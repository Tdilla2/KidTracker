const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { Client } = require('pg');

async function run() {
  const db = new Client({
    host: 'kidtracker-db.cqsakzqfyzty.us-east-1.rds.amazonaws.com',
    port: 5432,
    database: 'kidtracker',
    user: 'kidtracker_admin',
    password: 'KidAdmin2025!Temp',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  await db.connect();
  console.log('Connected to database.\n');

  await db.query(`
    CREATE TABLE IF NOT EXISTS qbo_tokens (
      id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      daycare_id   TEXT UNIQUE,
      realm_id     TEXT NOT NULL,
      company_name TEXT,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      token_expiry TIMESTAMPTZ NOT NULL,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('Created table: qbo_tokens');

  await db.query(`
    CREATE TABLE IF NOT EXISTS qbo_sync_map (
      id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      daycare_id  TEXT,
      local_id    TEXT NOT NULL,
      qbo_id      TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      synced_at   TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (daycare_id, local_id, entity_type)
    )
  `);
  console.log('Created table: qbo_sync_map');

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_qbo_sync_map_lookup
      ON qbo_sync_map (daycare_id, entity_type)
  `);
  console.log('Created index: idx_qbo_sync_map_lookup');

  const check = await db.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('qbo_tokens','qbo_sync_map')
    ORDER BY table_name
  `);
  console.log('\nVerified tables:', check.rows.map(r => r.table_name).join(', '));
  console.log('\nDone. QuickBooks tables are ready.');

  await db.end();
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
