const { startMongoTestContainer } = require('../utils/testContainer');
// setup global setup for starting the test container - triggered by Jest before any tests run
module.exports = async () => {
  console.log('Starting global test container...');
  await startMongoTestContainer('testdb');
  console.log('Global test container ready');
};