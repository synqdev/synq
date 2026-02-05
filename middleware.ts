import createIntlMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { routing } from './src/i18n/routing'
import { checkBookingRateLimit, checkApiRateLimit } from '@/lib/rate-limit'

const intlMiddleware = createIntlMiddleware(routing)

/**
 * Middleware for i18n routing, admin route protection, and rate limiting.
 *
 * - Admin routes (except login) require a valid session cookie
 * - Booking endpoint has stricter rate limiting (10 req/min)
 * - General API endpoints have standard rate limiting (100 req/min)
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  // ==========================================================================
  // RATE LIMITING FOR API ROUTES
  // ==========================================================================

  // Rate limit booking POST requests (stricter: 10 req/min)
  if (pathname.startsWith('/api/booking') && method === 'POST') {
    const ip = request.ip ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1'
    const result = await checkBookingRateLimit(ip)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Too many booking requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.reset.toString(),
            'Retry-After': '60',
          },
        }
      )
    }
  }

  // Rate limit general API requests (standard: 100 req/min)
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/booking')) {
    const ip = request.ip ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1'
    const result = await checkApiRateLimit(ip)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.reset.toString(),
            'Retry-After': '60',
          },
        }
      )
    }
  }

  // ==========================================================================
  // ADMIN ROUTE PROTECTION
  // ==========================================================================

  // Check if admin route (after locale prefix, excluding login)
  // Matches: /ja/admin/dashboard, /en/admin/dashboard, etc.
  // Excludes: /ja/admin/login, /en/admin/login
  const isAdminRoute = pathname.match(/^\/[a-z]{2}\/admin\/(?!login)/)

  if (isAdminRoute) {
    const sessionCookie = request.cookies.get('admin_session')

    if (!sessionCookie) {
      // Extract locale from pathname (first segment after /)
      const locale = pathname.split('/')[1] || 'ja'
      return NextResponse.redirect(new URL(`/${locale}/admin/login`, request.url))
    }

    // Cookie exists - full JWT verification happens in layout/pages
    // Middleware only checks for cookie presence for performance
  }

  return intlMiddleware(request)
}

export const config = {
  // Match all pathnames except for:
  // - _next (Next.js internals)
  // - _vercel (Vercel internals)
  // - static files (images, favicon, etc.)
  // Note: api routes ARE included for rate limiting
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
}
