/**
 * Admin Authentication Utilities
 *
 * JWT-based session management for admin authentication.
 * Uses jose for lightweight JWT signing and verification.
 */

import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.ADMIN_SESSION_SECRET || 'dev-secret-change-in-production'
)

/**
 * Verify admin credentials against environment variables.
 *
 * @param username - Username to verify
 * @param password - Password to verify
 * @returns True if credentials match environment variables
 */
export function verifyAdminCredentials(username: string, password: string): boolean {
  return (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  )
}

/**
 * Create a new admin session JWT token.
 *
 * @returns JWT token string valid for 24 hours
 */
export async function createAdminSession(): Promise<string> {
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET)

  return token
}

/**
 * Verify an admin session JWT token.
 *
 * @param token - JWT token to verify
 * @returns True if token is valid and not expired
 */
export async function verifyAdminSession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, SECRET)
    return true
  } catch {
    return false
  }
}

/**
 * Get the current admin session from cookies.
 *
 * @returns True if valid admin session exists
 */
export async function getAdminSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('admin_session')
  if (!sessionCookie) return false
  return verifyAdminSession(sessionCookie.value)
}
