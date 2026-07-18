import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

// GET /api/pengumuman/unread — jumlah pengumuman belum dibaca (untuk badge)
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.memberId) {
    return NextResponse.json({ count: 0 })
  }

  const now = new Date()

  const total = await prisma.pengumuman.count({
    where: {
      tenantId: session.tenantId!,
      aktif: true,
      OR: [{ tanggalExpiry: null }, { tanggalExpiry: { gte: now } }],
      NOT: {
        bacaList: { some: { memberId: session.memberId } },
      },
    },
  })

  return NextResponse.json({ count: total })
}
