const neo4j = require('neo4j-driver');
const Redis = require('ioredis');

// Neo4j connection
const driver = neo4j.driver(
  'neo4j://localhost:7687',
  neo4j.auth.basic('neo4j', 'orgmind123')
);

// Redis connection
const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

redis.on('connect', () => console.log(' Redis connected'));
redis.on('error', (err) => console.error(' Redis error:', err));

module.exports = { driver, redis };