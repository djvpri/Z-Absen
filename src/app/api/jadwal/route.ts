import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

// GET /api/jadwal?week=YYYY-MM-DD (Senin awal minggu)
// Returns 14 hari (minggu ini + minggu depan)
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session?.memberId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const weekParam = searchParams.get('week')

  // Default: awal minggu ini (Senin)
  const now = new Date()
  let monday: Date
  if (weekParam) {
    monday = new Date(weekParam)
  } else {
    const day = now.getDay() // 0=Sun, 1=Mon...
    const diff = day === 0 ? -6 : 1 - day
    monday = new Date(now)
    monday.setDate(now.getDate() + diff)
    monday.setHours(0, 0, 0, 0)
  }

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const jadwal = await prisma.jadwalKerja.findMany({
    where: {
      memberId: session.memberId,
      tanggal: { gte: monday, lte: sunday },
    },
    include: { shift: true },
    orderBy: { tanggal: 'asc' },
  })

  return NextResponse.json({ jadwal, weekStart: monday.toISOString() })
}
