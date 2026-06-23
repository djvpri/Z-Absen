export default function RootPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <header className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">Z</span>
            </div>
            <span className="text-lg font-semibold">Z-Absen</span>
          </div>
          <a href="/auth/login" className="bg-white text-blue-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-50 transition">
            Masuk
          </a>
        </nav>

        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <p className="text-blue-200 text-sm font-medium mb-3">Sistem Absensi Digital Sekolah</p>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">
              Absensi Sekolah<br />
              <span className="text-blue-200">Berbasis Face Recognition</span>
            </h1>
            <p className="text-blue-100 text-base md:text-lg mb-8 leading-relaxed">
              Pantau kehadiran siswa & guru secara real-time. Wajib hadir di area sekolah (GPS geofencing),
              notifikasi WhatsApp otomatis, laporan export PDF/Excel, dan penggajian berbasis kehadiran.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="/auth/login" className="bg-white text-blue-700 px-6 py-3 rounded-xl font-medium hover:bg-blue-50 transition">
                Mulai Gratis →
              </a>
              <a href="#fitur" className="border border-white/30 text-white px-6 py-3 rounded-xl font-medium hover:bg-white/10 transition">
                Lihat Fitur
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="bg-blue-50 border-b border-blue-100">
        <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-3 gap-4 text-center">
          {[
            { nilai: 'Face Recognition', label: 'Verifikasi Wajah' },
            { nilai: 'GPS Geofencing', label: 'Validasi Lokasi' },
            { nilai: 'WhatsApp', label: 'Notifikasi Realtime' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-blue-600 font-semibold text-sm md:text-base">{s.nilai}</p>
              <p className="text-gray-500 text-xs md:text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Fitur */}
      <section id="fitur" className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Fitur Lengkap</h2>
          <p className="text-gray-500 max-w-xl mx-auto">Solusi absensi digital untuk sekolah modern — dari check-in hingga penggajian.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: '📸', title: 'Face Recognition', desc: 'Absen dengan wajah — tidak bisa diwakilkan. Model AI berjalan di browser, data aman.' },
            { icon: '📍', title: 'GPS Geofencing', desc: 'Harus dalam radius sekolah. Konfigurasi radius fleksibel per sekolah.' },
            { icon: '📱', title: 'Notifikasi WhatsApp', desc: 'Otomoatis kirim notifikasi ke guru, siswa, dan orang tua saat absen.' },
            { icon: '📊', title: 'Dashboard Realtime', desc: 'Grafik kehadiran 7 hari, rekap per kelas, status terlambat & izin.' },
            { icon: '📄', title: 'Export PDF & Excel', desc: 'Cetak rekap bulanan dalam format PDF atau spreadsheet Excel.' },
            { icon: '💰', title: 'Hitung Gaji', desc: 'Insentif kehadiran guru otomatis berdasarkan data absensi.' },
            { icon: '📋', title: 'Pengajuan Izin', desc: 'Siswa/guru ajukan izin online. Kepsek approve langsung dari dashboard.' },
            { icon: '⏰', title: 'Jam Absensi Fleksibel', desc: 'Atur jam masuk per role — guru, siswa, staf — dengan toleransi keterlambatan.' },
            { icon: '🏫', title: 'Multi-Sekolah', desc: 'Satu akun admin bisa kelola beberapa sekolah sekaligus.' },
          ].map((f) => (
            <div key={f.title} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:shadow-sm transition">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cara Kerja */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-12">Cara Kerja</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Daftar Sekolah', desc: 'Isi data sekolah, lokasi GPS, dan radius geofencing.' },
              { step: '2', title: 'Daftarkan Wajah', desc: 'Guru & siswa daftarkan wajah via HP/laptop satu kali.' },
              { step: '3', title: 'Absen Setiap Hari', desc: 'Arahkan wajah ke kamera + GPS otomatis validasi lokasi.' },
              { step: '4', title: 'Lihat Laporan', desc: 'Dashboard realtime, export PDF/Excel, hitung gaji otomatis.' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-3">{s.step}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Harga */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Paket Harga</h2>
          <p className="text-gray-500">Pilih paket sesuai kebutuhan sekolah Anda.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            {
              nama: 'Starter',
              harga: 'Rp 199rb',
              periode: '/bulan',
              desc: 'Cocok untuk sekolah kecil',
              fitur: ['50 user (guru + siswa)', '1 sekolah', 'Absen face + GPS', 'Dashboard admin', 'Notifikasi WhatsApp', 'Laporan bulanan'],
              popular: false,
            },
            {
              nama: 'Pro',
              harga: 'Rp 499rb',
              periode: '/bulan',
              desc: 'Untuk sekolah menengah',
              fitur: ['200 user', '3 sekolah', 'Semua fitur Starter', 'Export PDF & Excel', 'Hitung gaji guru', 'Pengajuan izin online', 'Prioritas support'],
              popular: true,
            },
            {
              nama: 'Enterprise',
              harga: 'Custom',
              periode: '',
              desc: 'Untuk cabang dinas / yayasan',
              fitur: ['Unlimited user', 'Unlimited sekolah', 'Semua fitur Pro', 'SSO integration', 'API access', 'Dedicated support', 'Custom branding'],
              popular: false,
            },
          ].map((p) => (
            <div key={p.nama} className={`rounded-2xl p-6 border-2 ${p.popular ? 'border-blue-600 bg-blue-50' : 'border-gray-100 bg-white'}`}>
              {p.popular && <span className="bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">Populer</span>}
              <h3 className="text-lg font-semibold text-gray-900 mt-2">{p.nama}</h3>
              <p className="text-sm text-gray-500 mb-4">{p.desc}</p>
              <div className="mb-4">
                <span className="text-2xl font-bold text-gray-900">{p.harga}</span>
                <span className="text-sm text-gray-400">{p.periode}</span>
              </div>
              <ul className="space-y-2 mb-6">
                {p.fitur.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-green-500">✓</span> {f}
                  </li>
                ))}
              </ul>
              <a href="https://wa.me/6285752700818?text=Halo,%20saya%20tertarik%20dengan%20Z-Absen%20paket%20{p.nama}" target="_blank" rel="noopener noreferrer"
                className={`block text-center py-2.5 rounded-xl text-sm font-medium transition ${p.popular ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                Hubungi Sales
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Siap Digitalisasi Absensi?</h2>
          <p className="text-blue-100 mb-6 max-w-lg mx-auto">Mulai gratis hari ini. Tanpa kartu kredit. Setup 5 menit.</p>
          <a href="/auth/login" className="inline-block bg-white text-blue-700 px-8 py-3 rounded-xl font-medium hover:bg-blue-50 transition">
            Mulai Sekarang →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 py-8 text-center text-sm text-gray-400">
        <p>© 2026 Z-Absen by Z-Ecosystem. All rights reserved.</p>
        <p className="mt-1">
          <a href="https://wa.me/6285752700818" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">WhatsApp Support</a>
        </p>
      </footer>
    </div>
  )
}
