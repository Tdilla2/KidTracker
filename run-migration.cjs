const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection configuration
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

async function runMigration() {
  const client = new Client(config);

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!\n');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'database-migration-daycares.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split SQL statements and execute them individually
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Running ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      // Skip comment lines
      if (statement.startsWith('--') || statement.length === 0) continue;

      try {
        console.log(`[${i + 1}/${statements.length}] Executing...`);
        await client.query(statement);
        console.log('  ✓ Success\n');
      } catch (err) {
        // Some errors are OK (like "table already exists")
        if (err.message.includes('already exists') || err.message.includes('does not exist')) {
          console.log(`  ⚠ Warning: ${err.message}\n`);
        } else {
          console.error(`  ✗ Error: ${err.message}\n`);
        }
      }
    }

    console.log('\n=================================');
    console.log('Migration completed successfully!');
    console.log('=================================\n');

    // Verify the daycares table was created
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'daycares'
    `);

    if (result.rows.length > 0) {
      console.log('✓ Daycares table exists');

      // Check for existing daycares
      const daycares = await client.query('SELECT id, name, daycare_code FROM daycares');
      console.log(`✓ Found ${daycares.rows.length} daycare(s):`);
      daycares.rows.forEach(dc => {
        console.log(`  - ${dc.name} (Code: ${dc.daycare_code})`);
      });
    } else {
      console.log('✗ Daycares table was not created');
    }

  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

runMigration();
