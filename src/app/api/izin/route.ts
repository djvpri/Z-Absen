import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { z } from 'zod'

const izinSchema = z.object({
  jenis: z.enum(['IZIN', 'SAKIT', 'CUTI_TAHUNAN', 'CUTI_SAKIT', 'DINAS_LUAR']),
  tanggalMulai: z.string(),
  tanggalSelesai: z.string(),
  alasan: z.string().min(5),
  lampiranUrl: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session || !session.memberId || !session.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = izinSchema.parse(body)

    const izin = await prisma.izin.create({
      data: {
        tenantId: session.tenantId,
        memberId: session.memberId,
        jenis: data.jenis,
        tanggalMulai: new Date(data.tanggalMulai),
        tanggalSelesai: new Date(data.tanggalSelesai),
        alasan: data.alasan,
        lampiranUrl: data.lampiranUrl,
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
  if (!session || !session.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isAdmin = ['TENANT_ADMIN', 'SUPER_ADMIN'].includes(session.role ?? '')

  const izin = await prisma.izin.findMany({
    where: isAdmin
      ? { tenantId: session.tenantId }
      : { tenantId: session.tenantId, memberId: session.memberId! },
    include: {
      member: { include: { user: { select: { nama: true } } } },
      approver: { include: { user: { select: { nama: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ izin })
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !['TENANT_ADMIN', 'SUPER_ADMIN'].includes(session.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { izinId, status, catatan } = await req.json()

  const izin = await prisma.izin.update({
    where: { id: izinId },
    data: { status, approverId: session.memberId, catatanApprover: catatan },
  })

  return NextResponse.json({ izin })
}
