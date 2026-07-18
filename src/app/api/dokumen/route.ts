import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

// GET /api/dokumen — dokumen milik karyawan sendiri
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session?.memberId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dokumen = await prisma.dokumenKaryawan.findMany({
    where: { memberId: session.memberId },
    select: {
      id: true, nama: true, kategori: true, nomorDokumen: true,
      tanggalTerbit: true, tanggalExpiry: true,
      fileName: true, fileMime: true, fileSize: true,
      status: true, catatan: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ dokumen })
}

// POST /api/dokumen — karyawan upload dokumen sendiri
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session?.memberId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const nama = formData.get('nama') as string
  const kategori = (formData.get('kategori') as string) || 'LAINNYA'
  const nomorDokumen = (formData.get('nomorDokumen') as string) || null
  const tanggalTerbit = (formData.get('tanggalTerbit') as string) || null
  const tanggalExpiry = (formData.get('tanggalExpiry') as string) || null
  const file = formData.get('file') as File | null

  if (!nama) {
    return NextResponse.json({ error: 'Nama dokumen wajib diisi' }, { status: 400 })
  }

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
      tenantId: session.tenantId!,
      memberId: session.memberId!,
      nama,
      kategori: kategori as never,
      nomorDokumen,
      tanggalTerbit: tanggalTerbit ? new Date(tanggalTerbit) : null,
      tanggalExpiry: tanggalExpiry ? new Date(tanggalExpiry) : null,
      fileData,
      fileMime,
      fileName,
      fileSize,
      uploadedById: session.memberId,
    },
    select: { id: true, nama: true, kategori: true, fileName: true, createdAt: true },
  })

  return NextResponse.json({ dokumen })
}
