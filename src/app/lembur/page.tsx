'use client'

import { useState, useEffect, useCallback } from 'react'

interface LemburItem {
  id: string
  tanggal: string
  jamLembur: number
  keterangan: string | null
  status: 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK'
  catatanApproval: string | null
}

const BULAN_NAMA = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const STATUS_CONFIG = {
  MENUNGGU: { label: 'Menunggu', cls: 'bg-amber-100 text-amber-700', icon: 'bi-hourglass-split' },
  DISETUJUI: { label: 'Disetujui', cls: 'bg-green-100 text-green-700', icon: 'bi-check-circle' },
  DITOLAK: { label: 'Ditolak', cls: 'bg-red-100 text-red-700', icon: 'bi-x-circle' },
}

export default function LemburPage() {
  const now = new Date()
  const [bulan, setBulan] = useState(now.getMonth() + 1)
  const [tahun, setTahun] = useState(now.getFullYear())
  const [data, setData] = useState<LemburItem[]>([])
  const [stats, setStats] = useState({ totalDisetujui: 0, pending: 0 })
  const [loading, setLoading] = useState(true)

  // Form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ tanggal: '', jamLembur: '', keterangan: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/lembur?bulan=${bulan}&tahun=${tahun}`)
    const d = await res.json()
    setData(d.lembur || [])
    setStats(d.stats || { totalDisetujui: 0, pending: 0 })
    setLoading(false)
  }, [bulan, tahun])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSubmit = async () => {
    setError('')
    if (!form.tanggal || !form.jamLembur) { setError('Tanggal dan jam lembur wajib diisi'); return }
    setSubmitting(true)
    const res = await fetch('/api/lembur', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tanggal: form.tanggal,
        jamLembur: Number(form.jamLembur),
        keterangan: form.keterangan,
      }),
    })
    const d = await res.json()
    if (!res.ok) { setError(d.error || 'Gagal mengajukan lembur'); setSubmitting(false); return }
    setShowForm(false)
    setForm({ tanggal: '', jamLembur: '', keterangan: '' })
    setSubmitting(false)
    fetchData()
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Batalkan pengajuan lembur ini?')) return
    await fetch(`/api/lembur?id=${id}`, { method: 'DELETE' })
    fetchData()
  }

  const prevMonth = () => bulan === 1 ? (setBulan(12), setTahun((t) => t - 1)) : setBulan((b) => b - 1)
  const nextMonth = () => bulan === 12 ? (setBulan(1), setTahun((t) => t + 1)) : setBulan((b) => b + 1)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <a href="/check-in" className="text-gray-400 hover:text-gray-600 p-1">
          <i className="bi bi-arrow-left" />
        </a>
        <h1 className="text-sm font-semibold text-gray-900 flex-1">Lembur Saya</h1>
        <button
          onClick={() => { setShowForm(true); setError('') }}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700"
        >
          <i className="bi bi-plus-lg" /> Ajukan
        </button>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Period nav */}
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-2.5">
          <button onClick={prevMonth} className="text-gray-400 hover:text-gray-700 p-1">
            <i className="bi bi-chevron-left text-sm" />
          </button>
          <span className="text-sm font-semibold text-gray-800">{BULAN_NAMA[bulan]} {tahun}</span>
          <button onClick={nextMonth} className="text-gray-400 hover:text-gray-700 p-1">
            <i className="bi bi-chevron-right text-sm" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <p className="text-xs text-green-700 mb-1">Jam Disetujui</p>
            <p className="text-2xl font-bold text-green-700">{stats.totalDisetujui.toFixed(1)}j</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-xs text-amber-700 mb-1">Menunggu</p>
            <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
          </div>
        </div>

        {/* Form Pengajuan */}
        {showForm && (
          <div className="bg-white border border-blue-200 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-900">Pengajuan Lembur Baru</p>
            {error && (
              <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-xl">{error}</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tanggal</label>
                <input
                  type="date"
                  value={form.tanggal}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Jam Lembur</label>
                <input
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  placeholder="mis. 2.5"
                  value={form.jamLembur}
                  onChange={(e) => setForm((f) => ({ ...f, jamLembur: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Keterangan</label>
              <input
                type="text"
                placeholder="Alasan / pekerjaan yang dilembur..."
                value={form.keterangan}
                onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setShowForm(false); setError('') }}
                className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Mengajukan...' : 'Ajukan'}
              </button>
            </div>
          </div>
        )}

        {/* History */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
              <i className="bi bi-clock-history text-4xl text-gray-300 block mb-2" />
              <p className="text-sm text-gray-400">Belum ada pengajuan lembur bulan ini</p>
            </div>
          ) : (
            data.map((l) => {
              const cfg = STATUS_CONFIG[l.status]
              return (
                <div key={l.id} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(l.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                          {l.jamLembur}j
                        </span>
                      </div>
                      {l.keterangan && (
                        <p className="text-xs text-gray-500">{l.keterangan}</p>
                      )}
                      {l.catatanApproval && (
                        <p className="text-xs text-gray-400 mt-1 italic">Catatan: {l.catatanApproval}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.cls}`}>
                        <i className={`bi ${cfg.icon} mr-1`} />{cfg.label}
                      </span>
                      {l.status === 'MENUNGGU' && (
                        <button
                          onClick={() => handleCancel(l.id)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Batalkan
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
