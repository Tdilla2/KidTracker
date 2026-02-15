const { Client } = require('pg');

const config = {
  host: 'kidtracker-db.cqsakzqfyzty.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'kidtracker',
  user: 'kidtracker_admin',
  password: 'KidTracker2024!',
  ssl: { rejectUnauthorized: false }
};

async function testQuery() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected\n');

    // Test the exact query the login uses
    const code = '4ZPWSY';
    console.log(`Testing query for code: "${code}"`);
    console.log(`Uppercase: "${code.trim().toUpperCase()}"`);

    const result = await client.query(`
      SELECT * FROM daycares
      WHERE daycare_code = $1
      AND status = 'active'
    `, [code.trim().toUpperCase()]);

    console.log('\nQuery result:');
    if (result.rows.length === 0) {
      console.log('  NO ROWS FOUND!');
    } else {
      result.rows.forEach(row => {
        console.log(`  ID: ${row.id}`);
        console.log(`  Name: ${row.name}`);
        console.log(`  Code: "${row.daycare_code}"`);
        console.log(`  Status: ${row.status}`);
      });
    }

    // Also list ALL daycares
    console.log('\n=== ALL DAYCARES ===');
    const allDaycares = await client.query('SELECT id, name, daycare_code, status FROM daycares');
    allDaycares.rows.forEach(row => {
      console.log(`  "${row.daycare_code}" -> ${row.name} (${row.status})`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

testQuery();
