'use server'

/**
 * Admin Server Actions
 *
 * Server-side handlers for admin authentication operations.
 */

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyAdminCredentials, createAdminSession } from '@/lib/auth/admin'

const COOKIE_NAME = 'admin_session'
const MAX_AGE_SECONDS = 60 * 60 * 24 // 24 hours

/**
 * State returned from admin login form action.
 */
export type AdminLoginFormState = {
  error?: string
} | null

/**
 * Admin login action for form submission.
 *
 * @param prevState - Previous form state
 * @param formData - Form with username and password
 * @returns Error state if login fails, or redirects to dashboard on success
 */
export async function adminLogin(
  prevState: AdminLoginFormState,
  formData: FormData
): Promise<AdminLoginFormState> {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  if (!username || !password) {
    return { error: 'Username and password are required' }
  }

  if (!verifyAdminCredentials(username, password)) {
    return { error: 'Invalid credentials' }
  }

  const token = await createAdminSession()
  const cookieStore = await cookies()

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE_SECONDS,
    path: '/',
  })

  redirect('/ja/admin/dashboard')
}

/**
 * Admin logout action.
 * Clears the session cookie and redirects to login.
 */
export async function adminLogout(): Promise<never> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  redirect('/ja/admin/login')
}
