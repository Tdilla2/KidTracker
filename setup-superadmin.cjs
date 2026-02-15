const { Client } = require('pg');

// Database configuration - using staging database
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

async function setupSuperAdmin() {
  const client = new Client(config);

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✓ Connected!\n');

    // Check table structure first
    console.log('Checking app_users table structure...');
    const columns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'app_users'
      ORDER BY ordinal_position
    `);
    console.log('Available columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    console.log('');

    // Check if super admin user already exists
    console.log('Checking for existing super admin users...');
    const existing = await client.query(`
      SELECT * FROM app_users WHERE role = 'super_admin'
    `);

    if (existing.rows.length > 0) {
      console.log('Found existing super admin users:');
      existing.rows.forEach(u => {
        console.log(`  - Username: ${u.username || 'N/A'}`);
        console.log(`    Email: ${u.email}`);
        console.log(`    Name: ${u.full_name}`);
        console.log(`    Status: ${u.status}`);
        console.log('');
      });

      // Check if superadmin username exists
      const superadminUser = existing.rows.find(u => u.username === 'superadmin');
      if (superadminUser) {
        console.log('✓ Super admin user "superadmin" already exists!');
        console.log('  Username: superadmin');
        console.log('  Password: admin123');
        console.log('  Status:', superadminUser.status);
        console.log('');
      } else {
        console.log('Creating "superadmin" user...');
        await createSuperAdminUser(client);
      }
    } else {
      console.log('No super admin users found. Creating one...');
      await createSuperAdminUser(client);
    }

    // Show all users
    console.log('All users in database:');
    const allUsers = await client.query(`
      SELECT username, email, full_name, role, status, daycare_id
      FROM app_users
      ORDER BY role, full_name
    `);
    allUsers.rows.forEach(u => {
      console.log(`  - ${u.username || 'no-username'} (${u.full_name})`);
      console.log(`    Role: ${u.role}, Status: ${u.status}, Daycare: ${u.daycare_id || 'ALL'}`);
    });

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
  } finally {
    await client.end();
    console.log('\n✓ Done!');
  }
}

async function createSuperAdminUser(client) {
  try {
    const result = await client.query(`
      INSERT INTO app_users (
        username,
        password,
        email,
        full_name,
        role,
        status,
        daycare_id
      )
      VALUES (
        'superadmin',
        'admin123',
        'superadmin@gdidigitalsolutions.com',
        'GDI Super Administrator',
        'super_admin',
        'active',
        NULL
      )
      RETURNING *
    `);

    console.log('\n✓ Super admin user created successfully!');
    console.log('');
    console.log('  ┌─────────────────────────────────────┐');
    console.log('  │  SUPER ADMIN LOGIN CREDENTIALS      │');
    console.log('  ├─────────────────────────────────────┤');
    console.log('  │  Username: superadmin               │');
    console.log('  │  Password: admin123                 │');
    console.log('  │  Role:     super_admin              │');
    console.log('  │  Status:   active                   │');
    console.log('  └─────────────────────────────────────┘');
    console.log('');
    console.log('  You can now login without a daycare code!');
    console.log('');

    return result.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      // Duplicate key error
      console.log('\n  ℹ Username "superadmin" already exists');
      console.log('  Updating password to "admin123"...');

      await client.query(`
        UPDATE app_users
        SET password = 'admin123',
            role = 'super_admin',
            status = 'active',
            daycare_id = NULL
        WHERE username = 'superadmin'
      `);

      console.log('  ✓ Password updated!');
    } else {
      throw err;
    }
  }
}

setupSuperAdmin();
