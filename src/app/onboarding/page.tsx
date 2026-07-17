'use client'

import { useState } from 'react'

type TenantType = 'SEKOLAH' | 'PERUSAHAAN'

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ type: '' as TenantType | '', nama: '', slug: '', alamat: '', telepon: '' })

  function generateSlug(nama: string) {
    return nama.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').slice(0, 40)
  }

  function handleNamaChange(nama: string) {
    setForm((f) => ({ ...f, nama, slug: generateSlug(nama) }))
  }

  async function handleSubmit() {
    if (!form.nama || !form.slug || !form.type) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Gagal membuat organisasi'); setLoading(false); return }

      // Set session cookie dengan tenant baru
      const tokenRes = await fetch('/api/auth/sso-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: data.memberId }),
      })
      const tokenData = await tokenRes.json()
      window.location.replace(tokenData.redirect || '/admin/dashboard')
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.')
      setLoading(false)
    }
  }

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">Z</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Selamat Datang di Z-Absen!</h1>
            <p className="text-gray-500 mt-2 text-sm">Pilih jenis organisasi Anda untuk memulai</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { type: 'SEKOLAH' as TenantType, icon: '🏫', label: 'Sekolah / Madrasah', sub: 'Guru, siswa, orang tua' },
              { type: 'PERUSAHAAN' as TenantType, icon: '🏢', label: 'Perusahaan / Bisnis', sub: 'Karyawan, manajer, HRD' },
            ].map((opt) => (
              <button
                key={opt.type}
                onClick={() => { setForm((f) => ({ ...f, type: opt.type })); setStep(2) }}
                className="bg-white border-2 border-gray-200 hover:border-blue-500 rounded-2xl p-6 text-center transition-all group"
              >
                <div className="text-4xl mb-3">{opt.icon}</div>
                <div className="font-semibold text-gray-800 group-hover:text-blue-600 text-sm">{opt.label}</div>
                <p className="text-xs text-gray-400 mt-1">{opt.sub}</p>
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">✓ Trial 14 hari gratis · Tanpa kartu kredit</p>
        </div>
      </div>
    )
  }

  const labelOrg = form.type === 'SEKOLAH' ? 'Sekolah / Madrasah' : 'Perusahaan / Bisnis'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <button onClick={() => setStep(1)} className="text-sm text-gray-400 mb-5 hover:text-gray-600">← Kembali</button>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Detail {labelOrg}</h2>
        <p className="text-sm text-gray-500 mb-6">Ini akan menjadi akun organisasi Anda di Z-Absen</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama {labelOrg} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nama}
              onChange={(e) => handleNamaChange(e.target.value)}
              placeholder={form.type === 'SEKOLAH' ? 'SDN 01 Badau' : 'PT Maju Bersama'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID Unik <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
              <span className="bg-gray-50 text-gray-400 text-xs px-3 py-2.5 border-r border-gray-200 whitespace-nowrap">z-absen.id/t/</span>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))}
                className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
            <input type="text" value={form.alamat} onChange={(e) => setForm((f) => ({ ...f, alamat: e.target.value }))}
              placeholder="Jl. Merdeka No. 1, Badau"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomor WhatsApp</label>
            <input type="tel" value={form.telepon} onChange={(e) => setForm((f) => ({ ...f, telepon: e.target.value }))}
              placeholder="08123456789"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {error && <div className="mt-4 bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}

        <button
          onClick={handleSubmit}
          disabled={!form.nama || !form.slug || loading}
          className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          {loading ? 'Membuat organisasi...' : 'Mulai Trial 14 Hari Gratis →'}
        </button>
        <p className="text-center text-xs text-gray-400 mt-3">
          Dengan mendaftar, Anda menyetujui syarat dan ketentuan Z-Absen
        </p>
      </div>
    </div>
  )
}
