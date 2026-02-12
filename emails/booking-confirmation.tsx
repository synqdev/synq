import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
} from '@react-email/components'

export interface BookingConfirmationProps {
  customerName: string
  serviceName: string
  workerName: string
  date: string // Formatted date string
  time: string // Formatted time string
  locale: 'ja' | 'en'
}

const translations = {
  ja: {
    subject: 'ご予約確認',
    greeting: (name: string) => `${name} 様`,
    confirmed: 'ご予約が確定しました',
    details: '予約詳細',
    service: 'サービス',
    date: '日付',
    time: '時間',
    worker: '担当',
    thanks: 'ご利用ありがとうございます。',
    footer: 'SYNQ 予約システム',
  },
  en: {
    subject: 'Booking Confirmation',
    greeting: (name: string) => `Dear ${name}`,
    confirmed: 'Your booking has been confirmed',
    details: 'Booking Details',
    service: 'Service',
    date: 'Date',
    time: 'Time',
    worker: 'Staff',
    thanks: 'Thank you for your booking.',
    footer: 'SYNQ Booking System',
  },
}

export default function BookingConfirmation({
  customerName,
  serviceName,
  workerName,
  date,
  time,
  locale = 'ja',
}: BookingConfirmationProps) {
  const t = translations[locale]

  return (
    <Html lang={locale}>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>{t.confirmed}</Heading>
          <Text style={styles.greeting}>{t.greeting(customerName)}</Text>

          <Section style={styles.details}>
            <Heading as="h2" style={styles.subheading}>
              {t.details}
            </Heading>
            <Text style={styles.detailRow}>
              <strong>{t.service}:</strong> {serviceName}
            </Text>
            <Text style={styles.detailRow}>
              <strong>{t.date}:</strong> {date}
            </Text>
            <Text style={styles.detailRow}>
              <strong>{t.time}:</strong> {time}
            </Text>
            <Text style={styles.detailRow}>
              <strong>{t.worker}:</strong> {workerName}
            </Text>
          </Section>

          <Hr style={styles.hr} />
          <Text style={styles.thanks}>{t.thanks}</Text>
          <Text style={styles.footer}>{t.footer}</Text>
        </Container>
      </Body>
    </Html>
  )
}

const styles = {
  body: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#f4f4f4',
    margin: 0,
    padding: '20px 0',
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '40px 20px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
  },
  heading: {
    color: '#333333',
    fontSize: '24px',
    fontWeight: '600' as const,
    marginBottom: '20px',
    textAlign: 'center' as const,
  },
  subheading: {
    fontSize: '18px',
    color: '#555555',
    fontWeight: '600' as const,
    marginTop: 0,
    marginBottom: '16px',
  },
  greeting: {
    fontSize: '16px',
    color: '#333333',
    marginBottom: '24px',
  },
  details: {
    backgroundColor: '#f9f9f9',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  detailRow: {
    fontSize: '14px',
    color: '#333333',
    margin: '8px 0',
  },
  hr: {
    borderColor: '#dddddd',
    marginTop: '24px',
    marginBottom: '24px',
  },
  thanks: {
    fontSize: '14px',
    color: '#666666',
    textAlign: 'center' as const,
  },
  footer: {
    fontSize: '12px',
    color: '#999999',
    textAlign: 'center' as const,
    marginTop: '16px',
  },
}

/**
 * Get the localized email subject
 */
export function getSubject(locale: 'ja' | 'en'): string {
  return translations[locale].subject
}
