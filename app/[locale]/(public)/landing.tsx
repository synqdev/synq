'use client'

import { Link } from '@/i18n/navigation'

// ============================================================================
// HERO SECTION
// ============================================================================

function HeroSection() {
  return (
    <section className="relative flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-7xl">
        SYNQ
      </h1>
      <p className="mx-auto mt-4 max-w-md text-lg text-gray-500">
        Smart booking for salons and clinics.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/booking"
          className="rounded-lg bg-gray-900 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          Book Now
        </Link>
        <button className="rounded-lg border border-gray-300 px-8 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900">
          Learn More
        </button>
      </div>
    </section>
  )
}

// ============================================================================
// NEAR YOU SECTION
// ============================================================================

function NearYouSection() {
  const placeholderLocations = [
    { name: 'Shibuya Salon', address: 'Shibuya, Tokyo', distance: '0.3 km' },
    { name: 'Omotesando Clinic', address: 'Minato, Tokyo', distance: '1.2 km' },
    { name: 'Shinjuku Wellness', address: 'Shinjuku, Tokyo', distance: '2.5 km' },
  ]

  return (
    <section className="border-t border-gray-100 bg-gray-50 px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-2xl font-bold text-gray-900">Near You</h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          Find available appointments nearby
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {placeholderLocations.map((loc) => (
            <div
              key={loc.name}
              className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
            >
              {/* Map placeholder */}
              <div className="mb-4 flex h-32 items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-400">
                Map
              </div>
              <h3 className="font-semibold text-gray-900">{loc.name}</h3>
              <p className="mt-1 text-sm text-gray-500">{loc.address}</p>
              <p className="mt-1 text-xs text-gray-400">{loc.distance}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// FOOTER
// ============================================================================

function Footer() {
  return (
    <footer className="border-t border-gray-100 px-6 py-8">
      <p className="text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} SYNQ
      </p>
    </footer>
  )
}

// ============================================================================
// MAIN LANDING COMPONENT
// ============================================================================

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-bold tracking-wide">SYNQ</span>
        <Link
          href="/booking"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Book Now
        </Link>
      </nav>

      <HeroSection />
      <NearYouSection />
      <Footer />
    </div>
  )
}
