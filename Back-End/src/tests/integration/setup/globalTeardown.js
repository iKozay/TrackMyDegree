const { stopMongoTestContainer } = require('../utils/database/testContainer');
const { stopPythonUtilsContainer } = require('../utils/python/testContainer');

async function globalTeardown() {
  console.log('Stopping global test container...');

  try {
    // Close MongoDB/Mongoose connections
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('Mongoose disconnected');
    }

    // Stop Python utils container
    await stopPythonUtilsContainer();
    console.log('Python utils container stopped');

    // Mock server cleanup (no real server in tests)
    if (globalThis.__SERVER__) {
      globalThis.__SERVER__.close(() => {
        console.log('Mock server cleanup complete');
      });
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }

  await stopMongoTestContainer();
  console.log('Global test container stopped');

  // Force exit if needed
  globalThis.setTimeout(() => {
    process.exit(0);
  }, 2000);
}

module.exports = globalTeardown;
