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

  return NextResponse.json({ success: true, karyawan: updated })
}
