import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

// GET /api/penilaian — riwayat KPI karyawan sendiri
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session?.memberId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const penilaian = await prisma.penilaian.findMany({
    where: { memberId: session.memberId, status: 'FINAL' },
    include: {
      template: { select: { nama: true, kriteria: true, periode: true } },
    },
    orderBy: { periode: 'desc' },
  })

  return NextResponse.json({ penilaian })
}
