import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest, signToken, SessionPayload, COOKIE_NAME } from '@/lib/auth'
import { resetDemoData } from '@/lib/demo-seed'

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7,
  path: '/',
}

// GET /api/demo/reset — cek apakah tenant sesi saat ini adalah demo
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session?.tenantId) return NextResponse.json({ isDemo: false })

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { isDemo: true, demoExpiresAt: true },
  })
  return NextResponse.json({ isDemo: tenant?.isDemo ?? false, demoExpiresAt: tenant?.demoExpiresAt ?? null })
}

// POST /api/demo/reset — reset manual oleh pengguna demo
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { isDemo: true },
    })
    if (!tenant?.isDemo) {
      return NextResponse.json({ error: 'Bukan tenant demo' }, { status: 403 })
    }

    const result = await resetDemoData(session.tenantId)

    const payload: SessionPayload = {
      userId: session.userId,
      email: session.email,
      nama: session.nama,
      avatarUrl: session.avatarUrl,
      isSuperAdmin: session.isSuperAdmin,
      tenantId: result.tenant.id,
      tenantSlug: result.tenant.slug,
      tenantNama: result.tenant.nama,
      tenantType: result.tenant.type as 'PERUSAHAAN',
      role: 'TENANT_ADMIN',
      memberId: result.adminMember.id,
      planStatus: 'ACTIVE',
    }
    const token = await signToken(payload)
    const res = NextResponse.json({ success: true })
    res.cookies.set(COOKIE_NAME, token, COOKIE_OPTS)
    return res
  } catch (err) {
    console.error('[demo/reset]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
