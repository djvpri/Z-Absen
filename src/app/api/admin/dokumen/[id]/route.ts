import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session?.tenantId || session.role !== 'TENANT_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const existing = await prisma.dokumenKaryawan.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  })
  if (!existing) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const body = await req.json()

  const dokumen = await prisma.dokumenKaryawan.update({
    where: { id: params.id },
    data: {
      ...(body.nama !== undefined && { nama: body.nama }),
      ...(body.kategori !== undefined && { kategori: body.kategori }),
      ...(body.nomorDokumen !== undefined && { nomorDokumen: body.nomorDokumen }),
      ...(body.tanggalTerbit !== undefined && { tanggalTerbit: body.tanggalTerbit ? new Date(body.tanggalTerbit) : null }),
      ...(body.tanggalExpiry !== undefined && { tanggalExpiry: body.tanggalExpiry ? new Date(body.tanggalExpiry) : null }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.catatan !== undefined && { catatan: body.catatan }),
    },
    select: { id: true, nama: true, kategori: true, status: true, tanggalExpiry: true },
  })

  return NextResponse.json({ dokumen })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session?.tenantId || session.role !== 'TENANT_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const existing = await prisma.dokumenKaryawan.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  })
  if (!existing) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  await prisma.dokumenKaryawan.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
