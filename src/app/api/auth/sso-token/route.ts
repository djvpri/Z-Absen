import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, signToken, SessionPayload, COOKIE_NAME } from '@/lib/auth'

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7,
  path: '/',
}

// POST /api/auth/sso-token
// Dipanggil setelah user pilih tenant di /pilih-organisasi
// Body: { memberId }
export async function POST(req: NextRequest) {
  try {
    const tempToken = req.cookies.get(COOKIE_NAME)?.value
    if (!tempToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await verifyToken(tempToken)
    if (!session) return NextResponse.json({ error: 'Session tidak valid' }, { status: 401 })

    const { memberId } = await req.json()
    if (!memberId) return NextResponse.json({ error: 'memberId diperlukan' }, { status: 400 })

    // Pastikan member ini milik user yang sedang login
    const member = await prisma.tenantMember.findFirst({
      where: { id: memberId, userId: session.userId, aktif: true },
      include: {
        user: true,
        tenant: { include: { plan: true, subscription: true } },
      },
    })

    if (!member) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

    const payload: SessionPayload = {
      userId: member.user.id,
      email: member.user.email,
      nama: member.user.nama,
      avatarUrl: member.user.avatarUrl,
      isSuperAdmin: member.user.isSuperAdmin,
      tenantId: member.tenant.id,
      tenantSlug: member.tenant.slug,
      tenantNama: member.tenant.nama,
      tenantType: member.tenant.type,
      role: member.role,
      memberId: member.id,
      planStatus: member.tenant.subscription?.status ?? 'TRIAL',
    }

    const token = await signToken(payload)
    const redirect = ['TENANT_ADMIN', 'SUPER_ADMIN'].includes(member.role)
      ? '/admin/dashboard'
      : '/check-in'

    const res = NextResponse.json({ success: true, redirect })
    res.cookies.set(COOKIE_NAME, token, COOKIE_OPTS)
    return res
  } catch (err) {
    console.error('[sso-token]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/auth/sso-token → logout
export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.delete(COOKIE_NAME)
  return res
}
