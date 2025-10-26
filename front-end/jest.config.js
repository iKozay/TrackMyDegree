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
};
