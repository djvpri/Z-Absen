'use client'

import { useState, useEffect } from 'react'

interface IzinItem {
  id: string
  jenis: string
  tanggalMulai: string
  tanggalSelesai: string
  alasan: string
  status: string
  catatanApprover?: string
  createdAt: string
}

interface KuotaItem {
  jenis: string
  jatah: number
  terpakai: number
  sisa: number
}

const JENIS_LIST = [
  { value: 'IZIN', label: 'Izin' },
  { value: 'SAKIT', label: 'Sakit' },
  { value: 'CUTI_TAHUNAN', label: 'Cuti Tahunan' },
  { value: 'CUTI_SAKIT', label: 'Cuti Sakit' },
  { value: 'DINAS_LUAR', label: 'Dinas Luar' },
]

const JENIS_BUTUH_KUOTA = ['CUTI_TAHUNAN', 'CUTI_SAKIT', 'IZIN']

const statusColor: Record<string, string> = {
  MENUNGGU: 'bg-amber-100 text-amber-700',
  DISETUJUI: 'bg-green-100 text-green-700',
  DITOLAK: 'bg-red-100 text-red-700',
}

function hitungHari(mulai: string, selesai: string) {
  if (!mulai || !selesai) return 0
  return Math.ceil((new Date(selesai).getTime() - new Date(mulai).getTime()) / 86_400_000) + 1
}

export default function IzinPage() {
  const [riwayat, setRiwayat] = useState<IzinItem[]>([])
  const [kuota, setKuota] = useState<KuotaItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ jenis: 'CUTI_TAHUNAN', tanggalMulai: '', tanggalSelesai: '', alasan: '' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [pesan, setPesan] = useState('')

  const loadData = async () => {
    const [izinRes, kuotaRes] = await Promise.all([
      fetch('/api/izin').then(r => r.json()),
      fetch('/api/jatah-cuti').then(r => r.json()),
    ])
    setRiwayat(izinRes.izin || [])
    setKuota(kuotaRes.kuota || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const kuotaJenis = kuota.find(k => k.jenis === form.jenis)
  const hariDiajukan = hitungHari(form.tanggalMulai, form.tanggalSelesai)
  const melebihiKuota = JENIS_BUTUH_KUOTA.includes(form.jenis) && kuotaJenis && hariDiajukan > kuotaJenis.sisa

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/izin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setPesan(data.error || 'Gagal mengajukan izin'); setSubmitting(false); return }
      setPesan('Izin berhasil diajukan!')
      setShowForm(false)
      setForm({ jenis: 'CUTI_TAHUNAN', tanggalMulai: '', tanggalSelesai: '', alasan: '' })
      loadData()
    } catch { setPesan('Terjadi kesalahan') }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <a href="/check-in" className="text-gray-400 hover:text-gray-600">
          <i className="bi bi-arrow-left"></i>
        </a>
        <h1 className="text-sm font-semibold text-gray-900">Pengajuan Izin</h1>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Saldo Kuota */}
        {kuota.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Saldo Cuti {new Date().getFullYear()}</p>
            <div className="grid grid-cols-3 gap-2">
              {kuota.map(k => (
                <div key={k.jenis} className="text-center">
                  <p className={`text-2xl font-bold ${k.sisa > 0 ? 'text-blue-600' : 'text-red-500'}`}>{k.sisa}</p>
                  <p className="text-xs text-gray-400 leading-tight">
                    {k.jenis === 'CUTI_TAHUNAN' ? 'Cuti' : k.jenis === 'CUTI_SAKIT' ? 'Cuti Sakit' : 'Izin'}
                  </p>
                  <p className="text-xs text-gray-300">dari {k.jatah} hari</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {pesan && (
          <div className={`rounded-xl p-3 text-sm flex items-center gap-2 ${pesan.includes('berhasil') ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
            <i className={`bi ${pesan.includes('berhasil') ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`}></i>
            {pesan}
          </div>
        )}

        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setPesan('') }}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700"
          >
            <i className="bi bi-plus-lg mr-2"></i>Ajukan Izin Baru
          </button>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Jenis Izin</label>
              <select
                value={form.jenis}
                onChange={e => setForm({ ...form, jenis: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {JENIS_LIST.map(j => <option key={j.value} value={j.value}>{j.label}</option>)}
              </select>
              {JENIS_BUTUH_KUOTA.includes(form.jenis) && kuotaJenis && (
                <p className={`text-xs mt-1 ${kuotaJenis.sisa > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                  Sisa kuota: <strong>{kuotaJenis.sisa}</strong> dari {kuotaJenis.jatah} hari
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Dari Tanggal</label>
                <input
                  type="date"
                  value={form.tanggalMulai}
                  required
                  onChange={e => setForm({ ...form, tanggalMulai: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  value={form.tanggalSelesai}
                  required
                  min={form.tanggalMulai}
                  onChange={e => setForm({ ...form, tanggalSelesai: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {hariDiajukan > 0 && (
              <div className={`rounded-xl px-3 py-2 flex items-center gap-2 ${melebihiKuota ? 'bg-red-50 border border-red-100' : 'bg-blue-50 border border-blue-100'}`}>
                <i className={`bi ${melebihiKuota ? 'bi-exclamation-triangle-fill text-red-500' : 'bi-calendar-check text-blue-500'} text-sm`}></i>
                <p className={`text-xs ${melebihiKuota ? 'text-red-600' : 'text-blue-700'}`}>
                  {hariDiajukan} hari{melebihiKuota ? ` — melebihi sisa kuota (${kuotaJenis?.sisa} hari)` : ''}
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Alasan</label>
              <textarea
                value={form.alasan}
                required
                minLength={5}
                rows={3}
                onChange={e => setForm({ ...form, alasan: e.target.value })}
                placeholder="Jelaskan alasan pengajuan izin..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
              >
                {submitting ? 'Mengirim...' : 'Ajukan'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setPesan('') }}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
              >
                Batal
              </button>
            </div>
          </form>
        )}

        {/* Riwayat */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="font-semibold text-gray-900 text-sm mb-3">Riwayat Pengajuan</h2>
          {loading ? (
            <div className="py-6 text-center">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : riwayat.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Belum ada pengajuan izin</p>
          ) : (
            <div className="space-y-3">
              {riwayat.map(i => {
                const label = JENIS_LIST.find(j => j.value === i.jenis)?.label ?? i.jenis
                const hari = hitungHari(i.tanggalMulai, i.tanggalSelesai)
                return (
                  <div key={i.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{label}</span>
                        <span className="ml-2 text-xs text-gray-400">· {hari} hari</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[i.status] || 'bg-gray-100 text-gray-600'}`}>
                        {i.status === 'MENUNGGU' ? 'Menunggu' : i.status === 'DISETUJUI' ? 'Disetujui' : 'Ditolak'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(i.tanggalMulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {i.tanggalMulai !== i.tanggalSelesai && ` — ${new Date(i.tanggalSelesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{i.alasan}</p>
                    {i.catatanApprover && (
                      <p className="text-xs text-gray-400 mt-1 italic bg-gray-50 rounded-lg px-2 py-1">
                        <i className="bi bi-chat-quote mr-1"></i>{i.catatanApprover}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
