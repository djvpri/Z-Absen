import { NextResponse } from 'next/server'
import { COOKIE_NAME } from '@/lib/auth'

export async function GET() {
  const zoneUrl = process.env.NEXT_PUBLIC_ZONE_URL ?? 'https://zone.zomet.my.id'
  const res = NextResponse.redirect(zoneUrl)
  res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' })
  return res
}

export async function POST() {
  const res = NextResponse.json({ success: true })
  res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' })
  return res
}
