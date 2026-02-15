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

async function checkTables() {
  const client = new Client(config);

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✓ Connected!\n');

    // List all tables
    console.log('All tables in database:');
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    tables.rows.forEach(t => {
      console.log(`  - ${t.table_name}`);
    });
    console.log('');

    // Check for users-related tables
    const userTables = tables.rows.filter(t => t.table_name.includes('user'));
    if (userTables.length > 0) {
      console.log('User-related tables:');
      for (const table of userTables) {
        console.log(`\n${table.table_name}:`);
        const columns = await client.query(`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = '${table.table_name}'
          ORDER BY ordinal_position
        `);
        columns.rows.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type}`);
        });

        // Show sample data
        const sample = await client.query(`SELECT * FROM ${table.table_name} LIMIT 3`);
        if (sample.rows.length > 0) {
          console.log(`\nSample data (${sample.rows.length} rows):`);
          sample.rows.forEach((row, i) => {
            console.log(`  Row ${i + 1}:`, JSON.stringify(row, null, 2));
          });
        }
      }
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
    console.log('\nDone.');
  }
}

checkTables();
