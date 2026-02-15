const { Client } = require('pg');

const config = {
  host: 'kidtracker-db-staging-public.cluster-cqsakzqfyzty.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'kidtracker',
  user: 'kidtracker_admin',
  password: 'XQhE2602ZpvGVdg2K3FFrLYDgTTzvETN',
  ssl: {
    rejectUnauthorized: false
  }
};

async function checkAllTables() {
  const client = new Client(config);

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!\n');

    // List all tables with row counts
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('Tables in database:');
    for (const row of tables.rows) {
      const count = await client.query(`SELECT COUNT(*) as count FROM ${row.table_name}`);
      console.log(`  - ${row.table_name}: ${count.rows[0].count} rows`);
    }

    // Check if there's an app_users table or view
    console.log('\nChecking for app_users...');
    const appUsers = await client.query(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_name LIKE '%user%' OR table_name LIKE '%app%'
    `);
    appUsers.rows.forEach(t => {
      console.log(`  - ${t.table_name} (${t.table_type})`);
    });

    // Sample users data
    console.log('\nAll users:');
    const users = await client.query('SELECT id, email, full_name, role, status, daycare_id FROM users');
    users.rows.forEach(u => {
      console.log(`  - ${u.full_name} (${u.email}) - Role: ${u.role}, Daycare: ${u.daycare_id}`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkAllTables();
