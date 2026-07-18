'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface Member { id: string; jabatan: string | null; user: { nama: string }; departemen: { nama: string } | null }
interface DokumenRecord {
  id: string; nama: string; kategori: string; nomorDokumen: string | null
  tanggalTerbit: string | null; tanggalExpiry: string | null
  fileName: string | null; fileMime: string | null; fileSize: number | null
  status: string; catatan: string | null; createdAt: string
  member: { id: string; jabatan: string | null; user: { nama: string } }
}

const KATEGORI_LIST = [
  { value: 'IDENTITAS', label: 'Identitas', icon: 'bi-person-vcard', color: 'text-blue-600 bg-blue-50' },
  { value: 'KONTRAK', label: 'Kontrak', icon: 'bi-file-earmark-text', color: 'text-green-600 bg-green-50' },
  { value: 'PENDIDIKAN', label: 'Pendidikan', icon: 'bi-mortarboard', color: 'text-violet-600 bg-violet-50' },
  { value: 'SERTIFIKAT', label: 'Sertifikat', icon: 'bi-award', color: 'text-amber-600 bg-amber-50' },
  { value: 'LAINNYA', label: 'Lainnya', icon: 'bi-folder', color: 'text-gray-600 bg-gray-50' },
]

const STATUS_LIST = [
  { value: 'AKTIF', label: 'Aktif', cls: 'bg-green-100 text-green-700' },
  { value: 'KADALUARSA', label: 'Kadaluarsa', cls: 'bg-red-100 text-red-700' },
  { value: 'DICABUT', label: 'Dicabut', cls: 'bg-gray-100 text-gray-500' },
]

const formatBytes = (b: number) => {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

const formatDate = (d: string | null) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

const expiryStatus = (d: string | null) => {
  if (!d) return null
  const diff = (new Date(d).getTime() - Date.now()) / 86400000
  if (diff < 0) return { label: 'Kadaluarsa', cls: 'text-red-600 bg-red-50' }
  if (diff < 30) return { label: `${Math.ceil(diff)} hari lagi`, cls: 'text-red-500 bg-red-50' }
  if (diff < 90) return { label: `${Math.ceil(diff)} hari lagi`, cls: 'text-amber-600 bg-amber-50' }
  return null
}

const kategoriInfo = (k: string) => KATEGORI_LIST.find((x) => x.value === k) ?? KATEGORI_LIST[4]
const statusInfo = (s: string) => STATUS_LIST.find((x) => x.value === s) ?? STATUS_LIST[0]

const fileIcon = (mime: string | null) => {
  if (!mime) return 'bi-file-earmark'
  if (mime.startsWith('image/')) return 'bi-file-earmark-image text-blue-500'
  if (mime === 'application/pdf') return 'bi-file-earmark-pdf text-red-500'
  if (mime.includes('word')) return 'bi-file-earmark-word text-blue-700'
  if (mime.includes('sheet') || mime.includes('excel')) return 'bi-file-earmark-excel text-green-600'
  return 'bi-file-earmark text-gray-500'
}

export default function AdminDokumenPage() {
  const [dokumen, setDokumen] = useState<DokumenRecord[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMember, setFilterMember] = useState('')
  const [filterKat, setFilterKat] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    memberId: '', nama: '', kategori: 'IDENTITAS', nomorDokumen: '',
    tanggalTerbit: '', tanggalExpiry: '', catatan: '',
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Edit metadata only (PUT)
  const [editModal, setEditModal] = useState<DokumenRecord | null>(null)
  const [editForm, setEditForm] = useState({ status: 'AKTIF', catatan: '', tanggalExpiry: '' })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterMember) params.set('memberId', filterMember)
    if (filterKat) params.set('kategori', filterKat)
    const [dRes, mRes] = await Promise.all([
      fetch(`/api/admin/dokumen?${params}`).then((r) => r.json()),
      fetch('/api/admin/karyawan?limit=200').then((r) => r.json()),
    ])
    setDokumen(dRes.dokumen || [])
    setMembers(mRes.members || [])
    setLoading(false)
  }, [filterMember, filterKat])

  useEffect(() => { fetchAll() }, [fetchAll])

  const openUpload = () => {
    setForm({ memberId: '', nama: '', kategori: 'IDENTITAS', nomorDokumen: '', tanggalTerbit: '', tanggalExpiry: '', catatan: '' })
    setSelectedFile(null)
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!form.memberId || !form.nama) return
    setSaving(true)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
    if (selectedFile) fd.append('file', selectedFile)
    await fetch('/api/admin/dokumen', { method: 'POST', body: fd })
    setSaving(false)
    setShowModal(false)
    fetchAll()
  }

  const openEdit = (d: DokumenRecord) => {
    setEditModal(d)
    setEditForm({
      status: d.status,
      catatan: d.catatan || '',
      tanggalExpiry: d.tanggalExpiry ? d.tanggalExpiry.slice(0, 10) : '',
    })
  }

  const handleSaveEdit = async () => {
    if (!editModal) return
    setSaving(true)
    await fetch(`/api/admin/dokumen/${editModal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editForm, tanggalExpiry: editForm.tanggalExpiry || null }),
    })
    setSaving(false)
    setEditModal(null)
    fetchAll()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus dokumen ini?')) return
    await fetch(`/api/admin/dokumen/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  const filtered = dokumen.filter((d) => {
    if (!search) return true
    const q = search.toLowerCase()
    return d.nama.toLowerCase().includes(q) || d.member.user.nama.toLowerCase().includes(q) || (d.nomorDokumen || '').toLowerCase().includes(q)
  })

  const expiringSoon = dokumen.filter((d) => {
    if (!d.tanggalExpiry || d.status !== 'AKTIF') return false
    return (new Date(d.tanggalExpiry).getTime() - Date.now()) / 86400000 < 30
  })

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <a href="/admin/dashboard" className="text-gray-400 hover:text-gray-600 p-1">
          <i className="bi bi-arrow-left" />
        </a>
        <h1 className="text-sm font-semibold text-gray-900 flex-1">Dokumen Karyawan</h1>
        <button
          onClick={openUpload}
          className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
        >
          <i className="bi bi-upload" /> Upload
        </button>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Expiry warning */}
        {expiringSoon.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <i className="bi bi-exclamation-triangle text-amber-600 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800">
                {expiringSoon.length} dokumen akan kadaluarsa dalam 30 hari
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {expiringSoon.map((d) => d.member.user.nama.split(' ')[0] + ' – ' + d.nama).join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* Filter bar */}
        <div className="bg-white border border-gray-100 rounded-xl p-3 space-y-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama dokumen, karyawan, nomor..."
            className={inputCls}
          />
          <div className="flex gap-2">
            <select
              value={filterMember}
              onChange={(e) => setFilterMember(e.target.value)}
              className={inputCls}
            >
              <option value="">Semua Karyawan</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.user.nama}</option>
              ))}
            </select>
            <select
              value={filterKat}
              onChange={(e) => setFilterKat(e.target.value)}
              className={inputCls}
            >
              <option value="">Semua Kategori</option>
              {KATEGORI_LIST.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stat pills */}
        <div className="flex gap-2 flex-wrap">
          {KATEGORI_LIST.map((k) => {
            const count = dokumen.filter((d) => d.kategori === k.value).length
            if (!count) return null
            return (
              <button
                key={k.value}
                onClick={() => setFilterKat(filterKat === k.value ? '' : k.value)}
                className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium ${
                  filterKat === k.value ? 'ring-2 ring-blue-500 ' : ''
                }${k.color}`}
              >
                <i className={`bi ${k.icon}`} /> {k.label} <span className="opacity-70">({count})</span>
              </button>
            )
          })}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 py-12 text-center">
            <i className="bi bi-folder2-open text-4xl text-gray-300 block mb-2" />
            <p className="text-sm text-gray-400">Belum ada dokumen</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((d) => {
              const kat = kategoriInfo(d.kategori)
              const stat = statusInfo(d.status)
              const exp = expiryStatus(d.tanggalExpiry)
              return (
                <div key={d.id} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${kat.color}`}>
                      <i className={`bi ${kat.icon} text-base`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{d.nama}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{d.member.user.nama}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${stat.cls}`}>{stat.label}</span>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                        {d.nomorDokumen && <span><i className="bi bi-upc mr-1" />{d.nomorDokumen}</span>}
                        {d.tanggalTerbit && <span><i className="bi bi-calendar-check mr-1" />Terbit: {formatDate(d.tanggalTerbit)}</span>}
                        {d.tanggalExpiry && (
                          <span className={exp ? exp.cls + ' px-1.5 py-0.5 rounded' : ''}>
                            <i className="bi bi-calendar-x mr-1" />
                            Exp: {formatDate(d.tanggalExpiry)}
                            {exp && <span className="ml-1 font-semibold">({exp.label})</span>}
                          </span>
                        )}
                      </div>

                      {d.fileName && (
                        <div className="mt-2 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                          <i className={`bi ${fileIcon(d.fileMime)} text-base`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-700 truncate">{d.fileName}</p>
                            {d.fileSize && <p className="text-[10px] text-gray-400">{formatBytes(d.fileSize)}</p>}
                          </div>
                          <a
                            href={`/api/admin/dokumen/${d.id}/file`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                          >
                            <i className="bi bi-eye" /> Lihat
                          </a>
                          <a
                            href={`/api/admin/dokumen/${d.id}/file?download=1`}
                            download
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            <i className="bi bi-download" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-50">
                    <button
                      onClick={() => openEdit(d)}
                      className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
                    >
                      <i className="bi bi-pencil mr-1" />Edit
                    </button>
                    <button
                      onClick={() => handleDelete(d.id)}
                      className="text-xs px-3 py-1.5 border border-red-100 rounded-lg text-red-400 hover:bg-red-50"
                    >
                      <i className="bi bi-trash mr-1" />Hapus
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-8">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Upload Dokumen</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Karyawan <span className="text-red-400">*</span></label>
                <select value={form.memberId} onChange={(e) => setForm((f) => ({ ...f, memberId: e.target.value }))} className={inputCls}>
                  <option value="">— Pilih Karyawan —</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.user.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Nama Dokumen <span className="text-red-400">*</span></label>
                <input type="text" placeholder="cth: KTP, Ijazah S1, Kontrak Kerja..." value={form.nama} onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Kategori</label>
                  <select value={form.kategori} onChange={(e) => setForm((f) => ({ ...f, kategori: e.target.value }))} className={inputCls}>
                    {KATEGORI_LIST.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Nomor Dokumen</label>
                  <input type="text" placeholder="Opsional" value={form.nomorDokumen} onChange={(e) => setForm((f) => ({ ...f, nomorDokumen: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Tgl Terbit</label>
                  <input type="date" value={form.tanggalTerbit} onChange={(e) => setForm((f) => ({ ...f, tanggalTerbit: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Tgl Kadaluarsa</label>
                  <input type="date" value={form.tanggalExpiry} onChange={(e) => setForm((f) => ({ ...f, tanggalExpiry: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">File (maks 10MB)</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 text-center hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  {selectedFile ? (
                    <div>
                      <i className="bi bi-file-earmark-check text-green-500 text-xl block mb-1" />
                      <p className="text-xs text-gray-700 font-medium">{selectedFile.name}</p>
                      <p className="text-[10px] text-gray-400">{formatBytes(selectedFile.size)}</p>
                    </div>
                  ) : (
                    <div>
                      <i className="bi bi-cloud-upload text-gray-300 text-2xl block mb-1" />
                      <p className="text-xs text-gray-400">Klik untuk pilih file</p>
                      <p className="text-[10px] text-gray-300">PDF, JPG, PNG, DOC, XLS</p>
                    </div>
                  )}
                </button>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Catatan</label>
                <textarea rows={2} value={form.catatan} onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))} className={inputCls + ' resize-none'} />
              </div>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Batal</button>
              <button
                onClick={handleSubmit}
                disabled={saving || !form.memberId || !form.nama}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Mengupload...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Edit Dokumen</h3>
              <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-gray-600">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm font-medium text-gray-700">{editModal.nama}</p>
              <p className="text-xs text-gray-400">{editModal.member.user.nama}</p>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
                  {STATUS_LIST.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Tgl Kadaluarsa</label>
                <input type="date" value={editForm.tanggalExpiry} onChange={(e) => setEditForm((f) => ({ ...f, tanggalExpiry: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Catatan</label>
                <textarea rows={2} value={editForm.catatan} onChange={(e) => setEditForm((f) => ({ ...f, catatan: e.target.value }))} className={inputCls + ' resize-none'} />
              </div>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setEditModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Batal</button>
              <button onClick={handleSaveEdit} disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
