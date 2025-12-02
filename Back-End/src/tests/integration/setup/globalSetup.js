const { startPythonUtilsContainer } = require('../utils/python/testContainer');
const { startMongoTestContainer } = require('../utils/database/testContainer');
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

    // Wait a bit to ensure connection is stable
    await new Promise((resolve) => globalThis.setTimeout(resolve, 2000));

    // Create test admin user
    await createTestAdminUser();
    console.log('Test admin user created');

    // Start python utils container
    console.log('Setting up Python utils container...');
    await startPythonUtilsContainer();

    console.log('Global test container ready');
  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  }
}

module.exports = globalSetup;
