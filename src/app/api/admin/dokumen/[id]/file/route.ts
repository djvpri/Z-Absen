import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session?.tenantId || session.role !== 'TENANT_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const doc = await prisma.dokumenKaryawan.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    select: { fileData: true, fileMime: true, fileName: true, fileSize: true },
  })

  if (!doc || !doc.fileData) {
    return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 })
  }

  const buffer = doc.fileData as Buffer
  const disposition = req.nextUrl.searchParams.get('download') === '1'
    ? `attachment; filename="${encodeURIComponent(doc.fileName ?? 'file')}"`
    : `inline; filename="${encodeURIComponent(doc.fileName ?? 'file')}"`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': doc.fileMime ?? 'application/octet-stream',
      'Content-Disposition': disposition,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
