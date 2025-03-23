import * as Sentry from '@sentry/node';

// Sentry Backend INIT
Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
});

export default Sentry;
