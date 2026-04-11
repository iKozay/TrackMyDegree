const { GenericContainer, Wait } = require('testcontainers');

let redisContainer = null;

async function startRedisTestContainer() {
  console.log('Starting Redis container...');

  redisContainer = await new GenericContainer('redis:8.2')
    .withExposedPorts(6379)
    .withHealthCheck({
      test: ['CMD', 'redis-cli', 'ping'],
    })
    .withWaitStrategy(Wait.forHealthCheck())
    .withStartupTimeout(120000)
    .start();

  const host = redisContainer.getHost();
  const port = redisContainer.getMappedPort(6379);

  const cacheUrl = `redis://${host}:${port}/0`;
  const jobUrl = `redis://${host}:${port}/1`;

  console.log(`Redis container started at ${host}:${port}`);

  return {
    container: redisContainer,
    host,
    port,
    cacheUrl,
    jobUrl,
  };
}

async function stopRedisTestContainer() {
  if (!redisContainer) return;

  try {
    await redisContainer.stop({ timeout: 30000 });
  } catch (error) {
    console.warn('Failed to stop Redis container:', error);
  } finally {
    redisContainer = null;
  }
}

module.exports = {
  startRedisTestContainer,
  stopRedisTestContainer,
};
