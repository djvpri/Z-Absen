'use client'

import { useState, useEffect, useCallback } from 'react'

interface KuotaItem {
  jenis: string
  jatah: number
  terpakai: number
  sisa: number
  jatahId: string | null
}

interface KaryawanKuota {
  memberId: string
  nama: string
  jabatan?: string
  kuota: KuotaItem[]
}

const JENIS_LABEL: Record<string, string> = {
  CUTI_TAHUNAN: 'Cuti Tahunan',
  CUTI_SAKIT: 'Cuti Sakit',
  IZIN: 'Izin',
}

const JENIS_COLOR: Record<string, string> = {
  CUTI_TAHUNAN: 'blue',
  CUTI_SAKIT: 'purple',
  IZIN: 'amber',
}

type EditingCell = { memberId: string; jenis: string; value: string }

export default function JatahCutiPage() {
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [data, setData] = useState<KaryawanKuota[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<EditingCell | null>(null)
  const [initing, setIniting] = useState(false)
  const [initMsg, setInitMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/jatah-cuti?tahun=${tahun}`)
    const d = await res.json()
    setData(d.karyawan || [])
    setLoading(false)
  }, [tahun])

  useEffect(() => { load() }, [load])

  const handleInit = async () => {
    setIniting(true)
    const res = await fetch('/api/admin/jatah-cuti', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tahun }),
    })
    const d = await res.json()
    setInitMsg(`${d.created} kuota baru dibuat untuk tahun ${d.tahun}`)
    setTimeout(() => setInitMsg(''), 4000)
    setIniting(false)
    load()
  }

  const handleSave = async (memberId: string, jenis: string, value: string) => {
    const jatah = parseInt(value)
    if (isNaN(jatah) || jatah < 0) { setEditing(null); return }
    await fetch('/api/admin/jatah-cuti', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, tahun, jenis, jatah }),
    })
    setEditing(null)
    load()
  }

  const barColor = (sisa: number, jatah: number) => {
    const pct = jatah > 0 ? sisa / jatah : 0
    if (pct > 0.5) return 'bg-green-500'
    if (pct > 0.25) return 'bg-amber-400'
    return 'bg-red-500'
  }

  const tahunOptions = [tahun - 1, tahun, tahun + 1]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <a href="/admin/dashboard" className="text-gray-400 hover:text-gray-600">
            <i className="bi bi-arrow-left"></i>
          </a>
          <h1 className="text-sm font-semibold text-gray-900">Kuota Cuti</h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={tahun}
            onChange={e => setTahun(Number(e.target.value))}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none"
          >
            {tahunOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            onClick={handleInit}
            disabled={initing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-40"
          >
            <i className="bi bi-magic"></i> Init Kuota
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {initMsg && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
            <i className="bi bi-check-circle-fill text-green-600"></i>
            <p className="text-sm text-green-700">{initMsg}</p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2">
          <i className="bi bi-info-circle text-blue-500 mt-0.5"></i>
          <div className="text-xs text-blue-700 space-y-0.5">
            <p>Klik angka <strong>jatah</strong> untuk mengeditnya. Klik di luar untuk membatalkan.</p>
            <p>Default: Cuti Tahunan 12 hari · Cuti Sakit 12 hari · Izin 6 hari</p>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <i className="bi bi-calendar-x text-4xl text-gray-300 block mb-2"></i>
            <p className="text-sm text-gray-400 mb-3">Belum ada karyawan aktif</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map(k => (
              <div key={k.memberId} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {k.nama.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{k.nama}</p>
                    <p className="text-xs text-gray-400">{k.jabatan || 'Karyawan'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {k.kuota.map(q => {
                    const color = JENIS_COLOR[q.jenis] ?? 'gray'
                    const isEditing = editing?.memberId === k.memberId && editing?.jenis === q.jenis
                    const pct = q.jatah > 0 ? Math.min(100, (q.terpakai / q.jatah) * 100) : 0

                    return (
                      <div key={q.jenis} className={`rounded-xl p-3 bg-${color}-50 border border-${color}-100`}>
                        <p className={`text-xs font-medium text-${color}-700 mb-2`}>{JENIS_LABEL[q.jenis]}</p>

                        <div className="flex items-baseline gap-1 mb-1.5">
                          <span className={`text-xl font-bold text-${color}-700`}>{q.sisa}</span>
                          <span className={`text-xs text-${color}-400`}>
                            / {isEditing ? (
                              <input
                                autoFocus
                                type="number"
                                min="0"
                                max="365"
                                value={editing.value}
                                onChange={e => setEditing(prev => prev ? { ...prev, value: e.target.value } : null)}
                                onBlur={() => handleSave(k.memberId, q.jenis, editing?.value ?? '')}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSave(k.memberId, q.jenis, editing?.value ?? '')
                                  if (e.key === 'Escape') setEditing(null)
                                }}
                                className={`w-10 border-b border-${color}-400 bg-transparent text-${color}-700 font-semibold text-xs focus:outline-none text-center`}
                              />
                            ) : (
                              <button
                                onClick={() => setEditing({ memberId: k.memberId, jenis: q.jenis, value: String(q.jatah) })}
                                className={`underline decoration-dashed cursor-pointer hover:text-${color}-700`}
                                title="Klik untuk edit jatah"
                              >
                                {q.jatah}
                              </button>
                            )} hari
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="h-1.5 bg-white rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${barColor(q.sisa, q.jatah)}`}
                            style={{ width: `${100 - pct}%` }}
                          />
                        </div>
                        <p className={`text-xs text-${color}-400 mt-1`}>{q.terpakai} terpakai</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
