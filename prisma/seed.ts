import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const sekolah = await prisma.sekolah.upsert({
    where: { npsn: '12345678' },
    update: {},
    create: {
      nama: 'SMPN 1 Pontianak',
      npsn: '12345678',
      alamat: 'Jl. Pendidikan No. 1, Pontianak',
      latitude: -0.0263303,
      longitude: 109.3425,
      radiusMeters: 100,
    },
  })

  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sihadir.id' },
    update: {},
    create: {
      nama: 'Administrator',
      email: 'admin@sihadir.id',
      password: adminPassword,
      role: Role.ADMIN,
      sekolahId: sekolah.id,
      aktif: true,
    },
  })

  const kepsekPassword = await bcrypt.hash('kepsek123', 10)
  await prisma.user.upsert({
    where: { email: 'kepsek@sihadir.id' },
    update: {},
    create: {
      nama: 'Drs. Kepala Sekolah',
      email: 'kepsek@sihadir.id',
      password: kepsekPassword,
      role: Role.KEPALA_SEKOLAH,
      nip: '197001012000011001',
      noHp: '08123456789',
      sekolahId: sekolah.id,
      aktif: true,
    },
  })

  await prisma.jamAbsensi.upsert({
    where: { id: 'jam-guru-pagi' },
    update: {},
    create: {
      id: 'jam-guru-pagi',
      nama: 'Jam Masuk Guru',
      jamMasuk: '07:00',
      jamPulang: '14:00',
      toleransiMenit: 15,
      berlakuUntuk: [Role.GURU, Role.KEPALA_SEKOLAH],
      sekolahId: sekolah.id,
    },
  })

  await prisma.jamAbsensi.upsert({
    where: { id: 'jam-siswa-pagi' },
    update: {},
    create: {
      id: 'jam-siswa-pagi',
      nama: 'Jam Masuk Siswa',
      jamMasuk: '07:00',
      jamPulang: '13:00',
      toleransiMenit: 10,
      berlakuUntuk: [Role.SISWA],
      sekolahId: sekolah.id,
    },
  })

  console.log('Seed selesai!')
  console.log('Admin:', admin.email, '/ password: admin123')
  console.log('Sekolah:', sekolah.nama)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
