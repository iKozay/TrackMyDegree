import * as Sentry from "@sentry/react";

// Sentry Backend INIT
Sentry.init({
	dsn: process.env.REACT_APP_SENTRY_DSN,
	integrations: [Sentry.browserTracingIntegration()],
	tracesSampleRate: 1.0,
});

export default Sentry;
