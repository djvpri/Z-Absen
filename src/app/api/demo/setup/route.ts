import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { seedDemoData } from '@/lib/demo-seed'

const DEMO_SECRET = process.env.DEMO_SECRET || 'zabsen-demo-'

// POST /api/demo/setup
// Dipanggil sekali dari ZPos untuk inisialisasi demo tenant Z-Absen
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') ?? ''
    if (!auth.startsWith('Bearer ') || !auth.slice(7).startsWith(DEMO_SECRET)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await prisma.tenant.findFirst({
      where: { slug: 'demo-sihadir', isDemo: true },
    })
    if (existing) {
      return NextResponse.json({ success: true, alreadyExists: true, tenantId: existing.id })
    }

    const result = await seedDemoData()
    return NextResponse.json({ success: true, tenantId: result.tenant.id })
  } catch (err) {
    console.error('[demo/setup]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
