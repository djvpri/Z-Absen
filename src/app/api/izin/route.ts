import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { z } from 'zod'

const izinSchema = z.object({
  jenis: z.enum(['IZIN', 'SAKIT', 'CUTI', 'DINAS']),
  tanggalMulai: z.string(),
  tanggalSelesai: z.string(),
  alasan: z.string().min(10),
  lampiran: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const data = izinSchema.parse(body)

    const izin = await prisma.izin.create({
      data: {
        userId: session.userId,
        jenis: data.jenis,
        tanggalMulai: new Date(data.tanggalMulai),
        tanggalSelesai: new Date(data.tanggalSelesai),
        alasan: data.alasan,
        lampiran: data.lampiran,
        status: 'MENUNGGU',
      },
    })

    return NextResponse.json({ izin }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Data tidak valid', detail: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = ['ADMIN', 'KEPALA_SEKOLAH'].includes(session.role)

  const izin = await prisma.izin.findMany({
    where: isAdmin
      ? { user: { sekolahId: session.sekolahId } }
      : { userId: session.userId },
    include: {
      user: { select: { nama: true, role: true } },
      approver: { select: { nama: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ izin })
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !['ADMIN', 'KEPALA_SEKOLAH'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { izinId, status, catatan } = body

  const izin = await prisma.izin.update({
    where: { id: izinId },
    data: {
      status,
      approverId: session.userId,
      catatanApprover: catatan,
    },
    include: { user: true },
  })

  return NextResponse.json({ izin })
}
