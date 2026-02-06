/**
 * Customers API Route
 *
 * Registers a customer (lazy auth) and returns their profile.
 */

import { NextRequest, NextResponse } from 'next/server'
import { registerCustomerSchema } from '@/lib/validations/customer'
import { findOrCreateCustomer } from '@/lib/services/customer.service'
import { checkApiRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip')?.trim() ??
      '127.0.0.1'

    const rateLimit = await checkApiRateLimit(ip)
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = registerCustomerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid customer data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const customer = await findOrCreateCustomer(parsed.data)

    return NextResponse.json(
      {
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          locale: customer.locale,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Customer registration error:', error)
    return NextResponse.json(
      { error: 'Failed to register customer' },
      { status: 500 }
    )
  }
}
