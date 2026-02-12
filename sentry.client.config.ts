/**
 * Sentry Client Configuration
 *
 * Initializes Sentry for client-side error tracking and performance monitoring.
 * Disabled if NEXT_PUBLIC_SENTRY_DSN is not set.
 */

import * as Sentry from '@sentry/nextjs'

// Only initialize Sentry if DSN is configured
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Performance Monitoring
    // Capture 100% of transactions in development, 10% in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session Replay
    // Capture 10% of sessions, 100% of sessions with errors
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Integrations
    integrations: [
      Sentry.replayIntegration({
        // Mask text content for privacy
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Environment
    environment: process.env.NODE_ENV,

    // Filter out known non-actionable errors
    beforeSend(event) {
      // Don't send events in development unless DSN is explicitly set
      if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
        return null
      }
      return event
    },
  })
}
