// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>'],
  testMatch: ['**/*.test.js', '**/*.test.ts'],
  collectCoverageFrom: [
    'controllers/**/*.ts',
    'routes/**/*.ts',
    'middleware/**/*.ts',
    'Util/**/*.ts',
    'services/**/*.ts',
    'models/**/*.ts',
    'index.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/*.d.ts',
    '!**/tests/**',
    '!**/coverage/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['lcov', 'text', 'text-summary', 'html'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
        isolatedModules: false,
      },
    ],
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [],
  moduleNameMapper: {
    '^@controllers/(.*)$': '<rootDir>/controllers/$1',
    '^@routes/(.*)$': '<rootDir>/routes/$1',
    '^@Util/(.*)$': '<rootDir>/Util/$1',
    '^@middleware/(.*)$': '<rootDir>/middleware/$1',
  },
  setupFiles: ['<rootDir>/tests/setup.js'],
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  testPathIgnorePatterns: ['<rootDir>/dist/'],

};
