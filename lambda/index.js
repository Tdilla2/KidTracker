const { Pool } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const https = require('https');

// ── HTTPS helper (used for QuickBooks API calls) ──────────────────────────────
function httpsRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// Stripe credentials — loaded from environment variables (set in Lambda configuration)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER || '',
  professional: process.env.STRIPE_PRICE_PROFESSIONAL || '',
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE || '',
};
const stripe = STRIPE_SECRET_KEY ? require('stripe')(STRIPE_SECRET_KEY) : null;

// QuickBooks credentials / constants
const QBO_CLIENT_ID     = 'ABZFDP7PIjWts3kK0IqHbjO1QylLXuVPVhHzCt1p3ZmYzAlRB4';
const QBO_REDIRECT_URI  = 'https://main.d2nbsjhv8lzch9.amplifyapp.com';
const QBO_TOKEN_HOST    = 'oauth.platform.intuit.com';
const QBO_TOKEN_PATH    = '/oauth2/v1/tokens/bearer';
const QBO_API_HOST      = 'sandbox-quickbooks.api.intuit.com';

const smClient = new SecretsManagerClient({ region: 'us-east-1' });

let cachedSecret = null;
let cachedEncryptionKey = null;
let pool = null;

// Columns in the children table that contain PII and must be encrypted
const ENCRYPTED_COLUMNS = [
  'parent_email', 'parent_phone',
  'emergency_contact', 'emergency_phone',
  'emergency_contact_2', 'emergency_phone_2',
  'authorized_pickup_1', 'authorized_pickup_1_phone',
  'authorized_pickup_2', 'authorized_pickup_2_phone',
  'authorized_pickup_3', 'authorized_pickup_3_phone',
  'allergies', 'medical_notes'
];

async function getEncryptionKey() {
  if (cachedEncryptionKey) return cachedEncryptionKey;

  const secretName = process.env.ENCRYPTION_KEY_ARN || 'kidtracker/encryption-key';
  const resp = await smClient.send(new GetSecretValueCommand({ SecretId: secretName }));
  const parsed = JSON.parse(resp.SecretString);
  cachedEncryptionKey = Buffer.from(parsed.key, 'hex');
  return cachedEncryptionKey;
}

function encrypt(plaintext, key) {
  if (plaintext == null || plaintext === '') return plaintext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return iv.toString('base64') + ':' + authTag.toString('base64') + ':' + encrypted.toString('base64');
}

function decrypt(encryptedStr, key) {
  if (encryptedStr == null || encryptedStr === '') return encryptedStr;
  const parts = String(encryptedStr).split(':');
  if (parts.length !== 3) return encryptedStr; // plaintext fallback
  try {
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const ciphertext = Buffer.from(parts[2], 'base64');
    if (iv.length !== 12 || authTag.length !== 16) return encryptedStr; // not encrypted
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(ciphertext, null, 'utf8') + decipher.final('utf8');
  } catch {
    return encryptedStr; // graceful fallback for plaintext values
  }
}

function encryptRow(data, key) {
  const result = { ...data };
  for (const col of ENCRYPTED_COLUMNS) {
    if (col in result) {
      result[col] = encrypt(result[col], key);
    }
  }
  return result;
}

function decryptRow(row, key) {
  if (!row) return row;
  const result = { ...row };
  for (const col of ENCRYPTED_COLUMNS) {
    if (col in result) {
      result[col] = decrypt(result[col], key);
    }
  }
  return result;
}

function decryptRows(rows, key) {
  return rows.map(row => decryptRow(row, key));
}

async function getDbCredentials() {
  if (cachedSecret) return cachedSecret;

  const secretName = process.env.DB_SECRET_ARN || 'kidtracker/db-credentials';
  const resp = await smClient.send(new GetSecretValueCommand({ SecretId: secretName }));
  cachedSecret = JSON.parse(resp.SecretString);
  return cachedSecret;
}

async function getPool() {
  if (pool) return pool;

  const creds = await getDbCredentials();
  const ca = fs.readFileSync(path.join(__dirname, 'global-bundle.pem'), 'utf8');

  pool = new Pool({
    host: creds.host,
    port: creds.port || 5432,
    database: creds.database,
    user: creds.username,
    password: creds.password,
    ssl: { rejectUnauthorized: true, ca },
    max: 10,
    idleTimeoutMillis: 30000
  });

  return pool;
}

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event));

  // Get method - handle both API Gateway v1 and v2 formats
  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const path_ = event.rawPath || event.path || '';

  // Parse path: /prod/api/{table} or /prod/api/{table}/{id}
  const pathParts = path_.split('/').filter(p => p);
  const apiIndex = pathParts.indexOf('api');
  const table = pathParts[apiIndex + 1]; // table name after 'api'
  const id = pathParts[apiIndex + 2]; // id after table (if present)

  // For Stripe webhooks, keep raw body for signature verification
  const isStripeWebhook = (table === 'stripe' && id === 'webhook');
  const rawBody = isStripeWebhook
    ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body)
    : null;
  const body = (!isStripeWebhook && event.body) ? JSON.parse(event.body) : {};

  console.log('Path:', path_, 'Table:', table, 'ID:', id);

  // JSONB columns that need to be stringified
  const jsonbColumns = ['recurring_charges', 'bathroom_times', 'child_ids', 'operating_hours'];

  // Process body to stringify JSONB fields
  const processBody = (data) => {
    const processed = { ...data };
    for (const col of jsonbColumns) {
      if (col in processed && processed[col] !== null) {
        // If it's already an object/array, stringify it for PostgreSQL JSONB
        if (typeof processed[col] === 'object') {
          processed[col] = JSON.stringify(processed[col]);
        }
      }
    }
    return processed;
  };

  try {
    const db = await getPool();

    // ── QuickBooks OAuth + Sync routes (/api/qbo/*) ───────────────────────────
    if (table === 'qbo') {
      const qboAction = id; // auth-url | callback | status | sync | disconnect
      const queryParams = event.queryStringParameters || {};
      const QBO_CLIENT_SECRET = process.env.QBO_CLIENT_SECRET;

      if (!QBO_CLIENT_SECRET) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'QBO_CLIENT_SECRET env var not set' }) };
      }

      const b64Creds = Buffer.from(`${QBO_CLIENT_ID}:${QBO_CLIENT_SECRET}`).toString('base64');

      // Helper: call QB sandbox API
      const qboCall = async (accessToken, realmId, method_, apiPath, payload = null) => {
        const bodyStr = payload ? JSON.stringify(payload) : null;
        const reqHeaders = {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        };
        if (bodyStr) reqHeaders['Content-Length'] = Buffer.byteLength(bodyStr);
        return httpsRequest({
          hostname: QBO_API_HOST,
          path: `/v3/company/${realmId}${apiPath}?minorversion=65`,
          method: method_,
          headers: reqHeaders,
        }, bodyStr);
      };

      // Helper: refresh access token and update DB
      const refreshToken = async (daycareId, oldRefresh) => {
        const rbody = `grant_type=refresh_token&refresh_token=${encodeURIComponent(oldRefresh)}`;
        const res = await httpsRequest({
          hostname: QBO_TOKEN_HOST, path: QBO_TOKEN_PATH, method: 'POST',
          headers: { Authorization: `Basic ${b64Creds}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(rbody) },
        }, rbody);
        const t = JSON.parse(res.body);
        if (!t.access_token) throw new Error('Token refresh failed');
        const expiry = new Date(Date.now() + t.expires_in * 1000).toISOString();
        await db.query('UPDATE qbo_tokens SET access_token=$1,refresh_token=$2,token_expiry=$3,updated_at=NOW() WHERE daycare_id=$4',
          [t.access_token, t.refresh_token || oldRefresh, expiry, daycareId]);
        return t.access_token;
      };

      // Helper: get a valid (refreshing if needed) access token
      const getValidToken = async (daycareId) => {
        const r = await db.query('SELECT * FROM qbo_tokens WHERE daycare_id=$1', [daycareId]);
        if (!r.rows[0]) throw new Error('Not connected to QuickBooks');
        const row = r.rows[0];
        if (new Date(row.token_expiry) < new Date(Date.now() + 5 * 60 * 1000)) {
          return { accessToken: await refreshToken(daycareId, row.refresh_token), realmId: row.realm_id };
        }
        return { accessToken: row.access_token, realmId: row.realm_id };
      };

      // ── GET /api/qbo/auth-url?daycare_id=XXX&redirect_uri=XXX ───────────
      if (qboAction === 'auth-url' && method === 'GET') {
        const ALLOWED_REDIRECTS = [
          'https://main.d2nbsjhv8lzch9.amplifyapp.com',
          'http://localhost:5173',
          'http://localhost:5174',
        ];
        const requestedRedirect = queryParams.redirect_uri;
        const redirectUri = (requestedRedirect && ALLOWED_REDIRECTS.includes(requestedRedirect))
          ? requestedRedirect
          : QBO_REDIRECT_URI;
        const state = encodeURIComponent(queryParams.daycare_id || 'default');
        const url = `https://appcenter.intuit.com/connect/oauth2`
          + `?client_id=${QBO_CLIENT_ID}`
          + `&redirect_uri=${encodeURIComponent(redirectUri)}`
          + `&response_type=code`
          + `&scope=com.intuit.quickbooks.accounting`
          + `&state=${state}`;
        return { statusCode: 200, headers, body: JSON.stringify({ url }) };
      }

      // ── POST /api/qbo/callback  body: {code, realmId, daycareId, redirectUri} ──
      if (qboAction === 'callback' && method === 'POST') {
        const { code, realmId, daycareId, redirectUri } = body;
        const ALLOWED_REDIRECTS = [
          'https://main.d2nbsjhv8lzch9.amplifyapp.com',
          'http://localhost:5173',
          'http://localhost:5174',
        ];
        const callbackRedirect = (redirectUri && ALLOWED_REDIRECTS.includes(redirectUri))
          ? redirectUri
          : QBO_REDIRECT_URI;
        const rbody = `grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(callbackRedirect)}`;
        const tokenRes = await httpsRequest({
          hostname: QBO_TOKEN_HOST, path: QBO_TOKEN_PATH, method: 'POST',
          headers: { Authorization: `Basic ${b64Creds}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(rbody) },
        }, rbody);
        const tokens = JSON.parse(tokenRes.body);
        if (!tokens.access_token) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Token exchange failed', detail: tokenRes.body }) };
        }
        const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

        // Fetch company name from QB
        let companyName = 'QuickBooks Company';
        try {
          const infoRes = await qboCall(tokens.access_token, realmId, 'GET', `/companyinfo/${realmId}`);
          const info = JSON.parse(infoRes.body);
          companyName = info.CompanyInfo?.CompanyName || companyName;
        } catch (_) {}

        const did = daycareId || 'default';
        await db.query(
          `INSERT INTO qbo_tokens (daycare_id,realm_id,company_name,access_token,refresh_token,token_expiry)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (daycare_id) DO UPDATE SET
             realm_id=$2,company_name=$3,access_token=$4,refresh_token=$5,token_expiry=$6,updated_at=NOW()`,
          [did, realmId, companyName, tokens.access_token, tokens.refresh_token, expiry]
        );
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, companyName, realmId }) };
      }

      // ── GET /api/qbo/status?daycare_id=XXX ───────────────────────────────
      if (qboAction === 'status' && method === 'GET') {
        const r = await db.query('SELECT realm_id,company_name,updated_at FROM qbo_tokens WHERE daycare_id=$1', [queryParams.daycare_id || 'default']);
        if (!r.rows[0]) return { statusCode: 200, headers, body: JSON.stringify({ connected: false }) };
        return { statusCode: 200, headers, body: JSON.stringify({ connected: true, companyName: r.rows[0].company_name, realmId: r.rows[0].realm_id, lastSync: r.rows[0].updated_at }) };
      }

      // ── POST /api/qbo/sync  body: {daycareId, type} ──────────────────────
      if (qboAction === 'sync' && method === 'POST') {
        const { daycareId, type } = body; // type: customers | invoices | payments | all
        const did = daycareId || 'default';
        const { accessToken, realmId } = await getValidToken(did);
        const results = {};

        // Sync customers
        if (type === 'customers' || type === 'all') {
          const kids = await db.query("SELECT * FROM children WHERE daycare_id=$1 AND status='active'", [did]);
          let synced = 0;
          for (const child of kids.rows) {
            const ex = await db.query('SELECT qbo_id FROM qbo_sync_map WHERE daycare_id=$1 AND local_id=$2 AND entity_type=$3', [did, child.id, 'customer']);
            if (ex.rows[0]) { synced++; continue; }
            const customerBody = { DisplayName: `${child.first_name} ${child.last_name} Family`, GivenName: child.first_name || '', FamilyName: child.last_name || '' };
            const res = await qboCall(accessToken, realmId, 'POST', '/customer', customerBody);
            const qboId = JSON.parse(res.body).Customer?.Id;
            if (qboId) {
              await db.query('INSERT INTO qbo_sync_map(daycare_id,local_id,qbo_id,entity_type) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING', [did, child.id, qboId, 'customer']);
              synced++;
            }
          }
          results.customers = { synced, total: kids.rows.length };
        }

        // Sync invoices
        if (type === 'invoices' || type === 'all') {
          const invs = await db.query('SELECT * FROM invoices WHERE daycare_id=$1', [did]);
          let synced = 0;
          for (const inv of invs.rows) {
            const ex = await db.query('SELECT qbo_id FROM qbo_sync_map WHERE daycare_id=$1 AND local_id=$2 AND entity_type=$3', [did, inv.id, 'invoice']);
            if (ex.rows[0]) { synced++; continue; }
            const custMap = await db.query('SELECT qbo_id FROM qbo_sync_map WHERE daycare_id=$1 AND local_id=$2 AND entity_type=$3', [did, inv.child_id, 'customer']);
            if (!custMap.rows[0]) continue;
            const invBody = {
              CustomerRef: { value: custMap.rows[0].qbo_id },
              DueDate: inv.due_date ? new Date(inv.due_date).toISOString().split('T')[0] : undefined,
              TxnDate: inv.created_at ? new Date(inv.created_at).toISOString().split('T')[0] : undefined,
              Line: [{ DetailType: 'SalesItemLineDetail', Amount: parseFloat(inv.amount), Description: inv.description || 'Childcare Services', SalesItemLineDetail: { ItemRef: { value: '1' } } }],
            };
            const res = await qboCall(accessToken, realmId, 'POST', '/invoice', invBody);
            const qboId = JSON.parse(res.body).Invoice?.Id;
            if (qboId) {
              await db.query('INSERT INTO qbo_sync_map(daycare_id,local_id,qbo_id,entity_type) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING', [did, inv.id, qboId, 'invoice']);
              synced++;
            }
          }
          results.invoices = { synced, total: invs.rows.length };
        }

        // Sync payments (paid invoices only)
        if (type === 'payments' || type === 'all') {
          const paid = await db.query("SELECT * FROM invoices WHERE daycare_id=$1 AND status='paid'", [did]);
          let synced = 0;
          for (const inv of paid.rows) {
            const ex = await db.query('SELECT qbo_id FROM qbo_sync_map WHERE daycare_id=$1 AND local_id=$2 AND entity_type=$3', [did, inv.id, 'payment']);
            if (ex.rows[0]) { synced++; continue; }
            const custMap = await db.query('SELECT qbo_id FROM qbo_sync_map WHERE daycare_id=$1 AND local_id=$2 AND entity_type=$3', [did, inv.child_id, 'customer']);
            const invMap  = await db.query('SELECT qbo_id FROM qbo_sync_map WHERE daycare_id=$1 AND local_id=$2 AND entity_type=$3', [did, inv.id, 'invoice']);
            if (!custMap.rows[0] || !invMap.rows[0]) continue;
            const payDate = inv.paid_date ? new Date(inv.paid_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            const payBody = {
              CustomerRef: { value: custMap.rows[0].qbo_id },
              TotalAmt: parseFloat(inv.amount),
              TxnDate: payDate,
              Line: [{ Amount: parseFloat(inv.amount), LinkedTxn: [{ TxnId: invMap.rows[0].qbo_id, TxnType: 'Invoice' }] }],
            };
            const res = await qboCall(accessToken, realmId, 'POST', '/payment', payBody);
            const qboId = JSON.parse(res.body).Payment?.Id;
            if (qboId) {
              await db.query('INSERT INTO qbo_sync_map(daycare_id,local_id,qbo_id,entity_type) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING', [did, inv.id, qboId, 'payment']);
              synced++;
            }
          }
          results.payments = { synced, total: paid.rows.length };
        }

        await db.query('UPDATE qbo_tokens SET updated_at=NOW() WHERE daycare_id=$1', [did]);
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, results }) };
      }

      // ── POST /api/qbo/import  body: {daycareId} ──────────────────────────
      // Pulls invoice/payment statuses from QB and updates KidTracker invoices
      if (qboAction === 'import' && method === 'POST') {
        const did = body.daycareId || 'default';
        const { accessToken, realmId } = await getValidToken(did);

        // Fetch all invoices from QB
        const qbQuery = encodeURIComponent("SELECT * FROM Invoice MAXRESULTS 1000");
        const qbRes = await httpsRequest({
          hostname: QBO_API_HOST,
          path: `/v3/company/${realmId}/query?query=${qbQuery}&minorversion=65`,
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        });
        const qbData = JSON.parse(qbRes.body);
        const qbInvoices = qbData.QueryResponse?.Invoice || [];

        // Fetch all payments from QB
        const payQuery = encodeURIComponent("SELECT * FROM Payment MAXRESULTS 1000");
        const payRes = await httpsRequest({
          hostname: QBO_API_HOST,
          path: `/v3/company/${realmId}/query?query=${payQuery}&minorversion=65`,
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        });
        const payData = JSON.parse(payRes.body);
        const qbPayments = payData.QueryResponse?.Payment || [];

        // Build set of QB invoice IDs that are fully paid (Balance = 0)
        const paidQbIds = new Set(
          qbInvoices.filter(inv => parseFloat(inv.Balance) === 0).map(inv => inv.Id)
        );

        // Also collect QB invoice IDs linked from payments
        for (const pmt of qbPayments) {
          for (const line of (pmt.Line || [])) {
            for (const linked of (line.LinkedTxn || [])) {
              if (linked.TxnType === 'Invoice') paidQbIds.add(linked.TxnId);
            }
          }
        }

        // Find KidTracker invoices mapped to those QB invoice IDs
        const maps = await db.query(
          "SELECT local_id, qbo_id FROM qbo_sync_map WHERE daycare_id=$1 AND entity_type='invoice'",
          [did]
        );

        let updated = 0;
        const paidLocalIds = [];
        for (const row of maps.rows) {
          if (paidQbIds.has(row.qbo_id)) {
            paidLocalIds.push(row.local_id);
          }
        }

        if (paidLocalIds.length > 0) {
          const placeholders = paidLocalIds.map((_, i) => `$${i + 2}`).join(',');
          const result = await db.query(
            `UPDATE invoices SET status='paid', paid_date=COALESCE(paid_date, NOW())
             WHERE daycare_id=$1 AND id IN (${placeholders}) AND status != 'paid'
             RETURNING id`,
            [did, ...paidLocalIds]
          );
          updated = result.rowCount;
        }

        // Also check for new QB invoices not yet in KidTracker (created directly in QB)
        // Build set of already-mapped QB invoice IDs
        const mappedQbIds = new Set(maps.rows.map(r => r.qbo_id));
        const unmappedQbInvoices = qbInvoices.filter(inv => !mappedQbIds.has(inv.Id));

        // Pre-load all children for name-based fallback matching
        const allChildren = await db.query('SELECT id, first_name, last_name FROM children WHERE daycare_id=$1', [did]);

        // For each unmapped QB invoice, try to match by customer and create in KidTracker
        let imported = 0;
        for (const qbInv of unmappedQbInvoices) {
          const custQbId = qbInv.CustomerRef?.value;
          const custDisplayName = (qbInv.CustomerRef?.name || '').toLowerCase();
          if (!custQbId) continue;

          // 1) Try sync map first
          let childId = null;
          const custMap = await db.query(
            "SELECT local_id FROM qbo_sync_map WHERE daycare_id=$1 AND qbo_id=$2 AND entity_type='customer'",
            [did, custQbId]
          );
          if (custMap.rows[0]) {
            childId = custMap.rows[0].local_id;
          } else {
            // 2) Fallback: match QB customer name to a child ("Smith Family" → last name "Smith")
            for (const child of allChildren.rows) {
              const lastName = child.last_name.toLowerCase();
              const fullExpected = `${child.first_name} ${child.last_name} family`.toLowerCase();
              if (custDisplayName === fullExpected || custDisplayName.includes(lastName)) {
                childId = child.id;
                // Save the mapping so future syncs skip this lookup
                await db.query(
                  "INSERT INTO qbo_sync_map(daycare_id,local_id,qbo_id,entity_type) VALUES($1,$2,$3,'customer') ON CONFLICT DO NOTHING",
                  [did, child.id, custQbId]
                );
                break;
              }
            }
          }
          if (!childId) continue;
          const amount = parseFloat(qbInv.TotalAmt) || 0;
          const dueDate = qbInv.DueDate || null;
          const txnDate = qbInv.TxnDate || new Date().toISOString().split('T')[0];
          const isPaid = parseFloat(qbInv.Balance) === 0;
          const desc = (qbInv.Line || []).find(l => l.Description)?.Description || 'Imported from QuickBooks';
          const invoiceNumber = qbInv.DocNumber || `QB-${qbInv.Id}`;

          const ins = await db.query(
            `INSERT INTO invoices (child_id, daycare_id, amount, description, due_date, status, created_at, paid_date, invoice_number)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
            [childId, did, amount, desc, dueDate, isPaid ? 'paid' : 'pending', txnDate, isPaid ? new Date() : null, invoiceNumber]
          );
          const newId = ins.rows[0]?.id;
          if (newId) {
            await db.query(
              "INSERT INTO qbo_sync_map(daycare_id,local_id,qbo_id,entity_type) VALUES($1,$2,$3,'invoice') ON CONFLICT DO NOTHING",
              [did, newId, qbInv.Id]
            );
            imported++;
          }
        }

        return { statusCode: 200, headers, body: JSON.stringify({
          success: true,
          results: {
            invoicesUpdatedToPaid: updated,
            invoicesImportedFromQB: imported,
            totalQBInvoices: qbInvoices.length,
            paidInQB: paidQbIds.size,
          }
        })};
      }

      // ── POST /api/qbo/disconnect  body: {daycareId} ──────────────────────
      if (qboAction === 'disconnect' && method === 'POST') {
        const did = body.daycareId || 'default';
        await db.query('DELETE FROM qbo_tokens WHERE daycare_id=$1', [did]);
        await db.query('DELETE FROM qbo_sync_map WHERE daycare_id=$1', [did]);
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }

      return { statusCode: 404, headers, body: JSON.stringify({ error: `Unknown QB action: ${qboAction}` }) };
    }
    // ── End QuickBooks routes ─────────────────────────────────────────────────

    // ── Stripe Subscription routes (/api/stripe/*) ──────────────────────────
    if (table === 'stripe') {
      const stripeAction = id; // create-checkout-session | webhook | subscription | create-portal-session

      // ── POST /api/stripe/create-checkout-session ──────────────────────────
      if (stripeAction === 'create-checkout-session' && method === 'POST') {
        const { daycareId, plan, successUrl, cancelUrl } = body;

        if (!daycareId || !plan || !STRIPE_PRICE_IDS[plan]) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing daycareId or invalid plan' }) };
        }

        // Look up the daycare
        const dcResult = await db.query('SELECT * FROM daycares WHERE id = $1', [daycareId]);
        const daycare = dcResult.rows[0];
        if (!daycare) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Daycare not found' }) };
        }

        // Create or reuse Stripe customer
        let stripeCustomerId = daycare.stripe_customer_id;
        if (!stripeCustomerId) {
          const customer = await stripe.customers.create({
            email: daycare.email || undefined,
            name: daycare.name,
            metadata: { daycareId },
          });
          stripeCustomerId = customer.id;
          await db.query('UPDATE daycares SET stripe_customer_id = $1 WHERE id = $2', [stripeCustomerId, daycareId]);
        }

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
          customer: stripeCustomerId,
          mode: 'subscription',
          line_items: [{ price: STRIPE_PRICE_IDS[plan], quantity: 1 }],
          success_url: (successUrl || 'http://localhost:5173') + '?payment=success',
          cancel_url: (cancelUrl || 'http://localhost:5173') + '?payment=cancelled',
          metadata: { daycareId, plan },
          subscription_data: { metadata: { daycareId, plan } },
        });

        return { statusCode: 200, headers, body: JSON.stringify({ sessionId: session.id, url: session.url }) };
      }

      // ── POST /api/stripe/webhook ──────────────────────────────────────────
      if (stripeAction === 'webhook' && method === 'POST') {
        const sig = event.headers?.['stripe-signature'] || event.headers?.['Stripe-Signature'];

        let stripeEvent;
        try {
          stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
        } catch (err) {
          console.error('Stripe webhook signature verification failed:', err.message);
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Webhook signature verification failed' }) };
        }

        switch (stripeEvent.type) {
          case 'checkout.session.completed': {
            const session = stripeEvent.data.object;
            const daycareId = session.metadata?.daycareId;
            const plan = session.metadata?.plan;
            const subscriptionId = session.subscription;

            if (daycareId && plan) {
              await db.query(
                `UPDATE daycares SET subscription_status = 'active', subscription_plan = $1, stripe_subscription_id = $2 WHERE id = $3`,
                [plan, subscriptionId, daycareId]
              );
              console.log(`Activated subscription for daycare ${daycareId}: plan=${plan}`);
            }
            break;
          }
          case 'customer.subscription.updated': {
            const sub = stripeEvent.data.object;
            const daycareId = sub.metadata?.daycareId;
            if (daycareId && (sub.status === 'canceled' || sub.status === 'past_due')) {
              await db.query(
                `UPDATE daycares SET subscription_status = 'expired' WHERE id = $1`,
                [daycareId]
              );
              console.log(`Subscription expired for daycare ${daycareId}`);
            }
            break;
          }
          case 'customer.subscription.deleted': {
            const sub = stripeEvent.data.object;
            const daycareId = sub.metadata?.daycareId;
            if (daycareId) {
              await db.query(
                `UPDATE daycares SET subscription_status = 'expired', subscription_plan = 'none' WHERE id = $1`,
                [daycareId]
              );
              console.log(`Subscription deleted for daycare ${daycareId}`);
            }
            break;
          }
          default:
            console.log(`Unhandled Stripe event type: ${stripeEvent.type}`);
        }

        return { statusCode: 200, headers, body: JSON.stringify({ received: true }) };
      }

      // ── GET /api/stripe/subscription?daycare_id=XXX ───────────────────────
      if (stripeAction === 'subscription' && method === 'GET') {
        const queryParams = event.queryStringParameters || {};
        const daycareId = queryParams.daycare_id;
        if (!daycareId) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing daycare_id' }) };
        }

        const result = await db.query(
          'SELECT subscription_plan, subscription_status, stripe_customer_id, stripe_subscription_id FROM daycares WHERE id = $1',
          [daycareId]
        );
        const row = result.rows[0];
        if (!row) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Daycare not found' }) };
        }

        return {
          statusCode: 200, headers,
          body: JSON.stringify({
            plan: row.subscription_plan,
            status: row.subscription_status,
            stripeCustomerId: row.stripe_customer_id,
            stripeSubscriptionId: row.stripe_subscription_id,
          }),
        };
      }

      // ── POST /api/stripe/create-portal-session ────────────────────────────
      if (stripeAction === 'create-portal-session' && method === 'POST') {
        const { daycareId, returnUrl } = body;

        const dcResult = await db.query('SELECT stripe_customer_id FROM daycares WHERE id = $1', [daycareId]);
        const daycare = dcResult.rows[0];
        if (!daycare?.stripe_customer_id) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'No Stripe customer found for this daycare' }) };
        }

        const session = await stripe.billingPortal.sessions.create({
          customer: daycare.stripe_customer_id,
          return_url: returnUrl || 'http://localhost:5173',
        });

        return { statusCode: 200, headers, body: JSON.stringify({ url: session.url }) };
      }

      return { statusCode: 404, headers, body: JSON.stringify({ error: `Unknown Stripe action: ${stripeAction}` }) };
    }
    // ── End Stripe routes ───────────────────────────────────────────────────

    const encKey = table === 'children' ? await getEncryptionKey() : null;
    let result;

    switch (method) {
      case 'GET':
        if (id) {
          result = await db.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
          const row = result.rows[0] || null;
          return { statusCode: 200, headers, body: JSON.stringify(encKey ? decryptRow(row, encKey) : row) };
        } else {
          const orderBy = table === 'children' ? 'ORDER BY first_name' :
                          table === 'attendance' ? 'ORDER BY date DESC' :
                          table === 'invoices' ? 'ORDER BY created_at DESC' : '';
          result = await db.query(`SELECT * FROM ${table} ${orderBy}`);
          return { statusCode: 200, headers, body: JSON.stringify(encKey ? decryptRows(result.rows, encKey) : result.rows) };
        }

      case 'POST': {
        let processedInsert = processBody(body);
        if (encKey) processedInsert = encryptRow(processedInsert, encKey);
        const insertCols = Object.keys(processedInsert);
        const insertVals = Object.values(processedInsert);
        const insertPlaceholders = insertCols.map((_, i) => `$${i + 1}`).join(', ');
        result = await db.query(
          `INSERT INTO ${table} (${insertCols.join(', ')}) VALUES (${insertPlaceholders}) RETURNING *`,
          insertVals
        );
        return { statusCode: 201, headers, body: JSON.stringify(encKey ? decryptRow(result.rows[0], encKey) : result.rows[0]) };
      }

      case 'PUT': {
        let processedUpdate = processBody(body);
        if (encKey) processedUpdate = encryptRow(processedUpdate, encKey);
        const updateCols = Object.keys(processedUpdate);
        const updateVals = Object.values(processedUpdate);
        const updateSet = updateCols.map((col, i) => `${col} = $${i + 1}`).join(', ');
        result = await db.query(
          `UPDATE ${table} SET ${updateSet} WHERE id = $${updateCols.length + 1} RETURNING *`,
          [...updateVals, id]
        );
        return { statusCode: 200, headers, body: JSON.stringify(encKey ? decryptRow(result.rows[0], encKey) : result.rows[0]) };
      }

      case 'DELETE':
        await db.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
        return { statusCode: 204, headers, body: '' };

      default:
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
