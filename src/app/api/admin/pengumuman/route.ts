import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(role: string | null) {
  return ['TENANT_ADMIN', 'SUPER_ADMIN'].includes(role ?? '')
}

// GET /api/admin/pengumuman — list all (termasuk non-aktif) + jumlah pembaca
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const pengumuman = await prisma.pengumuman.findMany({
    where: { tenantId: session.tenantId! },
    include: {
      _count: { select: { bacaList: true } },
    },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
  })

  // Total active members untuk hitung % dibaca
  const totalMember = await prisma.tenantMember.count({
    where: { tenantId: session.tenantId!, aktif: true },
  })

  return NextResponse.json({ pengumuman, totalMember })
}

// POST /api/admin/pengumuman — buat pengumuman baru
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { judul, isi, prioritas, pinned, targetRole, tanggalExpiry } = body

  if (!judul?.trim() || !isi?.trim()) {
    return NextResponse.json({ error: 'Judul dan isi wajib diisi' }, { status: 400 })
  }

  const pengumuman = await prisma.pengumuman.create({
    data: {
      tenantId: session.tenantId!,
      judul: judul.trim(),
      isi: isi.trim(),
      prioritas: prioritas || 'NORMAL',
      pinned: pinned === true,
      targetRole: targetRole || null,
      tanggalExpiry: tanggalExpiry ? new Date(tanggalExpiry) : null,
      aktif: true,
    },
  })

  return NextResponse.json({ success: true, pengumuman }, { status: 201 })
}
