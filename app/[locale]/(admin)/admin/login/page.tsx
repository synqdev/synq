'use client'

/**
 * Admin Login Page
 *
 * Simple login form with username/password authentication.
 * Uses useActionState for form state management.
 */

import { useActionState } from 'react'
import { adminLogin, type AdminLoginFormState } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/card'

export default function AdminLoginPage() {
  const [state, formAction, isPending] = useActionState<
    AdminLoginFormState,
    FormData
  >(adminLogin, null)

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 className="text-xl font-semibold text-center">Admin Login</h1>
        </CardHeader>
        <form action={formAction}>
          <CardBody className="space-y-4">
            {state?.error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                {state.error}
              </div>
            )}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Username
              </label>
              <Input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                disabled={isPending}
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                disabled={isPending}
              />
            </div>
          </CardBody>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Logging in...' : 'Login'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
