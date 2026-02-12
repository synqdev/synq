import { getTranslations } from 'next-intl/server';
import { RegisterForm } from './register-form';

interface RegisterPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Customer Registration Page
 *
 * Allows new customers to register with email, name, and phone.
 * Uses lazy auth: no password required, customer identified by email.
 * After successful registration, redirects to booking calendar.
 */
export default async function RegisterPage({ params }: RegisterPageProps) {
  const { locale } = await params;
  const t = await getTranslations('register');
  const tCommon = await getTranslations('common');

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-secondary-900">{t('title')}</h1>
          <p className="mt-2 text-secondary-600">{t('subtitle')}</p>
        </div>

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
