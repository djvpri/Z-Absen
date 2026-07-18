import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(role: string | null) {
  return ['TENANT_ADMIN', 'SUPER_ADMIN'].includes(role ?? '')
}

// PUT /api/admin/pengumuman/[id] — update
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.pengumuman.findFirst({
    where: { id: params.id, tenantId: session.tenantId! },
  })
  if (!existing) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const body = await req.json()
  const updated = await prisma.pengumuman.update({
    where: { id: params.id },
    data: {
      judul: body.judul?.trim() ?? undefined,
      isi: body.isi?.trim() ?? undefined,
      prioritas: body.prioritas ?? undefined,
      pinned: body.pinned !== undefined ? body.pinned : undefined,
      targetRole: body.targetRole !== undefined ? body.targetRole || null : undefined,
      tanggalExpiry: body.tanggalExpiry !== undefined
        ? body.tanggalExpiry ? new Date(body.tanggalExpiry) : null
        : undefined,
      aktif: body.aktif !== undefined ? body.aktif : undefined,
    },
  })

  return NextResponse.json({ success: true, pengumuman: updated })
}

// DELETE /api/admin/pengumuman/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.pengumuman.findFirst({
    where: { id: params.id, tenantId: session.tenantId! },
  })
  if (!existing) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  await prisma.pengumuman.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
