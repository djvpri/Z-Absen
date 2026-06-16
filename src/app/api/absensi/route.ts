import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { dalamRadius } from '@/lib/gps'
import { kirimDanLog, pesanAbsenMasuk } from '@/lib/notifikasi'
import { z } from 'zod'

const checkInSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  fotoBase64: z.string().optional(),
  waktu: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { latitude, longitude, fotoBase64, waktu } = checkInSchema.parse(body)

    const sekolah = await prisma.sekolah.findUnique({ where: { id: session.sekolahId } })
    if (!sekolah) return NextResponse.json({ error: 'Sekolah tidak ditemukan' }, { status: 404 })

    const dalamArea = dalamRadius(
      { latitude, longitude },
      { latitude: sekolah.latitude, longitude: sekolah.longitude },
      sekolah.radiusMeters
    )
    if (!dalamArea) {
      return NextResponse.json(
        { error: `Anda berada di luar area sekolah (radius ${sekolah.radiusMeters}m)` },
        { status: 400 }
      )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const sudahAbsen = await prisma.absensi.findUnique({
      where: { userId_tanggal: { userId: session.userId, tanggal: today } },
    })
    if (sudahAbsen?.waktuMasuk) {
      return NextResponse.json({ error: 'Anda sudah absen masuk hari ini' }, { status: 400 })
    }

    const jamConfig = await prisma.jamAbsensi.findFirst({
      where: {
        sekolahId: session.sekolahId,
        berlakuUntuk: { has: session.role as any },
      },
    })

    const waktuMasuk = new Date(waktu)
    let status: 'HADIR' | 'TERLAMBAT' = 'HADIR'

    if (jamConfig) {
      const [jam, menit] = jamConfig.jamMasuk.split(':').map(Number)
      const batasMasuk = new Date(today)
      batasMasuk.setHours(jam, menit + jamConfig.toleransiMenit, 0, 0)
      if (waktuMasuk > batasMasuk) status = 'TERLAMBAT'
    }

    const absensi = await prisma.absensi.upsert({
      where: { userId_tanggal: { userId: session.userId, tanggal: today } },
      update: {
        waktuMasuk,
        status,
        latitudeMasuk: latitude,
        longitudeMasuk: longitude,
        fotoMasuk: fotoBase64,
        jamMasukId: jamConfig?.id,
      },
      create: {
        userId: session.userId,
        tanggal: today,
        waktuMasuk,
        status,
        latitudeMasuk: latitude,
        longitudeMasuk: longitude,
        fotoMasuk: fotoBase64,
        jamMasukId: jamConfig?.id,
      },
    })

    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    const waktuStr = waktuMasuk.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

    if (user?.noHp) {
      await kirimDanLog({
        userId: session.userId,
        noTujuan: user.noHp,
        pesan: pesanAbsenMasuk(session.nama, waktuStr, status),
        via: 'whatsapp',
      })
    }

    if (user?.noHpOrtu) {
      await kirimDanLog({
        userId: session.userId,
        noTujuan: user.noHpOrtu,
        pesan: pesanAbsenMasuk(session.nama, waktuStr, status),
        via: 'whatsapp',
      })
    }

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
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const bulan = parseInt(searchParams.get('bulan') || String(new Date().getMonth() + 1))
  const tahun = parseInt(searchParams.get('tahun') || String(new Date().getFullYear()))

  const mulai = new Date(tahun, bulan - 1, 1)
  const selesai = new Date(tahun, bulan, 0)

  const absensi = await prisma.absensi.findMany({
    where: {
      userId: session.userId,
      tanggal: { gte: mulai, lte: selesai },
    },
    orderBy: { tanggal: 'desc' },
  })

  return NextResponse.json({ absensi })
}
