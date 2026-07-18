import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

// GET /api/profil — data profil lengkap karyawan saat ini
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session?.memberId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const member = await prisma.tenantMember.findUnique({
    where: { id: session.memberId },
    include: {
      user: { select: { nama: true, email: true, avatarUrl: true } },
      departemen: { select: { nama: true } },
    },
  })

  if (!member) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  return NextResponse.json({ member })
}

// PATCH /api/profil — update field yang boleh diubah karyawan sendiri
export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session?.memberId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  // Whitelist field yang boleh diubah karyawan (bukan admin-only fields)
  const allowed = [
    'noHp', 'alamat', 'kota', 'provinsi', 'kodePos',
    'namaBank', 'noRekening', 'atasNamaRek', 'npwp', 'kontakDarurat',
  ]

  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key] ?? null
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Tidak ada field yang diperbarui' }, { status: 400 })
  }

  const member = await prisma.tenantMember.update({
    where: { id: session.memberId },
    data,
  })

  return NextResponse.json({ member })
}
