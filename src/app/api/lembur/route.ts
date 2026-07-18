import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

// GET /api/lembur?bulan=&tahun= — employee's own lembur
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.memberId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const bulan = Number(searchParams.get('bulan')) || 0
  const tahun = Number(searchParams.get('tahun')) || new Date().getFullYear()

  const where: Record<string, unknown> = {
    tenantId: session.tenantId!,
    memberId: session.memberId,
  }
  if (bulan) {
    where.tanggal = {
      gte: new Date(tahun, bulan - 1, 1),
      lte: new Date(tahun, bulan, 0),
    }
  } else {
    where.tanggal = {
      gte: new Date(tahun, 0, 1),
      lte: new Date(tahun, 11, 31),
    }
  }

  const lembur = await prisma.lembur.findMany({
    where,
    orderBy: { tanggal: 'desc' },
  })

  const totalDisetujui = lembur
    .filter((l) => l.status === 'DISETUJUI')
    .reduce((s, l) => s + l.jamLembur, 0)
  const pending = lembur.filter((l) => l.status === 'MENUNGGU').length

  return NextResponse.json({ lembur, stats: { totalDisetujui, pending } })
}

// POST /api/lembur — employee submits lembur request
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.memberId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { tanggal, jamLembur, keterangan } = body

  if (!tanggal || !jamLembur) {
    return NextResponse.json({ error: 'tanggal dan jamLembur wajib' }, { status: 400 })
  }

  const jam = Number(jamLembur)
  if (jam <= 0 || jam > 24) {
    return NextResponse.json({ error: 'jamLembur tidak valid (0–24)' }, { status: 400 })
  }

  // Check duplikasi per hari
  const exists = await prisma.lembur.findFirst({
    where: {
      memberId: session.memberId,
      tanggal: new Date(tanggal),
    },
  })
  if (exists) {
    return NextResponse.json({ error: 'Sudah ada pengajuan lembur untuk tanggal ini' }, { status: 409 })
  }

  const lembur = await prisma.lembur.create({
    data: {
      tenantId: session.tenantId!,
      memberId: session.memberId,
      tanggal: new Date(tanggal),
      jamLembur: jam,
      keterangan: keterangan || null,
      status: 'MENUNGGU',
    },
  })

  return NextResponse.json({ success: true, lembur }, { status: 201 })
}

// DELETE /api/lembur/[id] — employee cancels pending lembur
export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.memberId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })

  const lembur = await prisma.lembur.findFirst({
    where: { id, memberId: session.memberId },
  })
  if (!lembur) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
  if (lembur.status !== 'MENUNGGU') {
    return NextResponse.json({ error: 'Hanya bisa batalkan lembur yang masih menunggu' }, { status: 400 })
  }

  await prisma.lembur.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
