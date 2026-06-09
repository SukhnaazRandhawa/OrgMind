const express = require('express');
const { driver, redis } = require('../config/db');

const app = express();
app.use(express.json());

// Test route — checks Redis then Neo4j
app.get('/health', async (req, res) => {
  const results = {};

  // Check Redis
  try {
    await redis.ping();
    results.redis = ' connected';
  } catch (err) {
    results.redis = ' failed';
  }

  // Check Neo4j
  try {
    const session = driver.session();
    await session.run('RETURN 1');
    await session.close();
    results.neo4j = ' connected';
  } catch (err) {
    results.neo4j = ' failed';
  }

  res.json(results);
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(` OrgMind server running on port ${PORT}`);
});

const http = require('http');

// Ingest route — receives text and sends to Python microservice
app.post('/ingest', async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'No text provided' });
  }

  try {
    // Check Redis cache first
    const cached = await redis.get(`ingest:${text.slice(0, 50)}`);
    if (cached) {
      return res.json({ source: 'cache', result: JSON.parse(cached) });
    }

    // Forward to Python microservice
    const response = await fetch('http://localhost:5001/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    const result = await response.json();

    // Cache the result
    await redis.set(`ingest:${text.slice(0, 50)}`, JSON.stringify(result), 'EX', 3600);

    res.json({ source: 'live', result });

  } catch (err) {
    res.status(500).json({ error: 'Microservice unreachable', details: err.message });
  }
});