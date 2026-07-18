import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

const BULAN_NAMA = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des']

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !['TENANT_ADMIN', 'SUPER_ADMIN'].includes(session.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenantId = session.tenantId!
  const { searchParams } = new URL(req.url)
  const bulan = parseInt(searchParams.get('bulan') || String(new Date().getMonth() + 1))
  const tahun = parseInt(searchParams.get('tahun') || String(new Date().getFullYear()))

  const mulai = new Date(tahun, bulan - 1, 1)
  const selesai = new Date(tahun, bulan, 0)

  // Batas 6 bulan ke belakang
  let sixB = bulan - 6, sixY = tahun
  if (sixB <= 0) { sixB += 12; sixY-- }
  const sixMonthsStart = new Date(sixY, sixB - 1, 1)

  // Hari kerja bulan ini (Senin–Jumat)
  let hariKerja = 0
  for (let d = new Date(mulai); d <= selesai; d.setDate(d.getDate() + 1)) {
    if (d.getDay() >= 1 && d.getDay() <= 5) hariKerja++
  }

  const [members, absensiAll, gajiRecords] = await Promise.all([
    prisma.tenantMember.findMany({
      where: { tenantId, aktif: true },
      select: {
        id: true,
        tipeKaryawan: true,
        gajiPokok: true,
        departemen: { select: { id: true, nama: true } },
        user: { select: { nama: true } },
        absensi: {
          where: { tanggal: { gte: mulai, lte: selesai } },
          select: { status: true },
        },
      },
    }),
    prisma.absensi.findMany({
      where: { tenantId, tanggal: { gte: sixMonthsStart, lte: selesai } },
      select: { tanggal: true, status: true },
    }),
    prisma.gaji.findMany({
      where: { tenantId, bulan, tahun },
      select: { gajiKotor: true, bpjsKes: true, bpjsTK: true, pph21: true, takehomePay: true, dibayarkan: true },
    }),
  ])

  const totalKaryawan = members.length

  // Agregat absensi bulan ini per member
  let totalHadir = 0, totalTerlambat = 0, totalAlpha = 0
  const topTerlambatMap: Record<string, { nama: string; count: number }> = {}
  const deptMap: Record<string, { nama: string; hadir: number; hariPossible: number }> = {}

  members.forEach((m) => {
    const hadir = m.absensi.filter((a) => a.status === 'HADIR').length
    const terlambat = m.absensi.filter((a) => a.status === 'TERLAMBAT').length
    const alpha = m.absensi.filter((a) => a.status === 'ALPHA').length
    totalHadir += hadir + terlambat
    totalTerlambat += terlambat
    totalAlpha += alpha

    if (terlambat > 0) {
      topTerlambatMap[m.id] = { nama: m.user.nama, count: terlambat }
    }

    const deptId = m.departemen?.id ?? '__none__'
    const deptNama = m.departemen?.nama ?? 'Tanpa Departemen'
    if (!deptMap[deptId]) deptMap[deptId] = { nama: deptNama, hadir: 0, hariPossible: 0 }
    deptMap[deptId].hadir += hadir + terlambat
    deptMap[deptId].hariPossible += hariKerja
  })

  const totalHariPossible = totalKaryawan * hariKerja
  const rataKehadiran = totalHariPossible > 0 ? Math.round((totalHadir / totalHariPossible) * 100) : 0

  const topTerlambat = Object.values(topTerlambatMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const perDepartemen = Object.values(deptMap)
    .map((d) => ({
      nama: d.nama,
      pctKehadiran: d.hariPossible > 0 ? Math.round((d.hadir / d.hariPossible) * 100) : 0,
    }))
    .sort((a, b) => b.pctKehadiran - a.pctKehadiran)

  // Distribusi tipe karyawan
  const tipeMap: Record<string, number> = {}
  members.forEach((m) => {
    const t = m.tipeKaryawan ?? 'BELUM_DISET'
    tipeMap[t] = (tipeMap[t] || 0) + 1
  })
  const distribusiTipe = Object.entries(tipeMap)
    .map(([tipe, count]) => ({ tipe, count }))
    .sort((a, b) => b.count - a.count)

  // Gaji summary
  const totalGajiKotor = gajiRecords.reduce((s, g) => s + (g.gajiKotor || 0), 0)
  const totalBpjsKes = gajiRecords.reduce((s, g) => s + (g.bpjsKes || 0), 0)
  const totalBpjsTK = gajiRecords.reduce((s, g) => s + (g.bpjsTK || 0), 0)
  const totalPph21 = gajiRecords.reduce((s, g) => s + (g.pph21 || 0), 0)
  const totalTakehome = gajiRecords.reduce((s, g) => s + (g.takehomePay || 0), 0)

  // Trend 6 bulan (agregat dari absensiAll)
  const trendMap: Record<string, { hadir: number; terlambat: number; alpha: number }> = {}
  absensiAll.forEach((a) => {
    const d = new Date(a.tanggal)
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`
    if (!trendMap[key]) trendMap[key] = { hadir: 0, terlambat: 0, alpha: 0 }
    if (a.status === 'HADIR') trendMap[key].hadir++
    else if (a.status === 'TERLAMBAT') { trendMap[key].hadir++; trendMap[key].terlambat++ }
    else if (a.status === 'ALPHA') trendMap[key].alpha++
  })

  const trend6Bulan = []
  for (let i = 5; i >= 0; i--) {
    let b = bulan - i, y = tahun
    if (b <= 0) { b += 12; y-- }
    const key = `${y}-${b}`
    const d = trendMap[key] || { hadir: 0, terlambat: 0, alpha: 0 }
    trend6Bulan.push({
      label: `${BULAN_NAMA[b]} '${String(y).slice(2)}`,
      hadir: d.hadir,
      terlambat: d.terlambat,
      alpha: d.alpha,
    })
  }

  return NextResponse.json({
    kpi: {
      totalKaryawan,
      rataKehadiran,
      totalAlpha,
      totalTerlambat,
      totalGajiKotor,
      totalBpjsKes,
      totalBpjsTK,
      totalPph21,
      totalTakehome,
      jumlahSlip: gajiRecords.length,
    },
    perDepartemen,
    topTerlambat,
    distribusiTipe,
    trend6Bulan,
  })
}
