import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(role: string | null) {
  return ['TENANT_ADMIN', 'SUPER_ADMIN'].includes(role ?? '')
}

// PATCH /api/admin/lembur/[id] — approve / reject / update
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { status, catatanApproval, jamLembur, keterangan } = body

  const existing = await prisma.lembur.findFirst({
    where: { id: params.id, tenantId: session.tenantId! },
  })
  if (!existing) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (status) {
    data.status = status
    if (status === 'DISETUJUI' || status === 'DITOLAK') {
      data.approvedById = session.memberId ?? null
      data.tanggalApproval = new Date()
    }
    if (catatanApproval !== undefined) data.catatanApproval = catatanApproval
  }
  if (jamLembur !== undefined) data.jamLembur = Number(jamLembur)
  if (keterangan !== undefined) data.keterangan = keterangan

  const updated = await prisma.lembur.update({
    where: { id: params.id },
    data,
    include: { member: { include: { user: { select: { nama: true } } } } },
  })

  return NextResponse.json({ success: true, lembur: updated })
}

// DELETE /api/admin/lembur/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.lembur.findFirst({
    where: { id: params.id, tenantId: session.tenantId! },
  })
  if (!existing) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  await prisma.lembur.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
