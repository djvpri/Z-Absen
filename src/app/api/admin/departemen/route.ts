import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(role: string | null) {
  return ['TENANT_ADMIN', 'SUPER_ADMIN'].includes(role ?? '')
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const list = await prisma.departemen.findMany({
    where: { tenantId: session.tenantId!, aktif: true },
    include: { _count: { select: { members: { where: { aktif: true } } } } },
    orderBy: { nama: 'asc' },
  })

  return NextResponse.json({ departemen: list })
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { nama, deskripsi } = await req.json()
  if (!nama?.trim()) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })

  const dep = await prisma.departemen.create({
    data: { tenantId: session.tenantId!, nama: nama.trim(), deskripsi: deskripsi?.trim() || null },
  })

  return NextResponse.json({ success: true, departemen: dep })
}
