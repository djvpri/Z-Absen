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

  const mulai = new Date(tahun, bulan - 1, 1)
  const selesai = new Date(tahun, bulan, 0)

  const members = await prisma.tenantMember.findMany({
    where: { tenantId, aktif: true },
    select: {
      id: true,
      nip: true,
      jabatan: true,
      role: true,
      user: { select: { nama: true, email: true } },
      absensi: {
        where: { tanggal: { gte: mulai, lte: selesai } },
        select: { tanggal: true, status: true, waktuMasuk: true, waktuKeluar: true },
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
    orderBy: { user: { nama: 'asc' } },
  })

  const rekap = members.map((m) => ({
    id: m.id,
    nama: m.user.nama,
    email: m.user.email,
    nip: m.nip,
    jabatan: m.jabatan,
    role: m.role,
    hadir: m.absensi.filter((a) => a.status === 'HADIR').length,
    terlambat: m.absensi.filter((a) => a.status === 'TERLAMBAT').length,
    sakit: m.absensi.filter((a) => a.status === 'SAKIT').length,
    izin: m.absensi.filter((a) => a.status === 'IZIN').length,
    alpha: m.absensi.filter((a) => a.status === 'ALPHA').length,
    totalAbsensi: m.absensi.length,
  }))

  return NextResponse.json({
    rekap,
    periode: {
      bulan,
      tahun,
      namaBulan: mulai.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
    },
  })
}
