import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { z } from 'zod'

const wajahSchema = z.object({
  embedding: z.array(z.number()).length(128),
  fotoBase64: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session || !session.memberId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { embedding, fotoBase64 } = wajahSchema.parse(body)

    await prisma.tenantMember.update({
      where: { id: session.memberId },
      data: { faceEmbedding: embedding },
    })

    return NextResponse.json({ sukses: true, pesan: 'Wajah berhasil didaftarkan' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const allMembers = await prisma.tenantMember.findMany({
    where: { tenantId: session.tenantId, aktif: true },
    select: {
      id: true,
      faceEmbedding: true,
      user: { select: { nama: true } },
    },
  })
  const members = allMembers.filter((m) => m.faceEmbedding !== null)

  return NextResponse.json({
    users: members.map((m) => ({
      id: m.id,
      nama: m.user.nama,
      wajahEmbedding: m.faceEmbedding,
    })),
  })
}
