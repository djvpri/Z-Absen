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
      select: { id: true, nama: true, email: true, isSuperAdmin: true, createdAt: true },
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

    if (action === 'updatePlan') {
      if (!data?.tenantId || !data?.plan) {
        return NextResponse.json({ error: 'tenantId & plan wajib' }, { status: 400 })
      }
      const plan = await prisma.plan.findUnique({ where: { name: data.plan.toUpperCase() } })
      if (!plan) return NextResponse.json({ error: 'Plan tidak ditemukan' }, { status: 404 })

      await prisma.tenant.update({ where: { id: data.tenantId }, data: { planId: plan.id } })
      const berakhir = new Date()
      berakhir.setMonth(berakhir.getMonth() + 1)
      await prisma.subscription.upsert({
        where: { tenantId: data.tenantId },
        update: { status: 'ACTIVE', berakhir },
        create: { tenantId: data.tenantId, status: 'ACTIVE', mulai: new Date(), berakhir },
      })
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
