const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'kidtracker-db.cqsakzqfyzty.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'kidtracker',
  user: 'kidtracker_admin',
  password: 'KidTracker2024!',
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000
});

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event));

  // Get method - handle both API Gateway v1 and v2 formats
  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const path = event.rawPath || event.path || '';
  const body = event.body ? JSON.parse(event.body) : {};

  // Parse path: /prod/api/{table} or /prod/api/{table}/{id}
  const pathParts = path.split('/').filter(p => p);
  const apiIndex = pathParts.indexOf('api');
  const table = pathParts[apiIndex + 1]; // table name after 'api'
  const id = pathParts[apiIndex + 2]; // id after table (if present)

  console.log('Path:', path, 'Table:', table, 'ID:', id);

  // JSONB columns that need to be stringified
  const jsonbColumns = ['recurring_charges', 'bathroom_times', 'child_ids', 'operating_hours'];

  // Process body to stringify JSONB fields
  const processBody = (data) => {
    const processed = { ...data };
    for (const col of jsonbColumns) {
      if (col in processed && processed[col] !== null) {
        // If it's already an object/array, stringify it for PostgreSQL JSONB
        if (typeof processed[col] === 'object') {
          processed[col] = JSON.stringify(processed[col]);
        }
      }
    }
    return processed;
  };

  try {
    let result;

    switch (method) {
      case 'GET':
        if (id) {
          result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
          return { statusCode: 200, headers, body: JSON.stringify(result.rows[0] || null) };
        } else {
          const orderBy = table === 'children' ? 'ORDER BY first_name' :
                          table === 'attendance' ? 'ORDER BY date DESC' :
                          table === 'invoices' ? 'ORDER BY created_at DESC' : '';
          result = await pool.query(`SELECT * FROM ${table} ${orderBy}`);
          return { statusCode: 200, headers, body: JSON.stringify(result.rows) };
        }

      case 'POST':
        const processedInsert = processBody(body);
        const insertCols = Object.keys(processedInsert);
        const insertVals = Object.values(processedInsert);
        const insertPlaceholders = insertCols.map((_, i) => `$${i + 1}`).join(', ');
        result = await pool.query(
          `INSERT INTO ${table} (${insertCols.join(', ')}) VALUES (${insertPlaceholders}) RETURNING *`,
          insertVals
        );
        return { statusCode: 201, headers, body: JSON.stringify(result.rows[0]) };

      case 'PUT':
        const processedUpdate = processBody(body);
        const updateCols = Object.keys(processedUpdate);
        const updateVals = Object.values(processedUpdate);
        const updateSet = updateCols.map((col, i) => `${col} = $${i + 1}`).join(', ');
        result = await pool.query(
          `UPDATE ${table} SET ${updateSet} WHERE id = $${updateCols.length + 1} RETURNING *`,
          [...updateVals, id]
        );
        return { statusCode: 200, headers, body: JSON.stringify(result.rows[0]) };

      case 'DELETE':
        await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
        return { statusCode: 204, headers, body: '' };

      default:
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
