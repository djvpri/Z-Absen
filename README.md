# SiHadir — Sistem Kehadiran Digital

PWA absensi sekolah/madrasah dengan face recognition dan GPS geofencing.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + PWA
- **Database**: PostgreSQL (Railway)
- **ORM**: Prisma
- **Face Recognition**: face-api.js (browser-side)
- **Notifikasi**: Fonnte API (WhatsApp) + Telegram Bot
- **Deploy**: Railway (full-stack, satu platform)

## Fitur

- ✅ Check-in dengan face recognition (kamera HP/webcam)
- ✅ Validasi GPS geofencing (harus dalam radius sekolah)
- ✅ Notifikasi WhatsApp ke guru, siswa, dan orang tua
- ✅ Dashboard admin realtime dengan grafik
- ✅ Rekap & export PDF / Excel
- ✅ Pengajuan & approval izin online
- ✅ Hitung insentif kehadiran guru
- ✅ Multi-role: Admin, Kepala Sekolah, Guru, Siswa, Orang Tua

---

## Setup Lokal

### 1. Clone & install

```bash
git clone <repo>
cd sihadir
npm install
```

### 2. Buat database PostgreSQL di Railway

1. Buka [railway.app](https://railway.app) → New Project
2. Add Service → Database → PostgreSQL
3. Copy `DATABASE_URL` dari tab Connect

### 3. Setup environment

```bash
cp .env.example .env
# Edit .env, isi DATABASE_URL dari Railway
```

### 4. Jalankan migrasi & seed

```bash
npm run db:push    # buat tabel dari schema Prisma
npm run db:seed    # isi data awal (admin, sekolah, jam absensi)
```

### 5. Download model face-api.js

```bash
mkdir -p public/models
# Download dari: https://github.com/justadudewhohacks/face-api.js/tree/master/weights
# File yang dibutuhkan:
# - ssd_mobilenetv1_model-weights_manifest.json + shard files
# - face_landmark_68_model-weights_manifest.json + shard files
# - face_recognition_model-weights_manifest.json + shard files
```

### 6. Jalankan dev server

```bash
npm run dev
```

Buka http://localhost:3000

---

## Deploy ke Railway

### 1. Push ke GitHub

```bash
git init
git add .
git commit -m "init SiHadir"
git remote add origin <github-repo-url>
git push -u origin main
```

### 2. Buat service di Railway

1. Railway Dashboard → New Project → Deploy from GitHub repo
2. Pilih repo ini
3. Railway otomatis detect Next.js dan build

### 3. Set environment variables di Railway

Di Railway → Settings → Variables, tambahkan:
```
DATABASE_URL=postgresql://...  ← dari service PostgreSQL Railway
JWT_SECRET=random-string-panjang
FONNTE_TOKEN=token-dari-fonnte.com
TELEGRAM_BOT_TOKEN=token-dari-botfather
NEXT_PUBLIC_APP_URL=https://sihadir-xxx.railway.app
```

### 4. Link PostgreSQL service

Di Railway, klik service Next.js → Variables → Reference Variable → pilih `DATABASE_URL` dari PostgreSQL service.

---

## Akun default (setelah seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@sihadir.id | admin123 |
| Kepala Sekolah | kepsek@sihadir.id | kepsek123 |

---

## Struktur Folder

```
sihadir/
├── prisma/
│   ├── schema.prisma      # Schema database lengkap
│   └── seed.ts            # Data awal sekolah & admin
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/login/     # Login endpoint
│   │   │   ├── absensi/        # Check-in/out + dashboard stats
│   │   │   ├── izin/           # Pengajuan & approval izin
│   │   │   ├── wajah/          # Daftarkan embedding wajah
│   │   │   ├── laporan/        # Rekap bulanan
│   │   │   └── health/         # Health check Railway
│   │   ├── check-in/           # Halaman absen (face rec + GPS)
│   │   ├── admin/dashboard/    # Dashboard admin
│   │   ├── izin/               # Form pengajuan izin
│   │   └── riwayat/            # Riwayat absensi pribadi
│   └── lib/
│       ├── prisma.ts           # Prisma client singleton
│       ├── auth.ts             # JWT sign/verify
│       ├── gps.ts              # Haversine + geofencing
│       └── notifikasi.ts       # WA (Fonnte) + Telegram
├── middleware.ts               # Route protection
└── railway.toml                # Railway deployment config
```

---

## Cara daftarkan wajah user

1. Login sebagai user
2. Buka `/profil`
3. Klik "Daftarkan Wajah"
4. Izinkan kamera → ambil foto → simpan

Embedding wajah disimpan di database, bukan foto asli (lebih aman & hemat storage).
