import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(role: string | null) {
  return ['TENANT_ADMIN', 'SUPER_ADMIN'].includes(role ?? '')
}

// GET /api/admin/mutasi?memberId=
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId') || ''

  const where: Record<string, unknown> = { tenantId: session.tenantId! }
  if (memberId) where.memberId = memberId

  const mutasi = await prisma.mutasi.findMany({
    where,
    include: {
      member: { include: { user: { select: { nama: true } } } },
    },
    orderBy: { tanggal: 'desc' },
  })

  return NextResponse.json({ mutasi })
}

// POST /api/admin/mutasi — manual mutasi entry + update TenantMember
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { memberId, jenis, sesudah, keterangan } = body

  if (!memberId || !jenis || !sesudah) {
    return NextResponse.json({ error: 'memberId, jenis, sesudah wajib' }, { status: 400 })
  }

  const member = await prisma.tenantMember.findFirst({
    where: { id: memberId, tenantId: session.tenantId! },
    include: { departemen: { select: { id: true, nama: true } } },
  })
  if (!member) return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 })

  const sebelum = {
    departemenId: member.departemenId,
    departemenNama: member.departemen?.nama ?? null,
    jabatan: member.jabatan,
    tipeKaryawan: member.tipeKaryawan,
    gajiPokok: member.gajiPokok,
  }

  // Apply changes to TenantMember
  const updateData: Record<string, unknown> = {}
  if (sesudah.departemenId !== undefined) updateData.departemenId = sesudah.departemenId || null
  if (sesudah.jabatan !== undefined) updateData.jabatan = sesudah.jabatan
  if (sesudah.tipeKaryawan !== undefined) updateData.tipeKaryawan = sesudah.tipeKaryawan
  if (sesudah.gajiPokok !== undefined) updateData.gajiPokok = Number(sesudah.gajiPokok) || null

  const [updatedMember, mutasi] = await Promise.all([
    Object.keys(updateData).length > 0
      ? prisma.tenantMember.update({ where: { id: memberId }, data: updateData })
      : member,
    prisma.mutasi.create({
      data: {
        tenantId: session.tenantId!,
        memberId,
        jenis,
        sebelum,
        sesudah,
        keterangan: keterangan || null,
      },
    }),
  ])

  return NextResponse.json({ success: true, mutasi }, { status: 201 })
}
