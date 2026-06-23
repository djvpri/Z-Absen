'use client'

import { useState, useEffect } from 'react'

interface AbsenItem {
  id: string
  tanggal: string
  status: string
  waktuMasuk?: string
  waktuPulang?: string
  keterangan?: string
}

export default function RiwayatPage() {
  const [data, setData] = useState<AbsenItem[]>([])
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const [bulan, setBulan] = useState(now.getMonth() + 1)
  const [tahun, setTahun] = useState(now.getFullYear())

  useEffect(() => {
    setLoading(true)
    fetch(`/api/absensi?bulan=${bulan}&tahun=${tahun}`)
      .then(r => r.json())
      .then(d => { setData(d.absensi || []); setLoading(false) })
  }, [bulan, tahun])

  const prevMonth = () => {
    if (bulan === 1) { setBulan(12); setTahun(t => t - 1) }
    else setBulan(b => b - 1)
  }
  const nextMonth = () => {
    if (bulan === 12) { setBulan(1); setTahun(t => t + 1) }
    else setBulan(b => b + 1)
  }

  const namaBulan = new Date(tahun, bulan - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

  const statusColor: Record<string, string> = {
    HADIR: 'bg-green-100 text-green-700',
    TERLAMBAT: 'bg-amber-100 text-amber-700',
    IZIN: 'bg-blue-100 text-blue-700',
    SAKIT: 'bg-purple-100 text-purple-700',
    ALPHA: 'bg-red-100 text-red-700',
  }

  const stats = {
    hadir: data.filter(d => d.status === 'HADIR').length,
    terlambat: data.filter(d => d.status === 'TERLAMBAT').length,
    izin: data.filter(d => d.status === 'IZIN').length,
    sakit: data.filter(d => d.status === 'SAKIT').length,
    alpha: data.filter(d => d.status === 'ALPHA').length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <a href="/check-in" className="text-gray-400 hover:text-gray-600">← Kembali</a>
        <h1 className="text-sm font-semibold text-gray-900">Riwayat Absensi</h1>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Month selector */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
          <button onClick={prevMonth} className="text-gray-400 hover:text-gray-600 px-2">←</button>
          <p className="font-semibold text-gray-900 text-sm">{namaBulan}</p>
          <button onClick={nextMonth} className="text-gray-400 hover:text-gray-600 px-2">→</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'Hadir', nilai: stats.hadir, bg: 'bg-green-50 text-green-700' },
            { label: 'Telat', nilai: stats.terlambat, bg: 'bg-amber-50 text-amber-700' },
            { label: 'Izin', nilai: stats.izin, bg: 'bg-blue-50 text-blue-700' },
            { label: 'Sakit', nilai: stats.sakit, bg: 'bg-purple-50 text-purple-700' },
            { label: 'Alpha', nilai: stats.alpha, bg: 'bg-red-50 text-red-700' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-2 text-center ${s.bg}`}>
              <p className="text-lg font-bold">{s.nilai}</p>
              <p className="text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Memuat...</div>
          ) : data.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">Tidak ada data absensi</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Tanggal</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Masuk</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map(a => (
                  <tr key={a.id} className="border-t border-gray-50">
                    <td className="px-4 py-2.5 text-gray-900">
                      {new Date(a.tanggal).toLocaleDateString('id-ID', { day: 'numeric', weekday: 'short' })}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {a.waktuMasuk ? new Date(a.waktuMasuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[a.status] || ''}`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
