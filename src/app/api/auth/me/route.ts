import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ user: null })

  return NextResponse.json({
    user: {
      id: session.userId,
      nama: session.nama,
      email: session.email,
      avatarUrl: session.avatarUrl,
      role: session.role,
      isSuperAdmin: session.isSuperAdmin,
      tenantId: session.tenantId,
      tenantNama: session.tenantNama,
      tenantType: session.tenantType,
      memberId: session.memberId,
      planStatus: session.planStatus,
    },
  })
}
