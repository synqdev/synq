/**
 * Email Sending Utility
 *
 * Uses Resend API with React Email templates for transactional emails.
 * Errors are logged but don't block the calling operation (graceful degradation).
 */

import { Resend } from 'resend'
import BookingConfirmation, { getSubject } from '@/emails/booking-confirmation'

let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

export interface SendBookingConfirmationParams {
  to: string
  customerName: string
  serviceName: string
  workerName: string
  date: string
  time: string
  locale: 'ja' | 'en'
}

/**
 * Send a booking confirmation email
 *
 * @param params - Email parameters including recipient and booking details
 * @returns The email data on success, null on failure
 *
 * @example
 * await sendBookingConfirmation({
 *   to: 'customer@example.com',
 *   customerName: '山田太郎',
 *   serviceName: 'カット',
 *   workerName: '佐藤',
 *   date: '2024年6月15日',
 *   time: '10:00',
 *   locale: 'ja',
 * })
 */
export async function sendBookingConfirmation(
  params: SendBookingConfirmationParams
): Promise<{ id: string } | null> {
  const { to, locale, ...templateProps } = params

  // Skip if no API key (development without email)
  if (!process.env.RESEND_API_KEY) {
    console.log('[Email] Skipping email send - no RESEND_API_KEY configured')
    console.log('[Email] Would send booking confirmation to:', to)
    return null
  }

  // In development/testing without verified domain, send to verified email
  // Resend only allows sending to your own email in test mode
  const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.RESEND_VERIFIED_DOMAIN
  const recipientEmail = isDevelopment ? 'dev@synqreserve.com' : to

  if (isDevelopment && to !== recipientEmail) {
    console.log(`[Email] Development mode: Redirecting email from ${to} to ${recipientEmail}`)
  }

  try {
    const { data, error } = await getResend().emails.send({
      from: process.env.EMAIL_FROM || 'SYNQ <onboarding@resend.dev>',
      to: recipientEmail,
      subject: getSubject(locale),
      react: BookingConfirmation({ ...templateProps, locale }),
    })

    if (error) {
      console.error('[Email] Failed to send booking confirmation:', error)
      // Don't throw - email failure shouldn't block booking
      return null
    }

    console.log('[Email] Booking confirmation sent:', data?.id)
    return data
  } catch (error) {
    // Log but don't throw - email failure shouldn't block booking
    console.error('[Email] Service error:', error)
    return null
  }
}
