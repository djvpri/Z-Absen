import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(role: string | null) {
  return ['TENANT_ADMIN', 'SUPER_ADMIN'].includes(role ?? '')
}

function hitungHari(mulai: Date, selesai: Date) {
  return Math.ceil((selesai.getTime() - mulai.getTime()) / 86_400_000) + 1
}

const JENIS_LIST = ['CUTI_TAHUNAN', 'CUTI_SAKIT', 'IZIN'] as const
const DEFAULT_JATAH: Record<string, number> = {
  CUTI_TAHUNAN: 12,
  CUTI_SAKIT: 12,
  IZIN: 6,
}

// GET /api/admin/jatah-cuti?tahun=2026
// Returns all active members with their quota and usage per jenis
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tahun = Number(new URL(req.url).searchParams.get('tahun')) || new Date().getFullYear()

  const [members, jatahList, izinDisetujui] = await Promise.all([
    prisma.tenantMember.findMany({
      where: { tenantId: session.tenantId!, aktif: true },
      include: { user: { select: { nama: true, email: true } } },
      orderBy: { user: { nama: 'asc' } },
    }),
    prisma.jatahCuti.findMany({
      where: { tenantId: session.tenantId!, tahun },
    }),
    prisma.izin.findMany({
      where: {
        tenantId: session.tenantId!,
        status: 'DISETUJUI',
        jenis: { in: JENIS_LIST as unknown as never[] },
        tanggalMulai: { gte: new Date(`${tahun}-01-01`), lte: new Date(`${tahun}-12-31`) },
      },
      select: { memberId: true, jenis: true, tanggalMulai: true, tanggalSelesai: true },
    }),
  ])

  // Index jatah by memberId+jenis
  const jatahMap = new Map(jatahList.map(j => [`${j.memberId}|${j.jenis}`, j]))

  // Compute terpakai per member per jenis
  const terpakaiMap = new Map<string, number>()
  for (const izin of izinDisetujui) {
    const key = `${izin.memberId}|${izin.jenis}`
    const hari = hitungHari(izin.tanggalMulai, izin.tanggalSelesai)
    terpakaiMap.set(key, (terpakaiMap.get(key) ?? 0) + hari)
  }

  const result = members.map(m => ({
    memberId: m.id,
    nama: m.user.nama,
    jabatan: m.jabatan,
    kuota: JENIS_LIST.map(jenis => {
      const key = `${m.id}|${jenis}`
      const jatah = jatahMap.get(key)?.jatah ?? DEFAULT_JATAH[jenis]
      const terpakai = terpakaiMap.get(key) ?? 0
      const jatahId = jatahMap.get(key)?.id ?? null
      return { jenis, jatah, terpakai, sisa: Math.max(0, jatah - terpakai), jatahId }
    }),
  }))

  return NextResponse.json({ tahun, karyawan: result, jenisList: JENIS_LIST })
}

// PUT /api/admin/jatah-cuti — upsert quota for one member+jenis+tahun
export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { memberId, tahun, jenis, jatah } = await req.json()
  if (!memberId || !tahun || !jenis || jatah === undefined) {
    return NextResponse.json({ error: 'memberId, tahun, jenis, jatah wajib' }, { status: 400 })
  }

  const record = await prisma.jatahCuti.upsert({
    where: { memberId_tahun_jenis: { memberId, tahun, jenis } },
    update: { jatah: Number(jatah) },
    create: { tenantId: session.tenantId!, memberId, tahun, jenis, jatah: Number(jatah) },
  })

  return NextResponse.json({ success: true, record })
}

// POST /api/admin/jatah-cuti — inisialisasi kuota default semua anggota aktif
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { tahun } = await req.json()
  const targetTahun = Number(tahun) || new Date().getFullYear()

  const members = await prisma.tenantMember.findMany({
    where: { tenantId: session.tenantId!, aktif: true },
    select: { id: true },
  })

  let created = 0
  for (const m of members) {
    for (const jenis of JENIS_LIST) {
      const exists = await prisma.jatahCuti.findUnique({
        where: { memberId_tahun_jenis: { memberId: m.id, tahun: targetTahun, jenis } },
      })
      if (!exists) {
        await prisma.jatahCuti.create({
          data: {
            tenantId: session.tenantId!,
            memberId: m.id,
            tahun: targetTahun,
            jenis,
            jatah: DEFAULT_JATAH[jenis],
          },
        })
        created++
      }
    }
  }

  return NextResponse.json({ success: true, created, tahun: targetTahun })
}
