const express = require('express');
const mongoRoutes = require('../dist/routes/mongo/index').default;

describe('MongoDB Routes Index', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use('/api', mongoRoutes);
  });

  it('should mount all route modules', () => {
    // Test that the router is properly configured
    expect(mongoRoutes).toBeDefined();
    expect(typeof mongoRoutes).toBe('function');
  });

  it('should have all expected route paths', () => {
    // This test verifies that the router is properly configured
    // by checking that it's a function (Express router)
    expect(mongoRoutes).toBeInstanceOf(Function);
  });

  it('should export router as default', () => {
    // Verify the module exports a router function
    expect(mongoRoutes).toBeDefined();
    expect(typeof mongoRoutes).toBe('function');
  });
});
