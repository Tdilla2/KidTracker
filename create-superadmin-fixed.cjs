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

async function createSuperAdmin() {
  const client = new Client(config);

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!\n');

    // Check if super_admin role already exists
    const existing = await client.query(`
      SELECT * FROM users WHERE role = 'super_admin'
    `);

    if (existing.rows.length > 0) {
      console.log('Super admin user already exists:');
      existing.rows.forEach(u => {
        console.log(`  - Email: ${u.email}, Name: ${u.full_name}`);
      });
    } else {
      // Create a super admin user using the existing schema
      // Note: daycare_id is NULL for super admin
      const result = await client.query(`
        INSERT INTO users (email, full_name, role, status, daycare_id)
        VALUES ('superadmin@kidtracker.com', 'Super Administrator', 'super_admin', 'active', NULL)
        RETURNING *
      `);
      console.log('✓ Super admin user created:');
      console.log(`  Email: ${result.rows[0].email}`);
      console.log(`  Name: ${result.rows[0].full_name}`);
      console.log(`  Role: super_admin`);
      console.log(`  Daycare ID: NULL (can manage all daycares)`);
    }

    // Update your admin user to be super_admin for testing
    console.log('\nUpdating thomas.dillahunt@gdidigitalsolutions.com to super_admin...');
    await client.query(`
      UPDATE users
      SET role = 'super_admin', daycare_id = NULL
      WHERE email = 'thomas.dillahunt@gdidigitalsolutions.com'
    `);
    console.log('✓ User updated to super_admin');

    // Show all users now
    console.log('\nAll users after update:');
    const users = await client.query('SELECT id, email, full_name, role, status, daycare_id FROM users ORDER BY role, full_name');
    users.rows.forEach(u => {
      console.log(`  - ${u.full_name} (${u.email}) - Role: ${u.role}, Daycare: ${u.daycare_id || 'ALL'}`);
    });

    // Show daycares
    console.log('\nDaycares:');
    const daycares = await client.query('SELECT * FROM daycares');
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

createSuperAdmin();
