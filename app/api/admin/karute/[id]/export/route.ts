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
  const safeId = id.replace(/[^A-Za-z0-9_-]/g, '') || 'record'
  const rawFormat = request.nextUrl.searchParams.get('format') || 'pdf'
  const ALLOWED_FORMATS = ['pdf', 'text'] as const
  type ExportFormat = typeof ALLOWED_FORMATS[number]
  if (!ALLOWED_FORMATS.includes(rawFormat as ExportFormat)) {
    return NextResponse.json({ error: 'Invalid format. Use "pdf" or "text".' }, { status: 400 })
  }
  const format = rawFormat as ExportFormat

  try {
    if (format === 'text') {
      const result = await generateKaruteText(id)
      if (!result.success) {
        const status = result.error === 'Karute record not found' ? 404 : 500
        return NextResponse.json({ error: result.error }, { status })
      }

      return new Response(result.text, {
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="karute-${safeId}.txt"`,
        },
      })
    }

    // Default: PDF
    const result = await generateKarutePDF(id)
    if (!result.success) {
      const status = result.error === 'Karute record not found' ? 404 : 500
      return NextResponse.json({ error: result.error }, { status })
    }

    return new Response(new Uint8Array(result.buffer), {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="karute-${safeId}.pdf"`,
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
