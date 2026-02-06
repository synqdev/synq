import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

interface BookingPageProps {
  params: Promise<{ locale: string }>
}

/**
 * Booking Entry Point
 *
 * Redirects user to appropriate step in booking flow:
 * - No customer ID → Registration page
 * - Has customer ID → Service selection
 */
export default async function BookingPage({ params }: BookingPageProps) {
  const { locale } = await params
  const cookieStore = await cookies()
  const customerId = cookieStore.get('customerId')?.value

  if (!customerId) {
    // No customer ID - send to registration
    redirect(`/${locale}/register?redirect=${encodeURIComponent(`/${locale}/booking/service`)}`)
  }

  // Has customer - go to service selection
  redirect(`/${locale}/booking/service`)
}
