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
        console.log(`  - Username: ${u.username}, Name: ${u.full_name}`);
      });
    } else {
      // Create a super admin user (same credentials as tdilla for testing)
      const result = await client.query(`
        INSERT INTO users (username, password, full_name, email, role, status)
        VALUES ('superadmin', 'admin123', 'Super Administrator', 'superadmin@kidtracker.com', 'super_admin', 'active')
        RETURNING *
      `);
      console.log('✓ Super admin user created:');
      console.log(`  Username: ${result.rows[0].username}`);
      console.log(`  Password: admin123`);
      console.log(`  Role: super_admin`);
    }

    // Also update default daycare to have a better name and code
    await client.query(`
      UPDATE daycares
      SET name = 'GDI Demo Daycare', daycare_code = 'GDI001'
      WHERE id = '00000000-0000-0000-0000-000000000001'
    `);
    console.log('\n✓ Updated default daycare:');
    console.log('  Name: GDI Demo Daycare');
    console.log('  Code: GDI001');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
    console.log('\nDone.');
  }
}

createSuperAdmin();
