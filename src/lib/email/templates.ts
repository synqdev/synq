/**
 * Email Templates
 *
 * Re-exports email templates from the emails directory for use in the application.
 */

export {
  default as BookingConfirmation,
  getSubject,
  type BookingConfirmationProps,
} from '@/emails/booking-confirmation'
