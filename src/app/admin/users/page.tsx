'use client'

import { useState, useEffect } from 'react'

interface UserItem {
  id: string
  nama: string
  email: string
  role: string
  nip?: string
  nis?: string
  noHp?: string
  aktif: boolean
  wajahEmbedding: number[]
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nama: '', email: '', password: '', role: 'GURU', nip: '', nis: '', noHp: '' })
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState('')

  const load = () => {
    setLoading(true)
    fetch('/api/admin/users').then(r => r.json()).then(d => { setUsers(d.users || []); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowForm(false)
    setForm({ nama: '', email: '', password: '', role: 'GURU', nip: '', nis: '', noHp: '' })
    load()
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus user ini?')) return
    await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' })
    load()
  }

  const filtered = filter ? users.filter(u => u.role === filter) : users

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/admin/dashboard" className="text-gray-400 hover:text-gray-600">← Kembali</a>
          <h1 className="text-sm font-semibold text-gray-900">Kelola User</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700">
          + Tambah User
        </button>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="flex gap-2">
          {['', 'GURU', 'SISWA', 'KEPALA_SEKOLAH'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === f ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
              {f || 'Semua'}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400 self-center">{filtered.length} user</span>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Nama" required value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <input placeholder="Email" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Password" type="password" required minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <option value="GURU">Guru</option>
                <option value="SISWA">Siswa</option>
                <option value="KEPALA_SEKOLAH">Kepala Sekolah</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input placeholder="NIP (opsional)" value={form.nip} onChange={e => setForm({ ...form, nip: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <input placeholder="NIS (opsional)" value={form.nis} onChange={e => setForm({ ...form, nis: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <input placeholder="No HP (opsional)" value={form.noHp} onChange={e => setForm({ ...form, noHp: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={submitting}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
                {submitting ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Batal
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Memuat...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">Tidak ada user</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(u => (
                <div key={u.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                      {u.nama.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{u.nama}</p>
                      <p className="text-xs text-gray-400">{u.email} · {u.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.wajahEmbedding?.length ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.wajahEmbedding?.length ? '📷 Wajah ✓' : 'Belum daftar wajah'}
                    </span>
                    <button onClick={() => handleDelete(u.id)}
                      className="text-gray-400 hover:text-red-500 text-xs px-2">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
