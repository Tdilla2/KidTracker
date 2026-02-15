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

async function fixRoleConstraint() {
  const client = new Client(config);

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!\n');

    // Check the current constraint
    console.log('Checking current role constraint...');
    const constraints = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'users'::regclass
      AND contype = 'c'
    `);

    constraints.rows.forEach(c => {
      console.log(`  - ${c.conname}: ${c.definition}`);
    });

    // Drop the old constraint and add new one with super_admin
    console.log('\nUpdating role constraint to include super_admin...');

    await client.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check
    `);
    console.log('  ✓ Old constraint dropped');

    await client.query(`
      ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('admin', 'staff', 'parent', 'super_admin'))
    `);
    console.log('  ✓ New constraint added with super_admin');

    // Now create super admin
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

    // Update default daycare to have a better code
    console.log('\nUpdating default daycare...');
    await client.query(`
      UPDATE daycares
      SET name = 'GDI Demo Daycare', daycare_code = 'GDI001'
      WHERE id = '00000000-0000-0000-0000-000000000001'
    `);

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

fixRoleConstraint();
