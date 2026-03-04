const { Pool } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const https = require('https');
const bcrypt = require('bcryptjs');

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

// ── Security: API Key, CORS origins, table whitelist ─────────────────────────
const API_KEY = process.env.API_KEY || '';

const ALLOWED_ORIGINS = [
  'https://main.d2nbsjhv8lzch9.amplifyapp.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
];

const ALLOWED_TABLES = [
  'app_users', 'children', 'attendance', 'invoices',
  'classrooms', 'daily_activities', 'activity_photos',
  'meal_menus', 'company_info', 'daycares',
  'qbo_tokens', 'qbo_sync_map',
];

// Per-table column whitelists (SQL injection prevention for POST/PUT)
const ALLOWED_COLUMNS = {
  app_users: ['username', 'password', 'full_name', 'email', 'role', 'status', 'child_ids', 'parent_code', 'daycare_id', 'must_change_password', 'last_login'],
  children: ['first_name', 'last_name', 'date_of_birth', 'photo', 'parent_name', 'parent_email', 'parent_phone', 'emergency_contact', 'emergency_phone', 'emergency_contact_2', 'emergency_phone_2', 'authorized_pickup_1', 'authorized_pickup_1_phone', 'authorized_pickup_2', 'authorized_pickup_2_phone', 'authorized_pickup_3', 'authorized_pickup_3_phone', 'allergies', 'medical_notes', 'status', 'parent_user_id', 'recurring_charges', 'classroom_id', 'daycare_id', 'updated_at'],
  attendance: ['child_id', 'date', 'check_in', 'check_out', 'status', 'daycare_id'],
  invoices: ['invoice_number', 'child_id', 'amount', 'due_date', 'description', 'status', 'daycare_id', 'paid_date', 'created_at'],
  classrooms: ['name', 'age_group', 'capacity', 'teacher_name', 'description', 'status', 'daycare_id'],
  daily_activities: ['child_id', 'date', 'bathroom_times', 'nap_start', 'nap_end', 'mood', 'teacher_notes', 'daycare_id', 'updated_at'],
  activity_photos: ['child_id', 'date', 'photo', 'caption', 'daycare_id'],
  meal_menus: ['day', 'meal_type', 'menu_name', 'description', 'allergens', 'daycare_id'],
  company_info: ['name', 'address', 'city', 'state', 'zip_code', 'phone', 'email', 'website', 'tax_id', 'logo', 'operating_hours', 'daycare_id', 'updated_at'],
  daycares: ['name', 'daycare_code', 'address', 'city', 'state', 'zip_code', 'phone', 'email', 'status', 'owner_user_id', 'trial_ends_at', 'subscription_status', 'subscription_plan', 'stripe_customer_id', 'stripe_subscription_id'],
  qbo_tokens: ['daycare_id', 'realm_id', 'company_name', 'access_token', 'refresh_token', 'token_expiry'],
  qbo_sync_map: ['daycare_id', 'local_id', 'qbo_id', 'entity_type'],
};

// Tables that support daycare_id scoping on GET
const DAYCARE_SCOPED_TABLES = ['app_users', 'children', 'attendance', 'invoices', 'classrooms', 'daily_activities', 'activity_photos', 'meal_menus', 'company_info'];

// Password helpers
const BCRYPT_ROUNDS = 12;

async function verifyPassword(inputPassword, storedPassword) {
  if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$')) {
    return bcrypt.compare(inputPassword, storedPassword);
  }
  // Legacy plaintext comparison (migration path)
  return inputPassword === storedPassword;
}

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

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

function getResponseHeaders(event) {
  const origin = event?.headers?.origin || event?.headers?.Origin || '';
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
  };
}

exports.handler = async (event) => {
  const headers = getResponseHeaders(event);

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

  // ── API Key validation (skip for Stripe webhooks which use signature) ──
  if (!isStripeWebhook) {
    const requestKey = event.headers?.['x-api-key'] || event.headers?.['X-API-Key'] || '';
    if (!API_KEY || requestKey !== API_KEY) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
  }

  let body = {};
  try {
    body = (!isStripeWebhook && event.body) ? JSON.parse(event.body) : {};
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

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

    // ── Auth routes (/api/auth/*) ─────────────────────────────────────────────
    if (table === 'auth') {
      const authAction = id;

      // ── POST /api/auth/login ────────────────────────────────────────────────
      if (authAction === 'login' && method === 'POST') {
        const { username, password, daycareCode } = body;
        if (!username || !password) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing username or password' }) };
        }

        const trimmedUsername = username.trim().toLowerCase();
        const trimmedPassword = password.trim();

        // Fetch all users
        const usersResult = await db.query('SELECT * FROM app_users WHERE status = $1', ['active']);
        const allUsers = usersResult.rows;

        // Check for super admin (no daycare code needed)
        const superAdmin = allUsers.find(
          u => u.role === 'super_admin' &&
               (u.username?.toLowerCase() === trimmedUsername || u.email?.toLowerCase() === trimmedUsername)
        );

        if (superAdmin) {
          const valid = await verifyPassword(trimmedPassword, superAdmin.password);
          if (!valid) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid credentials' }) };
          }

          // Migrate plaintext password to bcrypt if needed (atomic: only update if password unchanged)
          if (!superAdmin.password.startsWith('$2a$') && !superAdmin.password.startsWith('$2b$')) {
            const hashed = await hashPassword(trimmedPassword);
            await db.query('UPDATE app_users SET password = $1 WHERE id = $2 AND password = $3', [hashed, superAdmin.id, superAdmin.password]);
          }

          // Update last login
          const now = new Date().toISOString();
          await db.query('UPDATE app_users SET last_login = $1 WHERE id = $2', [now, superAdmin.id]);

          const { password: _, ...userWithoutPassword } = superAdmin;
          userWithoutPassword.last_login = now;
          return { statusCode: 200, headers, body: JSON.stringify({ success: true, user: userWithoutPassword, daycare: null }) };
        }

        // Non-super-admin: daycare code required
        if (!daycareCode) {
          return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid credentials' }) };
        }

        // Look up daycare
        const targetCode = daycareCode.trim().toUpperCase();
        const dcResult = await db.query('SELECT * FROM daycares WHERE daycare_code = $1 AND status = $2', [targetCode, 'active']);
        const daycare = dcResult.rows[0];
        if (!daycare) {
          return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid credentials' }) };
        }

        // Check trial status
        if (daycare.trial_ends_at) {
          const trialEnd = new Date(daycare.trial_ends_at);
          const now = new Date();
          const isOnTrial = daycare.subscription_status === 'trial';
          const isActive = daycare.subscription_status === 'active';
          if (!isActive && isOnTrial && trialEnd < now) {
            return { statusCode: 403, headers, body: JSON.stringify({ error: 'Trial expired', trialExpired: true, daycareName: daycare.name }) };
          }
          if (!isActive && !isOnTrial && daycare.subscription_status !== 'trial') {
            // Expired subscription
            if (daycare.subscription_status === 'expired') {
              return { statusCode: 403, headers, body: JSON.stringify({ error: 'Subscription expired', trialExpired: true, daycareName: daycare.name }) };
            }
          }
        }

        // Find matching user in this daycare (must have exact daycare_id match)
        const matchingUser = allUsers.find(
          u => u.role !== 'super_admin' &&
               u.daycare_id === daycare.id &&
               (u.username?.toLowerCase() === trimmedUsername || u.email?.toLowerCase() === trimmedUsername)
        );

        if (!matchingUser) {
          return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid credentials' }) };
        }

        const valid = await verifyPassword(trimmedPassword, matchingUser.password);
        if (!valid) {
          return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid credentials' }) };
        }

        // Migrate plaintext password to bcrypt if needed (atomic: only update if password unchanged)
        if (!matchingUser.password.startsWith('$2a$') && !matchingUser.password.startsWith('$2b$')) {
          const hashed = await hashPassword(trimmedPassword);
          await db.query('UPDATE app_users SET password = $1 WHERE id = $2 AND password = $3', [hashed, matchingUser.id, matchingUser.password]);
        }

        // Update last login and daycare_id
        const now = new Date().toISOString();
        await db.query('UPDATE app_users SET last_login = $1, daycare_id = $2 WHERE id = $3', [now, daycare.id, matchingUser.id]);

        const { password: _, ...userWithoutPassword } = matchingUser;
        userWithoutPassword.last_login = now;
        userWithoutPassword.daycare_id = daycare.id;
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, user: userWithoutPassword, daycare }) };
      }

      // ── POST /api/auth/login-parent ─────────────────────────────────────────
      if (authAction === 'login-parent' && method === 'POST') {
        const { parentCode } = body;
        if (!parentCode) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing parent code' }) };
        }

        const userResult = await db.query(
          'SELECT * FROM app_users WHERE parent_code = $1 AND status = $2 AND role = $3',
          [parentCode, 'active', 'parent']
        );
        const parentUser = userResult.rows[0];
        if (!parentUser) {
          return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid parent code' }) };
        }

        // Look up parent's daycare
        let daycare = null;
        if (parentUser.daycare_id) {
          const dcResult = await db.query('SELECT * FROM daycares WHERE id = $1', [parentUser.daycare_id]);
          daycare = dcResult.rows[0] || null;

          // Check trial status
          if (daycare && daycare.trial_ends_at) {
            const trialEnd = new Date(daycare.trial_ends_at);
            const now = new Date();
            const isOnTrial = daycare.subscription_status === 'trial';
            const isActive = daycare.subscription_status === 'active';
            if (!isActive && isOnTrial && trialEnd < now) {
              return { statusCode: 403, headers, body: JSON.stringify({ error: 'Trial expired', trialExpired: true }) };
            }
          }
        }

        // Update last login
        const now = new Date().toISOString();
        await db.query('UPDATE app_users SET last_login = $1 WHERE id = $2', [now, parentUser.id]);

        const { password: _, ...userWithoutPassword } = parentUser;
        userWithoutPassword.last_login = now;
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, user: userWithoutPassword, daycare }) };
      }

      // ── POST /api/auth/change-password ──────────────────────────────────────
      if (authAction === 'change-password' && method === 'POST') {
        const { userId, currentPassword, newPassword } = body;
        if (!userId || !newPassword) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
        }

        const userResult = await db.query('SELECT * FROM app_users WHERE id = $1', [userId]);
        const user = userResult.rows[0];
        if (!user) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'User not found' }) };
        }

        // Require current password unless this is a forced password change (admin reset)
        if (!user.must_change_password) {
          if (!currentPassword) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Current password is required' }) };
          }
          const valid = await verifyPassword(currentPassword, user.password);
          if (!valid) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Current password is incorrect' }) };
          }
        } else if (currentPassword) {
          // Even on forced change, verify current password if provided
          const valid = await verifyPassword(currentPassword, user.password);
          if (!valid) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Current password is incorrect' }) };
          }
        }

        const hashed = await hashPassword(newPassword);
        await db.query('UPDATE app_users SET password = $1, must_change_password = false WHERE id = $2', [hashed, userId]);

        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }

      // ── POST /api/auth/reset-password ─────────────────────────────────────
      if (authAction === 'reset-password' && method === 'POST') {
        const { daycareCode, username, email } = body;
        if (!daycareCode || !username || !email) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
        }

        const trimmedCode = daycareCode.trim().toUpperCase();
        const trimmedUsername = username.trim().toLowerCase();
        const trimmedEmail = email.trim().toLowerCase();

        // Look up daycare
        const dcResult = await db.query('SELECT id FROM daycares WHERE daycare_code = $1 AND status = $2', [trimmedCode, 'active']);
        const daycare = dcResult.rows[0];
        if (!daycare) {
          return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid credentials' }) };
        }

        // Find matching user in that daycare
        const userResult = await db.query(
          'SELECT id FROM app_users WHERE daycare_id = $1 AND status = $2 AND LOWER(username) = $3 AND LOWER(email) = $4',
          [daycare.id, 'active', trimmedUsername, trimmedEmail]
        );
        const matchingUser = userResult.rows[0];
        if (!matchingUser) {
          return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid credentials' }) };
        }

        // Generate cryptographically secure 12-char temporary password
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
        const randomBytes = crypto.randomBytes(12);
        let tempPassword = '';
        for (let i = 0; i < 12; i++) {
          tempPassword += chars.charAt(randomBytes[i] % chars.length);
        }

        const hashed = await hashPassword(tempPassword);
        await db.query('UPDATE app_users SET password = $1, must_change_password = true WHERE id = $2', [hashed, matchingUser.id]);

        return { statusCode: 200, headers, body: JSON.stringify({ success: true, tempPassword }) };
      }

      return { statusCode: 404, headers, body: JSON.stringify({ error: `Unknown auth action: ${authAction}` }) };
    }

    // ── QuickBooks OAuth + Sync routes (/api/qbo/*) ───────────────────────────
    if (table === 'qbo') {
      const qboAction = id; // auth-url | callback | status | sync | disconnect
      const queryParams = event.queryStringParameters || {};
      const QBO_CLIENT_SECRET = process.env.QBO_CLIENT_SECRET;

      console.log('QBO route:', qboAction, 'method:', method);

      if (!QBO_CLIENT_SECRET) {
        console.error('QBO_CLIENT_SECRET not set');
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'QBO_CLIENT_SECRET env var not set' }) };
      }

      // Note: qbo_tokens and qbo_sync_map tables must be pre-created via create-qbo-tables.cjs

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
        console.log('QBO callback:', { realmId, daycareId, redirectUri, hasCode: !!code });
        if (!code || !realmId) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing code or realmId' }) };
        }
        const ALLOWED_REDIRECTS = [
          'https://main.d2nbsjhv8lzch9.amplifyapp.com',
          'http://localhost:5173',
          'http://localhost:5174',
        ];
        const callbackRedirect = (redirectUri && ALLOWED_REDIRECTS.includes(redirectUri))
          ? redirectUri
          : QBO_REDIRECT_URI;
        console.log('QBO token exchange with redirect:', callbackRedirect);
        const rbody = `grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(callbackRedirect)}`;
        const tokenRes = await httpsRequest({
          hostname: QBO_TOKEN_HOST, path: QBO_TOKEN_PATH, method: 'POST',
          headers: { Authorization: `Basic ${b64Creds}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(rbody) },
        }, rbody);
        const tokens = JSON.parse(tokenRes.body);
        if (!tokens.access_token) {
          console.error('QBO token exchange failed:', tokenRes.body);
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Token exchange failed', detail: tokenRes.body }) };
        }
        console.log('QBO token exchange succeeded, realmId:', realmId);
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
              const lastName = (child.last_name || '').toLowerCase();
              if (!lastName) continue;
              const fullExpected = `${child.first_name || ''} ${child.last_name || ''} family`.toLowerCase();
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

          try {
            // Check if this invoice number already exists for this daycare
            const existing = await db.query(
              'SELECT id FROM invoices WHERE invoice_number = $1 AND daycare_id = $2',
              [invoiceNumber, did]
            );
            if (existing.rows[0]) {
              // Already exists — map it and skip
              await db.query(
                "INSERT INTO qbo_sync_map(daycare_id,local_id,qbo_id,entity_type) VALUES($1,$2,$3,'invoice') ON CONFLICT DO NOTHING",
                [did, existing.rows[0].id, qbInv.Id]
              );
              imported++;
              continue;
            }

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
          } catch (invErr) {
            console.error('QBO import invoice error:', invoiceNumber, invErr.message);
            // Continue importing other invoices even if one fails
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
        if (!STRIPE_WEBHOOK_SECRET) {
          console.error('STRIPE_WEBHOOK_SECRET not configured');
          return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server misconfiguration' }) };
        }
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

            // Handle one-time invoice payment
            if (session.metadata?.type === 'invoice_payment') {
              const invoiceId = session.metadata.invoiceId;
              const invDaycareId = session.metadata.daycareId;
              if (invoiceId) {
                const today = new Date().toISOString().split('T')[0];
                await db.query(
                  `UPDATE invoices SET status = 'paid', paid_date = $1 WHERE id = $2 AND daycare_id = $3`,
                  [today, invoiceId, invDaycareId]
                );
                console.log(`Invoice ${invoiceId} marked as paid via Stripe payment`);
              }
              break;
            }

            // Handle subscription checkout
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

      // ── POST /api/stripe/create-invoice-payment ─────────────────────────
      if (stripeAction === 'create-invoice-payment' && method === 'POST') {
        const { invoiceId, daycareId, successUrl, cancelUrl } = body;

        if (!invoiceId || !daycareId) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing invoiceId or daycareId' }) };
        }

        // Look up the invoice
        const invResult = await db.query('SELECT * FROM invoices WHERE id = $1 AND daycare_id = $2', [invoiceId, daycareId]);
        const invoice = invResult.rows[0];
        if (!invoice) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Invoice not found' }) };
        }
        if (invoice.status === 'paid') {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invoice is already paid' }) };
        }

        // Look up the child to get parent email
        const childResult = await db.query('SELECT * FROM children WHERE id = $1 AND daycare_id = $2', [invoice.child_id, daycareId]);
        const child = childResult.rows[0];
        let parentEmail = null;
        if (child && child.parent_email) {
          const encKey = await getEncryptionKey();
          parentEmail = decrypt(child.parent_email, encKey);
        }

        // Create one-time Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          ...(parentEmail ? { customer_email: parentEmail } : {}),
          line_items: [{
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Invoice #${invoice.invoice_number}`,
                description: invoice.description || 'Childcare Services',
              },
              unit_amount: Math.round(parseFloat(invoice.amount) * 100),
            },
            quantity: 1,
          }],
          success_url: (successUrl || 'http://localhost:5173') + '?invoice_payment=success&invoice_id=' + invoiceId,
          cancel_url: (cancelUrl || 'http://localhost:5173') + '?invoice_payment=cancelled',
          metadata: {
            type: 'invoice_payment',
            invoiceId: invoiceId,
            daycareId: daycareId,
            invoiceNumber: invoice.invoice_number,
          },
        });

        return { statusCode: 200, headers, body: JSON.stringify({ sessionId: session.id, url: session.url }) };
      }

      return { statusCode: 404, headers, body: JSON.stringify({ error: `Unknown Stripe action: ${stripeAction}` }) };
    }
    // ── End Stripe routes ───────────────────────────────────────────────────

    // ── Table whitelist (SQL injection prevention) ──────────────────────────
    if (!ALLOWED_TABLES.includes(table)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied' }) };
    }

    const queryParams = event.queryStringParameters || {};
    const encKey = table === 'children' ? await getEncryptionKey() : null;
    let result;

    // Helper: strip password from app_users rows
    const stripPasswords = (rows) => {
      if (table !== 'app_users') return rows;
      return rows.map(({ password, ...rest }) => rest);
    };
    const stripPassword = (row) => {
      if (!row || table !== 'app_users') return row;
      const { password, ...rest } = row;
      return rest;
    };

    // Helper: validate column names against whitelist (SQL injection prevention)
    const validateColumns = (data) => {
      const allowed = ALLOWED_COLUMNS[table];
      if (!allowed) return { valid: false, error: `No column whitelist for table: ${table}` };
      const cols = Object.keys(data);
      for (const col of cols) {
        if (!allowed.includes(col)) {
          return { valid: false, error: `Invalid column: ${col}` };
        }
      }
      return { valid: true };
    };

    switch (method) {
      case 'GET': {
        // Daycare-scoped GET: filter by daycare_id if provided
        const scopeDaycareId = queryParams.daycare_id;
        const shouldScope = scopeDaycareId && DAYCARE_SCOPED_TABLES.includes(table);

        if (id) {
          result = await db.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
          let row = result.rows[0] || null;
          row = encKey ? decryptRow(row, encKey) : row;
          return { statusCode: 200, headers, body: JSON.stringify(stripPassword(row)) };
        } else {
          const orderBy = table === 'children' ? 'ORDER BY first_name' :
                          table === 'attendance' ? 'ORDER BY date DESC' :
                          table === 'invoices' ? 'ORDER BY created_at DESC' : '';
          if (shouldScope) {
            result = await db.query(`SELECT * FROM ${table} WHERE daycare_id = $1 ${orderBy}`, [scopeDaycareId]);
          } else {
            result = await db.query(`SELECT * FROM ${table} ${orderBy}`);
          }
          let rows = encKey ? decryptRows(result.rows, encKey) : result.rows;
          return { statusCode: 200, headers, body: JSON.stringify(stripPasswords(rows)) };
        }
      }

      case 'POST': {
        let processedInsert = processBody(body);
        const colCheck = validateColumns(processedInsert);
        if (!colCheck.valid) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: colCheck.error }) };
        }
        // Auto-hash passwords for app_users
        if (table === 'app_users' && processedInsert.password && !processedInsert.password.startsWith('$2a$') && !processedInsert.password.startsWith('$2b$')) {
          processedInsert.password = await hashPassword(processedInsert.password);
        }
        if (encKey) processedInsert = encryptRow(processedInsert, encKey);
        const insertCols = Object.keys(processedInsert);
        const insertVals = Object.values(processedInsert);
        const insertPlaceholders = insertCols.map((_, i) => `$${i + 1}`).join(', ');
        result = await db.query(
          `INSERT INTO ${table} (${insertCols.join(', ')}) VALUES (${insertPlaceholders}) RETURNING *`,
          insertVals
        );
        let insertedRow = encKey ? decryptRow(result.rows[0], encKey) : result.rows[0];
        return { statusCode: 201, headers, body: JSON.stringify(stripPassword(insertedRow)) };
      }

      case 'PUT': {
        let processedUpdate = processBody(body);
        const colCheck = validateColumns(processedUpdate);
        if (!colCheck.valid) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: colCheck.error }) };
        }
        // Auto-hash passwords for app_users
        if (table === 'app_users' && processedUpdate.password && !processedUpdate.password.startsWith('$2a$') && !processedUpdate.password.startsWith('$2b$')) {
          processedUpdate.password = await hashPassword(processedUpdate.password);
        }
        if (encKey) processedUpdate = encryptRow(processedUpdate, encKey);
        const updateCols = Object.keys(processedUpdate);
        const updateVals = Object.values(processedUpdate);
        const updateSet = updateCols.map((col, i) => `${col} = $${i + 1}`).join(', ');
        result = await db.query(
          `UPDATE ${table} SET ${updateSet} WHERE id = $${updateCols.length + 1} RETURNING *`,
          [...updateVals, id]
        );
        let updatedRow = encKey ? decryptRow(result.rows[0], encKey) : result.rows[0];
        return { statusCode: 200, headers, body: JSON.stringify(stripPassword(updatedRow)) };
      }

      case 'DELETE':
        await db.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
        return { statusCode: 204, headers, body: '' };

      default:
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'An internal error occurred' }) };
  }
};
