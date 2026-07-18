import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

// GET /api/admin/jadwal?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session?.tenantId || session.role !== 'TENANT_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate dan endDate wajib' }, { status: 400 })
  }

  const [members, jadwal, shifts] = await Promise.all([
    prisma.tenantMember.findMany({
      where: { tenantId: session.tenantId, aktif: true },
      include: { user: { select: { nama: true } } },
      orderBy: { user: { nama: 'asc' } },
    }),
    prisma.jadwalKerja.findMany({
      where: {
        tenantId: session.tenantId,
        tanggal: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      include: { shift: true },
    }),
    prisma.jamAbsensi.findMany({
      where: { tenantId: session.tenantId, aktif: true },
      orderBy: { jamMasuk: 'asc' },
    }),
  ])

  return NextResponse.json({ members, jadwal, shifts })
}

// POST /api/admin/jadwal — upsert satu jadwal
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session?.tenantId || session.role !== 'TENANT_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { memberId, tanggal, shiftId, libur, keterangan } = body

  if (!memberId || !tanggal) {
    return NextResponse.json({ error: 'memberId dan tanggal wajib' }, { status: 400 })
  }

  const tgl = new Date(tanggal)

  const jadwal = await prisma.jadwalKerja.upsert({
    where: { memberId_tanggal: { memberId, tanggal: tgl } },
    update: {
      shiftId: shiftId || null,
      libur: libur ?? false,
      keterangan: keterangan || null,
    },
    create: {
      tenantId: session.tenantId,
      memberId,
      tanggal: tgl,
      shiftId: shiftId || null,
      libur: libur ?? false,
      keterangan: keterangan || null,
    },
    include: { shift: true },
  })

  return NextResponse.json({ jadwal })
}

// DELETE /api/admin/jadwal?memberId=&tanggal=
export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session?.tenantId || session.role !== 'TENANT_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId')
  const tanggal = searchParams.get('tanggal')

  if (!memberId || !tanggal) {
    return NextResponse.json({ error: 'memberId dan tanggal wajib' }, { status: 400 })
  }

  await prisma.jadwalKerja.deleteMany({
    where: { memberId, tanggal: new Date(tanggal), tenantId: session.tenantId },
  })

  return NextResponse.json({ success: true })
}
