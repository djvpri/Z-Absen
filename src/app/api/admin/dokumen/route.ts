import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

// GET /api/admin/dokumen?memberId=&kategori=
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session?.tenantId || session.role !== 'TENANT_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId')
  const kategori = searchParams.get('kategori')

  const dokumen = await prisma.dokumenKaryawan.findMany({
    where: {
      tenantId: session.tenantId,
      ...(memberId && { memberId }),
      ...(kategori && { kategori: kategori as never }),
    },
    select: {
      id: true, nama: true, kategori: true, nomorDokumen: true,
      tanggalTerbit: true, tanggalExpiry: true,
      fileName: true, fileMime: true, fileSize: true,
      status: true, catatan: true, uploadedById: true, createdAt: true,
      member: {
        select: { id: true, jabatan: true, user: { select: { nama: true } } },
      },
    },
    orderBy: [{ memberId: 'asc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({ dokumen })
}

// POST /api/admin/dokumen — multipart/form-data
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session?.tenantId || session.role !== 'TENANT_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const memberId = formData.get('memberId') as string
  const nama = formData.get('nama') as string
  const kategori = (formData.get('kategori') as string) || 'LAINNYA'
  const nomorDokumen = (formData.get('nomorDokumen') as string) || null
  const tanggalTerbit = (formData.get('tanggalTerbit') as string) || null
  const tanggalExpiry = (formData.get('tanggalExpiry') as string) || null
  const catatan = (formData.get('catatan') as string) || null
  const file = formData.get('file') as File | null

  if (!memberId || !nama) {
    return NextResponse.json({ error: 'memberId dan nama wajib' }, { status: 400 })
  }

  const member = await prisma.tenantMember.findFirst({
    where: { id: memberId, tenantId: session.tenantId },
  })
  if (!member) return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 })

  let fileData: Buffer | null = null
  let fileMime: string | null = null
  let fileName: string | null = null
  let fileSize: number | null = null

  if (file && file.size > 0) {
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Ukuran file maksimal 10MB' }, { status: 400 })
    }
    const bytes = await file.arrayBuffer()
    fileData = Buffer.from(bytes)
    fileMime = file.type || 'application/octet-stream'
    fileName = file.name
    fileSize = file.size
  }

  const dokumen = await prisma.dokumenKaryawan.create({
    data: {
      tenantId: session.tenantId,
      memberId,
      nama,
      kategori: kategori as never,
      nomorDokumen,
      tanggalTerbit: tanggalTerbit ? new Date(tanggalTerbit) : null,
      tanggalExpiry: tanggalExpiry ? new Date(tanggalExpiry) : null,
      fileData,
      fileMime,
      fileName,
      fileSize,
      catatan,
      uploadedById: session.memberId || null,
    },
    select: {
      id: true, nama: true, kategori: true, fileName: true, fileSize: true, status: true,
    },
  })

  return NextResponse.json({ dokumen })
}
