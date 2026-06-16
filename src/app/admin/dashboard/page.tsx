'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface DashboardData {
  ringkasan: {
    totalGuru: number
    totalSiswa: number
    hadirHariIni: number
    terlambatHariIni: number
    izinMenunggu: number
    tanggal: string
  }
  absensiTerbaru: Array<{
    id: string
    status: string
    waktuMasuk: string
    user: { nama: string; role: string }
  }>
  grafik7Hari: Array<{
    tanggal: string
    status: string
    _count: number
  }>
}

const statusWarna: Record<string, string> = {
  HADIR: '#22c55e',
  TERLAMBAT: '#f59e0b',
  ALPHA: '#ef4444',
  IZIN: '#3b82f6',
  SAKIT: '#a855f7',
}

export default function DashboardAdmin() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/absensi/dashboard')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) return null

  const { ringkasan, absensiTerbaru } = data

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">S</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">SiHadir Admin</p>
            <p className="text-xs text-gray-400">{ringkasan.tanggal}</p>
          </div>
        </div>
        <a href="/api/auth/logout" className="text-xs text-gray-400 hover:text-gray-600">Keluar</a>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Guru', nilai: ringkasan.totalGuru, warna: 'blue' },
            { label: 'Total Siswa', nilai: ringkasan.totalSiswa, warna: 'purple' },
            { label: 'Hadir Hari Ini', nilai: ringkasan.hadirHariIni, warna: 'green' },
            { label: 'Izin Menunggu', nilai: ringkasan.izinMenunggu, warna: 'amber' },
          ].map((k) => (
            <div key={k.label} className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">{k.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{k.nilai}</p>
            </div>
          ))}
        </div>

        {ringkasan.terlambatHariIni > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center gap-2">
            <span className="text-amber-600">⚠️</span>
            <p className="text-sm text-amber-700">
              {ringkasan.terlambatHariIni} orang terlambat hari ini
            </p>
          </div>
        )}

        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-900 mb-3">Kehadiran 7 hari terakhir</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={data.grafik7Hari.slice(0, 7)}>
              <XAxis
                dataKey="tanggal"
                tickFormatter={(v) => new Date(v).toLocaleDateString('id-ID', { weekday: 'short' })}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                formatter={(v, n) => [v, n]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="_count" radius={[4, 4, 0, 0]}>
                {data.grafik7Hari.map((entry, i) => (
                  <Cell key={i} fill={statusWarna[entry.status] || '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-900">Absensi terbaru hari ini</p>
            <a href="/admin/laporan" className="text-xs text-blue-600 hover:underline">Lihat semua →</a>
          </div>
          <div className="space-y-2">
            {absensiTerbaru.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Belum ada absensi hari ini</p>
            )}
            {absensiTerbaru.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                    {a.user.nama.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.user.nama}</p>
                    <p className="text-xs text-gray-400">
                      {a.user.role} · {a.waktuMasuk ? new Date(a.waktuMasuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </p>
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: statusWarna[a.status] + '20',
                    color: statusWarna[a.status],
                  }}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <a href="/admin/laporan" className="bg-white border border-gray-100 rounded-xl p-4 hover:bg-gray-50">
            <p className="text-2xl mb-1">📄</p>
            <p className="text-sm font-medium text-gray-900">Laporan & PDF</p>
            <p className="text-xs text-gray-400">Export rekap bulanan</p>
          </a>
          <a href="/admin/gaji" className="bg-white border border-gray-100 rounded-xl p-4 hover:bg-gray-50">
            <p className="text-2xl mb-1">💰</p>
            <p className="text-sm font-medium text-gray-900">Hitung Gaji</p>
            <p className="text-xs text-gray-400">Insentif kehadiran guru</p>
          </a>
          <a href="/admin/izin" className="bg-white border border-gray-100 rounded-xl p-4 hover:bg-gray-50">
            <p className="text-2xl mb-1">📋</p>
            <p className="text-sm font-medium text-gray-900">Approve Izin</p>
            <p className="text-xs text-gray-400">{ringkasan.izinMenunggu} menunggu</p>
          </a>
          <a href="/admin/users" className="bg-white border border-gray-100 rounded-xl p-4 hover:bg-gray-50">
            <p className="text-2xl mb-1">👥</p>
            <p className="text-sm font-medium text-gray-900">Kelola User</p>
            <p className="text-xs text-gray-400">Daftarkan wajah</p>
          </a>
        </div>
      </div>
    </div>
  )
}
