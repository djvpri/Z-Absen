import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const userSchema = z.object({
  nama: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['GURU', 'SISWA', 'KEPALA_SEKOLAH', 'ADMIN']),
  nip: z.string().optional(),
  nis: z.string().optional(),
  noHp: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !['ADMIN', 'KEPALA_SEKOLAH'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    where: { sekolahId: session.sekolahId },
    select: {
      id: true, nama: true, email: true, role: true, nip: true, nis: true,
      noHp: true, aktif: true, wajahEmbedding: true,
    },
    orderBy: { nama: 'asc' },
  })

  return NextResponse.json({ users })
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !['ADMIN', 'KEPALA_SEKOLAH'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const data = userSchema.parse(body)
    const hash = await bcrypt.hash(data.password, 10)

    const user = await prisma.user.create({
      data: {
        nama: data.nama,
        email: data.email,
        password: hash,
        role: data.role as any,
        nip: data.nip || undefined,
        nis: data.nis || undefined,
        noHp: data.noHp || undefined,
        sekolahId: session.sekolahId,
        wajahEmbedding: [],
      },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Data tidak valid', detail: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ sukses: true })
}
