const { Pool } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

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
  const body = event.body ? JSON.parse(event.body) : {};

  // Parse path: /prod/api/{table} or /prod/api/{table}/{id}
  const pathParts = path_.split('/').filter(p => p);
  const apiIndex = pathParts.indexOf('api');
  const table = pathParts[apiIndex + 1]; // table name after 'api'
  const id = pathParts[apiIndex + 2]; // id after table (if present)

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
