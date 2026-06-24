import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'

const CROSS_APP_SECRET = process.env.CROSS_APP_SECRET || 'z-ecosystem-admin-2026'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token) return NextResponse.json({ error: 'Token wajib diisi' }, { status: 400 })

    // Verifikasi token dari Z One
    let payload: any
    try {
      payload = jwt.verify(token, CROSS_APP_SECRET)
    } catch {
      return NextResponse.json({ error: 'Token SSO tidak valid atau kedaluwarsa' }, { status: 401 })
    }

    if (payload.app !== 'zabsen') {
      return NextResponse.json({ error: 'Token ini bukan untuk Z-Absen' }, { status: 400 })
    }

    const email = String(payload.email || '').trim().toLowerCase()
    if (!email) return NextResponse.json({ error: 'Email tidak ada di token' }, { status: 400 })

    // Cari user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { sekolah: true },
    })

    if (!user) {
      return NextResponse.json({
        error: `Akun ${email} belum terdaftar di Z-Absen. Hubungi admin sekolah.`,
        code: 'USER_NOT_FOUND',
      }, { status: 404 })
    }

    if (!user.aktif) {
      return NextResponse.json({ error: 'Akun Anda dinonaktifkan.' }, { status: 403 })
    }

    // Buat session token
    const sessionToken = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      sekolahId: user.sekolahId,
      nama: user.nama,
    })

    // Redirect berdasarkan role
    const redirect = ['ADMIN', 'KEPALA_SEKOLAH'].includes(user.role)
      ? '/admin/dashboard'
      : '/check-in'

    const res = NextResponse.json({ success: true, redirect })
    res.cookies.set('sihadir_token', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return res
  } catch (err) {
    console.error('SSO verify error:', err)
    return NextResponse.json({ error: 'Gagal memproses SSO' }, { status: 500 })
  }
}
