export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Migration 2026-07-02: Dual secret support during transition
const NEW_SECRET = process.env.CROSS_APP_SECRET || 'uurclTHL375CiZeWi2g4T3GczU2YNY9I1wzjlsVTgSk'
const OLD_SECRET = 'z-ecosystem-admin-2026'
const VALID_SECRETS = [NEW_SECRET, OLD_SECRET]

function checkAuth(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.replace('Bearer ', '')
  return token ? VALID_SECRETS.includes(token) : false
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sekolah = await prisma.sekolah.findMany({
      select: {
        id: true,
        nama: true,
        npsn: true,
        alamat: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const users = await prisma.user.findMany({
      select: {
        id: true,
        nama: true,
        email: true,
        role: true,
        nip: true,
        nis: true,
        aktif: true,
        sekolahId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      tenants: sekolah.map(s => ({
        id: s.id,
        name: s.nama,
        plan: 'pro', // Z-Absen tidak punya plan tier
        active: true,
        expires_at: null,
      })),
      users: users.map(u => ({
        id: u.id,
        name: u.nama,
        email: u.email,
        role: u.role,
        active: u.aktif,
        tenantId: u.sekolahId,
      })),
    })
  } catch (error) {
    console.error('Cross-app GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { action, email, data } = await req.json()

    // --- Tenant (Sekolah) actions ---
    if (action === 'createTenant') {
      const name = String(data?.name || '').trim()
      if (!name) return NextResponse.json({ error: 'name wajib diisi' }, { status: 400 })
      
      const sekolah = await prisma.sekolah.create({
        data: {
          nama: name,
          alamat: data?.alamat || '-',
          latitude: -0.5,
          longitude: 109.5,
          radiusMeters: 100,
        },
      })
      return NextResponse.json({ success: true, tenant: { id: sekolah.id, name: sekolah.nama } }, { status: 201 })
    }

    if (action === 'updateTenant') {
      if (!data?.tenantId) return NextResponse.json({ error: 'tenantId wajib' }, { status: 400 })
      await prisma.sekolah.update({
        where: { id: data.tenantId },
        data: {
          nama: data.name || undefined,
          alamat: data.alamat || undefined,
        },
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'deleteTenant') {
      // Z-Absen: soft-delete user, tapi sekolah tetap ada (historical data)
      if (!data?.tenantId) return NextResponse.json({ error: 'tenantId wajib' }, { status: 400 })
      await prisma.user.updateMany({
        where: { sekolahId: data.tenantId },
        data: { aktif: false },
      })
      return NextResponse.json({ success: true, deactivated: true })
    }

    if (action === 'updatePlan') {
      // Z-Absen tidak punya plan tier — return success tanpa perubahan
      return NextResponse.json({ success: true, note: 'Z-Absen tidak menggunakan plan tier' })
    }

    // --- User actions ---
    if (action === 'create') {
      if (!data?.name || !data?.email || !data?.password) {
        return NextResponse.json({ error: 'name, email, password wajib' }, { status: 400 })
      }
      const existing = await prisma.user.findUnique({ where: { email: data.email } })
      if (existing) return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 })

      let sekolahId = data.tenantId
      if (!sekolahId) {
        const firstSekolah = await prisma.sekolah.findFirst({ orderBy: { createdAt: 'asc' } })
        if (!firstSekolah) return NextResponse.json({ error: 'Belum ada sekolah' }, { status: 400 })
        sekolahId = firstSekolah.id
      }

      const hashed = await bcrypt.hash(data.password, 10)
      const user = await prisma.user.create({
        data: {
          nama: data.name,
          email: data.email,
          password: hashed,
          role: data.role || 'GURU',
          sekolahId,
        },
      })
      return NextResponse.json({ success: true, user: { id: user.id, name: user.nama, email: user.email } }, { status: 201 })
    }

    if (action === 'delete') {
      if (!email) return NextResponse.json({ error: 'email wajib' }, { status: 400 })
      const result = await prisma.user.updateMany({
        where: { email },
        data: { aktif: false },
      })
      if (!result.count) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
      return NextResponse.json({ success: true, deactivated: true })
    }

    if (action === 'updateRole') {
      if (!email || !data?.role) return NextResponse.json({ error: 'email & role wajib' }, { status: 400 })
      const validRoles = ['ADMIN', 'KEPALA_SEKOLAH', 'GURU', 'SISWA', 'ORANG_TUA']
      if (!validRoles.includes(data.role.toUpperCase())) {
        return NextResponse.json({ error: `Role tidak valid. Pilih: ${validRoles.join(', ')}` }, { status: 400 })
      }
      const result = await prisma.user.updateMany({
        where: { email },
        data: { role: data.role.toUpperCase() as any },
      })
      if (!result.count) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
      return NextResponse.json({ success: true })
    }

    if (action === 'reactivate') {
      if (!email) return NextResponse.json({ error: 'email wajib' }, { status: 400 })
      const result = await prisma.user.updateMany({
        where: { email },
        data: { aktif: true },
      })
      if (!result.count) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
      return NextResponse.json({ success: true, reactivated: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Cross-app POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
