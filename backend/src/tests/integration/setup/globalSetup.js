const { startPythonUtilsContainer } = require('../utils/python/testContainer');
const { startMongoTestContainer } = require('../utils/database/testContainer');
const { startRedisTestContainer } = require('../utils/redis/testContainer');
const { createTestAdminUser } = require('../utils/database/testAccounts');

async function globalSetup() {
  console.log('\nStarting global test container...');

  // Set test envrionment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-integration-tests';

  try {
    // Start container and get connection URI
    const containerInfo = await startMongoTestContainer('testdb');

    // Set the test MongoDB URI for the entire test process
    process.env.MONGODB_URI = containerInfo.uri;
    console.log('Test MongoDB URI set to:', containerInfo.uri);

    // Start Redis container
    console.log('Setting up Redis container...');
    const redisContainerInfo = await startRedisTestContainer();
    const redisBridgeIp = redisContainerInfo.container.getIpAddress('bridge');

    if (!redisBridgeIp) {
      throw new Error('Could not resolve Redis bridge IP for python_utils container');
    }

    process.env.REDIS_HOST = redisContainerInfo.host;
    process.env.REDIS_PORT = String(redisContainerInfo.port);
    process.env.REDIS_URL = `redis://${redisBridgeIp}:6379`;
    process.env.REDIS_CACHE_URL = redisContainerInfo.cacheUrl;
    process.env.REDIS_JOB_URL = redisContainerInfo.jobUrl;
    console.log('Test Redis URL for python_utils set to:', process.env.REDIS_URL);
    console.log('Test Redis cache URL set to:', redisContainerInfo.cacheUrl);
    console.log('Test Redis job URL set to:', redisContainerInfo.jobUrl);

    // Wait a bit to ensure connection is stable
    await new Promise((resolve) => globalThis.setTimeout(resolve, 2000));

    // Create test admin user
    await createTestAdminUser();
    console.log('Test admin user created');

    // Start python utils container
    console.log('Setting up Python utils container...');
    const pythonContainerInfo = await startPythonUtilsContainer();

    // Set the test Python utils URL for the entire test process
    process.env.PYTHON_UTILS_URL = pythonContainerInfo.url;
    console.log('Test Python utils URL set to:', pythonContainerInfo.url);

    console.log('Global test container ready');
  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  }
}

module.exports = globalSetup;
