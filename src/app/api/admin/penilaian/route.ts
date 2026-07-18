import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

// GET /api/admin/penilaian?templateId=&periode=&memberId=
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session?.tenantId || session.role !== 'TENANT_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const templateId = searchParams.get('templateId')
  const periode = searchParams.get('periode')
  const memberId = searchParams.get('memberId')

  const penilaian = await prisma.penilaian.findMany({
    where: {
      tenantId: session.tenantId,
      ...(templateId && { templateId }),
      ...(periode && { periode }),
      ...(memberId && { memberId }),
    },
    include: {
      member: {
        include: {
          user: { select: { nama: true } },
          departemen: { select: { nama: true } },
        },
      },
      template: { select: { nama: true, kriteria: true, periode: true } },
    },
    orderBy: [{ periode: 'desc' }, { member: { user: { nama: 'asc' } } }],
  })

  return NextResponse.json({ penilaian })
}

// POST /api/admin/penilaian — buat penilaian baru
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session?.tenantId || session.role !== 'TENANT_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { memberId, templateId, periode, nilai, catatan, status } = body

  if (!memberId || !templateId || !periode) {
    return NextResponse.json({ error: 'memberId, templateId, periode wajib' }, { status: 400 })
  }

  // Hitung nilai total berbobot
  const template = await prisma.templatePenilaian.findFirst({
    where: { id: templateId, tenantId: session.tenantId },
  })
  if (!template) return NextResponse.json({ error: 'Template tidak ditemukan' }, { status: 404 })

  const kriteria = template.kriteria as Array<{ id: string; nama: string; bobot: number }>
  const nilaiArr = (nilai || []) as Array<{ kriteriaId: string; nilai: number }>
  const nilaiTotal = kriteria.reduce((sum, k) => {
    const n = nilaiArr.find((x) => x.kriteriaId === k.id)?.nilai ?? 0
    return sum + (n * k.bobot) / 100
  }, 0)

  const penilaian = await prisma.penilaian.upsert({
    where: { memberId_templateId_periode: { memberId, templateId, periode } },
    update: {
      nilai: nilai || [],
      nilaiTotal: Math.round(nilaiTotal * 10) / 10,
      catatan: catatan || null,
      status: status || 'DRAFT',
      reviewerId: session.memberId || null,
    },
    create: {
      tenantId: session.tenantId,
      memberId,
      templateId,
      periode,
      nilai: nilai || [],
      nilaiTotal: Math.round(nilaiTotal * 10) / 10,
      catatan: catatan || null,
      status: status || 'DRAFT',
      reviewerId: session.memberId || null,
    },
    include: {
      member: { include: { user: { select: { nama: true } } } },
    },
  })

  return NextResponse.json({ penilaian })
}
