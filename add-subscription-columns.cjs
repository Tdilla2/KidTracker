const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    host: 'kidtracker-db.cqsakzqfyzty.us-east-1.rds.amazonaws.com',
    port: 5432,
    database: 'kidtracker',
    user: 'ktadmin',
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Add subscription columns to daycares table
    await client.query(`
      ALTER TABLE daycares
        ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20) DEFAULT 'none',
        ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
    `);
    console.log('Added subscription_plan, stripe_customer_id, stripe_subscription_id columns');

    // Set existing active daycares to enterprise plan for backward compatibility
    const result = await client.query(`
      UPDATE daycares
      SET subscription_plan = 'enterprise'
      WHERE subscription_status = 'active' AND (subscription_plan IS NULL OR subscription_plan = 'none');
    `);
    console.log(`Updated ${result.rowCount} active daycares to enterprise plan`);

    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

migrate();
