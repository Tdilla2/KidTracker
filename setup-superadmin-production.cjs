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

async function setupSuperAdmin() {
  const client = new Client(config);

  try {
    console.log('Connecting to PRODUCTION database...');
    await client.connect();
    console.log('Connected!\n');

    // Check app_users table schema
    console.log('Checking app_users table schema...');
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'app_users'
      ORDER BY ordinal_position
    `);
    console.log('app_users columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    // Check for existing role constraint
    console.log('\nChecking role constraints...');
    const constraints = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'app_users'::regclass
      AND contype = 'c'
    `);
    constraints.rows.forEach(c => {
      console.log(`  - ${c.conname}: ${c.definition}`);
    });

    // Add daycare_id column to app_users if not exists
    console.log('\nAdding daycare_id to app_users...');
    const daycareColExists = await client.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'app_users' AND column_name = 'daycare_id'
    `);
    if (daycareColExists.rows.length === 0) {
      await client.query(`ALTER TABLE app_users ADD COLUMN daycare_id UUID REFERENCES daycares(id)`);
      console.log('  ✓ daycare_id column added to app_users');
    } else {
      console.log('  - daycare_id column already exists');
    }

    // Try to update role constraint to include super_admin
    console.log('\nUpdating role constraint...');
    try {
      // Find the existing constraint name
      const roleConstraint = await client.query(`
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'app_users'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%role%'
      `);

      if (roleConstraint.rows.length > 0) {
        const constraintName = roleConstraint.rows[0].conname;
        console.log(`  - Found role constraint: ${constraintName}`);
        await client.query(`ALTER TABLE app_users DROP CONSTRAINT IF EXISTS ${constraintName}`);
        console.log('  ✓ Old constraint dropped');
      }

      // Add new constraint with super_admin
      await client.query(`
        ALTER TABLE app_users ADD CONSTRAINT app_users_role_check
        CHECK (role IN ('admin', 'staff', 'parent', 'super_admin'))
      `);
      console.log('  ✓ New constraint added with super_admin');
    } catch (err) {
      console.log(`  Note: ${err.message}`);
    }

    // Show existing users
    console.log('\nExisting app_users:');
    const users = await client.query('SELECT * FROM app_users');
    users.rows.forEach(u => {
      console.log(`  - ${u.full_name || u.email} (${u.email}) - Role: ${u.role}`);
    });

    // Check if Thomas exists
    console.log('\nLooking for thomas.dillahunt@gdidigitalsolutions.com...');
    const thomas = await client.query(`
      SELECT * FROM app_users WHERE email = 'thomas.dillahunt@gdidigitalsolutions.com'
    `);

    if (thomas.rows.length > 0) {
      console.log('  Found user, updating to super_admin...');
      await client.query(`
        UPDATE app_users
        SET role = 'super_admin', daycare_id = NULL
        WHERE email = 'thomas.dillahunt@gdidigitalsolutions.com'
      `);
      console.log('  ✓ Updated to super_admin');
    } else {
      // Create super admin user
      console.log('  User not found, creating super admin...');
      await client.query(`
        INSERT INTO app_users (email, full_name, role, status, daycare_id)
        VALUES ('thomas.dillahunt@gdidigitalsolutions.com', 'Thomas Dillahunt', 'super_admin', 'active', NULL)
      `);
      console.log('  ✓ Super admin user created');
    }

    // Show final state
    console.log('\n=== Final State ===\n');
    console.log('App Users:');
    const finalUsers = await client.query('SELECT id, email, full_name, role, daycare_id FROM app_users ORDER BY role, full_name');
    finalUsers.rows.forEach(u => {
      console.log(`  - ${u.full_name || u.email} - Role: ${u.role}, Daycare: ${u.daycare_id || 'ALL (Super Admin)'}`);
    });

    console.log('\nDaycares:');
    const daycares = await client.query('SELECT * FROM daycares');
    daycares.rows.forEach(dc => {
      console.log(`  - ${dc.name} (Code: ${dc.daycare_code})`);
    });

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await client.end();
    console.log('\nDone.');
  }
}

setupSuperAdmin();
