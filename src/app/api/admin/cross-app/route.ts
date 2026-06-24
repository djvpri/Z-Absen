import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

const ADMIN_SECRET = process.env.CROSS_APP_SECRET || 'z-ecosystem-admin-2026'

function auth(req: NextRequest) {
  return req.headers.get('authorization') === `Bearer ${ADMIN_SECRET}`
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sekolahs = await prisma.sekolah.findMany({
    select: { id: true, nama: true, npsn: true, alamat: true },
    orderBy: { createdAt: 'desc' },
  })

  const users = await prisma.user.findMany({
    select: { id: true, nama: true, email: true, role: true, aktif: true, sekolahId: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    tenants: sekolahs.map(s => ({
      id: s.id, name: s.nama, npsn: s.npsn, active: true,
    })),
    users: users.map(u => ({
      id: u.id, name: u.nama, email: u.email,
      role: u.role.toLowerCase(), tenantId: u.sekolahId, active: u.aktif,
    })),
  })
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, data, email } = await req.json()

  if (action === 'createTenant') {
    if (!data?.name) return NextResponse.json({ error: 'Nama sekolah wajib' }, { status: 400 })
    const sekolah = await prisma.sekolah.create({
      data: {
        nama: data.name,
        npsn: data.npsn || null,
        alamat: data.alamat || data.address || '-',
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        radiusMeters: data.radius || 100,
      }
    })
    return NextResponse.json({ success: true, id: sekolah.id })
  }

  if (action === 'create') {
    const userEmail = data?.email
    if (!userEmail || !data?.name) return NextResponse.json({ error: 'Email dan nama wajib' }, { status: 400 })
    const exists = await prisma.user.findUnique({ where: { email: userEmail } })
    if (exists) return NextResponse.json({ error: 'Email sudah digunakan' }, { status: 409 })

    // Tentukan sekolah
    let sekolahId = data?.tenantId
    if (!sekolahId) {
      const first = await prisma.sekolah.findFirst()
      if (!first) return NextResponse.json({ error: 'Belum ada sekolah. Buat tenant dulu.' }, { status: 400 })
      sekolahId = first.id
    }

    const hash = await bcrypt.hash(data.password || 'ChangeMe123!', 10)
    const role = ['ADMIN','KEPALA_SEKOLAH','GURU','SISWA','ORANG_TUA'].includes(data.role?.toUpperCase())
      ? data.role.toUpperCase() as any : 'GURU'

    const user = await prisma.user.create({
      data: { nama: data.name, email: userEmail, password: hash, role, sekolahId }
    })
    return NextResponse.json({ success: true, id: user.id })
  }

  if (action === 'delete') {
    const userEmail = email || data?.email
    if (userEmail) {
      await prisma.user.updateMany({ where: { email: userEmail }, data: { aktif: false } })
    }
    return NextResponse.json({ success: true })
  }

  if (action === 'reactivate') {
    const userEmail = email || data?.email
    if (userEmail) {
      await prisma.user.updateMany({ where: { email: userEmail }, data: { aktif: true } })
    }
    return NextResponse.json({ success: true })
  }

  if (action === 'updateRole') {
    const userEmail = email || data?.email
    const roleMap: Record<string, string> = {
      owner: 'ADMIN', admin: 'ADMIN', practitioner: 'GURU', guru: 'GURU', siswa: 'SISWA'
    }
    const role = roleMap[data?.role?.toLowerCase()] || 'GURU'
    if (userEmail) {
      await prisma.user.updateMany({ where: { email: userEmail }, data: { role: role as any } })
    }
    return NextResponse.json({ success: true })
  }

  if (action === 'moveTenant') {
    const userEmail = email || data?.email
    if (userEmail && data?.tenantId) {
      await prisma.user.updateMany({ where: { email: userEmail }, data: { sekolahId: data.tenantId } })
    }
    return NextResponse.json({ success: true })
  }

  if (action === 'updateTenant') {
    if (!data?.id) return NextResponse.json({ error: 'ID sekolah wajib' }, { status: 400 })
    await prisma.sekolah.update({
      where: { id: data.id },
      data: { nama: data.name, npsn: data.npsn || undefined }
    })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Action tidak dikenal' }, { status: 400 })
}
