import createIntlMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { routing } from './src/i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

/**
 * Middleware for i18n routing and admin route protection.
 *
 * Note: Rate limiting is handled in individual API routes (not middleware)
 * because Next.js Edge Runtime middleware cannot use Node.js-specific packages
 * like @upstash/redis.
 *
 * - Admin routes (except login) require a valid session cookie
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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
  // - api routes (no locale prefix needed)
  // - _next (Next.js internals)
  // - _vercel (Vercel internals)
  // - static files (images, favicon, etc.)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
