import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session?.tenantId || session.role !== 'TENANT_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const templates = await prisma.templatePenilaian.findMany({
    where: { tenantId: session.tenantId },
    include: { _count: { select: { penilaian: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ templates })
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session?.tenantId || session.role !== 'TENANT_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { nama, periode, kriteria } = body

  if (!nama || !Array.isArray(kriteria) || kriteria.length === 0) {
    return NextResponse.json({ error: 'nama dan kriteria wajib' }, { status: 400 })
  }

  const template = await prisma.templatePenilaian.create({
    data: {
      tenantId: session.tenantId,
      nama,
      periode: periode || 'TAHUNAN',
      kriteria,
      aktif: true,
    },
  })

  return NextResponse.json({ template }, { status: 201 })
}
