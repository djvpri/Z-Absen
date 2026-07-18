'use client'

import { useState, useEffect, useCallback } from 'react'

interface PengumumanItem {
  id: string
  judul: string
  isi: string
  prioritas: 'RENDAH' | 'NORMAL' | 'PENTING' | 'URGENT'
  pinned: boolean
  targetRole: string | null
  tanggalExpiry: string | null
  aktif: boolean
  createdAt: string
  _count: { bacaList: number }
}

const PRIORITAS_CONFIG = {
  RENDAH: { label: 'Rendah', cls: 'bg-gray-100 text-gray-600' },
  NORMAL: { label: 'Normal', cls: 'bg-blue-100 text-blue-700' },
  PENTING: { label: 'Penting', cls: 'bg-amber-100 text-amber-700' },
  URGENT: { label: 'Urgent', cls: 'bg-red-100 text-red-700' },
}

const emptyForm = {
  judul: '', isi: '', prioritas: 'NORMAL', pinned: false,
  targetRole: '', tanggalExpiry: '',
}

export default function AdminPengumumanPage() {
  const [data, setData] = useState<PengumumanItem[]>([])
  const [totalMember, setTotalMember] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<PengumumanItem | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/pengumuman')
    const d = await res.json()
    setData(d.pengumuman || [])
    setTotalMember(d.totalMember || 0)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (p: PengumumanItem) => {
    setEditTarget(p)
    setForm({
      judul: p.judul,
      isi: p.isi,
      prioritas: p.prioritas,
      pinned: p.pinned,
      targetRole: p.targetRole || '',
      tanggalExpiry: p.tanggalExpiry ? p.tanggalExpiry.slice(0, 10) : '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.judul.trim() || !form.isi.trim()) return
    setSaving(true)
    const payload = {
      judul: form.judul,
      isi: form.isi,
      prioritas: form.prioritas,
      pinned: form.pinned,
      targetRole: form.targetRole || null,
      tanggalExpiry: form.tanggalExpiry || null,
    }
    if (editTarget) {
      await fetch(`/api/admin/pengumuman/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      await fetch('/api/admin/pengumuman', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }
    setSaving(false)
    setShowModal(false)
    fetchData()
  }

  const handleToggleAktif = async (p: PengumumanItem) => {
    await fetch(`/api/admin/pengumuman/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aktif: !p.aktif }),
    })
    fetchData()
  }

  const handleTogglePin = async (p: PengumumanItem) => {
    await fetch(`/api/admin/pengumuman/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !p.pinned }),
    })
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pengumuman ini?')) return
    await fetch(`/api/admin/pengumuman/${id}`, { method: 'DELETE' })
    fetchData()
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <a href="/admin/dashboard" className="text-gray-400 hover:text-gray-600 p-1">
          <i className="bi bi-arrow-left" />
        </a>
        <h1 className="text-sm font-semibold text-gray-900 flex-1">Kelola Pengumuman</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700"
        >
          <i className="bi bi-plus-lg" /> Buat
        </button>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <i className="bi bi-megaphone text-4xl text-gray-300 block mb-2" />
            <p className="text-sm text-gray-400 mb-3">Belum ada pengumuman</p>
            <button onClick={openCreate} className="text-sm text-blue-600 hover:underline">
              Buat pengumuman pertama →
            </button>
          </div>
        ) : (
          data.map((p) => {
            const cfg = PRIORITAS_CONFIG[p.prioritas]
            const pctDibaca = totalMember > 0 ? Math.round((p._count.bacaList / totalMember) * 100) : 0
            const isExpanded = expandedId === p.id
            return (
              <div key={p.id} className={`bg-white rounded-xl border transition-colors ${!p.aktif ? 'opacity-60 border-gray-100' : 'border-gray-100'}`}>
                <div
                  className="px-4 py-3 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {p.pinned && (
                          <i className="bi bi-pin-fill text-xs text-blue-600" title="Disematkan" />
                        )}
                        <span className="font-medium text-gray-900 text-sm">{p.judul}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                        {!p.aktif && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Nonaktif</span>
                        )}
                      </div>
                      {!isExpanded && (
                        <p className="text-xs text-gray-400 truncate">{p.isi}</p>
                      )}
                    </div>
                    <i className={`bi ${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'} text-gray-400 shrink-0 mt-0.5`} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{p.isi}</p>

                    {/* Read stats */}
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Sudah dibaca</span>
                        <span className="font-semibold text-gray-700">
                          {p._count.bacaList} / {totalMember} ({pctDibaca}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${pctDibaca}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-xs text-gray-400 flex flex-wrap gap-3">
                      <span>
                        <i className="bi bi-calendar3 mr-1" />
                        {new Date(p.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      {p.targetRole && <span><i className="bi bi-person-check mr-1" />{p.targetRole}</span>}
                      {p.tanggalExpiry && (
                        <span><i className="bi bi-clock mr-1" />
                          Berlaku s/d {new Date(p.tanggalExpiry).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                      >
                        <i className="bi bi-pencil" /> Edit
                      </button>
                      <button
                        onClick={() => handleTogglePin(p)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-lg ${p.pinned ? 'border-blue-200 text-blue-600 bg-blue-50' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                      >
                        <i className={`bi ${p.pinned ? 'bi-pin-fill' : 'bi-pin'}`} />
                        {p.pinned ? 'Disematkan' : 'Sematkan'}
                      </button>
                      <button
                        onClick={() => handleToggleAktif(p)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-lg ${p.aktif ? 'border-gray-200 text-gray-600 hover:bg-gray-50' : 'border-green-200 text-green-600 bg-green-50'}`}
                      >
                        <i className={`bi ${p.aktif ? 'bi-eye-slash' : 'bi-eye'}`} />
                        {p.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 border border-red-200 rounded-lg text-red-500 hover:bg-red-50"
                      >
                        <i className="bi bi-trash" /> Hapus
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Modal buat/edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                {editTarget ? 'Edit Pengumuman' : 'Buat Pengumuman'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Judul <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  placeholder="Judul pengumuman..."
                  value={form.judul}
                  onChange={(e) => setForm((f) => ({ ...f, judul: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Isi <span className="text-red-400">*</span></label>
                <textarea
                  rows={5}
                  placeholder="Tulis isi pengumuman di sini..."
                  value={form.isi}
                  onChange={(e) => setForm((f) => ({ ...f, isi: e.target.value }))}
                  className={inputCls + ' resize-none'}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Prioritas</label>
                  <select
                    value={form.prioritas}
                    onChange={(e) => setForm((f) => ({ ...f, prioritas: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="RENDAH">Rendah</option>
                    <option value="NORMAL">Normal</option>
                    <option value="PENTING">Penting</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Berlaku Hingga</label>
                  <input
                    type="date"
                    value={form.tanggalExpiry}
                    onChange={(e) => setForm((f) => ({ ...f, tanggalExpiry: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => setForm((f) => ({ ...f, pinned: !f.pinned }))}
                    className={`w-10 h-6 rounded-full transition-colors ${form.pinned ? 'bg-blue-600' : 'bg-gray-200'} relative`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${form.pinned ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                  <span className="text-sm text-gray-700">Sematkan di atas</span>
                </label>
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
                disabled={saving || !form.judul.trim() || !form.isi.trim()}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : editTarget ? 'Simpan Perubahan' : 'Buat Pengumuman'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
