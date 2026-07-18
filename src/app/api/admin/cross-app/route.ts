export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    const tenants = await prisma.tenant.findMany({
      select: { id: true, nama: true, slug: true, type: true, subscription: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })

    const users = await prisma.user.findMany({
      select: {
        id: true, nama: true, email: true, isSuperAdmin: true, createdAt: true,
        memberships: {
          where: { aktif: true },
          select: { tenantId: true, role: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      tenants: tenants.map((t) => ({
        id: t.id,
        name: t.nama,
        slug: t.slug,
        type: t.type,
        plan: t.subscription?.status ?? 'TRIAL',
        active: t.subscription?.status === 'ACTIVE' || t.subscription?.status === 'TRIAL',
        expires_at: t.subscription?.berakhir ?? null,
      })),
      users: users.map((u) => ({
        id: u.id,
        name: u.nama,
        email: u.email,
        role: u.isSuperAdmin ? 'SUPER_ADMIN' : 'USER',
        tenantId: u.memberships[0]?.tenantId ?? null,
        active: true,
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

    if (action === 'createTenant') {
      const name = data?.name?.trim()
      if (!name) return NextResponse.json({ error: 'name wajib' }, { status: 400 })
      const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)
      const slug = slugBase || `tenant-${Date.now()}`
      let plan = await prisma.plan.findFirst({ where: { name: 'TRIAL' } })
      if (!plan) {
        plan = await prisma.plan.create({
          data: { name: 'TRIAL', maxAnggota: 10, maxLokasi: 1, hargaBulanan: 0, hargaTahunan: 0, fitur: {} },
        })
      }
      const tenant = await prisma.tenant.create({
        data: { nama: name, slug, type: 'PERUSAHAAN', planId: plan.id },
      })
      const berakhir = new Date()
      berakhir.setDate(berakhir.getDate() + 14)
      await prisma.subscription.create({
        data: { tenantId: tenant.id, status: 'TRIAL', mulai: new Date(), berakhir },
      })
      return NextResponse.json({ success: true, tenantId: tenant.id })
    }

    if (action === 'deleteTenant') {
      const tenantId = data?.tenantId
      if (!tenantId) return NextResponse.json({ error: 'tenantId wajib' }, { status: 400 })
      await prisma.subscription.updateMany({ where: { tenantId }, data: { status: 'CANCELLED' } })
      return NextResponse.json({ success: true })
    }

    if (action === 'reactivateTenant') {
      const tenantId = data?.tenantId
      if (!tenantId) return NextResponse.json({ error: 'tenantId wajib' }, { status: 400 })
      const berakhir = new Date()
      berakhir.setMonth(berakhir.getMonth() + 1)
      await prisma.subscription.upsert({
        where: { tenantId },
        update: { status: 'ACTIVE', berakhir },
        create: { tenantId, status: 'ACTIVE', mulai: new Date(), berakhir },
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'updatePlan') {
      if (!data?.tenantId || !data?.plan) {
        return NextResponse.json({ error: 'tenantId & plan wajib' }, { status: 400 })
      }
      const plan = await prisma.plan.findFirst({ where: { name: data.plan.toUpperCase() } })
      if (!plan) return NextResponse.json({ error: 'Plan tidak ditemukan' }, { status: 404 })
      await prisma.tenant.update({ where: { id: data.tenantId }, data: { planId: plan.id } })
      const berakhir = data.planExpires ? new Date(data.planExpires) : (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d })()
      await prisma.subscription.upsert({
        where: { tenantId: data.tenantId },
        update: { status: 'ACTIVE', berakhir },
        create: { tenantId: data.tenantId, status: 'ACTIVE', mulai: new Date(), berakhir },
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'create') {
      // Z-Absen SSO-only — cukup buat record User, tidak ada password
      if (!email) return NextResponse.json({ error: 'email wajib' }, { status: 400 })
      const user = await prisma.user.upsert({
        where: { email },
        update: { nama: data?.name ?? email },
        create: { email, nama: data?.name ?? email },
      })
      if (data?.tenantId) {
        await prisma.tenantMember.upsert({
          where: { userId_tenantId: { userId: user.id, tenantId: data.tenantId } },
          update: { aktif: true },
          create: { userId: user.id, tenantId: data.tenantId, role: 'ANGGOTA', jabatan: '' },
        })
      }
      return NextResponse.json({ success: true, userId: user.id })
    }

    if (action === 'moveTenant') {
      if (!data?.tenantId) return NextResponse.json({ error: 'tenantId wajib' }, { status: 400 })
      const user = await prisma.user.findUnique({ where: { email: email! } })
      if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
      await prisma.tenantMember.upsert({
        where: { userId_tenantId: { userId: user.id, tenantId: data.tenantId } },
        update: { aktif: true },
        create: { userId: user.id, tenantId: data.tenantId, role: 'ANGGOTA', jabatan: '' },
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'updateRole') {
      if (!email || !data?.role) return NextResponse.json({ error: 'email & role wajib' }, { status: 400 })
      const user = await prisma.user.findUnique({ where: { email } })
      if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
      const roleMap: Record<string, 'TENANT_ADMIN' | 'ANGGOTA'> = { admin: 'TENANT_ADMIN', kasir: 'ANGGOTA' }
      const role = roleMap[data.role] ?? 'ANGGOTA'
      await prisma.tenantMember.updateMany({ where: { userId: user.id }, data: { role } })
      return NextResponse.json({ success: true })
    }

    if (action === 'delete' || action === 'deactivate') {
      if (!email) return NextResponse.json({ error: 'email wajib' }, { status: 400 })
      const user = await prisma.user.findUnique({ where: { email } })
      if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
      await prisma.tenantMember.updateMany({ where: { userId: user.id }, data: { aktif: false } })
      return NextResponse.json({ success: true, deactivated: true })
    }

    if (action === 'reactivate') {
      if (!email) return NextResponse.json({ error: 'email wajib' }, { status: 400 })
      const user = await prisma.user.findUnique({ where: { email } })
      if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
      await prisma.tenantMember.updateMany({ where: { userId: user.id }, data: { aktif: true } })
      return NextResponse.json({ success: true, reactivated: true })
    }

    if (action === 'setSuperAdmin') {
      if (!email) return NextResponse.json({ error: 'email wajib' }, { status: 400 })
      const user = await prisma.user.findUnique({ where: { email } })
      if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
      await prisma.user.update({ where: { email }, data: { isSuperAdmin: data?.value !== false } })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Cross-app POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
