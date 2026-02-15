/**
 * One-time migration script to encrypt existing plaintext PII columns
 * in the children table using AES-256-GCM.
 *
 * Usage: node lambda/migrate-encrypt.js
 *
 * Idempotent — skips values that are already encrypted or null/empty.
 * Uses the same Secrets Manager credentials as the Lambda function.
 */

const { Pool } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const smClient = new SecretsManagerClient({ region: 'us-east-1' });

const ENCRYPTED_COLUMNS = [
  'parent_email', 'parent_phone',
  'emergency_contact', 'emergency_phone',
  'emergency_contact_2', 'emergency_phone_2',
  'authorized_pickup_1', 'authorized_pickup_1_phone',
  'authorized_pickup_2', 'authorized_pickup_2_phone',
  'authorized_pickup_3', 'authorized_pickup_3_phone',
  'allergies', 'medical_notes'
];

async function getDbCredentials() {
  const secretName = process.env.DB_SECRET_ARN || 'kidtracker/db-credentials';
  const resp = await smClient.send(new GetSecretValueCommand({ SecretId: secretName }));
  return JSON.parse(resp.SecretString);
}

async function getEncryptionKey() {
  const secretName = process.env.ENCRYPTION_KEY_ARN || 'kidtracker/encryption-key';
  const resp = await smClient.send(new GetSecretValueCommand({ SecretId: secretName }));
  const parsed = JSON.parse(resp.SecretString);
  return Buffer.from(parsed.key, 'hex');
}

function isAlreadyEncrypted(value) {
  if (value == null || value === '') return true; // nothing to encrypt
  const parts = String(value).split(':');
  if (parts.length !== 3) return false;
  try {
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    return iv.length === 12 && authTag.length === 16;
  } catch {
    return false;
  }
}

function encrypt(plaintext, key) {
  if (plaintext == null || plaintext === '') return plaintext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return iv.toString('base64') + ':' + authTag.toString('base64') + ':' + encrypted.toString('base64');
}

async function main() {
  console.log('Fetching credentials...');
  const [creds, encKey] = await Promise.all([getDbCredentials(), getEncryptionKey()]);

  const ca = fs.readFileSync(path.join(__dirname, 'global-bundle.pem'), 'utf8');
  const pool = new Pool({
    host: creds.host,
    port: creds.port || 5432,
    database: creds.database,
    user: creds.username,
    password: creds.password,
    ssl: { rejectUnauthorized: true, ca },
    max: 5
  });

  console.log('Connected to database. Fetching children rows...');
  const { rows } = await pool.query('SELECT * FROM children');
  console.log(`Found ${rows.length} rows.`);

  let updatedCount = 0;

  for (const row of rows) {
    const updates = {};

    for (const col of ENCRYPTED_COLUMNS) {
      const value = row[col];
      if (value != null && value !== '' && !isAlreadyEncrypted(value)) {
        updates[col] = encrypt(value, encKey);
      }
    }

    if (Object.keys(updates).length === 0) {
      console.log(`  Row ${row.id}: already encrypted or empty — skipping`);
      continue;
    }

    const setClauses = Object.keys(updates).map((col, i) => `${col} = $${i + 1}`).join(', ');
    const values = Object.values(updates);
    await pool.query(
      `UPDATE children SET ${setClauses} WHERE id = $${values.length + 1}`,
      [...values, row.id]
    );
    updatedCount++;
    console.log(`  Row ${row.id}: encrypted ${Object.keys(updates).length} columns`);
  }

  console.log(`\nDone. Encrypted ${updatedCount} of ${rows.length} rows.`);
  await pool.end();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
