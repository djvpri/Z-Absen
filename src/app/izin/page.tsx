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

export default function IzinPage() {
  const [riwayat, setRiwayat] = useState<IzinItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ jenis: 'IZIN', tanggalMulai: '', tanggalSelesai: '', alasan: '' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [pesan, setPesan] = useState('')

  useEffect(() => {
    fetch('/api/izin').then(r => r.json()).then(d => { setRiwayat(d.izin || []); setLoading(false) })
  }, [])

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
      setPesan('Izin berhasil diajukan! ✅')
      setShowForm(false)
      setForm({ jenis: 'IZIN', tanggalMulai: '', tanggalSelesai: '', alasan: '' })
      // Reload
      const r2 = await fetch('/api/izin').then(r => r.json())
      setRiwayat(r2.izin || [])
    } catch { setPesan('Terjadi kesalahan') }
    setSubmitting(false)
  }

  const statusColor: Record<string, string> = {
    MENUNGGU: 'bg-amber-100 text-amber-700',
    DISETUJUI: 'bg-green-100 text-green-700',
    DITOLAK: 'bg-red-100 text-red-700',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <a href="/check-in" className="text-gray-400 hover:text-gray-600">← Kembali</a>
        <h1 className="text-sm font-semibold text-gray-900">Pengajuan Izin</h1>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {pesan && (
          <div className={`rounded-xl p-3 text-sm ${pesan.includes('✅') ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
            {pesan}
          </div>
        )}

        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700">
            + Ajukan Izin Baru
          </button>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Jenis</label>
              <select value={form.jenis} onChange={e => setForm({ ...form, jenis: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <option value="IZIN">Izin</option>
                <option value="SAKIT">Sakit</option>
                <option value="CUTI">Cuti</option>
                <option value="DINAS">Dinas</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Dari Tanggal</label>
                <input type="date" value={form.tanggalMulai} required onChange={e => setForm({ ...form, tanggalMulai: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Sampai Tanggal</label>
                <input type="date" value={form.tanggalSelesai} required onChange={e => setForm({ ...form, tanggalSelesai: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Alasan</label>
              <textarea value={form.alasan} required minLength={10} rows={3} onChange={e => setForm({ ...form, alasan: e.target.value })}
                placeholder="Jelaskan alasan pengajuan izin..."
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={submitting}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
                {submitting ? 'Mengirim...' : 'Ajukan'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setPesan('') }}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Batal
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-3">Riwayat Izin</h2>
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-4">Memuat...</p>
          ) : riwayat.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Belum ada pengajuan izin</p>
          ) : (
            <div className="space-y-3">
              {riwayat.map(i => (
                <div key={i.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{i.jenis}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[i.status] || 'bg-gray-100 text-gray-600'}`}>
                      {i.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(i.tanggalMulai).toLocaleDateString('id-ID')} — {new Date(i.tanggalSelesai).toLocaleDateString('id-ID')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{i.alasan}</p>
                  {i.catatanApprover && <p className="text-xs text-gray-400 mt-1 italic">Catatan: {i.catatanApprover}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
