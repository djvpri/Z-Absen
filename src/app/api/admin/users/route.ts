import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { z } from 'zod'

const inviteSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(['TENANT_ADMIN', 'ANGGOTA', 'WALI']).default('ANGGOTA'),
  jabatan: z.string().optional(),
})

function isAdmin(role: string | null) {
  return ['TENANT_ADMIN', 'SUPER_ADMIN'].includes(role ?? '')
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const members = await prisma.tenantMember.findMany({
    where: { tenantId: session.tenantId! },
    include: { user: { select: { nama: true, email: true, avatarUrl: true } } },
    orderBy: { user: { nama: 'asc' } },
  })

  return NextResponse.json({
    users: members.map((m) => ({
      id: m.id,
      userId: m.userId,
      nama: m.user.nama,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      jabatan: m.jabatan,
      nip: m.nip,
      aktif: m.aktif,
      faceRegistered: !!m.faceEmbedding,
    })),
  })
}

// Buat invite link (menggantikan POST user langsung — user login via SSO Z One)
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const data = inviteSchema.parse(body)

    const expiredAt = new Date()
    expiredAt.setDate(expiredAt.getDate() + 7) // berlaku 7 hari

    const invite = await prisma.invite.create({
      data: {
        tenantId: session.tenantId!,
        email: data.email,
        role: data.role,
        jabatan: data.jabatan,
        expiredAt,
      },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const inviteUrl = `${appUrl}/join?invite=${invite.token}`

    return NextResponse.json({ invite, inviteUrl }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Data tidak valid', detail: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

// Nonaktifkan member
export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('id')
  if (!memberId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // Pastikan member ini milik tenant yang sama
  const member = await prisma.tenantMember.findFirst({
    where: { id: memberId, tenantId: session.tenantId! },
  })
  if (!member) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  await prisma.tenantMember.update({ where: { id: memberId }, data: { aktif: false } })
  return NextResponse.json({ sukses: true })
}
