module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/Back-End/tests', '<rootDir>/Back-End/controllers'],
    testMatch: ['**/*.test.ts'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    collectCoverageFrom: [
      'Back-End/controllers/**/*.ts',
      '!Back-End/controllers/**/*.test.ts',
      '!Back-End/controllers/**/*.d.ts',
      '!**/node_modules/**',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    testPathIgnorePatterns: ['/node_modules/'],
    transform: {
      '^.+\\.ts$': 'ts-jest',
    },
  };
  