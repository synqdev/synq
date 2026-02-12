/**
 * Rate Limiting Utility
 *
 * Provides rate limiting for API endpoints using Upstash Redis.
 * Falls back to no rate limiting in development if Upstash is not configured.
 *
 * Limits:
 * - Booking endpoint: 10 requests per minute per IP (prevent abuse)
 * - General API: 100 requests per minute per IP
 *
 * Configuration:
 * - Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in environment
 * - Without these, rate limiting is disabled (development mode)
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Redis client for rate limiting.
 * Only initialized if Upstash environment variables are set.
 */
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

/**
 * Rate limiter for booking endpoint.
 * Stricter limit: 10 requests per minute per IP.
 */
export const bookingRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
      prefix: 'synq:booking',
    })
  : null

/**
 * Rate limiter for general API endpoints.
 * More permissive: 100 requests per minute per IP.
 */
export const apiRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
      prefix: 'synq:api',
    })
  : null

/**
 * Result from a rate limit check.
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean
  /** Maximum requests allowed in the window */
  limit: number
  /** Remaining requests in the current window */
  remaining: number
  /** Unix timestamp (ms) when the window resets */
  reset: number
}

/**
 * Check rate limit for booking endpoint.
 *
 * Returns success: true if under limit or rate limiting is disabled.
 * In development without Upstash, always returns success: true.
 *
 * @param ip - Client IP address (for rate limit key)
 * @returns Rate limit result with success status and limit info
 *
 * @example
 * ```typescript
 * const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? '127.0.0.1'
 * const result = await checkBookingRateLimit(ip)
 *
 * if (!result.success) {
 *   return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 * }
 * ```
 */
export async function checkBookingRateLimit(ip: string): Promise<RateLimitResult> {
  if (!bookingRateLimit) {
    // Development mode: no rate limiting
    return {
      success: true,
      limit: 10,
      remaining: 10,
      reset: Date.now() + 60000,
    }
  }

  const result = await bookingRateLimit.limit(ip)
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }
}

/**
 * Check rate limit for general API endpoints.
 *
 * @param ip - Client IP address (for rate limit key)
 * @returns Rate limit result with success status and limit info
 */
export async function checkApiRateLimit(ip: string): Promise<RateLimitResult> {
  if (!apiRateLimit) {
    // Development mode: no rate limiting
    return {
      success: true,
      limit: 100,
      remaining: 100,
      reset: Date.now() + 60000,
    }
  }

  const result = await apiRateLimit.limit(ip)
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }
}

/**
 * Check if rate limiting is enabled.
 * Useful for conditional logic in middleware or logging.
 */
export function isRateLimitingEnabled(): boolean {
  return redis !== null
}
