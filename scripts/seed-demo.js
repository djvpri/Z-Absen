// Seed data DEMO untuk Z-Absen — mengisi sekolah akun demo dengan guru & siswa,
// jadwal absensi, absensi harian (~15 hari kerja), izin, dan gaji guru.
// SEMUA DATA FIKTIF. User hasil seed ditandai email berawalan "seed." agar bisa
// direset tanpa mengganggu akun login asli.
//
// IDEMPOTENT / RESET MANUAL: tiap dijalankan, user seed + absensi/izin/gaji-nya
// DIHAPUS lalu diisi ulang (sekolah & akun login asli TIDAK dihapus). Reset:
//   node scripts/seed-demo.js
// Target sekolah: user dgn email DEMO_EMAIL (default demo@zomet.my.id) -> sekolahId,
// fallback sekolah pertama.

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@zomet.my.id'
const now = new Date()
const rint = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

const FIRST = ['Budi', 'Sari', 'Andi', 'Dewi', 'Rizky', 'Putri', 'Agus', 'Maya', 'Fajar', 'Indah',
  'Hendra', 'Ratna', 'Yoga', 'Lestari', 'Bayu', 'Wulan', 'Dimas', 'Citra', 'Eko', 'Nadia', 'Reza', 'Sinta']
const LAST = ['Santoso', 'Wijaya', 'Kurniawan', 'Pratama', 'Nugroho', 'Halim', 'Saputra', 'Anggraini', 'Hidayat', 'Maharani']
const name = () => `${pick(FIRST)} ${pick(LAST)}`

function dateOnly(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
function lastWeekdays(count) {
  const days = []; const d = new Date(now)
  while (days.length < count) { if (d.getDay() !== 0 && d.getDay() !== 6) days.push(dateOnly(d)); d.setDate(d.getDate() - 1) }
  return days
}
function at(date, h, m) { const x = new Date(date); x.setHours(h, m, 0, 0); return x }

async function main() {
  // 1. Sekolah target
  const demoUser = await prisma.user.findFirst({ where: { email: DEMO_EMAIL } })
  let sekolahId = demoUser?.sekolahId
  if (!sekolahId) sekolahId = (await prisma.sekolah.findFirst())?.id
  if (!sekolahId) throw new Error('Tidak ada sekolah di Z-Absen. Buat sekolah dulu.')
  const sekolah = await prisma.sekolah.findUnique({ where: { id: sekolahId } })
  const tag = sekolahId.slice(0, 6)
  console.log(`Target sekolah: ${sekolah.nama}`)

  // 2. RESET user seed + turunannya
  const seeded = await prisma.user.findMany({ where: { sekolahId, email: { startsWith: 'seed.' } }, select: { id: true } })
  const oldIds = seeded.map((u) => u.id)
  if (oldIds.length) {
    await prisma.gaji.deleteMany({ where: { userId: { in: oldIds } } })
    await prisma.izin.deleteMany({ where: { OR: [{ userId: { in: oldIds } }, { approverId: { in: oldIds } }] } })
    await prisma.absensi.deleteMany({ where: { userId: { in: oldIds } } })
    await prisma.user.deleteMany({ where: { id: { in: oldIds } } })
  }
  console.log(`Data demo lama dibersihkan (${oldIds.length} user seed).`)

  // 3. Jadwal absensi (pakai yang ada, kalau tak ada buat baru)
  let jam = await prisma.jamAbsensi.findFirst({ where: { sekolahId } })
  if (!jam) {
    jam = await prisma.jamAbsensi.create({
      data: { sekolahId, nama: 'Jam Reguler', jamMasuk: '07:00', jamPulang: '15:00', toleransiMenit: 15, berlakuUntuk: ['GURU', 'SISWA'] },
    })
  }

  // 4. Buat guru (6) + siswa (24)
  const userRows = []
  for (let i = 1; i <= 6; i++) userRows.push({ sekolahId, nama: name(), email: `seed.guru.${i}@${tag}.demo`, password: 'seed-no-login', role: 'GURU', nip: `S${tag}-G${i}`, noHp: `0813${String(rint(10000000, 99999999))}`, wajahEmbedding: [] })
  for (let i = 1; i <= 24; i++) userRows.push({ sekolahId, nama: name(), email: `seed.siswa.${i}@${tag}.demo`, password: 'seed-no-login', role: 'SISWA', nis: `S${tag}-${1000 + i}`, noHp: `0857${String(rint(10000000, 99999999))}`, wajahEmbedding: [] })
  await prisma.user.createMany({ data: userRows })
  const users = await prisma.user.findMany({ where: { sekolahId, email: { startsWith: 'seed.' } }, select: { id: true, role: true } })
  const gurus = users.filter((u) => u.role === 'GURU')
  console.log(`User dibuat: ${users.length} (guru ${gurus.length}, siswa ${users.length - gurus.length})`)

  // 5. Absensi harian (~15 hari kerja) — batch
  const days = lastWeekdays(15)
  const absensiRows = []
  for (const u of users) {
    for (const d of days) {
      const r = Math.random()
      let status, waktuMasuk = null, waktuPulang = null
      if (r < 0.78) { status = 'HADIR'; waktuMasuk = at(d, 6, rint(40, 59)); waktuPulang = at(d, 15, rint(0, 20)) }
      else if (r < 0.88) { status = 'TERLAMBAT'; waktuMasuk = at(d, 7, rint(16, 50)); waktuPulang = at(d, 15, rint(0, 20)) }
      else if (r < 0.93) status = 'IZIN'
      else if (r < 0.97) status = 'SAKIT'
      else status = 'ALPHA'
      absensiRows.push({
        userId: u.id, tanggal: d, jamMasukId: jam.id, waktuMasuk, waktuPulang, status,
        latitudeMasuk: waktuMasuk ? sekolah.latitude + (Math.random() - 0.5) * 0.0005 : null,
        longitudeMasuk: waktuMasuk ? sekolah.longitude + (Math.random() - 0.5) * 0.0005 : null,
      })
    }
  }
  await prisma.absensi.createMany({ data: absensiRows, skipDuplicates: true })
  console.log(`Absensi: ${absensiRows.length}`)

  // 6. Izin (8) — campuran status
  const approver = demoUser && demoUser.sekolahId === sekolahId ? demoUser.id : (gurus[0]?.id ?? null)
  const JENIS = ['IZIN', 'SAKIT', 'CUTI', 'DINAS']
  for (let i = 0; i < 8; i++) {
    const u = pick(users)
    const mulai = dateOnly(new Date(now.getTime() - rint(0, 25) * 86400000))
    await prisma.izin.create({
      data: {
        userId: u.id, jenis: pick(JENIS),
        tanggalMulai: mulai, tanggalSelesai: dateOnly(new Date(mulai.getTime() + rint(0, 2) * 86400000)),
        alasan: pick(['Keperluan keluarga', 'Sakit demam', 'Acara keluarga', 'Tugas dinas luar', 'Kontrol dokter']),
        status: pick(['MENUNGGU', 'DISETUJUI', 'DISETUJUI', 'DITOLAK']),
        approverId: approver,
      },
    })
  }

  // 7. Gaji guru (bulan ini & bulan lalu)
  let gajiCount = 0
  for (const g of gurus) {
    for (let back = 0; back <= 1; back++) {
      const d = new Date(now.getFullYear(), now.getMonth() - back, 1)
      const hadir = rint(16, 22), alpha = rint(0, 2), terlambat = rint(0, 4), izinN = rint(0, 2)
      const gajiPokok = pick([3500000, 4000000, 4500000, 5000000])
      const tunjanganHadir = hadir * 25000
      const potonganAlpha = alpha * 100000
      const potonganTerlambat = terlambat * 25000
      const totalGaji = gajiPokok + tunjanganHadir - potonganAlpha - potonganTerlambat
      await prisma.gaji.create({
        data: {
          userId: g.id, bulan: d.getMonth() + 1, tahun: d.getFullYear(), gajiPokok, tunjanganHadir,
          potonganAlpha, potonganTerlambat, totalGaji, jumlahHadir: hadir, jumlahAlpha: alpha,
          jumlahTerlambat: terlambat, jumlahIzin: izinN, dibayarkan: back === 1,
          tanggalBayar: back === 1 ? new Date(d.getFullYear(), d.getMonth(), 28) : null,
        },
      })
      gajiCount++
    }
  }

  console.log('✅ Seed demo Z-Absen selesai:')
  console.log(`   guru=${gurus.length}, siswa=${users.length - gurus.length}, absensi=${absensiRows.length}, izin=8, gaji=${gajiCount}`)
}

main()
  .catch((e) => { console.error('❌', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
