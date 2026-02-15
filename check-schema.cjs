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

async function checkSchema() {
  const client = new Client(config);

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!\n');

    // Check users table schema
    console.log('Users table columns:');
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Check existing users
    console.log('\nExisting users:');
    const users = await client.query('SELECT * FROM users LIMIT 5');
    if (users.rows.length > 0) {
      console.log('Sample user data:');
      console.log(JSON.stringify(users.rows[0], null, 2));
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkSchema();
