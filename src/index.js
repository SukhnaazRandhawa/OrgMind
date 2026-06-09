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