import { prisma } from '@/lib/prisma'

const DEMO_SLUG = 'demo-sihadir'
const DEMO_EMAIL = 'demo@zomet.my.id'
const DEMO_NAMA = 'Demo User'

const ANGGOTA_DATA = [
  { email: 'budi.santoso@demo.sihadir', nama: 'Budi Santoso', jabatan: 'Staf Marketing' },
  { email: 'siti.rahayu@demo.sihadir', nama: 'Siti Rahayu', jabatan: 'Staf Keuangan' },
  { email: 'ahmad.fauzi@demo.sihadir', nama: 'Ahmad Fauzi', jabatan: 'Staf IT' },
  { email: 'dewi.susanti@demo.sihadir', nama: 'Dewi Susanti', jabatan: 'Staf HRD' },
  { email: 'rizky.pratama@demo.sihadir', nama: 'Rizky Pratama', jabatan: 'Staf Operasional' },
]

// Pola absensi deterministik: [dayOffset (0=hari ini, 6=6 hari lalu)]
// Masing-masing entry: idx = indeks anggota, menit = menit setelah 08:00
const ABSENSI_PATTERN: Array<Array<{ idx: number; status: string; menit: number }>> = [
  // Hari ini
  [
    { idx: 0, status: 'HADIR', menit: 5 },
    { idx: 1, status: 'HADIR', menit: 0 },
    { idx: 2, status: 'TERLAMBAT', menit: 25 },
    { idx: 3, status: 'HADIR', menit: 10 },
    // idx 4 tidak hadir
  ],
  // 1 hari lalu
  [
    { idx: 0, status: 'HADIR', menit: 3 },
    { idx: 1, status: 'TERLAMBAT', menit: 20 },
    { idx: 2, status: 'HADIR', menit: 8 },
    { idx: 3, status: 'HADIR', menit: 1 },
    { idx: 4, status: 'HADIR', menit: 12 },
  ],
  // 2 hari lalu
  [
    { idx: 0, status: 'HADIR', menit: 5 },
    { idx: 1, status: 'HADIR', menit: 7 },
    { idx: 2, status: 'HADIR', menit: 2 },
    { idx: 3, status: 'TERLAMBAT', menit: 30 },
    { idx: 4, status: 'HADIR', menit: 5 },
  ],
  // 3 hari lalu
  [
    { idx: 0, status: 'HADIR', menit: 10 },
    { idx: 1, status: 'HADIR', menit: 5 },
    { idx: 2, status: 'HADIR', menit: 8 },
    { idx: 3, status: 'HADIR', menit: 3 },
    { idx: 4, status: 'TERLAMBAT', menit: 22 },
  ],
  // 4 hari lalu
  [
    { idx: 0, status: 'TERLAMBAT', menit: 18 },
    { idx: 1, status: 'HADIR', menit: 5 },
    { idx: 2, status: 'HADIR', menit: 0 },
    { idx: 3, status: 'HADIR', menit: 7 },
    { idx: 4, status: 'HADIR', menit: 9 },
  ],
  // 5 hari lalu
  [
    { idx: 0, status: 'HADIR', menit: 5 },
    { idx: 1, status: 'HADIR', menit: 5 },
    // idx 2 tidak hadir
    { idx: 3, status: 'HADIR', menit: 12 },
    { idx: 4, status: 'HADIR', menit: 6 },
  ],
  // 6 hari lalu
  [
    { idx: 0, status: 'HADIR', menit: 2 },
    { idx: 1, status: 'TERLAMBAT', menit: 35 },
    { idx: 2, status: 'HADIR', menit: 8 },
    { idx: 3, status: 'HADIR', menit: 5 },
    { idx: 4, status: 'HADIR', menit: 5 },
  ],
]

export async function seedDemoData() {
  // Pastikan plan TRIAL ada
  let plan = await prisma.plan.findUnique({ where: { name: 'TRIAL' } })
  if (!plan) {
    plan = await prisma.plan.create({
      data: {
        name: 'TRIAL',
        maxAnggota: 10,
        maxLokasi: 1,
        hargaBulanan: 0,
        hargaTahunan: 0,
        fitur: { whatsapp: false, telegram: false, export: true, faceRec: false, laporan: true, multiLokasi: false },
      },
    })
  }

  // Upsert demo user
  const demoUser = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    create: { email: DEMO_EMAIL, nama: DEMO_NAMA },
    update: { nama: DEMO_NAMA },
  })

  // Upsert anggota users
  const anggotaUsers = await Promise.all(
    ANGGOTA_DATA.map((a) =>
      prisma.user.upsert({
        where: { email: a.email },
        create: { email: a.email, nama: a.nama },
        update: { nama: a.nama },
      })
    )
  )

  const berakhirDemo = new Date()
  berakhirDemo.setDate(berakhirDemo.getDate() + 30)
  const berakhirSubscription = new Date()
  berakhirSubscription.setDate(berakhirSubscription.getDate() + 30)

  // Buat tenant demo baru
  const tenant = await prisma.tenant.create({
    data: {
      nama: 'PT Demo',
      slug: DEMO_SLUG,
      type: 'PERUSAHAAN',
      isDemo: true,
      demoExpiresAt: berakhirDemo,
      planId: plan.id,
    },
  })

  await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      status: 'ACTIVE',
      mulai: new Date(),
      berakhir: berakhirSubscription,
    },
  })

  // Admin member (demo user)
  const adminMember = await prisma.tenantMember.create({
    data: {
      userId: demoUser.id,
      tenantId: tenant.id,
      role: 'TENANT_ADMIN',
      jabatan: 'Administrator',
    },
  })

  // Anggota members
  const anggotaMembers = await Promise.all(
    ANGGOTA_DATA.map((a, i) =>
      prisma.tenantMember.create({
        data: {
          userId: anggotaUsers[i].id,
          tenantId: tenant.id,
          role: 'ANGGOTA',
          jabatan: a.jabatan,
        },
      })
    )
  )

  // Lokasi (radius besar supaya GPS selalu pass di demo)
  const lokasi = await prisma.lokasi.create({
    data: {
      tenantId: tenant.id,
      nama: 'Kantor Demo',
      alamat: 'Jl. Demo No. 1, Jakarta Selatan',
      lat: -6.2088,
      lng: 106.8456,
      radius: 5000,
    },
  })

  // Jam absensi
  const jamAbsensi = await prisma.jamAbsensi.create({
    data: {
      tenantId: tenant.id,
      nama: 'Shift Reguler',
      hari: 'SENIN,SELASA,RABU,KAMIS,JUMAT',
      jamMasuk: '08:00',
      jamKeluar: '17:00',
      toleransi: 15,
    },
  })

  // Absensi 7 hari terakhir
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let dayOffset = 0; dayOffset < ABSENSI_PATTERN.length; dayOffset++) {
    const tanggal = new Date(today)
    tanggal.setDate(tanggal.getDate() - dayOffset)

    for (const p of ABSENSI_PATTERN[dayOffset]) {
      const anggota = anggotaMembers[p.idx]
      if (!anggota) continue

      const waktuMasuk = new Date(tanggal)
      waktuMasuk.setHours(8, p.menit, 0, 0)

      await prisma.absensi.create({
        data: {
          tenantId: tenant.id,
          memberId: anggota.id,
          lokasiId: lokasi.id,
          jamAbsensiId: jamAbsensi.id,
          tanggal,
          waktuMasuk,
          status: p.status as 'HADIR' | 'TERLAMBAT',
          latMasuk: -6.2088 + p.idx * 0.0001,
          lngMasuk: 106.8456 + p.idx * 0.0001,
        },
      })
    }
  }

  // 2 izin pending
  const tgl1 = new Date(today)
  tgl1.setDate(tgl1.getDate() + 1)
  const tgl2 = new Date(today)
  tgl2.setDate(tgl2.getDate() + 2)

  await prisma.izin.createMany({
    data: [
      {
        tenantId: tenant.id,
        memberId: anggotaMembers[1].id,
        jenis: 'IZIN',
        tanggalMulai: tgl1,
        tanggalSelesai: tgl1,
        alasan: 'Ada keperluan keluarga mendadak',
        status: 'MENUNGGU',
      },
      {
        tenantId: tenant.id,
        memberId: anggotaMembers[3].id,
        jenis: 'SAKIT',
        tanggalMulai: tgl2,
        tanggalSelesai: tgl2,
        alasan: 'Demam dan tidak enak badan',
        status: 'MENUNGGU',
      },
    ],
  })

  // Pengumuman
  await prisma.pengumuman.create({
    data: {
      tenantId: tenant.id,
      judul: 'Selamat Datang di PT Demo!',
      isi: 'Ini adalah akun demo. Semua fitur bisa dicoba tanpa data nyata. Data akan direset setiap hari secara otomatis.',
    },
  })

  return { tenant, adminMember }
}

export async function resetDemoData(tenantId: string) {
  await prisma.tenant.delete({ where: { id: tenantId } })
  return seedDemoData()
}
