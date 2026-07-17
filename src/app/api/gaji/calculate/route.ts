import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

const GAJI_POKOK_DEFAULT = 3_500_000
const TUNJANGAN_PER_HADIR = 50_000
const POTONGAN_ALPHA = 100_000
const POTONGAN_TERLAMBAT = 25_000

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !['TENANT_ADMIN', 'SUPER_ADMIN'].includes(session.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenantId = session.tenantId!
  const { bulan, tahun } = await req.json()

  const mulai = new Date(tahun, bulan - 1, 1)
  const selesai = new Date(tahun, bulan, 0)

  const members = await prisma.tenantMember.findMany({
    where: { tenantId, aktif: true },
  })

  const results = []

  for (const member of members) {
    const absensi = await prisma.absensi.findMany({
      where: { memberId: member.id, tanggal: { gte: mulai, lte: selesai } },
    })

    const jumlahHadir = absensi.filter((a) => a.status === 'HADIR').length
    const jumlahTerlambat = absensi.filter((a) => a.status === 'TERLAMBAT').length
    const jumlahAlpha = absensi.filter((a) => a.status === 'ALPHA').length
    const jumlahIzin = absensi.filter((a) => ['IZIN', 'SAKIT'].includes(a.status)).length

    const tunjanganHadir = jumlahHadir * TUNJANGAN_PER_HADIR
    const potonganAlpha = jumlahAlpha * POTONGAN_ALPHA
    const potonganTerlambat = jumlahTerlambat * POTONGAN_TERLAMBAT
    const totalGaji = GAJI_POKOK_DEFAULT + tunjanganHadir - potonganAlpha - potonganTerlambat

    const gaji = await prisma.gaji.upsert({
      where: { memberId_bulan_tahun: { memberId: member.id, bulan, tahun } },
      update: { gajiPokok: GAJI_POKOK_DEFAULT, tunjanganHadir, potonganAlpha, potonganTerlambat, totalGaji, jumlahHadir, jumlahAlpha, jumlahTerlambat, jumlahIzin },
      create: { tenantId, memberId: member.id, bulan, tahun, gajiPokok: GAJI_POKOK_DEFAULT, tunjanganHadir, potonganAlpha, potonganTerlambat, totalGaji, jumlahHadir, jumlahAlpha, jumlahTerlambat, jumlahIzin },
    })

    results.push(gaji)
  }

  return NextResponse.json({ gaji: results, message: `Gaji ${results.length} anggota dihitung` })
}
