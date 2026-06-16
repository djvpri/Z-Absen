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
  const role = searchParams.get('role') || undefined

  const mulai = new Date(tahun, bulan - 1, 1)
  const selesai = new Date(tahun, bulan, 0)

  const users = await prisma.user.findMany({
    where: {
      sekolahId: session.sekolahId,
      aktif: true,
      ...(role ? { role: role as any } : {}),
    },
    select: {
      id: true,
      nama: true,
      role: true,
      nip: true,
      nis: true,
      absensi: {
        where: { tanggal: { gte: mulai, lte: selesai } },
        select: { tanggal: true, status: true, waktuMasuk: true, waktuPulang: true },
      },
      izin: {
        where: {
          status: 'DISETUJUI',
          tanggalMulai: { lte: selesai },
          tanggalSelesai: { gte: mulai },
        },
        select: { jenis: true, tanggalMulai: true, tanggalSelesai: true },
      },
    },
    orderBy: { nama: 'asc' },
  })

  const rekap = users.map((u) => {
    const hadir = u.absensi.filter((a) => a.status === 'HADIR').length
    const terlambat = u.absensi.filter((a) => a.status === 'TERLAMBAT').length
    const sakit = u.absensi.filter((a) => a.status === 'SAKIT').length
    const izin = u.absensi.filter((a) => a.status === 'IZIN').length
    const alpha = u.absensi.filter((a) => a.status === 'ALPHA').length

    return {
      id: u.id,
      nama: u.nama,
      role: u.role,
      nip: u.nip,
      nis: u.nis,
      hadir,
      terlambat,
      sakit,
      izin,
      alpha,
      totalAbsensi: u.absensi.length,
    }
  })

  return NextResponse.json({
    rekap,
    periode: {
      bulan,
      tahun,
      namaBulan: mulai.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
    },
  })
}
