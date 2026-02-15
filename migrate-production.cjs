const { Client } = require('pg');

// PRODUCTION database config (from Lambda)
const config = {
  host: 'kidtracker-db.cqsakzqfyzty.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'kidtracker',
  user: 'kidtracker_admin',
  password: 'KidTracker2024!',
  ssl: {
    rejectUnauthorized: false
  }
};

async function migrateProduction() {
  const client = new Client(config);

  try {
    console.log('Connecting to PRODUCTION database...');
    console.log('Host:', config.host);
    await client.connect();
    console.log('Connected!\n');

    // 1. Create daycares table
    console.log('Step 1: Creating daycares table...');
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
        created_at TIMESTAMP DEFAULT NOW(),
        owner_user_id UUID
      )
    `);
    console.log('  ✓ daycares table created\n');

    // 2. Check existing tables
    console.log('Step 2: Checking existing tables...');
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('Tables found:');
    tables.rows.forEach(t => console.log(`  - ${t.table_name}`));

    // 3. Add daycare_id column to tables that need it
    console.log('\nStep 3: Adding daycare_id column to tables...');
    const tablesToUpdate = ['users', 'children', 'attendance', 'invoices', 'classrooms', 'meal_menus', 'daily_activities', 'activity_photos', 'company_info'];

    for (const tableName of tablesToUpdate) {
      try {
        // Check if table exists first
        const tableExists = await client.query(`
          SELECT 1 FROM information_schema.tables
          WHERE table_name = $1 AND table_schema = 'public'
        `, [tableName]);

        if (tableExists.rows.length === 0) {
          console.log(`  - ${tableName}: table doesn't exist, skipping`);
          continue;
        }

        // Check if column already exists
        const columnExists = await client.query(`
          SELECT 1 FROM information_schema.columns
          WHERE table_name = $1 AND column_name = 'daycare_id'
        `, [tableName]);

        if (columnExists.rows.length > 0) {
          console.log(`  - ${tableName}: daycare_id column already exists`);
        } else {
          await client.query(`ALTER TABLE ${tableName} ADD COLUMN daycare_id UUID REFERENCES daycares(id)`);
          console.log(`  ✓ ${tableName}: daycare_id column added`);
        }
      } catch (err) {
        console.log(`  ! ${tableName}: ${err.message}`);
      }
    }

    // 4. Update role constraint to include super_admin
    console.log('\nStep 4: Updating role constraint...');
    try {
      await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
      await client.query(`
        ALTER TABLE users ADD CONSTRAINT users_role_check
        CHECK (role IN ('admin', 'staff', 'parent', 'super_admin'))
      `);
      console.log('  ✓ Role constraint updated to include super_admin');
    } catch (err) {
      console.log(`  ! Role constraint: ${err.message}`);
    }

    // 5. Create default daycare
    console.log('\nStep 5: Creating default daycare...');
    const existingDaycare = await client.query(`SELECT * FROM daycares WHERE daycare_code = 'GDI001'`);

    let defaultDaycareId;
    if (existingDaycare.rows.length === 0) {
      const result = await client.query(`
        INSERT INTO daycares (id, name, daycare_code, status)
        VALUES ('00000000-0000-0000-0000-000000000001', 'GDI Demo Daycare', 'GDI001', 'active')
        RETURNING id
      `);
      defaultDaycareId = result.rows[0].id;
      console.log('  ✓ Default daycare created: GDI Demo Daycare (Code: GDI001)');
    } else {
      defaultDaycareId = existingDaycare.rows[0].id;
      console.log('  - Default daycare already exists');
    }

    // 6. Update existing records to use default daycare
    console.log('\nStep 6: Updating existing records with default daycare...');
    for (const tableName of tablesToUpdate) {
      try {
        const tableExists = await client.query(`
          SELECT 1 FROM information_schema.tables
          WHERE table_name = $1 AND table_schema = 'public'
        `, [tableName]);

        if (tableExists.rows.length === 0) continue;

        // Check if daycare_id column exists
        const columnExists = await client.query(`
          SELECT 1 FROM information_schema.columns
          WHERE table_name = $1 AND column_name = 'daycare_id'
        `, [tableName]);

        if (columnExists.rows.length > 0) {
          const result = await client.query(`
            UPDATE ${tableName}
            SET daycare_id = $1
            WHERE daycare_id IS NULL
          `, [defaultDaycareId]);
          console.log(`  ✓ ${tableName}: ${result.rowCount} records updated`);
        }
      } catch (err) {
        console.log(`  ! ${tableName}: ${err.message}`);
      }
    }

    // 7. Create/update super admin user
    console.log('\nStep 7: Setting up super admin...');
    try {
      // First check if user exists
      const userCheck = await client.query(`
        SELECT * FROM users WHERE email = 'thomas.dillahunt@gdidigitalsolutions.com'
      `);

      if (userCheck.rows.length > 0) {
        await client.query(`
          UPDATE users
          SET role = 'super_admin', daycare_id = NULL
          WHERE email = 'thomas.dillahunt@gdidigitalsolutions.com'
        `);
        console.log('  ✓ thomas.dillahunt@gdidigitalsolutions.com updated to super_admin');
      } else {
        console.log('  - User thomas.dillahunt@gdidigitalsolutions.com not found');
      }
    } catch (err) {
      console.log(`  ! Super admin setup: ${err.message}`);
    }

    // 8. Show final state
    console.log('\n=== Migration Complete ===\n');

    console.log('Daycares:');
    const daycares = await client.query('SELECT * FROM daycares');
    daycares.rows.forEach(dc => {
      console.log(`  - ${dc.name} (Code: ${dc.daycare_code})`);
    });

    console.log('\nUsers:');
    const users = await client.query('SELECT id, email, full_name, role, daycare_id FROM users ORDER BY role, full_name');
    users.rows.forEach(u => {
      console.log(`  - ${u.full_name || u.email} - Role: ${u.role}, Daycare: ${u.daycare_id || 'ALL (Super Admin)'}`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
    console.log('\nDone.');
  }
}

migrateProduction();
