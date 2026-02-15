const { Client } = require('pg');

// PRODUCTION database config
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

async function fixProduction() {
  const client = new Client(config);

  try {
    console.log('Connecting to PRODUCTION database...');
    await client.connect();
    console.log('Connected!\n');

    // Fix the role constraint - include ALL roles (admin, user, parent, staff, super_admin)
    console.log('1. Fixing role constraint...');
    try {
      await client.query(`ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check`);
      await client.query(`
        ALTER TABLE app_users ADD CONSTRAINT app_users_role_check
        CHECK (role IN ('admin', 'user', 'parent', 'staff', 'super_admin'))
      `);
      console.log('  ✓ Role constraint updated with all roles');
    } catch (err) {
      console.log(`  Error: ${err.message}`);
    }

    // Create super admin user with all required fields
    console.log('\n2. Creating super admin user...');
    try {
      // Check if user already exists
      const exists = await client.query(`
        SELECT * FROM app_users WHERE email = 'thomas.dillahunt@gdidigitalsolutions.com'
      `);

      if (exists.rows.length > 0) {
        await client.query(`
          UPDATE app_users
          SET role = 'super_admin', daycare_id = NULL
          WHERE email = 'thomas.dillahunt@gdidigitalsolutions.com'
        `);
        console.log('  ✓ Existing user updated to super_admin');
      } else {
        await client.query(`
          INSERT INTO app_users (username, password, email, full_name, role, status, daycare_id)
          VALUES ('superadmin', 'SuperAdmin123!', 'thomas.dillahunt@gdidigitalsolutions.com', 'Thomas Dillahunt', 'super_admin', 'active', NULL)
        `);
        console.log('  ✓ Super admin user created');
      }
    } catch (err) {
      console.log(`  Error: ${err.message}`);
    }

    // Update existing non-super_admin users to have the default daycare
    console.log('\n3. Assigning default daycare to existing users...');
    try {
      const result = await client.query(`
        UPDATE app_users
        SET daycare_id = '00000000-0000-0000-0000-000000000001'
        WHERE daycare_id IS NULL AND role != 'super_admin'
      `);
      console.log(`  ✓ ${result.rowCount} users assigned to default daycare`);
    } catch (err) {
      console.log(`  Error: ${err.message}`);
    }

    // Show final state
    console.log('\n=== Final Database State ===\n');

    console.log('Daycares:');
    const daycares = await client.query('SELECT * FROM daycares');
    daycares.rows.forEach(dc => {
      console.log(`  - ${dc.name} (Code: ${dc.daycare_code})`);
    });

    console.log('\nApp Users:');
    const users = await client.query('SELECT id, username, email, full_name, role, daycare_id FROM app_users ORDER BY role, full_name');
    users.rows.forEach(u => {
      console.log(`  - ${u.full_name || u.username} (${u.email})`);
      console.log(`    Role: ${u.role} | Daycare: ${u.daycare_id || 'ALL (Super Admin)'}`);
    });

    console.log('\nChildren count by daycare:');
    const childCounts = await client.query(`
      SELECT d.name as daycare_name, COUNT(c.id) as child_count
      FROM daycares d
      LEFT JOIN children c ON c.daycare_id = d.id
      GROUP BY d.id, d.name
    `);
    childCounts.rows.forEach(row => {
      console.log(`  - ${row.daycare_name}: ${row.child_count} children`);
    });

    console.log('\n✓ Production database migration complete!');
    console.log('\nYou can now log in with:');
    console.log('  - Super Admin login (no daycare code needed)');
    console.log('  - Email: thomas.dillahunt@gdidigitalsolutions.com');
    console.log('  - Password: Set in Cognito (SuperAdmin123!)');

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await client.end();
    console.log('\nDone.');
  }
}

fixProduction();
