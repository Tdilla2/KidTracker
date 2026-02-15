/**
 * Local development server that wraps the Lambda handler.
 * Simulates API Gateway so the frontend can test against real DB + encryption.
 *
 * Usage: node lambda/local-server.js
 * Listens on http://localhost:3001/api/...
 */

const http = require('http');
const { handler } = require('./index');

const PORT = process.env.PORT || 3001;

const server = http.createServer(async (req, res) => {
  // Collect request body
  let bodyChunks = [];
  req.on('data', chunk => bodyChunks.push(chunk));
  req.on('end', async () => {
    const rawBody = Buffer.concat(bodyChunks).toString();

    // Build a fake API Gateway v2 event
    const event = {
      rawPath: req.url,
      requestContext: { http: { method: req.method } },
      body: rawBody || null,
      headers: req.headers
    };

    try {
      const result = await handler(event);

      // Write CORS and response headers
      for (const [key, value] of Object.entries(result.headers || {})) {
        res.setHeader(key, value);
      }
      res.writeHead(result.statusCode);
      res.end(result.body || '');
    } catch (err) {
      console.error('Handler error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Local API server running at http://localhost:${PORT}/api/...`);
});
