'use client';

import { useActionState } from 'react';
import { Input } from '@/components/ui/input';
import { registerCustomer, type RegisterCustomerState } from '@/app/actions/customer';

interface RegisterFormProps {
  locale: string;
  labels: {
    email: string;
    name: string;
    phone: string;
    submit: string;
    emailPlaceholder: string;
    namePlaceholder: string;
    phonePlaceholder: string;
    formError: string;
  };
}

/**
 * Client-side registration form with verification flow.
 * Uses React 19 useActionState for form handling with server action.
 */
export function RegisterForm({ locale, labels }: RegisterFormProps) {
  const [state, formAction, isPending] = useActionState<RegisterCustomerState, FormData>(
    registerCustomer,
    null
  );

  // Removed verification flow - not implemented in backend yet

  return (
    <div
      className="w-full max-w-md bg-white border-2 border-black rounded-3xl p-6"
      data-testid="register-form"
    >
      <h2 className="text-2xl font-black mb-6 uppercase tracking-tight text-black text-center">Register</h2>
      <form action={formAction} className="flex flex-col gap-6">
        {/* Hidden locale field */}
        <input type="hidden" name="locale" value={locale} />

        {/* Form-level error */}
        {state?.error?._form && (
          <div className="rounded-lg bg-error-50 p-3 text-sm text-error-700" role="alert">
            {state.error._form.join(', ')}
          </div>
        )}

        <div className="space-y-4">
          {/* Name field */}
          <Input
            name="name"
            type="text"
            label={labels.name}
            placeholder={labels.namePlaceholder}
            variant="iso"
            required
            autoComplete="name"
            error={state?.error?.name?.join(', ')}
          />

          {/* Email field */}
          <Input
            name="email"
            type="email"
            label={labels.email}
            placeholder={labels.emailPlaceholder}
            variant="iso"
            required
            autoComplete="email"
            error={state?.error?.email?.join(', ')}
          />

          {/* Phone field */}
          <Input
            name="phone"
            type="tel"
            label={labels.phone}
            placeholder={labels.phonePlaceholder}
            variant="iso"
            autoComplete="tel"
            error={state?.error?.phone?.join(', ')}
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-black text-white hover:bg-gray-800 transition-colors rounded-xl h-12 font-black uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'SUBMITTING...' : 'SUBMIT'}
        </button>
      </form>
    </div>
  );
}
