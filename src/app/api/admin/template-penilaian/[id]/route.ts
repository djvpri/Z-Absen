import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session?.tenantId || session.role !== 'TENANT_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const existing = await prisma.templatePenilaian.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  })
  if (!existing) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const body = await req.json()

  const template = await prisma.templatePenilaian.update({
    where: { id: params.id },
    data: {
      ...(body.nama !== undefined && { nama: body.nama }),
      ...(body.periode !== undefined && { periode: body.periode }),
      ...(body.kriteria !== undefined && { kriteria: body.kriteria }),
      ...(body.aktif !== undefined && { aktif: body.aktif }),
    },
  })

  return NextResponse.json({ template })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session?.tenantId || session.role !== 'TENANT_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const existing = await prisma.templatePenilaian.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  })
  if (!existing) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  await prisma.templatePenilaian.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
