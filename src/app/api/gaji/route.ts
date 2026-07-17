import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !['TENANT_ADMIN', 'SUPER_ADMIN'].includes(session.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenantId = session.tenantId!
  const { searchParams } = new URL(req.url)
  const bulan = parseInt(searchParams.get('bulan') || String(new Date().getMonth() + 1))
  const tahun = parseInt(searchParams.get('tahun') || String(new Date().getFullYear()))

  const gaji = await prisma.gaji.findMany({
    where: { tenantId, bulan, tahun },
    include: { member: { include: { user: { select: { nama: true } } } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ gaji })
}
