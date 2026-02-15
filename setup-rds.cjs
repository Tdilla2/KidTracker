const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'kidtracker-db.cqsakzqfyzty.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'kidtracker',
  user: 'kidtracker_admin',
  password: 'KidTracker2024!',
  ssl: {
    rejectUnauthorized: false
  }
});

async function setupDatabase() {
  try {
    console.log('Connecting to RDS...');
    await client.connect();
    console.log('Connected successfully!');

    console.log('Reading schema file...');
    const schema = fs.readFileSync(path.join(__dirname, 'rds-schema.sql'), 'utf8');

    console.log('Applying schema...');
    await client.query(schema);
    console.log('Schema applied successfully!');

    // Verify tables
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('\nCreated tables:');
    result.rows.forEach(row => console.log('  - ' + row.table_name));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

setupDatabase();
