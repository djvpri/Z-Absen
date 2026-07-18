import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session?.tenantId || session.role !== 'TENANT_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const existing = await prisma.penilaian.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    include: { template: true },
  })
  if (!existing) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const body = await req.json()

  // Recalculate nilaiTotal if nilai changed
  let nilaiTotal = existing.nilaiTotal
  if (body.nilai !== undefined) {
    const kriteria = existing.template.kriteria as Array<{ id: string; bobot: number }>
    const nilaiArr = body.nilai as Array<{ kriteriaId: string; nilai: number }>
    nilaiTotal = kriteria.reduce((sum, k) => {
      const n = nilaiArr.find((x) => x.kriteriaId === k.id)?.nilai ?? 0
      return sum + (n * k.bobot) / 100
    }, 0)
    nilaiTotal = Math.round(nilaiTotal * 10) / 10
  }

  const penilaian = await prisma.penilaian.update({
    where: { id: params.id },
    data: {
      ...(body.nilai !== undefined && { nilai: body.nilai, nilaiTotal }),
      ...(body.catatan !== undefined && { catatan: body.catatan }),
      ...(body.status !== undefined && { status: body.status }),
    },
  })

  return NextResponse.json({ penilaian })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session?.tenantId || session.role !== 'TENANT_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const existing = await prisma.penilaian.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  })
  if (!existing) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  await prisma.penilaian.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
