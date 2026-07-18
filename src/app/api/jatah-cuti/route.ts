import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

const JENIS_LIST = ['CUTI_TAHUNAN', 'CUTI_SAKIT', 'IZIN'] as const
const DEFAULT_JATAH: Record<string, number> = {
  CUTI_TAHUNAN: 12,
  CUTI_SAKIT: 12,
  IZIN: 6,
}

function hitungHari(mulai: Date, selesai: Date) {
  return Math.ceil((selesai.getTime() - mulai.getTime()) / 86_400_000) + 1
}

// GET /api/jatah-cuti?tahun=2026
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.memberId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tahun = Number(new URL(req.url).searchParams.get('tahun')) || new Date().getFullYear()

  const [jatahList, izinDisetujui] = await Promise.all([
    prisma.jatahCuti.findMany({
      where: { memberId: session.memberId, tahun },
    }),
    prisma.izin.findMany({
      where: {
        memberId: session.memberId,
        status: 'DISETUJUI',
        jenis: { in: JENIS_LIST as unknown as never[] },
        tanggalMulai: { gte: new Date(`${tahun}-01-01`), lte: new Date(`${tahun}-12-31`) },
      },
      select: { jenis: true, tanggalMulai: true, tanggalSelesai: true },
    }),
  ])

  const jatahMap = new Map(jatahList.map(j => [j.jenis, j.jatah]))
  const terpakaiMap = new Map<string, number>()
  for (const izin of izinDisetujui) {
    const hari = hitungHari(izin.tanggalMulai, izin.tanggalSelesai)
    terpakaiMap.set(izin.jenis, (terpakaiMap.get(izin.jenis) ?? 0) + hari)
  }

  const kuota = JENIS_LIST.map(jenis => {
    const jatah = jatahMap.get(jenis) ?? DEFAULT_JATAH[jenis]
    const terpakai = terpakaiMap.get(jenis) ?? 0
    return { jenis, jatah, terpakai, sisa: Math.max(0, jatah - terpakai) }
  })

  return NextResponse.json({ tahun, kuota })
}
