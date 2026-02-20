'use server';

/**
 * Customer Server Actions
 *
 * Server-side form handlers for customer registration.
 * Creates customer record and stores ID in cookie for booking flow.
 */

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { registerCustomerSchema } from '@/lib/validations/customer';
import { findOrCreateCustomer } from '@/lib/services/customer.service';

/**
 * State returned from registerCustomer action for form error handling.
 */
export type RegisterCustomerState = {
  error?: {
    email?: string[];
    name?: string[];
    phone?: string[];
    locale?: string[];
    _form?: string[];
  };
} | null;

/**
 * Registers a customer and redirects to booking page.
 *
 * This action:
 * 1. Validates form data using Zod schema
 * 2. Creates or finds existing customer by email
 * 3. Stores customer ID in HTTP-only cookie
 * 4. Redirects to booking page
 *
 * @param prevState - Previous form state (for progressive enhancement)
 * @param formData - Form submission data
 * @returns Error state if validation fails, or redirects on success
 */
export async function registerCustomer(
  prevState: RegisterCustomerState,
  formData: FormData
): Promise<RegisterCustomerState> {
  // Extract form data
  const raw = {
    email: formData.get('email'),
    name: formData.get('name'),
    phone: formData.get('phone'),
    locale: formData.get('locale') || 'ja',
  };

  // Validate with Zod
  const parsed = registerCustomerSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      error: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    // Create or find existing customer
    const customer = await findOrCreateCustomer(parsed.data);

    // Store customer ID in HTTP-only cookie (7 days)
    const cookieStore = await cookies();
    cookieStore.set('customerId', customer.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
  } catch (error) {
    console.error('Failed to register customer:', error);
    return {
      error: {
        _form: ['Registration failed. Please try again.'],
      },
    };
  }

  // Redirect to booking page with locale
  const locale = parsed.data.locale;
  redirect(`/${locale}/booking`);
}

/**
 * Signs out the current customer by clearing the customerId cookie.
 *
 * @param locale - The locale to redirect to after signout
 */
export async function signoutCustomer(locale: string = 'en') {
  const cookieStore = await cookies();
  cookieStore.delete('customerId');
  const supportedLocales = new Set(['en', 'ja']);
  const safeLocale = supportedLocales.has(locale) ? locale : 'en';
  redirect(`/${safeLocale}`);
}
