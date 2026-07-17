import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !['TENANT_ADMIN', 'SUPER_ADMIN'].includes(session.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenantId = session.tenantId!
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [tenant, totalAnggota, absensiHariIni, izinMenunggu, absensi7Hari] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { isDemo: true } }),
    prisma.tenantMember.count({ where: { tenantId, aktif: true } }),
    prisma.absensi.findMany({
      where: { tenantId, tanggal: today },
      include: { member: { include: { user: { select: { nama: true } } } } },
      orderBy: { waktuMasuk: 'desc' },
      take: 10,
    }),
    prisma.izin.count({ where: { tenantId, status: 'MENUNGGU' } }),
    prisma.absensi.groupBy({
      by: ['tanggal', 'status'],
      where: {
        tenantId,
        tanggal: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      _count: true,
      orderBy: { tanggal: 'asc' },
    }),
  ])

  const hadirHariIni = absensiHariIni.filter((a) => ['HADIR', 'TERLAMBAT'].includes(a.status)).length
  const terlambatHariIni = absensiHariIni.filter((a) => a.status === 'TERLAMBAT').length

  return NextResponse.json({
    ringkasan: {
      totalAnggota,
      hadirHariIni,
      terlambatHariIni,
      izinMenunggu,
      tanggal: today.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    },
    absensiTerbaru: absensiHariIni.map((a) => ({
      id: a.id,
      status: a.status,
      waktuMasuk: a.waktuMasuk,
      nama: a.member.user.nama,
      jabatan: a.member.jabatan,
    })),
    grafik7Hari: absensi7Hari,
    isDemo: tenant?.isDemo ?? false,
  })
}
