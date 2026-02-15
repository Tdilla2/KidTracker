const { Client } = require('pg');

const client = new Client({
  host: 'kidtracker-db.cqsakzqfyzty.us-east-1.rds.amazonaws.com',
  database: 'kidtracker',
  user: 'kidtracker_admin',
  password: 'KidTracker2024!',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

async function checkUsers() {
  try {
    await client.connect();
    console.log('Connected to database\n');

    // Get all daycares
    console.log('=== DAYCARES ===');
    const daycares = await client.query('SELECT id, name, daycare_code FROM daycares ORDER BY name');
    daycares.rows.forEach(d => {
      console.log(`${d.name}: ID=${d.id}, Code=${d.daycare_code}`);
    });

    // Get all users with their daycare info
    console.log('\n=== USERS WITH DAYCARE ASSIGNMENTS ===');
    const users = await client.query(`
      SELECT u.id, u.username, u.full_name, u.role, u.daycare_id, d.name as daycare_name, d.daycare_code
      FROM app_users u
      LEFT JOIN daycares d ON u.daycare_id = d.id
      ORDER BY d.name, u.username
    `);

    users.rows.forEach(u => {
      console.log(`User: ${u.full_name} (${u.username})`);
      console.log(`  Role: ${u.role}`);
      console.log(`  Daycare ID: ${u.daycare_id || 'NULL'}`);
      console.log(`  Daycare: ${u.daycare_name || 'NONE'} (${u.daycare_code || 'N/A'})`);
      console.log('');
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkUsers();
