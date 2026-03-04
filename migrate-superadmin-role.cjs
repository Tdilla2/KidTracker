// Run: node migrate-superadmin-role.cjs
// Updates the app_users role CHECK constraint to allow 'super_admin'

const { Client } = require('pg');

const DB_CONFIG = {
  host: 'kidtracker-db-staging-public.cluster-cqsakzqfyzty.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'kidtracker',
  user: 'kidtracker_admin',
  password: 'XQhE2602ZpvGVdg2K3FFrLYDgTTzvETN',
  ssl: { rejectUnauthorized: false },
};

async function migrate() {
  const client = new Client(DB_CONFIG);
  await client.connect();
  console.log('Connected to database.');

  try {
    // Drop old constraint and add new one that includes super_admin
    await client.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    `);
    console.log('Dropped old role CHECK constraint (users table).');

    await client.query(`
      ALTER TABLE users ADD CONSTRAINT users_role_check
        CHECK (role IN ('super_admin', 'admin', 'user', 'parent', 'staff'));
    `);
    console.log('Added new role CHECK constraint with super_admin.');

    // Verify
    const result = await client.query(`
      SELECT COUNT(*) as count FROM users WHERE role = 'super_admin';
    `);
    console.log(`Current super admin count: ${result.rows[0].count}`);

    console.log('\nMigration complete!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

migrate();
