import { NextResponse } from 'next/server'

// Login sekarang via SSO Z One — endpoint ini tidak digunakan lagi
export async function POST() {
  return NextResponse.json(
    { error: 'Login via SSO Z One. Buka /sso untuk masuk.' },
    { status: 410 }
  )
}
