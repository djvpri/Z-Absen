import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(role: string | null) {
  return ['TENANT_ADMIN', 'SUPER_ADMIN'].includes(role ?? '')
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { nama, deskripsi } = await req.json()
  if (!nama?.trim()) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })

  const dep = await prisma.departemen.updateMany({
    where: { id: params.id, tenantId: session.tenantId! },
    data: { nama: nama.trim(), deskripsi: deskripsi?.trim() || null },
  })

  if (dep.count === 0) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.departemen.updateMany({
    where: { id: params.id, tenantId: session.tenantId! },
    data: { aktif: false },
  })

  return NextResponse.json({ success: true })
}
