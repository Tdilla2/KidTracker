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

async function checkAuth() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected!\n');

    // Check if there's an app_users table
    console.log('Checking for app_users table...');
    const appUsersCheck = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'app_users'
    `);

    if (appUsersCheck.rows.length > 0) {
      console.log('app_users table exists!');
      const appUsers = await client.query('SELECT * FROM app_users LIMIT 5');
      console.log('Sample app_users data:');
      console.log(JSON.stringify(appUsers.rows, null, 2));
    } else {
      console.log('No app_users table found.');
    }

    // Show all users with their details
    console.log('\nAll users in the system:');
    const users = await client.query(`
      SELECT id, email, full_name, role, status, cognito_id, daycare_id
      FROM users
      ORDER BY full_name
    `);

    users.rows.forEach(u => {
      console.log(`\n  Name: ${u.full_name}`);
      console.log(`  Email: ${u.email}`);
      console.log(`  Role: ${u.role}`);
      console.log(`  Cognito ID: ${u.cognito_id || 'None'}`);
      console.log(`  Daycare: ${u.daycare_id || 'ALL (Super Admin)'}`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkAuth();
