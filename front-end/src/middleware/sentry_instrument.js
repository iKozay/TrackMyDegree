import * as Sentry from "@sentry/react";

// Initialize Sentry
Sentry.init({
	dsn: process.env.REACT_APP_SENTRY_DSN,
	integrations: [Sentry.browserTracingIntegration()],
	tracesSampleRate: 1.0, // Capsure 100% of transactions
});
