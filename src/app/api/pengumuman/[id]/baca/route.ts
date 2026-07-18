import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

// POST /api/pengumuman/[id]/baca — tandai sudah dibaca
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.memberId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pengumuman = await prisma.pengumuman.findFirst({
    where: { id: params.id, tenantId: session.tenantId! },
  })
  if (!pengumuman) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  await prisma.pengumumanBaca.upsert({
    where: { pengumumanId_memberId: { pengumumanId: params.id, memberId: session.memberId } },
    update: {},
    create: { pengumumanId: params.id, memberId: session.memberId },
  })

  return NextResponse.json({ success: true })
}
