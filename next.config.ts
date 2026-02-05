import createNextIntlPlugin from 'next-intl/plugin'
import { withSentryConfig } from '@sentry/nextjs'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript strict mode
  typescript: {
    ignoreBuildErrors: false,
  },
  // ESLint strict mode
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Enable Next.js instrumentation for Sentry
  experimental: {
    instrumentationHook: true,
  },
}

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Only upload source maps in production with auth token
  silent: true,
  // Disable telemetry
  telemetry: false,
  // Hide source maps from browser
  hideSourceMaps: true,
  // Disable automatic source map uploading unless SENTRY_AUTH_TOKEN is set
  disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
  disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
}

// Apply plugins: next-intl first, then Sentry
const configWithIntl = withNextIntl(nextConfig)
export default withSentryConfig(configWithIntl, sentryWebpackPluginOptions)
