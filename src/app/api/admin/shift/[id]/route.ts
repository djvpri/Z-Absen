import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

// PUT /api/admin/shift/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session?.tenantId || session.role !== 'TENANT_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const existing = await prisma.jamAbsensi.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  })
  if (!existing) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const body = await req.json()

  const shift = await prisma.jamAbsensi.update({
    where: { id: params.id },
    data: {
      ...(body.nama !== undefined && { nama: body.nama }),
      ...(body.hari !== undefined && { hari: body.hari }),
      ...(body.jamMasuk !== undefined && { jamMasuk: body.jamMasuk }),
      ...(body.jamKeluar !== undefined && { jamKeluar: body.jamKeluar }),
      ...(body.toleransi !== undefined && { toleransi: body.toleransi }),
      ...(body.warna !== undefined && { warna: body.warna }),
      ...(body.aktif !== undefined && { aktif: body.aktif }),
    },
  })

  return NextResponse.json({ shift })
}

// DELETE /api/admin/shift/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session?.tenantId || session.role !== 'TENANT_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const existing = await prisma.jamAbsensi.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  })
  if (!existing) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  // Hapus jadwal yang menggunakan shift ini dulu
  await prisma.jadwalKerja.updateMany({
    where: { shiftId: params.id, tenantId: session.tenantId },
    data: { shiftId: null },
  })

  await prisma.jamAbsensi.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
