'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

type Tab = 'info' | 'rekening' | 'wajah'

interface KontakDarurat { nama: string; hubungan: string; noHp: string }

interface MemberData {
  id: string
  jabatan: string | null
  nip: string | null
  noHp: string | null
  nik: string | null
  tempatLahir: string | null
  tanggalLahir: string | null
  jenisKelamin: string | null
  agama: string | null
  alamat: string | null
  kota: string | null
  provinsi: string | null
  kodePos: string | null
  namaBank: string | null
  noRekening: string | null
  atasNamaRek: string | null
  npwp: string | null
  kontakDarurat: KontakDarurat[] | null
  tipeKaryawan: string
  tanggalMulai: string | null
  departemen: { nama: string } | null
  user: { nama: string; email: string; avatarUrl: string | null }
}

export default function ProfilPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tab, setTab] = useState<Tab>('info')
  const [member, setMember] = useState<MemberData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveOk, setSaveOk] = useState(false)

  // Editable form state
  const [form, setForm] = useState({
    noHp: '', alamat: '', kota: '', provinsi: '', kodePos: '',
    namaBank: '', noRekening: '', atasNamaRek: '', npwp: '',
  })
  const [kontakDarurat, setKontakDarurat] = useState<KontakDarurat[]>([])

  // Face registration
  const [faceStatus, setFaceStatus] = useState<'idle' | 'camera' | 'capturing' | 'done' | 'error'>('idle')
  const [facePesan, setFacePesan] = useState('')
  const [faceError, setFaceError] = useState('')

  const fetchProfil = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/profil')
    const d = await res.json()
    if (d.member) {
      setMember(d.member)
      setForm({
        noHp: d.member.noHp || '',
        alamat: d.member.alamat || '',
        kota: d.member.kota || '',
        provinsi: d.member.provinsi || '',
        kodePos: d.member.kodePos || '',
        namaBank: d.member.namaBank || '',
        noRekening: d.member.noRekening || '',
        atasNamaRek: d.member.atasNamaRek || '',
        npwp: d.member.npwp || '',
      })
      setKontakDarurat(
        Array.isArray(d.member.kontakDarurat) ? d.member.kontakDarurat : []
      )
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchProfil() }, [fetchProfil])

  const handleSave = async () => {
    setSaving(true)
    setSaveOk(false)
    await fetch('/api/profil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, kontakDarurat }),
    })
    setSaving(false)
    setSaveOk(true)
    setTimeout(() => setSaveOk(false), 3000)
  }

  // Face registration
  const mulaiDaftarWajah = async () => {
    setFaceStatus('camera')
    setFacePesan('Mengaktifkan kamera...')
    setFaceError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      })
      if (videoRef.current) videoRef.current.srcObject = stream
      setFacePesan('Arahkan wajah ke kamera, lalu klik "Ambil Foto"')
    } catch {
      setFaceError('Tidak bisa mengakses kamera')
      setFaceStatus('idle')
    }
  }

  const ambilDanSimpan = async () => {
    if (!videoRef.current || !canvasRef.current) return
    setFaceStatus('capturing')
    setFacePesan('Memproses wajah...')
    try {
      const faceapi = await import('face-api.js')
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      ])
      const deteksi = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor()
      if (!deteksi) {
        setFaceError('Wajah tidak terdeteksi. Coba lagi.')
        setFaceStatus('camera')
        return
      }
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')!
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      ctx.drawImage(videoRef.current, 0, 0)
      const fotoBase64 = canvas.toDataURL('image/jpeg', 0.7)
      const embedding = Array.from(deteksi.descriptor)
      const res = await fetch('/api/wajah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embedding, fotoBase64 }),
      })
      const data = await res.json()
      if (!res.ok) { setFaceError(data.error || 'Gagal'); setFaceStatus('camera'); return }
      const stream = videoRef.current.srcObject as MediaStream
      stream?.getTracks().forEach((t) => t.stop())
      setFacePesan('Wajah berhasil didaftarkan!')
      setFaceStatus('done')
    } catch (e) {
      setFaceError(String(e))
      setFaceStatus('camera')
    }
  }

  const batalKamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream
    stream?.getTracks().forEach((t) => t.stop())
    setFaceStatus('idle')
    setFaceError('')
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  const TIPE_LABEL: Record<string, string> = {
    TETAP: 'Karyawan Tetap', KONTRAK: 'Kontrak', MAGANG: 'Magang',
    PARTIME: 'Part-time', FREELANCE: 'Freelance',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <a href="/check-in" className="text-gray-400 hover:text-gray-600 p-1">
          <i className="bi bi-arrow-left" />
        </a>
        <h1 className="text-sm font-semibold text-gray-900 flex-1">Profil Saya</h1>
        <a href="/slip-gaji" className="text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50">
          <i className="bi bi-file-earmark-text mr-1" />Slip Gaji
        </a>
      </header>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Header card */}
          <div className="bg-blue-600 px-4 pt-6 pb-10">
            <div className="max-w-lg mx-auto flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-2xl font-bold text-white overflow-hidden shrink-0">
                {member?.user.avatarUrl ? (
                  <img src={member.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  member?.user.nama.charAt(0)
                )}
              </div>
              <div className="text-white">
                <p className="font-semibold text-base">{member?.user.nama}</p>
                <p className="text-blue-100 text-sm">{member?.jabatan || 'Karyawan'}</p>
                <p className="text-blue-200 text-xs">{member?.departemen?.nama || ''} · {TIPE_LABEL[member?.tipeKaryawan || ''] || ''}</p>
              </div>
            </div>
          </div>

          <div className="max-w-lg mx-auto -mt-6 px-4">
            {/* Tab selector */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4">
              <div className="flex border-b border-gray-100">
                {(['info', 'rekening', 'wajah'] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                      tab === t ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {t === 'info' ? 'Data Diri' : t === 'rekening' ? 'Rekening' : 'Wajah'}
                  </button>
                ))}
              </div>

              {/* Tab: Data Diri */}
              {tab === 'info' && (
                <div className="p-5 space-y-4">
                  {/* Read-only info */}
                  <div className="space-y-2">
                    {[
                      ['Email', member?.user.email],
                      ['NIP / ID', member?.nip || '-'],
                      ['NIK KTP', member?.nik || '-'],
                      ['Tgl Lahir', member?.tanggalLahir ? new Date(member.tanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'],
                      ['Tgl Mulai Kerja', member?.tanggalMulai ? new Date(member.tanggalMulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'],
                    ].map(([label, val]) => (
                      <div key={label} className="flex items-start gap-3 py-2 border-b border-gray-50">
                        <span className="text-xs text-gray-400 w-28 shrink-0 pt-0.5">{label}</span>
                        <span className="text-sm text-gray-800">{val || '-'}</span>
                      </div>
                    ))}
                  </div>

                  {/* Editable fields */}
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">Kontak & Alamat</p>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">No. HP / WhatsApp</label>
                    <input
                      type="tel"
                      value={form.noHp}
                      onChange={(e) => setForm((f) => ({ ...f, noHp: e.target.value }))}
                      placeholder="08xx xxxx xxxx"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Alamat</label>
                    <textarea
                      rows={2}
                      value={form.alamat}
                      onChange={(e) => setForm((f) => ({ ...f, alamat: e.target.value }))}
                      placeholder="Jl. ..."
                      className={inputCls + ' resize-none'}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Kota</label>
                      <input type="text" value={form.kota} onChange={(e) => setForm((f) => ({ ...f, kota: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Provinsi</label>
                      <input type="text" value={form.provinsi} onChange={(e) => setForm((f) => ({ ...f, provinsi: e.target.value }))} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Kode Pos</label>
                    <input type="text" value={form.kodePos} onChange={(e) => setForm((f) => ({ ...f, kodePos: e.target.value }))} placeholder="12345" className={inputCls} />
                  </div>

                  {/* Kontak darurat */}
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">Kontak Darurat</p>
                  {kontakDarurat.map((k, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-500">Kontak {i + 1}</p>
                        <button
                          onClick={() => setKontakDarurat((prev) => prev.filter((_, j) => j !== i))}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          <i className="bi bi-x-lg" />
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Nama"
                        value={k.nama}
                        onChange={(e) => setKontakDarurat((prev) => prev.map((x, j) => j === i ? { ...x, nama: e.target.value } : x))}
                        className={inputCls}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Hubungan"
                          value={k.hubungan}
                          onChange={(e) => setKontakDarurat((prev) => prev.map((x, j) => j === i ? { ...x, hubungan: e.target.value } : x))}
                          className={inputCls}
                        />
                        <input
                          type="tel"
                          placeholder="No. HP"
                          value={k.noHp}
                          onChange={(e) => setKontakDarurat((prev) => prev.map((x, j) => j === i ? { ...x, noHp: e.target.value } : x))}
                          className={inputCls}
                        />
                      </div>
                    </div>
                  ))}
                  {kontakDarurat.length < 3 && (
                    <button
                      onClick={() => setKontakDarurat((prev) => [...prev, { nama: '', hubungan: '', noHp: '' }])}
                      className="w-full py-2 text-sm text-blue-600 border border-dashed border-blue-200 rounded-xl hover:bg-blue-50"
                    >
                      <i className="bi bi-plus-lg mr-1" />Tambah Kontak Darurat
                    </button>
                  )}

                  <SaveButton saving={saving} saveOk={saveOk} onSave={handleSave} />
                </div>
              )}

              {/* Tab: Rekening */}
              {tab === 'rekening' && (
                <div className="p-5 space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Rekening Bank</p>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Nama Bank</label>
                    <input type="text" value={form.namaBank} onChange={(e) => setForm((f) => ({ ...f, namaBank: e.target.value }))} placeholder="BCA, BRI, Mandiri..." className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">No. Rekening</label>
                    <input type="text" value={form.noRekening} onChange={(e) => setForm((f) => ({ ...f, noRekening: e.target.value }))} placeholder="123456789" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Atas Nama Rekening</label>
                    <input type="text" value={form.atasNamaRek} onChange={(e) => setForm((f) => ({ ...f, atasNamaRek: e.target.value }))} placeholder="Nama sesuai buku tabungan" className={inputCls} />
                  </div>

                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">Pajak</p>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">NPWP</label>
                    <input type="text" value={form.npwp} onChange={(e) => setForm((f) => ({ ...f, npwp: e.target.value }))} placeholder="XX.XXX.XXX.X-XXX.XXX" className={inputCls} />
                  </div>

                  <SaveButton saving={saving} saveOk={saveOk} onSave={handleSave} />
                </div>
              )}

              {/* Tab: Wajah */}
              {tab === 'wajah' && (
                <div className="p-5 space-y-4">
                  <p className="text-sm text-gray-500">
                    Wajah digunakan untuk verifikasi saat absensi. Pastikan wajah terlihat jelas dan pencahayaan cukup.
                  </p>

                  {faceStatus === 'done' && (
                    <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                      <i className="bi bi-check-circle-fill text-green-500 text-2xl block mb-1" />
                      <p className="text-green-700 text-sm font-medium">Wajah berhasil didaftarkan!</p>
                      <button onClick={() => { setFaceStatus('idle'); setFacePesan('') }} className="text-xs text-green-600 underline mt-1">
                        Daftarkan ulang
                      </button>
                    </div>
                  )}

                  {faceStatus === 'camera' && (
                    <div>
                      <div className="relative aspect-[4/3] bg-gray-900 rounded-xl overflow-hidden mb-3">
                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-40 h-40 border-2 border-white/50 rounded-full" />
                        </div>
                      </div>
                      <canvas ref={canvasRef} className="hidden" />
                    </div>
                  )}

                  {facePesan && <p className="text-sm text-center text-gray-500">{facePesan}</p>}

                  {faceError && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                      <p className="text-sm text-red-600">{faceError}</p>
                    </div>
                  )}

                  {faceStatus === 'camera' ? (
                    <div className="space-y-2">
                      <button onClick={ambilDanSimpan} className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                        Ambil Foto & Simpan
                      </button>
                      <button onClick={batalKamera} className="w-full py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
                        Batal
                      </button>
                    </div>
                  ) : faceStatus !== 'done' && (
                    <button onClick={mulaiDaftarWajah} className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                      <i className="bi bi-camera mr-2" />
                      Daftarkan Wajah Sekarang
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function SaveButton({ saving, saveOk, onSave }: { saving: boolean; saveOk: boolean; onSave: () => void }) {
  return (
    <div>
      {saveOk && (
        <p className="text-xs text-green-600 text-center mb-2">
          <i className="bi bi-check-circle mr-1" />Data berhasil disimpan
        </p>
      )}
      <button
        onClick={onSave}
        disabled={saving}
        className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
      </button>
    </div>
  )
}
