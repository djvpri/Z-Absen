import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !['ADMIN', 'KEPALA_SEKOLAH'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const bulan = parseInt(searchParams.get('bulan') || String(new Date().getMonth() + 1))
  const tahun = parseInt(searchParams.get('tahun') || String(new Date().getFullYear()))

  const gaji = await prisma.gaji.findMany({
    where: {
      bulan, tahun,
      user: { sekolahId: session.sekolahId },
    },
    include: { user: { select: { nama: true, role: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ gaji })
}
