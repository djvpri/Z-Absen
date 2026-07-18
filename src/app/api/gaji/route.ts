import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isAdmin = ['TENANT_ADMIN', 'SUPER_ADMIN'].includes(session.role ?? '')
  const { searchParams } = new URL(req.url)
  const bulan = parseInt(searchParams.get('bulan') || String(new Date().getMonth() + 1))
  const tahun = parseInt(searchParams.get('tahun') || String(new Date().getFullYear()))

  const gaji = await prisma.gaji.findMany({
    where: isAdmin
      ? { tenantId: session.tenantId, bulan, tahun }
      : { tenantId: session.tenantId, memberId: session.memberId!, bulan, tahun },
    include: {
      member: {
        include: {
          user: { select: { nama: true, email: true } },
          departemen: { select: { nama: true } },
        },
      },
    },
    orderBy: { member: { user: { nama: 'asc' } } },
  })

  return NextResponse.json({ gaji })
}

// PATCH /api/gaji — mark paid / update lembur / add komponen manual
export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !['TENANT_ADMIN', 'SUPER_ADMIN'].includes(session.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { gajiId, dibayarkan, lemburJam, tunjanganLainnya, potonganLainnya, catatan } = body

  const existing = await prisma.gaji.findUnique({ where: { id: gajiId } })
  if (!existing) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const updated = await prisma.gaji.update({
    where: { id: gajiId },
    data: {
      ...(dibayarkan !== undefined ? { dibayarkan, tanggalBayar: dibayarkan ? new Date() : null } : {}),
      ...(lemburJam !== undefined ? { lemburJam } : {}),
      ...(tunjanganLainnya !== undefined ? { tunjanganLainnya } : {}),
      ...(potonganLainnya !== undefined ? { potonganLainnya } : {}),
      ...(catatan !== undefined ? { catatan } : {}),
    },
  })

  return NextResponse.json({ success: true, gaji: updated })
}
