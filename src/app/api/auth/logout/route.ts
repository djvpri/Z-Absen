import { NextResponse } from 'next/server'

export async function GET() {
  const res = NextResponse.redirect(new URL('/auth/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'))
  res.cookies.set('sihadir_token', '', { maxAge: 0, path: '/' })
  return res
}
