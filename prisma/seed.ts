import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Z-Absen...\n')

  // ── Plans ──────────────────────────────────────────────────────────
  const plans = [
    {
      name: 'TRIAL' as const,
      maxAnggota: 10, maxLokasi: 1,
      hargaBulanan: 0, hargaTahunan: 0,
      fitur: { whatsapp: false, telegram: false, export: true, faceRec: true, laporan: true, multiLokasi: false },
    },
    {
      name: 'STARTER' as const,
      maxAnggota: 25, maxLokasi: 1,
      hargaBulanan: 99000, hargaTahunan: 990000,
      fitur: { whatsapp: false, telegram: false, export: true, faceRec: true, laporan: true, multiLokasi: false },
    },
    {
      name: 'BISNIS' as const,
      maxAnggota: 100, maxLokasi: 3,
      hargaBulanan: 249000, hargaTahunan: 2490000,
      fitur: { whatsapp: true, telegram: false, export: true, faceRec: true, laporan: true, multiLokasi: true },
    },
    {
      name: 'PRO' as const,
      maxAnggota: 500, maxLokasi: 10,
      hargaBulanan: 499000, hargaTahunan: 4990000,
      fitur: { whatsapp: true, telegram: true, export: true, faceRec: true, laporan: true, multiLokasi: true },
    },
    {
      name: 'ENTERPRISE' as const,
      maxAnggota: -1, maxLokasi: -1,
      hargaBulanan: 0, hargaTahunan: 0,
      fitur: { whatsapp: true, telegram: true, export: true, faceRec: true, laporan: true, multiLokasi: true },
    },
  ]

  for (const plan of plans) {
    await prisma.plan.upsert({ where: { name: plan.name }, update: plan, create: plan })
    console.log(`  ✓ Plan ${plan.name}`)
  }

  // ── Super Admin ────────────────────────────────────────────────────
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL ?? 'admin@zomet.my.id'
  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: { isSuperAdmin: true },
    create: { email: superAdminEmail, nama: 'Super Admin', isSuperAdmin: true },
  })
  console.log(`\n  ✓ Super Admin: ${superAdmin.email}`)

  console.log('\n✅ Seeding selesai!')
  console.log('\nCatatan penting:')
  console.log('  • Tambahkan SUPER_ADMIN_EMAIL=email-google-kamu@gmail.com ke .env')
  console.log('  • Login via SSO Z One untuk akses Super Admin')
  console.log('  • User lain cukup buka z-absen, login via Z One, lalu daftar organisasi')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
