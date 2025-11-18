module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/integration/**/*.test.js'],
  globalSetup: '<rootDir>/tests/integration/setup/globalSetup.js', // global setup for creating test container - so all tests use the same container to reduce overhead
  globalTeardown: '<rootDir>/tests/integration/setup/globalTeardown.js', // global teardown for stopping test container
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage/integration',
  verbose: true,
  testTimeout: 60000, // increased timeout since integration tests may take longer
  forceExit: true,
  detectOpenHandles: true
};
