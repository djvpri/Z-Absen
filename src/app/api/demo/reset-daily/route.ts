import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resetDemoData } from '@/lib/demo-seed'

const DEMO_SECRET = process.env.DEMO_SECRET || 'zabsen-demo-'

// POST /api/demo/reset-daily
// Dipanggil oleh ZPos cron harian untuk reset otomatis data demo
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') ?? ''
    if (!auth.startsWith('Bearer ') || !auth.slice(7).startsWith(DEMO_SECRET)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const demoTenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-sihadir', isDemo: true },
    })

    if (!demoTenant) {
      return NextResponse.json({ success: false, message: 'Demo tenant tidak ditemukan, skip reset' })
    }

    await resetDemoData(demoTenant.id)
    return NextResponse.json({ success: true, message: 'Demo Z-Absen berhasil direset' })
  } catch (err) {
    console.error('[demo/reset-daily]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
