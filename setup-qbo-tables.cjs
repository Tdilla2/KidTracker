// Creates the QuickBooks OAuth tables in the production database
// Run: node setup-qbo-tables.cjs

const API = 'https://v9iqpcma3c.execute-api.us-east-1.amazonaws.com/prod/api';

async function setupQBOTables() {
  console.log('Setting up QuickBooks tables via Lambda...\n');

  // Test connectivity
  const test = await fetch(`${API}/children`);
  if (!test.ok) {
    console.error('Cannot reach Lambda API:', test.status);
    process.exit(1);
  }
  console.log('Lambda API reachable.\n');

  // We cannot run raw SQL via the Lambda API — the tables need to be created
  // directly in RDS. Run the SQL below in your RDS console or psql session.

  console.log('='.repeat(60));
  console.log('Run this SQL in your RDS PostgreSQL console:');
  console.log('='.repeat(60));
  console.log(`
-- QuickBooks OAuth token storage (one row per daycare)
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
);

-- Maps local KidTracker IDs to QuickBooks IDs
CREATE TABLE IF NOT EXISTS qbo_sync_map (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daycare_id  TEXT,
  local_id    TEXT NOT NULL,
  qbo_id      TEXT NOT NULL,
  entity_type TEXT NOT NULL,   -- 'customer', 'invoice', 'payment'
  synced_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (daycare_id, local_id, entity_type)
);

CREATE INDEX IF NOT EXISTS idx_qbo_sync_map_lookup
  ON qbo_sync_map (daycare_id, entity_type);
`);
  console.log('='.repeat(60));
  console.log('\nAfter running the SQL, add QBO_CLIENT_SECRET to your Lambda:');
  console.log('1. AWS Console → Lambda → kidtracker-api → Configuration → Environment variables');
  console.log('2. Add: QBO_CLIENT_SECRET = <your sandbox client secret>');
  console.log('\nClient ID (already in code): ABZFDP7PIjWts3kK0IqHbjO1QylLXuVPVhHzCt1p3ZmYzAlRB4');
}

setupQBOTables().catch(err => console.error('Error:', err.message));
