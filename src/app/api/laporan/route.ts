import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !['TENANT_ADMIN', 'SUPER_ADMIN'].includes(session.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenantId = session.tenantId!
  const { searchParams } = new URL(req.url)
  const bulan = parseInt(searchParams.get('bulan') || String(new Date().getMonth() + 1))
  const tahun = parseInt(searchParams.get('tahun') || String(new Date().getFullYear()))
  const departemenId = searchParams.get('departemenId') || ''
  const q = searchParams.get('q') || ''

  const mulai = new Date(tahun, bulan - 1, 1)
  const selesai = new Date(tahun, bulan, 0)

  const where: Record<string, unknown> = { tenantId, aktif: true }
  if (departemenId) where.departemenId = departemenId
  if (q) where.user = { nama: { contains: q, mode: 'insensitive' } }

  const [members, departemenList] = await Promise.all([
    prisma.tenantMember.findMany({
      where,
      select: {
        id: true,
        nip: true,
        jabatan: true,
        role: true,
        tipeKaryawan: true,
        departemen: { select: { id: true, nama: true } },
        user: { select: { nama: true, email: true } },
        absensi: {
          where: { tanggal: { gte: mulai, lte: selesai } },
          select: { tanggal: true, status: true, waktuMasuk: true, waktuKeluar: true },
        },
      },
      orderBy: { user: { nama: 'asc' } },
    }),
    prisma.departemen.findMany({
      where: { tenantId, aktif: true },
      select: { id: true, nama: true },
      orderBy: { nama: 'asc' },
    }),
  ])

  let hariKerja = 0
  for (let d = new Date(mulai); d <= selesai; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay()
    if (dow >= 1 && dow <= 5) hariKerja++
  }

  const rekap = members.map((m) => {
    const hadir = m.absensi.filter((a) => a.status === 'HADIR').length
    const terlambat = m.absensi.filter((a) => a.status === 'TERLAMBAT').length
    const sakit = m.absensi.filter((a) => a.status === 'SAKIT').length
    const izin = m.absensi.filter((a) => a.status === 'IZIN').length
    const alpha = m.absensi.filter((a) => a.status === 'ALPHA').length
    const pctKehadiran = hariKerja > 0 ? Math.round(((hadir + terlambat) / hariKerja) * 100) : 0

    return {
      id: m.id,
      nama: m.user.nama,
      email: m.user.email,
      nip: m.nip,
      jabatan: m.jabatan,
      role: m.role,
      tipeKaryawan: m.tipeKaryawan,
      departemen: m.departemen,
      hadir,
      terlambat,
      sakit,
      izin,
      alpha,
      pctKehadiran,
      hariKerja,
    }
  })

  return NextResponse.json({
    rekap,
    departemenList,
    hariKerja,
    periode: {
      bulan,
      tahun,
      namaBulan: mulai.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
    },
  })
}
