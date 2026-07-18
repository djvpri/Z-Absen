'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

interface KaryawanDetail {
  id: string
  userId: string
  nama: string
  email: string
  avatarUrl?: string
  role: string
  jabatan?: string
  nip?: string
  noHp?: string
  aktif: boolean
  tipeKaryawan: string
  departemenId?: string
  departemen?: { id: string; nama: string }
  tanggalMulai?: string
  statusPajak?: string
  tunjanganJabatan?: number
  tunjanganMakan?: number
  tunjanganTransport?: number
  tanggalAkhir?: string
  gajiPokok?: number
  nik?: string
  tempatLahir?: string
  tanggalLahir?: string
  jenisKelamin?: string
  agama?: string
  golDarah?: string
  alamat?: string
  kota?: string
  provinsi?: string
  kodePos?: string
  namaBank?: string
  noRekening?: string
  atasNamaRek?: string
  npwp?: string
  kontakDarurat?: Array<{ nama: string; hubungan: string; noHp: string }>
  faceEmbedding?: unknown
}

interface Departemen { id: string; nama: string }

type Tab = 'identitas' | 'kontrak' | 'alamat' | 'rekening' | 'kontak_darurat' | 'mutasi'

const TAB_LABEL: Record<Tab, string> = {
  identitas: 'Identitas',
  kontrak: 'Kontrak',
  alamat: 'Alamat',
  rekening: 'Rekening',
  kontak_darurat: 'Knt. Darurat',
  mutasi: 'Riwayat',
}

interface MutasiItem {
  id: string
  tanggal: string
  jenis: string
  sebelum: Record<string, unknown>
  sesudah: Record<string, unknown>
  keterangan: string | null
}

const JENIS_MUTASI_LABEL: Record<string, { label: string; cls: string }> = {
  PINDAH_DEPARTEMEN: { label: 'Pindah Departemen', cls: 'bg-blue-100 text-blue-700' },
  PERUBAHAN_JABATAN: { label: 'Perubahan Jabatan', cls: 'bg-purple-100 text-purple-700' },
  PERUBAHAN_TIPE: { label: 'Perubahan Tipe', cls: 'bg-gray-100 text-gray-700' },
  KENAIKAN_GAJI: { label: 'Kenaikan Gaji', cls: 'bg-green-100 text-green-700' },
  PENURUNAN_GAJI: { label: 'Penurunan Gaji', cls: 'bg-red-100 text-red-700' },
  KONTRAK_BARU: { label: 'Kontrak Baru', cls: 'bg-teal-100 text-teal-700' },
  LAINNYA: { label: 'Lainnya', cls: 'bg-amber-100 text-amber-700' },
}

export default function KaryawanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<KaryawanDetail | null>(null)
  const [departemen, setDepartemen] = useState<Departemen[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<Tab>('identitas')
  const [form, setForm] = useState<Partial<KaryawanDetail>>({})
  const [kontakDarurat, setKontakDarurat] = useState<Array<{ nama: string; hubungan: string; noHp: string }>>([])
  const [mutasiList, setMutasiList] = useState<MutasiItem[]>([])
  const [mutasiLoading, setMutasiLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/karyawan/${id}`).then(r => r.json()),
      fetch('/api/admin/departemen').then(r => r.json()),
    ]).then(([k, d]) => {
      const kar: KaryawanDetail = k.karyawan
      setData(kar)
      setForm(kar)
      setKontakDarurat(kar.kontakDarurat || [])
      setDepartemen(d.departemen || [])
      setLoading(false)
    })
  }, [id])

  useEffect(() => {
    if (tab !== 'mutasi') return
    setMutasiLoading(true)
    fetch(`/api/admin/mutasi?memberId=${id}`)
      .then(r => r.json())
      .then(d => { setMutasiList(d.mutasi || []); setMutasiLoading(false) })
  }, [tab, id])

  const f = (field: keyof KaryawanDetail) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value || undefined }))
  }

  const handleSave = async () => {
    setSaving(true)
    await fetch(`/api/admin/karyawan/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, kontakDarurat }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const addKontak = () => setKontakDarurat(prev => [...prev, { nama: '', hubungan: '', noHp: '' }])
  const removeKontak = (i: number) => setKontakDarurat(prev => prev.filter((_, idx) => idx !== i))
  const updateKontak = (i: number, field: string, val: string) =>
    setKontakDarurat(prev => prev.map((k, idx) => idx === i ? { ...k, [field]: val } : k))

  const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1'

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!data) return <div className="p-8 text-center text-gray-400">Tidak ditemukan</div>

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <a href="/admin/karyawan" className="text-gray-400 hover:text-gray-600">
            <i className="bi bi-arrow-left"></i>
          </a>
          <h1 className="text-sm font-semibold text-gray-900">Profil Karyawan</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-medium transition-colors ${saved ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'} disabled:opacity-40`}
        >
          {saved ? <><i className="bi bi-check-lg"></i> Tersimpan</> : saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </header>

      {/* Avatar + info ringkas */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {data.avatarUrl
              ? <img src={data.avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover" />
              : data.nama.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900">{data.nama}</p>
            <p className="text-xs text-gray-400">{data.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${data.aktif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {data.aktif ? 'Aktif' : 'Nonaktif'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {data.role === 'TENANT_ADMIN' ? 'Admin' : 'Anggota'}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <select
              value={form.aktif ? 'true' : 'false'}
              onChange={e => setForm(prev => ({ ...prev, aktif: e.target.value === 'true' }))}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none"
            >
              <option value="true">Aktifkan</option>
              <option value="false">Nonaktifkan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 sticky top-[57px] z-10">
        <div className="max-w-3xl mx-auto flex overflow-x-auto scrollbar-hide">
          {(Object.entries(TAB_LABEL) as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`shrink-0 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4">
        {/* TAB: Identitas Pribadi */}
        {tab === 'identitas' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>NIK / NIP</label>
                <input value={form.nip ?? ''} onChange={f('nip')} placeholder="NIK internal / NIP" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>NIK KTP</label>
                <input value={form.nik ?? ''} onChange={f('nik')} placeholder="16 digit NIK" maxLength={16} className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Nama Jabatan</label>
                <input value={form.jabatan ?? ''} onChange={f('jabatan')} placeholder="Staf IT, HRD, dll" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>No. HP / WA</label>
                <input value={form.noHp ?? ''} onChange={f('noHp')} placeholder="08xx..." type="tel" className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Tempat Lahir</label>
                <input value={form.tempatLahir ?? ''} onChange={f('tempatLahir')} placeholder="Jakarta" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Tanggal Lahir</label>
                <input value={form.tanggalLahir ? form.tanggalLahir.split('T')[0] : ''} onChange={f('tanggalLahir')} type="date" className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Jenis Kelamin</label>
                <select value={form.jenisKelamin ?? ''} onChange={f('jenisKelamin')} className={inputCls}>
                  <option value="">Pilih</option>
                  <option value="LAKI_LAKI">Laki-laki</option>
                  <option value="PEREMPUAN">Perempuan</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Agama</label>
                <select value={form.agama ?? ''} onChange={f('agama')} className={inputCls}>
                  <option value="">Pilih</option>
                  {['ISLAM','KRISTEN','KATOLIK','HINDU','BUDDHA','KONGHUCU'].map(a => (
                    <option key={a} value={a}>{a.charAt(0) + a.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Gol. Darah</label>
                <select value={form.golDarah ?? ''} onChange={f('golDarah')} className={inputCls}>
                  <option value="">-</option>
                  {['A','B','AB','O'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Kontrak Kerja */}
        {tab === 'kontrak' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Tipe Karyawan</label>
                <select value={form.tipeKaryawan ?? 'TETAP'} onChange={f('tipeKaryawan')} className={inputCls}>
                  <option value="TETAP">Tetap</option>
                  <option value="KONTRAK">Kontrak</option>
                  <option value="MAGANG">Magang</option>
                  <option value="PARTIME">Part-time</option>
                  <option value="FREELANCE">Freelance</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Departemen</label>
                <select value={form.departemenId ?? ''} onChange={f('departemenId')} className={inputCls}>
                  <option value="">Tidak ada</option>
                  {departemen.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Mulai Kerja</label>
                <input value={form.tanggalMulai ? form.tanggalMulai.split('T')[0] : ''} onChange={f('tanggalMulai')} type="date" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Kontrak Berakhir</label>
                <input value={form.tanggalAkhir ? form.tanggalAkhir.split('T')[0] : ''} onChange={f('tanggalAkhir')} type="date" className={inputCls} />
                <p className="text-xs text-gray-400 mt-1">Kosongkan jika karyawan tetap</p>
              </div>
            </div>

            <div>
              <label className={labelCls}>Gaji Pokok (Rp)</label>
              <input
                value={form.gajiPokok ?? ''}
                onChange={e => setForm(prev => ({ ...prev, gajiPokok: Number(e.target.value) || undefined }))}
                type="number"
                placeholder="5000000"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Hak Akses</label>
              <select value={form.role ?? 'ANGGOTA'} onChange={f('role')} className={inputCls}>
                <option value="ANGGOTA">Anggota (karyawan biasa)</option>
                <option value="TENANT_ADMIN">Admin (bisa akses dashboard admin)</option>
              </select>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Komponen Penggajian</p>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Status Pajak (PTKP)</label>
                  <select value={form.statusPajak ?? 'TK0'} onChange={f('statusPajak')} className={inputCls}>
                    <option value="TK0">TK/0 — Tidak Kawin, 0 tanggungan (54jt)</option>
                    <option value="TK1">TK/1 — Tidak Kawin, 1 tanggungan (58.5jt)</option>
                    <option value="TK2">TK/2 — Tidak Kawin, 2 tanggungan (63jt)</option>
                    <option value="TK3">TK/3 — Tidak Kawin, 3 tanggungan (67.5jt)</option>
                    <option value="K0">K/0 — Kawin, 0 tanggungan (58.5jt)</option>
                    <option value="K1">K/1 — Kawin, 1 tanggungan (63jt)</option>
                    <option value="K2">K/2 — Kawin, 2 tanggungan (67.5jt)</option>
                    <option value="K3">K/3 — Kawin, 3 tanggungan (72jt)</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Tunjangan Jabatan/bln</label>
                    <input value={form.tunjanganJabatan ?? 0} onChange={e => setForm(prev => ({ ...prev, tunjanganJabatan: Number(e.target.value) }))} type="number" min="0" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Tunjangan Makan/hari</label>
                    <input value={form.tunjanganMakan ?? 0} onChange={e => setForm(prev => ({ ...prev, tunjanganMakan: Number(e.target.value) }))} type="number" min="0" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Tunjangan Transport/hari</label>
                    <input value={form.tunjanganTransport ?? 0} onChange={e => setForm(prev => ({ ...prev, tunjanganTransport: Number(e.target.value) }))} type="number" min="0" className={inputCls} />
                  </div>
                </div>
              </div>
            </div>

            {form.tanggalAkhir && new Date(form.tanggalAkhir) < new Date() && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
                <i className="bi bi-exclamation-triangle text-amber-600"></i>
                <p className="text-xs text-amber-700">Kontrak karyawan ini sudah berakhir</p>
              </div>
            )}
          </div>
        )}

        {/* TAB: Alamat */}
        {tab === 'alamat' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
            <div>
              <label className={labelCls}>Alamat Lengkap</label>
              <textarea
                value={form.alamat ?? ''}
                onChange={e => setForm(prev => ({ ...prev, alamat: e.target.value || undefined }))}
                placeholder="Jl. Merdeka No. 12, RT 03/RW 02"
                rows={3}
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Kota / Kabupaten</label>
                <input value={form.kota ?? ''} onChange={f('kota')} placeholder="Jakarta Selatan" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Provinsi</label>
                <input value={form.provinsi ?? ''} onChange={f('provinsi')} placeholder="DKI Jakarta" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Kode Pos</label>
              <input value={form.kodePos ?? ''} onChange={f('kodePos')} placeholder="12345" maxLength={5} className={`${inputCls} max-w-[200px]`} />
            </div>
          </div>
        )}

        {/* TAB: Rekening & Pajak */}
        {tab === 'rekening' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
            <div>
              <label className={labelCls}>Nama Bank</label>
              <select value={form.namaBank ?? ''} onChange={f('namaBank')} className={inputCls}>
                <option value="">Pilih bank</option>
                {['BCA','BRI','BNI','Mandiri','BSI','CIMB Niaga','BTN','Danamon','Permata','BPD'].map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Nomor Rekening</label>
                <input value={form.noRekening ?? ''} onChange={f('noRekening')} placeholder="1234567890" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Atas Nama</label>
                <input value={form.atasNamaRek ?? ''} onChange={f('atasNamaRek')} placeholder="Nama sesuai buku tabungan" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>NPWP</label>
              <input value={form.npwp ?? ''} onChange={f('npwp')} placeholder="XX.XXX.XXX.X-XXX.XXX" className={`${inputCls} max-w-xs`} />
            </div>
          </div>
        )}

        {/* TAB: Kontak Darurat */}
        {tab === 'kontak_darurat' && (
          <div className="space-y-3">
            {kontakDarurat.map((k, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kontak {i + 1}</p>
                  <button onClick={() => removeKontak(i)} className="text-gray-400 hover:text-red-500 text-sm">
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Nama</label>
                    <input value={k.nama} onChange={e => updateKontak(i, 'nama', e.target.value)} placeholder="Nama kontak" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Hubungan</label>
                    <select value={k.hubungan} onChange={e => updateKontak(i, 'hubungan', e.target.value)} className={inputCls}>
                      <option value="">Pilih</option>
                      {['Suami','Istri','Ayah','Ibu','Anak','Saudara','Teman','Lainnya'].map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>No. HP</label>
                  <input value={k.noHp} onChange={e => updateKontak(i, 'noHp', e.target.value)} placeholder="08xx..." type="tel" className={inputCls} />
                </div>
              </div>
            ))}

            {kontakDarurat.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <i className="bi bi-person-lines-fill text-4xl text-gray-300 block mb-2"></i>
                <p className="text-sm text-gray-400">Belum ada kontak darurat</p>
              </div>
            )}

            <button
              onClick={addKontak}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
            >
              <i className="bi bi-plus-lg mr-1.5"></i> Tambah Kontak Darurat
            </button>
          </div>
        )}

        {/* TAB: Riwayat Mutasi */}
        {tab === 'mutasi' && (
          <div className="space-y-3">
            {mutasiLoading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : mutasiList.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                <i className="bi bi-arrow-left-right text-4xl text-gray-300 block mb-2" />
                <p className="text-sm text-gray-400">Belum ada riwayat mutasi</p>
                <p className="text-xs text-gray-300 mt-1">Perubahan jabatan, departemen, atau gaji akan tercatat di sini</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />
                {mutasiList.map((m, idx) => {
                  const cfg = JENIS_MUTASI_LABEL[m.jenis] || JENIS_MUTASI_LABEL.LAINNYA
                  const sbl = m.sebelum as Record<string, unknown>
                  const ssd = m.sesudah as Record<string, unknown>
                  return (
                    <div key={m.id} className={`relative pl-12 ${idx > 0 ? 'mt-4' : ''}`}>
                      <div className="absolute left-3.5 top-1.5 w-3 h-3 rounded-full border-2 border-blue-400 bg-white" />
                      <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.cls}`}>
                            {cfg.label}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(m.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          {sbl.jabatan !== ssd.jabatan && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 w-16 shrink-0">Jabatan</span>
                              <span className="line-through text-gray-400">{String(sbl.jabatan || '-')}</span>
                              <i className="bi bi-arrow-right text-gray-400" />
                              <span className="font-medium text-gray-700">{String(ssd.jabatan || '-')}</span>
                            </div>
                          )}
                          {sbl.departemenId !== ssd.departemenId && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 w-16 shrink-0">Departemen</span>
                              <span className="line-through text-gray-400">{String(sbl.departemenNama || '-')}</span>
                              <i className="bi bi-arrow-right text-gray-400" />
                              <span className="font-medium text-gray-700">{String(ssd.departemenNama || '-')}</span>
                            </div>
                          )}
                          {sbl.tipeKaryawan !== ssd.tipeKaryawan && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 w-16 shrink-0">Tipe</span>
                              <span className="line-through text-gray-400">{String(sbl.tipeKaryawan || '-')}</span>
                              <i className="bi bi-arrow-right text-gray-400" />
                              <span className="font-medium text-gray-700">{String(ssd.tipeKaryawan || '-')}</span>
                            </div>
                          )}
                          {sbl.gajiPokok !== ssd.gajiPokok && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 w-16 shrink-0">Gaji</span>
                              <span className="line-through text-gray-400">
                                Rp {Number(sbl.gajiPokok || 0).toLocaleString('id-ID')}
                              </span>
                              <i className="bi bi-arrow-right text-gray-400" />
                              <span className={`font-medium ${Number(ssd.gajiPokok) > Number(sbl.gajiPokok) ? 'text-green-600' : 'text-red-600'}`}>
                                Rp {Number(ssd.gajiPokok || 0).toLocaleString('id-ID')}
                              </span>
                            </div>
                          )}
                        </div>
                        {m.keterangan && (
                          <p className="text-xs text-gray-400 mt-2 italic">{m.keterangan}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating save button (mobile) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 sm:hidden">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold shadow-lg transition-colors ${saved ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'} disabled:opacity-50`}
        >
          {saved ? <><i className="bi bi-check-lg"></i> Tersimpan!</> : saving ? 'Menyimpan...' : <><i className="bi bi-floppy"></i> Simpan Perubahan</>}
        </button>
      </div>
    </div>
  )
}
