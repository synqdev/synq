import { getTranslations } from 'next-intl/server';
import { BookingCalendar } from './booking-calendar';

interface BookingPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Booking Calendar Page
 *
 * Displays the timeline calendar with live availability.
 * Users can select a time slot and book an appointment.
 * Uses SWR for real-time availability polling (10 second intervals).
 */
export default async function BookingPage({ params }: BookingPageProps) {
  const { locale } = await params;
  const t = await getTranslations('booking');
  const tCommon = await getTranslations('common');

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-secondary-900">{t('title')}</h1>
      <p className="mb-6 text-secondary-600">{t('selectTime')}</p>

      <BookingCalendar
        locale={locale}
        labels={{
          book: t('confirm'),
          loading: tCommon('loading'),
          error: tCommon('error'),
          noSlots: t('noSlots'),
          selectSlot: t('selectTime'),
          selectedSlot: t('selectedSlot'),
        }}
      />
    </div>
  );
}
