import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from './src/lib/auth'

const publicRoutes = ['/auth/login', '/auth/register']
const adminRoutes = ['/admin']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (publicRoutes.some((r) => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  const session = await getSessionFromRequest(req)

  if (!session) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  if (adminRoutes.some((r) => pathname.startsWith(r))) {
    if (!['ADMIN', 'KEPALA_SEKOLAH'].includes(session.role)) {
      return NextResponse.redirect(new URL('/check-in', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|models|api/auth/login).*)'],
}
