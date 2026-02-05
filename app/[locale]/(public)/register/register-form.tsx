'use client';

import { useActionState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
 * Client-side registration form with validation error display.
 * Uses React 19 useActionState for form handling with server action.
 */
export function RegisterForm({ locale, labels }: RegisterFormProps) {
  const [state, formAction, isPending] = useActionState<RegisterCustomerState, FormData>(
    registerCustomer,
    null
  );

  return (
    <Card className="p-6">
      <form action={formAction} className="space-y-4">
        {/* Hidden locale field */}
        <input type="hidden" name="locale" value={locale} />

        {/* Form-level error */}
        {state?.error?._form && (
          <div className="rounded-lg bg-error-50 p-3 text-sm text-error-700" role="alert">
            {state.error._form.join(', ')}
          </div>
        )}

        {/* Email field */}
        <Input
          name="email"
          type="email"
          label={labels.email}
          placeholder={labels.emailPlaceholder}
          required
          autoComplete="email"
          error={state?.error?.email?.join(', ')}
        />

        {/* Name field */}
        <Input
          name="name"
          type="text"
          label={labels.name}
          placeholder={labels.namePlaceholder}
          required
          autoComplete="name"
          error={state?.error?.name?.join(', ')}
        />

        {/* Phone field (optional) */}
        <Input
          name="phone"
          type="tel"
          label={labels.phone}
          placeholder={labels.phonePlaceholder}
          autoComplete="tel"
          error={state?.error?.phone?.join(', ')}
        />

        {/* Submit button */}
        <Button
          type="submit"
          className="w-full"
          loading={isPending}
          disabled={isPending}
        >
          {labels.submit}
        </Button>
      </form>
    </Card>
  );
}
