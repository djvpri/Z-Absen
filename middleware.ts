import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from './src/lib/auth'

const PUBLIC_ROUTES = [
  '/sso',
  '/onboarding',
  '/pilih-organisasi',
  '/pricing',
  '/join',
  '/api/auth/sso-verify',
  '/api/auth/sso-token',
  '/api/auth/logout',
  '/api/admin/cross-app',
  '/api/health',
  '/api/demo',
]

const ADMIN_ROUTES = ['/admin', '/super-admin']

const ZONE_URL = 'https://zone.zomet.my.id'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── 1. Route publik ───────────────────────────────────────────────
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // ── 2. Cek session ────────────────────────────────────────────────
  const session = await getSessionFromRequest(req)

  if (!session) {
    // Belum login → ke Z One
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin
    const ssoCallback = encodeURIComponent(`${appUrl}/sso`)
    return NextResponse.redirect(`${ZONE_URL}/sso?app=zabsen&redirect=${ssoCallback}`)
  }

  // ── 3. Sudah SSO tapi belum punya tenant ─────────────────────────
  if (!session.tenantId && !session.isSuperAdmin) {
    if (!pathname.startsWith('/onboarding') && !pathname.startsWith('/pilih-organisasi')) {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }
    return NextResponse.next()
  }

  // ── 4. Subscription expired → billing ────────────────────────────
  if (
    session.tenantId &&
    session.planStatus === 'EXPIRED' &&
    !pathname.startsWith('/billing') &&
    !pathname.startsWith('/api/billing')
  ) {
    return NextResponse.redirect(new URL('/billing?expired=1', req.url))
  }

  // ── 5. Admin routes ───────────────────────────────────────────────
  if (pathname.startsWith('/super-admin') && !session.isSuperAdmin) {
    return NextResponse.redirect(new URL('/check-in', req.url))
  }

  if (pathname.startsWith('/admin') && !['TENANT_ADMIN', 'SUPER_ADMIN'].includes(session.role ?? '')) {
    return NextResponse.redirect(new URL('/check-in', req.url))
  }

  // ── 6. Inject context ke header untuk API routes ─────────────────
  const headers = new Headers(req.headers)
  if (session.tenantId) headers.set('x-tenant-id', session.tenantId)
  if (session.memberId) headers.set('x-member-id', session.memberId)
  if (session.role) headers.set('x-role', session.role)
  headers.set('x-user-id', session.userId)

  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|models|public).*)'],
}
