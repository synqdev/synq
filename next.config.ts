import createNextIntlPlugin from 'next-intl/plugin'

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
}

export default withNextIntl(nextConfig)
