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

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.toLowerCase() ?? ''
  const departemenId = searchParams.get('departemenId') ?? ''
  const tipe = searchParams.get('tipe') ?? ''
  const aktif = searchParams.get('aktif') ?? 'true'

  const members = await prisma.tenantMember.findMany({
    where: {
      tenantId: session.tenantId!,
      aktif: aktif === 'semua' ? undefined : aktif !== 'false',
      ...(departemenId ? { departemenId } : {}),
      ...(tipe ? { tipeKaryawan: tipe as never } : {}),
      ...(q ? {
        OR: [
          { user: { nama: { contains: q, mode: 'insensitive' } } },
          { user: { email: { contains: q, mode: 'insensitive' } } },
          { jabatan: { contains: q, mode: 'insensitive' } },
          { nip: { contains: q, mode: 'insensitive' } },
        ],
      } : {}),
    },
    include: {
      user: { select: { id: true, nama: true, email: true, avatarUrl: true } },
      departemen: { select: { id: true, nama: true } },
    },
    orderBy: { user: { nama: 'asc' } },
  })

  return NextResponse.json({
    karyawan: members.map((m) => ({
      id: m.id,
      userId: m.userId,
      nama: m.user.nama,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      jabatan: m.jabatan,
      nip: m.nip,
      noHp: m.noHp,
      aktif: m.aktif,
      tipeKaryawan: m.tipeKaryawan,
      departemen: m.departemen,
      tanggalMulai: m.tanggalMulai,
      faceRegistered: !!m.faceEmbedding,
    })),
  })
}
