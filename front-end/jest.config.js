module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/src/test/__mocks__/styleMock.js',
    'bootstrap/dist/js/bootstrap.bundle.min.js': '<rootDir>/src/test/__mocks__/styleMock.js',
    '\\.png$': '<rootDir>/src/test/__mocks__/styleMock.js',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleDirectories: ['node_modules', 'src'],

  // Only collect coverage from page components (or even just UserPage.js)
  collectCoverageFrom: [
    'src/pages/**/*.js',     // or: 'src/pages/UserPage.js'
    '!src/pages/**/__tests__/**',
  ],

  // Explicitly ignore utils from coverage calculations
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/utils/',   // ignore all utils
  ],

  // (optional) show nicer reports and enforce a bar
  coverageReporters: ['text', 'lcov', 'html'],
};
