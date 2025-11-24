async function getTestApp() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not set - globalSetup may have failed');
  }

  // Patch express .listen before loading the app
  const express = require('express');
  if (!express.__LISTEN_PATCHED__) {
    const originalListen = express.application.listen;
    express.application.listen = function patchedListen() {
      if (process.env.NODE_ENV === 'test') {
        const mockServer = {
          close: cb => cb && cb(),
          address: () => ({ port: 0 })
        };
        global.__SERVER__ = mockServer;
        return mockServer;
      }
      return originalListen.apply(this, arguments);
    };
    express.__LISTEN_PATCHED__ = true;
  }

  console.log('Loading app with MongoDB URI:', process.env.MONGODB_URI);
  const app = require('../../../../index.ts').default;
  return app;
}

module.exports = { getTestApp };
