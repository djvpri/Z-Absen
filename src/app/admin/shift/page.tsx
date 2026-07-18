'use client'

import { useState, useEffect, useCallback } from 'react'

interface Shift {
  id: string
  nama: string
  hari: string
  jamMasuk: string
  jamKeluar: string
  toleransi: number
  warna: string
  aktif: boolean
}

const HARI_LIST = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU']
const HARI_LABEL: Record<string, string> = {
  SENIN: 'Sen', SELASA: 'Sel', RABU: 'Rab', KAMIS: 'Kam',
  JUMAT: 'Jum', SABTU: 'Sab', MINGGU: 'Min',
}
const WARNA_PRESET = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']

const emptyForm = {
  nama: '', hari: 'SENIN,SELASA,RABU,KAMIS,JUMAT',
  jamMasuk: '08:00', jamKeluar: '17:00', toleransi: 15, warna: '#3b82f6',
}

export default function AdminShiftPage() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Shift | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/shift')
    const d = await res.json()
    setShifts(d.shifts || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (s: Shift) => {
    setEditTarget(s)
    setForm({ nama: s.nama, hari: s.hari, jamMasuk: s.jamMasuk, jamKeluar: s.jamKeluar, toleransi: s.toleransi, warna: s.warna })
    setShowModal(true)
  }

  const toggleHari = (h: string) => {
    const list = form.hari ? form.hari.split(',').filter(Boolean) : []
    const idx = list.indexOf(h)
    if (idx >= 0) list.splice(idx, 1)
    else list.push(h)
    setForm((f) => ({ ...f, hari: list.join(',') }))
  }

  const handleSave = async () => {
    if (!form.nama || !form.jamMasuk || !form.jamKeluar) return
    setSaving(true)
    if (editTarget) {
      await fetch(`/api/admin/shift/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    } else {
      await fetch('/api/admin/shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    }
    setSaving(false)
    setShowModal(false)
    fetchData()
  }

  const handleToggleAktif = async (s: Shift) => {
    await fetch(`/api/admin/shift/${s.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aktif: !s.aktif }),
    })
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus shift ini? Jadwal yang menggunakan shift ini akan dikosongkan.')) return
    await fetch(`/api/admin/shift/${id}`, { method: 'DELETE' })
    fetchData()
  }

  const hariList = form.hari ? form.hari.split(',').filter(Boolean) : []
  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <a href="/admin/dashboard" className="text-gray-400 hover:text-gray-600 p-1">
          <i className="bi bi-arrow-left" />
        </a>
        <h1 className="text-sm font-semibold text-gray-900 flex-1">Kelola Shift</h1>
        <a href="/admin/jadwal" className="text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 mr-1">
          <i className="bi bi-calendar3 mr-1" />Jadwal
        </a>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700"
        >
          <i className="bi bi-plus-lg" /> Buat
        </button>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : shifts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <i className="bi bi-clock text-4xl text-gray-300 block mb-2" />
            <p className="text-sm text-gray-400 mb-3">Belum ada shift</p>
            <button onClick={openCreate} className="text-sm text-blue-600 hover:underline">
              Buat shift pertama →
            </button>
          </div>
        ) : (
          shifts.map((s) => (
            <div key={s.id} className={`bg-white rounded-xl border border-gray-100 p-4 ${!s.aktif ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: s.warna + '20' }}
                >
                  <i className="bi bi-clock text-lg" style={{ color: s.warna }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900 text-sm">{s.nama}</p>
                    {!s.aktif && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Nonaktif</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 font-mono">
                    {s.jamMasuk} – {s.jamKeluar}
                    <span className="text-xs text-gray-400 ml-2 font-sans">toleransi {s.toleransi} mnt</span>
                  </p>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {HARI_LIST.map((h) => (
                      <span
                        key={h}
                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          s.hari.includes(h)
                            ? 'text-white'
                            : 'bg-gray-100 text-gray-300'
                        }`}
                        style={s.hari.includes(h) ? { backgroundColor: s.warna } : {}}
                      >
                        {HARI_LABEL[h]}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => openEdit(s)}
                    className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                  >
                    <i className="bi bi-pencil" />
                  </button>
                  <button
                    onClick={() => handleToggleAktif(s)}
                    className={`text-xs px-2.5 py-1 border rounded-lg ${s.aktif ? 'border-gray-200 text-gray-400 hover:bg-gray-50' : 'border-green-200 text-green-600 bg-green-50'}`}
                  >
                    <i className={`bi ${s.aktif ? 'bi-eye-slash' : 'bi-eye'}`} />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-xs px-2.5 py-1 border border-red-100 rounded-lg text-red-400 hover:bg-red-50"
                  >
                    <i className="bi bi-trash" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-8">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">{editTarget ? 'Edit Shift' : 'Buat Shift'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Nama Shift <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  placeholder="cth: Shift Pagi, Full Day..."
                  value={form.nama}
                  onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Jam Masuk <span className="text-red-400">*</span></label>
                  <input
                    type="time"
                    value={form.jamMasuk}
                    onChange={(e) => setForm((f) => ({ ...f, jamMasuk: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Jam Keluar <span className="text-red-400">*</span></label>
                  <input
                    type="time"
                    value={form.jamKeluar}
                    onChange={(e) => setForm((f) => ({ ...f, jamKeluar: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Toleransi Terlambat (menit)</label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={form.toleransi}
                  onChange={(e) => setForm((f) => ({ ...f, toleransi: parseInt(e.target.value) || 0 }))}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">Hari Kerja</label>
                <div className="flex gap-2 flex-wrap">
                  {HARI_LIST.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => toggleHari(h)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        hariList.includes(h)
                          ? 'text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                      style={hariList.includes(h) ? { backgroundColor: form.warna } : {}}
                    >
                      {HARI_LABEL[h]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">Warna</label>
                <div className="flex gap-2 flex-wrap">
                  {WARNA_PRESET.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, warna: w }))}
                      className={`w-8 h-8 rounded-full transition-transform ${form.warna === w ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : ''}`}
                      style={{ backgroundColor: w }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.nama || !form.jamMasuk || !form.jamKeluar}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : editTarget ? 'Simpan' : 'Buat Shift'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
