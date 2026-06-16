import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !['ADMIN', 'KEPALA_SEKOLAH'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [totalGuru, totalSiswa, absensiHariIni, izinMenunggu, absensi7Hari] = await Promise.all([
    prisma.user.count({ where: { sekolahId: session.sekolahId, role: 'GURU', aktif: true } }),
    prisma.user.count({ where: { sekolahId: session.sekolahId, role: 'SISWA', aktif: true } }),
    prisma.absensi.findMany({
      where: {
        tanggal: today,
        user: { sekolahId: session.sekolahId },
      },
      include: { user: { select: { nama: true, role: true } } },
      orderBy: { waktuMasuk: 'desc' },
      take: 10,
    }),
    prisma.izin.count({
      where: {
        status: 'MENUNGGU',
        user: { sekolahId: session.sekolahId },
      },
    }),
    prisma.absensi.groupBy({
      by: ['tanggal', 'status'],
      where: {
        tanggal: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        user: { sekolahId: session.sekolahId },
      },
      _count: true,
      orderBy: { tanggal: 'asc' },
    }),
  ])

  const hadirHariIni = absensiHariIni.filter((a) => ['HADIR', 'TERLAMBAT'].includes(a.status)).length
  const terlambatHariIni = absensiHariIni.filter((a) => a.status === 'TERLAMBAT').length

  return NextResponse.json({
    ringkasan: {
      totalGuru,
      totalSiswa,
      hadirHariIni,
      terlambatHariIni,
      izinMenunggu,
      tanggal: today.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    },
    absensiTerbaru: absensiHariIni,
    grafik7Hari: absensi7Hari,
  })
}
