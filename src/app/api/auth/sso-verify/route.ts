import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyZOneToken, signToken, SessionPayload, COOKIE_NAME } from '@/lib/auth'

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 hari
  path: '/',
}

// POST /api/auth/sso-verify
// Dipanggil oleh /sso setelah menerima token dari Z One
export async function POST(req: NextRequest) {
  try {
    const { token, inviteToken } = await req.json()
    if (!token) {
      return NextResponse.json({ error: 'Token tidak ada' }, { status: 400 })
    }

    // ── 1. Verifikasi token Z One ─────────────────────────────────────
    const { user: zoneUser } = await verifyZOneToken(token)
    if (!zoneUser) {
      return NextResponse.json({ error: 'Token SSO tidak valid atau kedaluwarsa' }, { status: 401 })
    }

    // ── 2. Cari atau buat User lokal ──────────────────────────────────
    let user = await prisma.user.findUnique({ where: { email: zoneUser.email } })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: zoneUser.email,
          nama: zoneUser.name ?? zoneUser.email,
          avatarUrl: zoneUser.image ?? null,
        },
      })
    } else {
      // Update nama/avatar jika berubah di Z One
      if (user.nama !== zoneUser.name || (!user.avatarUrl && zoneUser.image)) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { nama: zoneUser.name, avatarUrl: zoneUser.image ?? user.avatarUrl },
        })
      }
    }

    // ── 3. Proses invite link (jika ada) ─────────────────────────────
    if (inviteToken) {
      const invite = await prisma.invite.findUnique({
        where: { token: inviteToken },
      })

      if (invite && !invite.usedAt && invite.expiredAt > new Date()) {
        const emailCocok = !invite.email || invite.email === user.email

        if (emailCocok) {
          const existing = await prisma.tenantMember.findUnique({
            where: { userId_tenantId: { userId: user.id, tenantId: invite.tenantId } },
          })
          if (!existing) {
            await prisma.tenantMember.create({
              data: {
                userId: user.id,
                tenantId: invite.tenantId,
                role: invite.role,
                jabatan: invite.jabatan,
              },
            })
          }
          await prisma.invite.update({ where: { id: invite.id }, data: { usedAt: new Date() } })
        }
      }
    }

    // ── 4. Super Admin → langsung dashboard super admin ───────────────
    if (user.isSuperAdmin) {
      const payload: SessionPayload = {
        userId: user.id, email: user.email, nama: user.nama, avatarUrl: user.avatarUrl,
        isSuperAdmin: true, tenantId: null, tenantSlug: null, tenantNama: null,
        tenantType: null, role: 'SUPER_ADMIN', memberId: null, planStatus: null,
      }
      const sessionToken = await signToken(payload)
      const res = NextResponse.json({ success: true, redirect: '/super-admin' })
      res.cookies.set(COOKIE_NAME, sessionToken, COOKIE_OPTS)
      return res
    }

    // ── 5. Cek semua tenant membership ───────────────────────────────
    const memberships = await prisma.tenantMember.findMany({
      where: { userId: user.id, aktif: true },
      include: {
        tenant: { include: { plan: true, subscription: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    // ── 6. Belum punya tenant → onboarding ───────────────────────────
    if (memberships.length === 0) {
      const payload: SessionPayload = {
        userId: user.id, email: user.email, nama: user.nama, avatarUrl: user.avatarUrl,
        isSuperAdmin: false, tenantId: null, tenantSlug: null, tenantNama: null,
        tenantType: null, role: null, memberId: null, planStatus: null,
      }
      const sessionToken = await signToken(payload)
      const res = NextResponse.json({ success: true, redirect: '/onboarding' })
      res.cookies.set(COOKIE_NAME, sessionToken, COOKIE_OPTS)
      return res
    }

    // ── 7. Tepat 1 tenant → langsung login ───────────────────────────
    if (memberships.length === 1) {
      const m = memberships[0]
      const payload = buildPayload(user, m)
      const sessionToken = await signToken(payload)
      const redirect = ['TENANT_ADMIN', 'SUPER_ADMIN'].includes(m.role)
        ? '/admin/dashboard'
        : '/check-in'
      const res = NextResponse.json({ success: true, redirect })
      res.cookies.set(COOKIE_NAME, sessionToken, COOKIE_OPTS)
      return res
    }

    // ── 8. Banyak tenant → pilih organisasi ──────────────────────────
    const payload: SessionPayload = {
      userId: user.id, email: user.email, nama: user.nama, avatarUrl: user.avatarUrl,
      isSuperAdmin: false, tenantId: null, tenantSlug: null, tenantNama: null,
      tenantType: null, role: null, memberId: null, planStatus: null,
    }
    const tempToken = await signToken(payload)

    const res = NextResponse.json({
      success: true,
      redirect: '/pilih-organisasi',
      tenants: memberships.map((m) => ({
        memberId: m.id,
        tenantId: m.tenantId,
        tenantSlug: m.tenant.slug,
        tenantNama: m.tenant.nama,
        tenantType: m.tenant.type,
        role: m.role,
        planStatus: m.tenant.subscription?.status ?? 'TRIAL',
        logoUrl: m.tenant.logoUrl,
      })),
    })
    res.cookies.set(COOKIE_NAME, tempToken, COOKIE_OPTS)
    return res
  } catch (err) {
    console.error('[sso-verify]', err)
    return NextResponse.json({ error: 'Gagal memproses SSO' }, { status: 500 })
  }
}

// ── Helper ────────────────────────────────────────────────────────────

function buildPayload(
  user: { id: string; email: string; nama: string; avatarUrl?: string | null; isSuperAdmin: boolean },
  m: {
    id: string
    role: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'ANGGOTA' | 'WALI'
    tenant: {
      id: string; slug: string; nama: string; type: 'SEKOLAH' | 'PERUSAHAAN'
      subscription: { status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' } | null
    }
  }
): SessionPayload {
  return {
    userId: user.id, email: user.email, nama: user.nama,
    avatarUrl: user.avatarUrl, isSuperAdmin: user.isSuperAdmin,
    tenantId: m.tenant.id, tenantSlug: m.tenant.slug, tenantNama: m.tenant.nama,
    tenantType: m.tenant.type, role: m.role, memberId: m.id,
    planStatus: m.tenant.subscription?.status ?? 'TRIAL',
  }
}
