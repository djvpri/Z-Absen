import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { dalamRadius } from '@/lib/gps'
import { z } from 'zod'

const checkInSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  fotoBase64: z.string().optional(),
  waktu: z.string(),
  lokasiId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session || !session.tenantId || !session.memberId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { latitude, longitude, fotoBase64, waktu, lokasiId } = checkInSchema.parse(body)

    // Cari lokasi aktif tenant
    const lokasi = await prisma.lokasi.findFirst({
      where: { tenantId: session.tenantId, aktif: true, ...(lokasiId ? { id: lokasiId } : {}) },
    })

    if (!lokasi) {
      return NextResponse.json({ error: 'Lokasi absensi belum dikonfigurasi admin' }, { status: 404 })
    }

    const dalamArea = dalamRadius(
      { latitude, longitude },
      { latitude: lokasi.lat, longitude: lokasi.lng },
      lokasi.radius
    )
    if (!dalamArea) {
      return NextResponse.json(
        { error: `Anda berada di luar area ${lokasi.nama} (radius ${lokasi.radius}m)` },
        { status: 400 }
      )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const sudahAbsen = await prisma.absensi.findUnique({
      where: { memberId_tanggal: { memberId: session.memberId, tanggal: today } },
    })
    if (sudahAbsen?.waktuMasuk) {
      return NextResponse.json({ error: 'Anda sudah absen masuk hari ini' }, { status: 400 })
    }

    const jamConfig = await prisma.jamAbsensi.findFirst({
      where: { tenantId: session.tenantId, aktif: true },
    })

    const waktuMasuk = new Date(waktu)
    let status: 'HADIR' | 'TERLAMBAT' = 'HADIR'

    if (jamConfig) {
      const [jam, menit] = jamConfig.jamMasuk.split(':').map(Number)
      const batasMasuk = new Date(today)
      batasMasuk.setHours(jam, menit + jamConfig.toleransi, 0, 0)
      if (waktuMasuk > batasMasuk) status = 'TERLAMBAT'
    }

    const absensi = await prisma.absensi.upsert({
      where: { memberId_tanggal: { memberId: session.memberId, tanggal: today } },
      update: { waktuMasuk, status, latMasuk: latitude, lngMasuk: longitude, fotoMasuk: fotoBase64, lokasiId: lokasi.id },
      create: {
        tenantId: session.tenantId,
        memberId: session.memberId,
        lokasiId: lokasi.id,
        tanggal: today,
        waktuMasuk,
        status,
        latMasuk: latitude,
        lngMasuk: longitude,
        fotoMasuk: fotoBase64,
      },
    })

    return NextResponse.json({ absensi, status })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.memberId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const bulan = parseInt(searchParams.get('bulan') || String(new Date().getMonth() + 1))
  const tahun = parseInt(searchParams.get('tahun') || String(new Date().getFullYear()))

  const mulai = new Date(tahun, bulan - 1, 1)
  const selesai = new Date(tahun, bulan, 0)

  const absensi = await prisma.absensi.findMany({
    where: { memberId: session.memberId, tanggal: { gte: mulai, lte: selesai } },
    orderBy: { tanggal: 'desc' },
  })

  return NextResponse.json({ absensi })
}
