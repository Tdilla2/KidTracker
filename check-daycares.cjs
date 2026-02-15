const { Client } = require('pg');

const config = {
  host: 'kidtracker-db.cqsakzqfyzty.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'kidtracker',
  user: 'kidtracker_admin',
  password: 'KidTracker2024!',
  ssl: { rejectUnauthorized: false }
};

async function checkDaycares() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected to production database\n');

    // Check all daycares
    console.log('=== DAYCARES ===');
    const daycares = await client.query('SELECT * FROM daycares ORDER BY created_at');
    daycares.rows.forEach(dc => {
      console.log(`ID: ${dc.id}`);
      console.log(`  Name: ${dc.name}`);
      console.log(`  Code: ${dc.daycare_code}`);
      console.log(`  Status: ${dc.status}`);
      console.log('');
    });

    // Check company_info
    console.log('=== COMPANY INFO ===');
    const companyInfo = await client.query('SELECT * FROM company_info');
    if (companyInfo.rows.length === 0) {
      console.log('No company_info records found');
    } else {
      companyInfo.rows.forEach(ci => {
        console.log(`ID: ${ci.id}`);
        console.log(`  Name: ${ci.name}`);
        console.log(`  Daycare ID: ${ci.daycare_id}`);

        // Find matching daycare
        const matchingDaycare = daycares.rows.find(d => d.id === ci.daycare_id);
        if (matchingDaycare) {
          console.log(`  -> Belongs to: ${matchingDaycare.name} (${matchingDaycare.daycare_code})`);
        } else {
          console.log(`  -> No matching daycare found!`);
        }
        console.log('');
      });
    }

    // Check what daycare code maps to what
    console.log('=== DAYCARE CODE MAPPING ===');
    for (const dc of daycares.rows) {
      const ci = companyInfo.rows.find(c => c.daycare_id === dc.id);
      console.log(`Code: ${dc.daycare_code} -> Daycare: "${dc.name}"`);
      if (ci) {
        console.log(`  Company Info: "${ci.name}"`);
      } else {
        console.log(`  Company Info: (none - will show empty)`);
      }
      console.log('');
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkDaycares();
