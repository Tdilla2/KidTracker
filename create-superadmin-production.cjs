const { Client } = require('pg');

// PRODUCTION database configuration
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

async function createSuperAdmin() {
  const client = new Client(config);

  try {
    console.log('Connecting to PRODUCTION database...');
    await client.connect();
    console.log('✓ Connected!\n');

    // Check if super admin user already exists
    console.log('Checking for existing super admin user...');
    const existing = await client.query(`
      SELECT * FROM app_users
      WHERE username = 'superadmin' OR role = 'super_admin'
    `);

    if (existing.rows.length > 0) {
      console.log('Super admin user found. Updating credentials...\n');
      const userId = existing.rows[0].id;

      await client.query(`
        UPDATE app_users
        SET username = 'superadmin',
            password = 'admin123',
            role = 'super_admin',
            status = 'active',
            daycare_id = NULL,
            email = 'superadmin@gdidigitalsolutions.com',
            full_name = 'GDI Super Administrator'
        WHERE id = $1
      `, [userId]);

      console.log('✓ Super admin user updated!');
    } else {
      console.log('No super admin found. Creating new super admin user...\n');

      await client.query(`
        INSERT INTO app_users (
          username,
          password,
          email,
          full_name,
          role,
          status,
          daycare_id,
          child_ids,
          parent_code
        ) VALUES (
          'superadmin',
          'admin123',
          'superadmin@gdidigitalsolutions.com',
          'GDI Super Administrator',
          'super_admin',
          'active',
          NULL,
          '[]'::jsonb,
          NULL
        )
      `);

      console.log('✓ Super admin user created!');
    }

    // Show final result
    const superAdmin = await client.query(`
      SELECT * FROM app_users WHERE username = 'superadmin'
    `);

    if (superAdmin.rows.length > 0) {
      const user = superAdmin.rows[0];
      console.log('\n' + '═'.repeat(50));
      console.log('  SUPER ADMIN LOGIN CREDENTIALS');
      console.log('═'.repeat(50));
      console.log('\n  Username: ' + user.username);
      console.log('  Password: admin123');
      console.log('  Email:    ' + user.email);
      console.log('  Name:     ' + user.full_name);
      console.log('  Role:     ' + user.role);
      console.log('  Status:   ' + user.status);
      console.log('  Daycare:  ' + (user.daycare_id || 'ALL (Super Admin)'));
      console.log('\n  ✓ You can now login without a daycare code!');
      console.log('\n' + '═'.repeat(50));
    }

    // Show all users for reference
    console.log('\nAll users in app_users table:');
    const allUsers = await client.query(`
      SELECT username, full_name, role, status, daycare_id
      FROM app_users
      ORDER BY role, full_name
      LIMIT 10
    `);
    allUsers.rows.forEach(u => {
      const daycareInfo = u.daycare_id ? `Daycare: ${u.daycare_id.substring(0, 8)}...` : 'ALL';
      console.log(`  - ${u.username} (${u.role}) - ${daycareInfo}`);
    });

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
  } finally {
    await client.end();
    console.log('\n✓ Done!');
  }
}

createSuperAdmin();
