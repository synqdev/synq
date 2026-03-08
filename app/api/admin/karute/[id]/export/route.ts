import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'
import {
  generateKarutePDF,
  generateKaruteText,
} from '@/lib/services/karute-export.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const format = request.nextUrl.searchParams.get('format') || 'pdf'

  try {
    if (format === 'text') {
      const result = await generateKaruteText(id)
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 404 })
      }

      return new Response(result.text, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename=karute-${id}.txt`,
        },
      })
    }

    // Default: PDF
    const result = await generateKarutePDF(id)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    return new Response(new Uint8Array(result.buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=karute-${id}.pdf`,
      },
    })
  } catch (error) {
    console.error('Export failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
