'use client'

import { useState, useEffect } from 'react'

interface GajiItem {
  id: string
  user: { nama: string; role: string }
  bulan: number
  tahun: number
  gajiPokok: number
  tunjanganHadir: number
  potonganAlpha: number
  potonganTerlambat: number
  totalGaji: number
  jumlahHadir: number
  jumlahAlpha: number
  jumlahTerlambat: number
  dibayarkan: boolean
}

export default function GajiPage() {
  const [data, setData] = useState<GajiItem[]>([])
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const [bulan, setBulan] = useState(now.getMonth() + 1)
  const [tahun, setTahun] = useState(now.getFullYear())
  const [calculating, setCalculating] = useState(false)

  const load = () => {
    setLoading(true)
    fetch(`/api/gaji?bulan=${bulan}&tahun=${tahun}`)
      .then(r => r.json())
      .then(d => { setData(d.gaji || []); setLoading(false) })
  }

  useEffect(() => { load() }, [bulan, tahun])

  const hitungGaji = async () => {
    setCalculating(true)
    await fetch('/api/gaji/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bulan, tahun }),
    })
    load()
    setCalculating(false)
  }

  const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

  const prevMonth = () => bulan === 1 ? (setBulan(12), setTahun(t => t - 1)) : setBulan(b => b - 1)
  const nextMonth = () => bulan === 12 ? (setBulan(1), setTahun(t => t + 1)) : setBulan(b => b + 1)
  const namaBulan = new Date(tahun, bulan - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <a href="/admin/dashboard" className="text-gray-400 hover:text-gray-600">← Kembali</a>
        <h1 className="text-sm font-semibold text-gray-900">Hitung Gaji</h1>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-2 flex items-center gap-2">
            <button onClick={prevMonth} className="text-gray-400 hover:text-gray-600">←</button>
            <span className="text-sm font-medium text-gray-900">{namaBulan}</span>
            <button onClick={nextMonth} className="text-gray-400 hover:text-gray-600">→</button>
          </div>
          <button onClick={hitungGaji} disabled={calculating}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-medium hover:bg-blue-700 disabled:opacity-40">
            {calculating ? 'Menghitung...' : '💰 Hitung Gaji'}
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Memuat...</div>
          ) : data.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              Belum ada data gaji. Klik "Hitung Gaji" untuk menghitung.
            </div>
          ) : (
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Nama</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center">Hadir</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center">Alpha</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center">Telat</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-right">Pokok</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-right">Tunjangan</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-right">Potongan</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.map(g => (
                  <tr key={g.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <p className="text-gray-900 font-medium">{g.user.nama}</p>
                      <p className="text-xs text-gray-400">{g.user.role}</p>
                    </td>
                    <td className="px-3 py-2.5 text-center text-green-600">{g.jumlahHadir}</td>
                    <td className="px-3 py-2.5 text-center text-red-600">{g.jumlahAlpha}</td>
                    <td className="px-3 py-2.5 text-center text-amber-600">{g.jumlahTerlambat}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{formatRp(g.gajiPokok)}</td>
                    <td className="px-3 py-2.5 text-right text-green-600">+{formatRp(g.tunjanganHadir)}</td>
                    <td className="px-3 py-2.5 text-right text-red-600">-{formatRp(g.potonganAlpha + g.potonganTerlambat)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{formatRp(g.totalGaji)}</td>
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
