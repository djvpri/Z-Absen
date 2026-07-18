'use client'

import { useState, useEffect, useCallback } from 'react'

interface Karyawan {
  id: string
  nama: string
  email: string
  avatarUrl?: string
  role: string
  jabatan?: string
  nip?: string
  noHp?: string
  aktif: boolean
  tipeKaryawan: string
  departemen?: { id: string; nama: string }
  tanggalMulai?: string
  faceRegistered: boolean
}

interface Departemen {
  id: string
  nama: string
  _count: { members: number }
}

const TIPE_LABEL: Record<string, string> = {
  TETAP: 'Tetap',
  KONTRAK: 'Kontrak',
  MAGANG: 'Magang',
  PARTIME: 'Part-time',
  FREELANCE: 'Freelance',
}

const TIPE_WARNA: Record<string, string> = {
  TETAP: 'bg-blue-100 text-blue-700',
  KONTRAK: 'bg-amber-100 text-amber-700',
  MAGANG: 'bg-purple-100 text-purple-700',
  PARTIME: 'bg-teal-100 text-teal-700',
  FREELANCE: 'bg-gray-100 text-gray-600',
}

export default function KaryawanPage() {
  const [karyawan, setKaryawan] = useState<Karyawan[]>([])
  const [departemen, setDepartemen] = useState<Departemen[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [filterDep, setFilterDep] = useState('')
  const [filterTipe, setFilterTipe] = useState('')
  const [filterAktif, setFilterAktif] = useState('true')
  const [showDepModal, setShowDepModal] = useState(false)
  const [depForm, setDepForm] = useState({ nama: '', deskripsi: '' })
  const [savingDep, setSavingDep] = useState(false)

  const loadKaryawan = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (filterDep) p.set('departemenId', filterDep)
    if (filterTipe) p.set('tipe', filterTipe)
    if (filterAktif) p.set('aktif', filterAktif)
    const res = await fetch(`/api/admin/karyawan?${p}`)
    const d = await res.json()
    setKaryawan(d.karyawan || [])
    setLoading(false)
  }, [q, filterDep, filterTipe, filterAktif])

  const loadDepartemen = async () => {
    const res = await fetch('/api/admin/departemen')
    const d = await res.json()
    setDepartemen(d.departemen || [])
  }

  useEffect(() => { loadDepartemen() }, [])
  useEffect(() => { const t = setTimeout(loadKaryawan, 300); return () => clearTimeout(t) }, [loadKaryawan])

  const handleAddDepartemen = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingDep(true)
    await fetch('/api/admin/departemen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(depForm),
    })
    setDepForm({ nama: '', deskripsi: '' })
    setShowDepModal(false)
    setSavingDep(false)
    loadDepartemen()
  }

  const handleDeleteDep = async (id: string, nama: string) => {
    if (!confirm(`Nonaktifkan departemen "${nama}"?`)) return
    await fetch(`/api/admin/departemen/${id}`, { method: 'DELETE' })
    loadDepartemen()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <a href="/admin/dashboard" className="text-gray-400 hover:text-gray-600">
            <i className="bi bi-arrow-left"></i>
          </a>
          <h1 className="text-sm font-semibold text-gray-900">Data Karyawan</h1>
        </div>
        <button
          onClick={() => setShowDepModal(true)}
          className="flex items-center gap-1.5 text-xs text-blue-600 font-medium hover:text-blue-700"
        >
          <i className="bi bi-diagram-3"></i> Departemen
        </button>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input
            type="text"
            placeholder="Cari nama, email, jabatan, NIP..."
            value={q}
            onChange={e => setQ(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter bar */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <select
            value={filterDep}
            onChange={e => setFilterDep(e.target.value)}
            className="shrink-0 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none"
          >
            <option value="">Semua Departemen</option>
            {departemen.map(d => (
              <option key={d.id} value={d.id}>{d.nama}</option>
            ))}
          </select>
          <select
            value={filterTipe}
            onChange={e => setFilterTipe(e.target.value)}
            className="shrink-0 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none"
          >
            <option value="">Semua Tipe</option>
            {Object.entries(TIPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filterAktif}
            onChange={e => setFilterAktif(e.target.value)}
            className="shrink-0 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none"
          >
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
            <option value="semua">Semua</option>
          </select>
          <span className="ml-auto shrink-0 text-xs text-gray-400 self-center whitespace-nowrap">
            {karyawan.length} karyawan
          </span>
        </div>

        {/* Departemen chips */}
        {departemen.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setFilterDep('')}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${!filterDep ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
            >
              Semua
            </button>
            {departemen.map(d => (
              <button
                key={d.id}
                onClick={() => setFilterDep(filterDep === d.id ? '' : d.id)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${filterDep === d.id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
              >
                {d.nama} <span className="opacity-60">({d._count.members})</span>
              </button>
            ))}
          </div>
        )}

        {/* List */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : karyawan.length === 0 ? (
            <div className="p-10 text-center">
              <i className="bi bi-person-x text-4xl text-gray-300 block mb-2"></i>
              <p className="text-sm text-gray-400">Tidak ada karyawan ditemukan</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {karyawan.map(k => (
                <a
                  key={k.id}
                  href={`/admin/karyawan/${k.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {k.avatarUrl
                      ? <img src={k.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                      : k.nama.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{k.nama}</p>
                      {!k.aktif && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 shrink-0">Nonaktif</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                      {k.jabatan || 'Belum diisi'}{k.departemen ? ` · ${k.departemen.nama}` : ''}
                    </p>
                    {k.nip && <p className="text-xs text-gray-300">{k.nip}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPE_WARNA[k.tipeKaryawan] ?? 'bg-gray-100 text-gray-600'}`}>
                      {TIPE_LABEL[k.tipeKaryawan] ?? k.tipeKaryawan}
                    </span>
                    {k.faceRegistered && (
                      <span className="text-xs text-green-500">
                        <i className="bi bi-camera-fill"></i>
                      </span>
                    )}
                  </div>
                  <i className="bi bi-chevron-right text-gray-300 text-xs"></i>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Departemen */}
      {showDepModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Kelola Departemen</h2>
              <button onClick={() => setShowDepModal(false)} className="text-gray-400 hover:text-gray-600">
                <i className="bi bi-x-lg text-sm"></i>
              </button>
            </div>

            <div className="p-4 space-y-4">
              <form onSubmit={handleAddDepartemen} className="space-y-2">
                <input
                  placeholder="Nama departemen"
                  required
                  value={depForm.nama}
                  onChange={e => setDepForm({ ...depForm, nama: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  placeholder="Deskripsi (opsional)"
                  value={depForm.deskripsi}
                  onChange={e => setDepForm({ ...depForm, deskripsi: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={savingDep}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
                >
                  {savingDep ? 'Menyimpan...' : '+ Tambah Departemen'}
                </button>
              </form>

              <div className="space-y-2">
                {departemen.map(d => (
                  <div key={d.id} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{d.nama}</p>
                      <p className="text-xs text-gray-400">{d._count.members} anggota</p>
                    </div>
                    <button
                      onClick={() => handleDeleteDep(d.id, d.nama)}
                      className="text-gray-400 hover:text-red-500 p-1"
                    >
                      <i className="bi bi-trash text-sm"></i>
                    </button>
                  </div>
                ))}
                {departemen.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">Belum ada departemen</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
