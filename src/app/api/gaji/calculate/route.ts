import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !['ADMIN', 'KEPALA_SEKOLAH'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { bulan, tahun } = await req.json()

  const mulai = new Date(tahun, bulan - 1, 1)
  const selesai = new Date(tahun, bulan, 0)

  // Get all guru in this school
  const guruList = await prisma.user.findMany({
    where: {
      sekolahId: session.sekolahId,
      role: { in: ['GURU', 'KEPALA_SEKOLAH'] },
      aktif: true,
    },
  })

  const GAJI_POKOK_DEFAULT = 3500000
  const TUNJANGAN_PER_HADIR = 50000
  const POTONGAN_ALPHA = 100000
  const POTONGAN_TERLAMBAT = 25000

  const results = []

  for (const guru of guruList) {
    const absensi = await prisma.absensi.findMany({
      where: {
        userId: guru.id,
        tanggal: { gte: mulai, lte: selesai },
      },
    })

    const jumlahHadir = absensi.filter(a => a.status === 'HADIR').length
    const jumlahTerlambat = absensi.filter(a => a.status === 'TERLAMBAT').length
    const jumlahAlpha = absensi.filter(a => a.status === 'ALPHA').length

    const tunjanganHadir = jumlahHadir * TUNJANGAN_PER_HADIR
    const potonganAlpha = jumlahAlpha * POTONGAN_ALPHA
    const potonganTerlambat = jumlahTerlambat * POTONGAN_TERLAMBAT
    const totalGaji = GAJI_POKOK_DEFAULT + tunjanganHadir - potonganAlpha - potonganTerlambat

    const gaji = await prisma.gaji.upsert({
      where: { userId_bulan_tahun: { userId: guru.id, bulan, tahun } },
      update: {
        gajiPokok: GAJI_POKOK_DEFAULT,
        tunjanganHadir,
        potonganAlpha,
        potonganTerlambat,
        totalGaji,
        jumlahHadir,
        jumlahAlpha,
        jumlahTerlambat,
      },
      create: {
        userId: guru.id,
        bulan,
        tahun,
        gajiPokok: GAJI_POKOK_DEFAULT,
        tunjanganHadir,
        potonganAlpha,
        potonganTerlambat,
        totalGaji,
        jumlahHadir,
        jumlahAlpha,
        jumlahTerlambat,
      },
    })

    results.push(gaji)
  }

  return NextResponse.json({ gaji: results, message: `Gaji ${results.length} guru dihitung` })
}
