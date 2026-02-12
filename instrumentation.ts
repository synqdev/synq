/**
 * Next.js Instrumentation
 *
 * Registers Sentry for different runtimes.
 * This file is automatically loaded by Next.js 15.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

/**
 * Called when an uncaught error occurs.
 * Captures the error in Sentry.
 */
export async function onRequestError(
  error: Error,
  request: Request,
  context: { routerKind: 'Pages Router' | 'App Router'; routePath: string; routeType: 'render' | 'route' | 'action' | 'middleware' }
) {
  // Only import Sentry if DSN is configured
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    const Sentry = await import('@sentry/nextjs')
    Sentry.captureException(error, {
      tags: {
        routerKind: context.routerKind,
        routeType: context.routeType,
        routePath: context.routePath,
      },
      extra: {
        url: request.url,
        method: request.method,
      },
    })
  }
}
