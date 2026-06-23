import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ user: null })

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { sekolah: { select: { nama: true } } },
  })

  if (!user) return NextResponse.json({ user: null })

  return NextResponse.json({
    user: {
      id: user.id,
      nama: user.nama,
      email: user.email,
      role: user.role,
      sekolah: user.sekolah?.nama || '',
      fotoWajah: user.fotoWajah,
    },
  })
}
