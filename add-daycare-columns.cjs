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

const tables = [
  'users',
  'children',
  'attendance',
  'invoices',
  'classrooms',
  'meal_menus',
  'daily_activities',
  'activity_photos',
  'company_info'
];

async function addDaycareColumns() {
  const client = new Client(config);

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!\n');

    for (const table of tables) {
      try {
        // Check if column exists
        const colCheck = await client.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = $1 AND column_name = 'daycare_id'
        `, [table]);

        if (colCheck.rows.length === 0) {
          console.log(`Adding daycare_id to ${table}...`);
          await client.query(`ALTER TABLE ${table} ADD COLUMN daycare_id UUID REFERENCES daycares(id)`);
          console.log(`  ✓ Column added`);

          // Create index
          await client.query(`CREATE INDEX IF NOT EXISTS idx_${table}_daycare ON ${table}(daycare_id)`);
          console.log(`  ✓ Index created`);
        } else {
          console.log(`${table} already has daycare_id column`);
        }
      } catch (err) {
        console.log(`  ⚠ Error on ${table}: ${err.message}`);
      }
    }

    // Update existing data to point to default daycare
    console.log('\nMigrating existing data to default daycare...');
    const defaultDaycareId = '00000000-0000-0000-0000-000000000001';

    for (const table of tables) {
      try {
        // Skip users table for super_admin users
        if (table === 'users') {
          const result = await client.query(`
            UPDATE users
            SET daycare_id = $1
            WHERE daycare_id IS NULL AND (role != 'super_admin' OR role IS NULL)
          `, [defaultDaycareId]);
          console.log(`  Updated ${result.rowCount} rows in ${table}`);
        } else {
          const result = await client.query(`
            UPDATE ${table}
            SET daycare_id = $1
            WHERE daycare_id IS NULL
          `, [defaultDaycareId]);
          console.log(`  Updated ${result.rowCount} rows in ${table}`);
        }
      } catch (err) {
        console.log(`  ⚠ Error updating ${table}: ${err.message}`);
      }
    }

    console.log('\n✓ Migration complete!');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
    console.log('\nDone.');
  }
}

addDaycareColumns();
