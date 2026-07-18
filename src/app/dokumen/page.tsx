'use client'

import { useState, useEffect, useRef } from 'react'

interface DokumenRecord {
  id: string; nama: string; kategori: string; nomorDokumen: string | null
  tanggalTerbit: string | null; tanggalExpiry: string | null
  fileName: string | null; fileMime: string | null; fileSize: number | null
  status: string; catatan: string | null; createdAt: string
}

const KATEGORI_LIST = [
  { value: 'IDENTITAS', label: 'Identitas', icon: 'bi-person-vcard', color: 'text-blue-600 bg-blue-50' },
  { value: 'KONTRAK', label: 'Kontrak', icon: 'bi-file-earmark-text', color: 'text-green-600 bg-green-50' },
  { value: 'PENDIDIKAN', label: 'Pendidikan', icon: 'bi-mortarboard', color: 'text-violet-600 bg-violet-50' },
  { value: 'SERTIFIKAT', label: 'Sertifikat', icon: 'bi-award', color: 'text-amber-600 bg-amber-50' },
  { value: 'LAINNYA', label: 'Lainnya', icon: 'bi-folder', color: 'text-gray-600 bg-gray-50' },
]

const formatBytes = (b: number) => {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

const formatDate = (d: string | null) => {
  if (!d) return null
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

const expiryDays = (d: string | null) => {
  if (!d) return null
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

const fileIcon = (mime: string | null) => {
  if (!mime) return 'bi-file-earmark text-gray-400'
  if (mime.startsWith('image/')) return 'bi-file-earmark-image text-blue-500'
  if (mime === 'application/pdf') return 'bi-file-earmark-pdf text-red-500'
  if (mime.includes('word')) return 'bi-file-earmark-word text-blue-700'
  if (mime.includes('sheet') || mime.includes('excel')) return 'bi-file-earmark-excel text-green-600'
  return 'bi-file-earmark text-gray-400'
}

const kategoriInfo = (k: string) => KATEGORI_LIST.find((x) => x.value === k) ?? KATEGORI_LIST[4]

export default function DokumenPage() {
  const [data, setData] = useState<DokumenRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    nama: '', kategori: 'IDENTITAS', nomorDokumen: '', tanggalTerbit: '', tanggalExpiry: '',
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const fetchData = async () => {
    const res = await fetch('/api/dokumen').then((r) => r.json())
    setData(res.dokumen || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleUpload = async () => {
    if (!form.nama) return
    setSaving(true)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
    if (selectedFile) fd.append('file', selectedFile)
    await fetch('/api/dokumen', { method: 'POST', body: fd })
    setSaving(false)
    setShowUpload(false)
    setForm({ nama: '', kategori: 'IDENTITAS', nomorDokumen: '', tanggalTerbit: '', tanggalExpiry: '' })
    setSelectedFile(null)
    fetchData()
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <a href="/check-in" className="text-gray-400 hover:text-gray-600 p-1">
          <i className="bi bi-arrow-left" />
        </a>
        <h1 className="text-sm font-semibold text-gray-900 flex-1">Dokumen Saya</h1>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
        >
          <i className="bi bi-plus-lg" /> Upload
        </button>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 py-12 text-center">
            <i className="bi bi-folder2-open text-4xl text-gray-300 block mb-2" />
            <p className="text-sm text-gray-500 font-medium">Belum Ada Dokumen</p>
            <p className="text-xs text-gray-400 mt-1">Upload dokumen pribadi Anda di sini.</p>
            <button
              onClick={() => setShowUpload(true)}
              className="mt-4 text-xs bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700"
            >
              Upload Sekarang
            </button>
          </div>
        ) : (
          data.map((d) => {
            const kat = kategoriInfo(d.kategori)
            const days = expiryDays(d.tanggalExpiry)
            const isExpired = days !== null && days < 0
            const isWarn = days !== null && days >= 0 && days < 30

            return (
              <div key={d.id} className={`bg-white rounded-xl border p-4 ${isExpired ? 'border-red-200' : isWarn ? 'border-amber-200' : 'border-gray-100'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${kat.color}`}>
                    <i className={`bi ${kat.icon} text-base`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-gray-900 text-sm">{d.nama}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                        d.status === 'AKTIF' ? 'bg-green-100 text-green-700'
                        : d.status === 'KADALUARSA' ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-500'
                      }`}>
                        {d.status === 'AKTIF' ? 'Aktif' : d.status === 'KADALUARSA' ? 'Kadaluarsa' : 'Dicabut'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{kat.label}</p>

                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-gray-400">
                      {d.nomorDokumen && <span><i className="bi bi-upc mr-0.5" />{d.nomorDokumen}</span>}
                      {d.tanggalTerbit && <span>Terbit: {formatDate(d.tanggalTerbit)}</span>}
                      {d.tanggalExpiry && (
                        <span className={isExpired ? 'text-red-600 font-medium' : isWarn ? 'text-amber-600 font-medium' : ''}>
                          Exp: {formatDate(d.tanggalExpiry)}
                          {days !== null && days >= 0 && days < 90 && (
                            <span className="ml-1">({days} hari)</span>
                          )}
                          {isExpired && <span className="ml-1">(Kadaluarsa)</span>}
                        </span>
                      )}
                    </div>

                    {d.catatan && (
                      <p className="text-xs text-gray-400 mt-1 italic">{d.catatan}</p>
                    )}

                    {d.fileName && (
                      <div className="mt-2 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                        <i className={`bi ${fileIcon(d.fileMime)} text-sm`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-600 truncate">{d.fileName}</p>
                          {d.fileSize && <p className="text-[10px] text-gray-400">{formatBytes(d.fileSize)}</p>}
                        </div>
                        <a
                          href={`/api/dokumen/${d.id}/file`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          <i className="bi bi-eye" />
                        </a>
                        <a
                          href={`/api/dokumen/${d.id}/file?download=1`}
                          download
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          <i className="bi bi-download" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm my-8">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Upload Dokumen</h3>
              <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-600">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Nama Dokumen <span className="text-red-400">*</span></label>
                <input type="text" placeholder="cth: KTP, Ijazah, Sertifikat..." value={form.nama} onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Kategori</label>
                  <select value={form.kategori} onChange={(e) => setForm((f) => ({ ...f, kategori: e.target.value }))} className={inputCls}>
                    {KATEGORI_LIST.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Nomor</label>
                  <input type="text" placeholder="Opsional" value={form.nomorDokumen} onChange={(e) => setForm((f) => ({ ...f, nomorDokumen: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Tgl Terbit</label>
                  <input type="date" value={form.tanggalTerbit} onChange={(e) => setForm((f) => ({ ...f, tanggalTerbit: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Tgl Exp</label>
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
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl py-5 text-center hover:border-blue-300 hover:bg-blue-50 transition-colors"
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
                    </div>
                  )}
                </button>
              </div>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setShowUpload(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Batal</button>
              <button
                onClick={handleUpload}
                disabled={saving || !form.nama}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Mengupload...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
