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

async function checkDatabase() {
  const client = new Client(config);

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!\n');

    // List all tables
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('Tables in database:');
    if (tables.rows.length === 0) {
      console.log('  (no tables found)');
    } else {
      tables.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    }

    // Now let's create the daycares table directly
    console.log('\nCreating daycares table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS daycares (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        daycare_code VARCHAR(10) UNIQUE NOT NULL,
        address VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(50),
        zip_code VARCHAR(20),
        phone VARCHAR(20),
        email VARCHAR(255),
        status VARCHAR(20) DEFAULT 'active',
        owner_user_id UUID,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Daycares table created');

    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_daycares_code ON daycares(daycare_code)
    `);
    console.log('✓ Index created');

    // Insert default daycare
    await client.query(`
      INSERT INTO daycares (id, name, daycare_code, status)
      VALUES ('00000000-0000-0000-0000-000000000001', 'Default Daycare', 'DEFAULT', 'active')
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('✓ Default daycare inserted');

    // Verify
    const daycares = await client.query('SELECT * FROM daycares');
    console.log('\nDaycares in database:');
    daycares.rows.forEach(dc => {
      console.log(`  - ${dc.name} (Code: ${dc.daycare_code})`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
    console.log('\nDone.');
  }
}

checkDatabase();
