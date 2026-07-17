import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-dev-secret-ganti-di-production'
)
const CROSS_APP_SECRET = new TextEncoder().encode(
  process.env.CROSS_APP_SECRET || 'uurclTHL375CiZeWi2g4T3GczU2YNY9I1wzjlsVTgSk'
)

export const COOKIE_NAME = 'z-absen-session'

// =====================================================
// Tipe payload JWT Z-Absen
// =====================================================

export type SessionPayload = {
  userId: string
  email: string
  nama: string
  avatarUrl?: string | null
  isSuperAdmin: boolean
  // Tenant context — null berarti belum pilih tenant / baru SSO
  tenantId: string | null
  tenantSlug: string | null
  tenantNama: string | null
  tenantType: 'SEKOLAH' | 'PERUSAHAAN' | null
  role: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'ANGGOTA' | 'WALI' | null
  memberId: string | null
  planStatus: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | null
}

// =====================================================
// Sign & verify JWT session Z-Absen
// =====================================================

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

// =====================================================
// Ambil session dari request (cookie)
// =====================================================

export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

// =====================================================
// Verifikasi token SSO dari Z One
// Z One men-sign JWT dengan CROSS_APP_SECRET dan payload:
//   { app: 'zabsen', email, name, image, iat, exp }
// =====================================================

export type ZOneTokenPayload = {
  app: string
  email: string
  name: string
  image?: string | null
}

export async function verifyZOneToken(token: string): Promise<ZOneTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, CROSS_APP_SECRET)
    const p = payload as unknown as ZOneTokenPayload
    if (p.app !== 'zabsen') return null
    if (!p.email) return null
    return p
  } catch {
    return null
  }
}

// =====================================================
// Helper: cek apakah fitur plan tersedia
// =====================================================

type FiturKey = 'whatsapp' | 'telegram' | 'export' | 'faceRec' | 'laporan' | 'multiLokasi'

export function canUseFeature(
  fitur: Record<string, boolean> | null | undefined,
  key: FiturKey
): boolean {
  if (!fitur) return false
  return fitur[key] === true
}
