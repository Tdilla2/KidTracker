const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { Client } = require('pg');

async function run() {
  const sm = new SecretsManagerClient({ region: 'us-east-1' });
  const r = await sm.send(new GetSecretValueCommand({ SecretId: 'kidtracker/db-credentials' }));
  const creds = JSON.parse(r.SecretString);

  const db = new Client({
    host: creds.host, port: creds.port || 5432,
    database: creds.database, user: creds.username, password: creds.password,
    ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000,
  });
  await db.connect();

  // Who owns existing tables?
  const tables = await db.query(`
    SELECT tablename, tableowner
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  console.log('Tables and owners:');
  tables.rows.forEach(r => console.log(' ', r.tablename, '->', r.tableowner));

  // What is the current user?
  const me = await db.query(`SELECT current_user, session_user`);
  console.log('\nCurrent user:', me.rows[0].current_user);

  // What privileges does the current user have on the public schema?
  const schemaPerms = await db.query(`
    SELECT has_schema_privilege(current_user, 'public', 'CREATE') AS can_create,
           has_schema_privilege(current_user, 'public', 'USAGE')  AS can_use
  `);
  console.log('Schema public CREATE privilege:', schemaPerms.rows[0].can_create);
  console.log('Schema public USAGE privilege:', schemaPerms.rows[0].can_use);

  // Is user superuser or has createdb?
  const userInfo = await db.query(`
    SELECT usecreatedb, usesuper FROM pg_user WHERE usename = current_user
  `);
  console.log('\nUser info:', userInfo.rows[0]);

  await db.end();
}

run().catch(e => console.error('Error:', e.message));
