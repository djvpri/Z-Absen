import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(role: string | null) {
  return ['TENANT_ADMIN', 'SUPER_ADMIN'].includes(role ?? '')
}

// GET /api/admin/lembur?bulan=&tahun=&memberId=&status=
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const bulan = Number(searchParams.get('bulan')) || 0
  const tahun = Number(searchParams.get('tahun')) || new Date().getFullYear()
  const memberId = searchParams.get('memberId') || ''
  const status = searchParams.get('status') || ''

  const where: Record<string, unknown> = { tenantId: session.tenantId! }
  if (memberId) where.memberId = memberId
  if (status) where.status = status
  if (bulan) {
    const mulai = new Date(tahun, bulan - 1, 1)
    const selesai = new Date(tahun, bulan, 0)
    where.tanggal = { gte: mulai, lte: selesai }
  } else {
    where.tanggal = {
      gte: new Date(tahun, 0, 1),
      lte: new Date(tahun, 11, 31),
    }
  }

  const lembur = await prisma.lembur.findMany({
    where,
    include: {
      member: {
        include: {
          user: { select: { nama: true } },
          departemen: { select: { nama: true } },
        },
      },
    },
    orderBy: [{ tanggal: 'desc' }, { createdAt: 'desc' }],
  })

  // Stats
  const pending = lembur.filter((l) => l.status === 'MENUNGGU').length
  const totalJamDisetujui = lembur
    .filter((l) => l.status === 'DISETUJUI')
    .reduce((s, l) => s + l.jamLembur, 0)

  return NextResponse.json({ lembur, stats: { pending, totalJamDisetujui } })
}

// POST /api/admin/lembur — admin tambahkan lembur langsung (sudah disetujui)
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { memberId, tanggal, jamLembur, keterangan, status } = body

  if (!memberId || !tanggal || !jamLembur) {
    return NextResponse.json({ error: 'memberId, tanggal, jamLembur wajib' }, { status: 400 })
  }

  const member = await prisma.tenantMember.findFirst({
    where: { id: memberId, tenantId: session.tenantId! },
  })
  if (!member) return NextResponse.json({ error: 'Member tidak ditemukan' }, { status: 404 })

  const lembur = await prisma.lembur.create({
    data: {
      tenantId: session.tenantId!,
      memberId,
      tanggal: new Date(tanggal),
      jamLembur: Number(jamLembur),
      keterangan: keterangan || null,
      status: status || 'DISETUJUI',
      approvedById: status === 'DISETUJUI' ? session.memberId ?? null : null,
      tanggalApproval: status === 'DISETUJUI' ? new Date() : null,
    },
    include: { member: { include: { user: { select: { nama: true } } } } },
  })

  return NextResponse.json({ success: true, lembur }, { status: 201 })
}
