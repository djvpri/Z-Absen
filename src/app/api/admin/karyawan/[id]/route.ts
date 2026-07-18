import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(role: string | null) {
  return ['TENANT_ADMIN', 'SUPER_ADMIN'].includes(role ?? '')
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const member = await prisma.tenantMember.findFirst({
    where: { id: params.id, tenantId: session.tenantId! },
    include: {
      user: { select: { id: true, nama: true, email: true, avatarUrl: true } },
      departemen: { select: { id: true, nama: true } },
    },
  })

  if (!member) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  return NextResponse.json({ karyawan: member })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()

  const existing = await prisma.tenantMember.findFirst({
    where: { id: params.id, tenantId: session.tenantId! },
    include: { departemen: { select: { id: true, nama: true } } },
  })
  if (!existing) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const updated = await prisma.tenantMember.update({
    where: { id: params.id },
    data: {
      jabatan: body.jabatan ?? undefined,
      nip: body.nip ?? undefined,
      noHp: body.noHp ?? undefined,
      role: body.role ?? undefined,
      aktif: body.aktif !== undefined ? body.aktif : undefined,
      tipeKaryawan: body.tipeKaryawan ?? undefined,
      departemenId: body.departemenId ?? undefined,
      tanggalMulai: body.tanggalMulai ? new Date(body.tanggalMulai) : undefined,
      tanggalAkhir: body.tanggalAkhir ? new Date(body.tanggalAkhir) : body.tanggalAkhir === null ? null : undefined,
      gajiPokok: body.gajiPokok !== undefined ? Number(body.gajiPokok) || null : undefined,
      // Identitas pribadi
      nik: body.nik ?? undefined,
      tempatLahir: body.tempatLahir ?? undefined,
      tanggalLahir: body.tanggalLahir ? new Date(body.tanggalLahir) : undefined,
      jenisKelamin: body.jenisKelamin ?? undefined,
      agama: body.agama ?? undefined,
      golDarah: body.golDarah ?? undefined,
      // Alamat
      alamat: body.alamat ?? undefined,
      kota: body.kota ?? undefined,
      provinsi: body.provinsi ?? undefined,
      kodePos: body.kodePos ?? undefined,
      // Payroll settings
      statusPajak: body.statusPajak ?? undefined,
      tunjanganJabatan: body.tunjanganJabatan !== undefined ? Number(body.tunjanganJabatan) : undefined,
      tunjanganMakan: body.tunjanganMakan !== undefined ? Number(body.tunjanganMakan) : undefined,
      tunjanganTransport: body.tunjanganTransport !== undefined ? Number(body.tunjanganTransport) : undefined,
      // Rekening
      namaBank: body.namaBank ?? undefined,
      noRekening: body.noRekening ?? undefined,
      atasNamaRek: body.atasNamaRek ?? undefined,
      npwp: body.npwp ?? undefined,
      // Kontak darurat
      kontakDarurat: body.kontakDarurat ?? undefined,
    },
    include: {
      user: { select: { id: true, nama: true, email: true, avatarUrl: true } },
      departemen: { select: { id: true, nama: true } },
    },
  })

  // Auto-log mutasi jika ada perubahan signifikan
  const detectJenis = () => {
    if (body.departemenId !== undefined && body.departemenId !== existing.departemenId) return 'PINDAH_DEPARTEMEN'
    if (body.jabatan !== undefined && body.jabatan !== existing.jabatan) return 'PERUBAHAN_JABATAN'
    if (body.tipeKaryawan !== undefined && body.tipeKaryawan !== existing.tipeKaryawan) return 'PERUBAHAN_TIPE'
    if (body.gajiPokok !== undefined && Number(body.gajiPokok) !== existing.gajiPokok) {
      return Number(body.gajiPokok) > (existing.gajiPokok ?? 0) ? 'KENAIKAN_GAJI' : 'PENURUNAN_GAJI'
    }
    return null
  }
  const jenisMutasi = detectJenis()
  if (jenisMutasi) {
    await prisma.mutasi.create({
      data: {
        tenantId: session.tenantId!,
        memberId: params.id,
        jenis: jenisMutasi as never,
        sebelum: {
          departemenId: existing.departemenId,
          departemenNama: (existing as any).departemen?.nama ?? null,
          jabatan: existing.jabatan,
          tipeKaryawan: existing.tipeKaryawan,
          gajiPokok: existing.gajiPokok,
        },
        sesudah: {
          departemenId: body.departemenId ?? existing.departemenId,
          departemenNama: null, // will be resolved on read
          jabatan: body.jabatan ?? existing.jabatan,
          tipeKaryawan: body.tipeKaryawan ?? existing.tipeKaryawan,
          gajiPokok: body.gajiPokok !== undefined ? Number(body.gajiPokok) : existing.gajiPokok,
        },
        keterangan: body.catatanMutasi ?? null,
      },
    })
  }

  return NextResponse.json({ success: true, karyawan: updated })
}
