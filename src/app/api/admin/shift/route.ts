import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

// GET /api/admin/shift — list semua shift (JamAbsensi)
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session?.tenantId || session.role !== 'TENANT_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const shifts = await prisma.jamAbsensi.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { jamMasuk: 'asc' },
  })

  return NextResponse.json({ shifts })
}

// POST /api/admin/shift — buat shift baru
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session?.tenantId || session.role !== 'TENANT_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { nama, hari, jamMasuk, jamKeluar, toleransi, warna } = body

  if (!nama || !jamMasuk || !jamKeluar) {
    return NextResponse.json({ error: 'nama, jamMasuk, jamKeluar wajib diisi' }, { status: 400 })
  }

  const shift = await prisma.jamAbsensi.create({
    data: {
      tenantId: session.tenantId,
      nama,
      hari: hari || 'SENIN,SELASA,RABU,KAMIS,JUMAT',
      jamMasuk,
      jamKeluar,
      toleransi: toleransi ?? 15,
      warna: warna || '#3b82f6',
      aktif: true,
    },
  })

  return NextResponse.json({ shift }, { status: 201 })
}
