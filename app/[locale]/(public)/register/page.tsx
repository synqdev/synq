import { getTranslations } from 'next-intl/server';
import { RegisterForm } from './register-form';

interface RegisterPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ redirect?: string }>
}

/**
 * Customer Registration Page
 *
 * Allows new customers to register with email, name, and phone.
 * Uses lazy auth: no password required, customer identified by email.
 * After successful registration, redirects to booking flow or specified redirect URL.
 */
export default async function RegisterPage({ params, searchParams }: RegisterPageProps) {
  const { locale } = await params
  const { redirect: redirectUrl } = await searchParams
  const t = await getTranslations('register');
  const tCommon = await getTranslations('common');

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <RegisterForm
          locale={locale}
          labels={{
            email: t('email'),
            name: t('name'),
            phone: t('phone'),
            submit: tCommon('submit'),
            emailPlaceholder: t('emailPlaceholder'),
            namePlaceholder: t('namePlaceholder'),
            phonePlaceholder: t('phonePlaceholder'),
            formError: t('formError'),
          }}
        />
      </div>
    </div>
  );
}
