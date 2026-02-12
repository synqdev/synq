/**
 * Services API Route
 *
 * Returns list of active public services for service selection.
 * Excludes system services (block-service) used for admin time blocking.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

/**
 * GET /api/services
 *
 * Returns all active public services (excludes block-service).
 * Cached for 1 hour since service data changes rarely.
 */
export async function GET() {
  try {
    const services = await prisma.service.findMany({
      where: {
        isActive: true,
        id: { not: 'block-service' }, // Exclude system service
      },
      select: {
        id: true,
        name: true,
        nameEn: true,
        description: true,
        duration: true,
        price: true,
      },
      orderBy: { price: 'asc' },
    })

    return NextResponse.json(services, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (error) {
    console.error('Services API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    )
  }
}
