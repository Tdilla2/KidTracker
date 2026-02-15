const { Client } = require('pg');

// PRODUCTION database configuration (same as Lambda uses)
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

async function fixAuthSchema() {
  const client = new Client(config);

  try {
    console.log('Connecting to PRODUCTION database...');
    await client.connect();
    console.log('✓ Connected!\n');

    // Step 1: Add username column if it doesn't exist
    console.log('Step 1: Adding username column to users table...');
    try {
      await client.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS username VARCHAR(255)
      `);
      console.log('✓ Username column added');
    } catch (err) {
      console.log('  Note:', err.message);
    }

    // Step 2: Add password column if it doesn't exist
    console.log('\nStep 2: Adding password column to users table...');
    try {
      await client.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS password VARCHAR(255)
      `);
      console.log('✓ Password column added');
    } catch (err) {
      console.log('  Note:', err.message);
    }

    // Step 3: Add child_ids column if it doesn't exist (for parent users)
    console.log('\nStep 3: Adding child_ids column to users table...');
    try {
      await client.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS child_ids UUID[]
      `);
      console.log('✓ child_ids column added');
    } catch (err) {
      console.log('  Note:', err.message);
    }

    // Step 4: Add parent_code column if it doesn't exist
    console.log('\nStep 4: Adding parent_code column to users table...');
    try {
      await client.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS parent_code VARCHAR(10)
      `);
      console.log('✓ parent_code column added');
    } catch (err) {
      console.log('  Note:', err.message);
    }

    // Step 5: Update role constraint to include super_admin
    console.log('\nStep 5: Updating role constraint...');
    try {
      // First check if there's an existing constraint
      const constraintCheck = await client.query(`
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'users'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%role%'
      `);

      if (constraintCheck.rows.length > 0) {
        const constraintName = constraintCheck.rows[0].conname;
        console.log(`  Dropping old constraint: ${constraintName}`);
        await client.query(`ALTER TABLE users DROP CONSTRAINT ${constraintName}`);
      }

      // Add new constraint
      await client.query(`
        ALTER TABLE users
        ADD CONSTRAINT users_role_check
        CHECK (role IN ('admin', 'staff', 'parent', 'user', 'super_admin'))
      `);
      console.log('✓ Role constraint updated to include super_admin');
    } catch (err) {
      console.log('  Note:', err.message);
    }

    // Step 6: Check if super admin exists
    console.log('\nStep 6: Checking for super admin user...');
    const superAdminCheck = await client.query(`
      SELECT * FROM users
      WHERE username = 'superadmin' OR role = 'super_admin'
    `);

    if (superAdminCheck.rows.length > 0) {
      console.log('  Super admin user found. Updating credentials...');
      await client.query(`
        UPDATE users
        SET username = 'superadmin',
            password = 'admin123',
            role = 'super_admin',
            status = 'active',
            daycare_id = NULL
        WHERE id = $1
      `, [superAdminCheck.rows[0].id]);
      console.log('✓ Super admin credentials updated');
    } else {
      console.log('  Creating new super admin user...');
      await client.query(`
        INSERT INTO users (
          username,
          password,
          email,
          full_name,
          role,
          status,
          daycare_id,
          cognito_id
        ) VALUES (
          'superadmin',
          'admin123',
          'superadmin@gdidigitalsolutions.com',
          'GDI Super Administrator',
          'super_admin',
          'active',
          NULL,
          NULL
        )
      `);
      console.log('✓ Super admin user created');
    }

    // Step 7: Show final schema
    console.log('\nStep 7: Final schema verification...');
    const columns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    console.log('\nUsers table columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    // Step 8: Show super admin user
    console.log('\n' + '═'.repeat(50));
    console.log('  PRODUCTION SUPER ADMIN LOGIN CREDENTIALS');
    console.log('═'.repeat(50));
    const superAdmin = await client.query(`
      SELECT * FROM users WHERE username = 'superadmin'
    `);
    if (superAdmin.rows.length > 0) {
      const user = superAdmin.rows[0];
      console.log('\n  Username: superadmin');
      console.log('  Password: admin123');
      console.log('  Email:    ' + user.email);
      console.log('  Name:     ' + user.full_name);
      console.log('  Role:     ' + user.role);
      console.log('  Status:   ' + user.status);
      console.log('\n  ✓ You can now login without a daycare code!');
    }
    console.log('\n' + '═'.repeat(50));

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
  } finally {
    await client.end();
    console.log('\n✓ PRODUCTION database migration complete!');
  }
}

fixAuthSchema();
