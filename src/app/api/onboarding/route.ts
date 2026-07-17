import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

// POST /api/onboarding
// Buat Tenant baru + aktivasi Trial 14 hari + TENANT_ADMIN member
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { type, nama, slug, alamat, telepon } = await req.json()

    if (!nama?.trim() || !slug?.trim() || !type) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    const cleanSlug = slug.trim().toLowerCase()
    if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
      return NextResponse.json(
        { error: 'ID unik hanya boleh huruf kecil, angka, dan tanda -' },
        { status: 400 }
      )
    }

    const existing = await prisma.tenant.findUnique({ where: { slug: cleanSlug } })
    if (existing) {
      return NextResponse.json({ error: 'ID unik sudah dipakai, coba yang lain' }, { status: 409 })
    }

    const trialPlan = await prisma.plan.findUnique({ where: { name: 'TRIAL' } })
    if (!trialPlan) {
      return NextResponse.json({ error: 'Konfigurasi plan belum ada, jalankan seed dulu' }, { status: 500 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          nama: nama.trim(),
          slug: cleanSlug,
          type,
          alamat: alamat?.trim() || null,
          telepon: telepon?.trim() || null,
          planId: trialPlan.id,
        },
      })

      const berakhir = new Date()
      berakhir.setDate(berakhir.getDate() + 14)

      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          status: 'TRIAL',
          mulai: new Date(),
          berakhir,
        },
      })

      const member = await tx.tenantMember.create({
        data: {
          userId: session.userId,
          tenantId: tenant.id,
          role: 'TENANT_ADMIN',
        },
      })

      return { tenant, member }
    })

    return NextResponse.json({
      success: true,
      tenantId: result.tenant.id,
      memberId: result.member.id,
    })
  } catch (err) {
    console.error('[onboarding]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
