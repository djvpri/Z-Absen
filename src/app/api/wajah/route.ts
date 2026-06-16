import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { z } from 'zod'

const wajahSchema = z.object({
  embedding: z.array(z.number()).length(128),
  fotoBase64: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { embedding, fotoBase64 } = wajahSchema.parse(body)

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        wajahEmbedding: embedding,
        fotoWajah: fotoBase64,
      },
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
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const users = await prisma.user.findMany({
    where: {
      sekolahId: session.sekolahId,
      wajahEmbedding: { isEmpty: false },
    },
    select: {
      id: true,
      nama: true,
      role: true,
      wajahEmbedding: true,
    },
  })

  return NextResponse.json({ users })
}
