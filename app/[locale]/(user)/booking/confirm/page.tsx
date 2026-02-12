import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/db/client';
import { BUSINESS_TIMEZONE } from '@/lib/constants';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { getLocaleDateTag, getLocalizedName } from '@/lib/i18n/locale';

interface ConfirmPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string }>;
}

/**
 * Booking Confirmation Page
 *
 * Displays booking details after successful booking creation.
 * Fetches booking with all related data (worker, service, customer).
 * Shows localized content based on user's locale.
 */
export default async function ConfirmPage({
  params,
  searchParams,
}: ConfirmPageProps) {
  const { locale } = await params;
  const { id: bookingId } = await searchParams;

  const t = await getTranslations('confirmation');
  const tBooking = await getTranslations('booking');
  const tCommon = await getTranslations('common');

  // Handle missing booking ID
  if (!bookingId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center" data-testid="confirm-not-found">
        <Card className="max-w-md text-center">
          <CardBody>
            <h1 className="text-xl font-bold text-error-600">{t('notFound')}</h1>
            <p className="mt-2 text-secondary-600">{t('notFoundMessage')}</p>
            <div className="mt-6">
              <Link href="/booking">
                <Button variant="primary">{t('bookAnother')}</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Fetch booking with related data
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      worker: true,
      service: true,
      customer: true,
      resource: true,
    },
  });

  // Handle booking not found
  if (!booking) {
    return (
      <div className="flex min-h-[400px] items-center justify-center" data-testid="confirm-not-found">
        <Card className="max-w-md text-center">
          <CardBody>
            <h1 className="text-xl font-bold text-error-600">{t('notFound')}</h1>
            <p className="mt-2 text-secondary-600">{t('notFoundMessage')}</p>
            <div className="mt-6">
              <Link href="/booking">
                <Button variant="primary">{t('bookAnother')}</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Format date and time with locale
  // Format date and time with locale
  const dateFormatter = new Intl.DateTimeFormat(getLocaleDateTag(locale), {
    dateStyle: 'full',
    timeZone: BUSINESS_TIMEZONE,
  });
  const timeFormatter = new Intl.DateTimeFormat(getLocaleDateTag(locale), {
    timeStyle: 'short',
    timeZone: BUSINESS_TIMEZONE,
  });

  const formattedDate = dateFormatter.format(booking.startsAt);
  const formattedTime = `${timeFormatter.format(booking.startsAt)} - ${timeFormatter.format(booking.endsAt)}`;

  // Get localized names
  const workerName = getLocalizedName(locale, booking.worker.name, booking.worker.nameEn);
  const serviceName = getLocalizedName(locale, booking.service.name, booking.service.nameEn);

  // Get status label
  const statusLabels: Record<string, string> = {
    CONFIRMED: tBooking('confirmed'),
    CANCELLED: tBooking('cancelled'),
    PENDING: tBooking('pending'),
    NOSHOW: tBooking('cancelled'),
  };
  const statusLabel = statusLabels[booking.status] || booking.status;

  // Status badge colors
  const statusColors: Record<string, string> = {
    CONFIRMED: 'bg-success-100 text-success-700',
    CANCELLED: 'bg-error-100 text-error-700',
    PENDING: 'bg-warning-100 text-warning-700',
    NOSHOW: 'bg-error-100 text-error-700',
  };
  const statusColor = statusColors[booking.status] || 'bg-secondary-100 text-secondary-700';

  return (
    <div className="mx-auto max-w-2xl py-8" data-testid="confirm-page">
      {/* Success header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-100">
          <svg
            className="h-8 w-8 text-success-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-secondary-900" data-testid="confirm-heading">{t('title')}</h1>
        <p className="mt-1 text-secondary-600">{t('subtitle')}</p>
      </div>

      {/* Booking details card */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-secondary-900">
            {t('bookingDetails')}
          </h2>
        </CardHeader>
        <CardBody className="divide-y divide-secondary-200">
          {/* Service */}
          <div className="flex justify-between py-3">
            <span className="text-secondary-600">{t('service')}</span>
            <span className="font-medium text-secondary-900" data-testid="confirm-service-name">{serviceName}</span>
          </div>

          {/* Worker */}
          <div className="flex justify-between py-3">
            <span className="text-secondary-600">{t('worker')}</span>
            <span className="font-medium text-secondary-900" data-testid="confirm-worker-name">{workerName}</span>
          </div>

          {/* Date & Time */}
          <div className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between">
            <span className="text-secondary-600">{t('dateTime')}</span>
            <div className="text-right">
              <div className="font-medium text-secondary-900" data-testid="confirm-date">{formattedDate}</div>
              <div className="text-secondary-600" data-testid="confirm-time">{formattedTime}</div>
            </div>
          </div>

          {/* Status */}
          <div className="flex justify-between py-3">
            <span className="text-secondary-600">{t('status')}</span>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusColor}`} data-testid="confirm-status">
              {statusLabel}
            </span>
          </div>
        </CardBody>
      </Card>

      {/* Action buttons */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/booking" data-testid="confirm-book-another">
          <Button variant="outline" className="w-full sm:w-auto">
            {t('bookAnother')}
          </Button>
        </Link>
        <Link href="/" data-testid="confirm-back-home">
          <Button variant="primary" className="w-full sm:w-auto">
            {t('backToHome')}
          </Button>
        </Link>
      </div>
    </div>
  );
}
