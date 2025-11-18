const { stopMongoTestContainer } = require('../utils/testContainer');
// setup global teardown for stopping the test container - triggered by Jest after all tests complete
async function globalTeardown() {
  console.log('Stopping global test container...');
  await stopMongoTestContainer();
  console.log('Global test container stopped');
}

module.exports = globalTeardown;