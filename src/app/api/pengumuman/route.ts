import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

// GET /api/pengumuman — active pengumuman untuk karyawan + status baca
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.memberId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  const pengumuman = await prisma.pengumuman.findMany({
    where: {
      tenantId: session.tenantId!,
      aktif: true,
      AND: [
        { OR: [{ tanggalExpiry: null }, { tanggalExpiry: { gte: now } }] },
        { OR: [{ targetRole: null }, { targetRole: session.role as never }] },
      ],
    },
    include: {
      bacaList: {
        where: { memberId: session.memberId },
        select: { tanggal: true },
      },
    },
    orderBy: [{ pinned: 'desc' }, { prioritas: 'desc' }, { createdAt: 'desc' }],
  })

  const result = pengumuman.map((p) => ({
    id: p.id,
    judul: p.judul,
    isi: p.isi,
    prioritas: p.prioritas,
    pinned: p.pinned,
    createdAt: p.createdAt,
    sudahDibaca: p.bacaList.length > 0,
    tanggalDibaca: p.bacaList[0]?.tanggal ?? null,
  }))

  const unreadCount = result.filter((p) => !p.sudahDibaca).length

  return NextResponse.json({ pengumuman: result, unreadCount })
}
