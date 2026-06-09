const express = require('express');
const { driver, redis } = require('../config/db');

const app = express();
app.use(express.json());

const cors = require('cors');
app.use(cors());

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

// Query route — natural language question → graph → LLM answer
app.post('/query', async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'No question provided' });
  }

  try {
    // Check Redis cache first
    const cacheKey = `query:${question.toLowerCase().trim()}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json({ source: 'cache', result: JSON.parse(cached) });
    }

    // Forward to Python microservice
    const response = await fetch('http://localhost:5001/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });

    const result = await response.json();

    // Cache for 1 hour
    await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);

    res.json({ source: 'live', result });

  } catch (err) {
    res.status(500).json({ error: 'Query failed', details: err.message });
  }
});

// Stats route — returns graph node and relationship counts
app.get('/stats', async (req, res) => {
  try {
    const session = driver.session();

    const nodeResult = await session.run('MATCH (n) RETURN count(n) as count');
    const relResult = await session.run('MATCH ()-[r]->() RETURN count(r) as count');
    const recentNodes = await session.run(
      'MATCH (n) RETURN labels(n)[0] as type, n.name as name, n.text as text LIMIT 50'
    );

    await session.close();

    res.json({
      nodes: nodeResult.records[0].get('count').toNumber(),
      relationships: relResult.records[0].get('count').toNumber(),
      recentNodes: recentNodes.records.map(r => ({
        type: r.get('type'),
        name: r.get('name'),
        text: r.get('text')
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});