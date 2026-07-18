import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { hitungPayroll, hitungHariKerja } from '@/lib/payroll'

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !['TENANT_ADMIN', 'SUPER_ADMIN'].includes(session.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenantId = session.tenantId!
  const body = await req.json()
  const bulan = Number(body.bulan) || new Date().getMonth() + 1
  const tahun = Number(body.tahun) || new Date().getFullYear()
  const hitungBpjs = body.hitungBpjs !== false
  const hitungPph  = body.hitungPph  !== false

  const mulai = new Date(tahun, bulan - 1, 1)
  const selesai = new Date(tahun, bulan, 0)
  const jumlahHariKerja = hitungHariKerja(tahun, bulan)

  const members = await prisma.tenantMember.findMany({
    where: { tenantId, aktif: true },
  })

  const results = []

  for (const m of members) {
    const absensi = await prisma.absensi.findMany({
      where: { memberId: m.id, tanggal: { gte: mulai, lte: selesai } },
    })

    const jumlahHadir     = absensi.filter(a => a.status === 'HADIR').length
    const jumlahTerlambat = absensi.filter(a => a.status === 'TERLAMBAT').length
    const jumlahAlpha     = absensi.filter(a => a.status === 'ALPHA').length
    const jumlahIzin      = absensi.filter(a => ['IZIN', 'SAKIT'].includes(a.status)).length

    const gajiPokok = m.gajiPokok ?? 0

    const result = hitungPayroll({
      gajiPokok,
      statusPajak: m.statusPajak ?? 'TK0',
      tunjanganJabatan: m.tunjanganJabatan ?? 0,
      tunjanganMakan: m.tunjanganMakan ?? 0,
      tunjanganTransport: m.tunjanganTransport ?? 0,
      jumlahHadir,
      jumlahTerlambat,
      jumlahAlpha,
      jumlahIzin,
      jumlahHariKerja,
      hitungBpjs,
      hitungPph,
    })

    const gaji = await prisma.gaji.upsert({
      where: { memberId_bulan_tahun: { memberId: m.id, bulan, tahun } },
      update: {
        jumlahHadir, jumlahTerlambat, jumlahAlpha, jumlahIzin, jumlahHariKerja,
        gajiPokok: result.gajiPokok,
        tunjanganJabatan: result.tunjanganJabatan,
        tunjanganHadir: result.tunjanganHadir,
        lemburJam: result.lemburJam,
        lemburNominal: result.lemburNominal,
        gajiKotor: result.gajiKotor,
        potonganAlpha: result.potonganAlpha,
        potonganTerlambat: result.potonganTerlambat,
        bpjsKes: result.bpjsKes,
        bpjsTK: result.bpjsTK,
        pph21: result.pph21,
        totalPotongan: result.totalPotongan,
        takehomePay: result.takehomePay,
        totalGaji: result.takehomePay,
      },
      create: {
        tenantId, memberId: m.id, bulan, tahun,
        jumlahHadir, jumlahTerlambat, jumlahAlpha, jumlahIzin, jumlahHariKerja,
        gajiPokok: result.gajiPokok,
        tunjanganJabatan: result.tunjanganJabatan,
        tunjanganHadir: result.tunjanganHadir,
        lemburJam: result.lemburJam,
        lemburNominal: result.lemburNominal,
        gajiKotor: result.gajiKotor,
        potonganAlpha: result.potonganAlpha,
        potonganTerlambat: result.potonganTerlambat,
        bpjsKes: result.bpjsKes,
        bpjsTK: result.bpjsTK,
        pph21: result.pph21,
        totalPotongan: result.totalPotongan,
        takehomePay: result.takehomePay,
        totalGaji: result.takehomePay,
      },
    })

    results.push(gaji)
  }

  return NextResponse.json({ gaji: results, count: results.length, bulan, tahun })
}
