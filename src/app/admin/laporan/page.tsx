'use client'

import { useState, useEffect } from 'react'

interface RekapItem {
  id: string
  nama: string
  role: string
  nip?: string
  nis?: string
  hadir: number
  terlambat: number
  sakit: number
  izin: number
  alpha: number
}

export default function LaporanPage() {
  const [data, setData] = useState<RekapItem[]>([])
  const [loading, setLoading] = useState(true)
  const [periode, setPeriode] = useState<any>(null)
  const now = new Date()
  const [bulan, setBulan] = useState(now.getMonth() + 1)
  const [tahun, setTahun] = useState(now.getFullYear())
  const [filterRole, setFilterRole] = useState('')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ bulan: String(bulan), tahun: String(tahun) })
    if (filterRole) params.set('role', filterRole)
    fetch(`/api/laporan?${params}`)
      .then(r => r.json())
      .then(d => { setData(d.rekap || []); setPeriode(d.periode); setLoading(false) })
  }, [bulan, tahun, filterRole])

  const exportExcel = async () => {
    const XLSX = await import('xlsx')
    const rows = data.map(d => ({
      'Nama': d.nama, 'Role': d.role, 'NIP/NIS': d.nip || d.nis || '',
      'Hadir': d.hadir, 'Terlambat': d.terlambat, 'Izin': d.izin, 'Sakit': d.sakit, 'Alpha': d.alpha,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap')
    XLSX.writeFile(wb, `rekap-absensi-${bulan}-${tahun}.xlsx`)
  }

  const exportPDF = async () => {
    const { jsPDF } = await import('jspdf')
    await import('jspdf-autotable')
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text(`Rekap Absensi - ${periode?.namaBulan || ''}`, 14, 20)
    const rows = data.map(d => [d.nama, d.role, String(d.hadir), String(d.terlambat), String(d.izin), String(d.sakit), String(d.alpha)])
    ;(doc as any).autoTable({
      head: [['Nama', 'Role', 'Hadir', 'Telat', 'Izin', 'Sakit', 'Alpha']],
      body: rows, startY: 30, styles: { fontSize: 8 },
    })
    doc.save(`rekap-absensi-${bulan}-${tahun}.pdf`)
  }

  const prevMonth = () => bulan === 1 ? (setBulan(12), setTahun(t => t - 1)) : setBulan(b => b - 1)
  const nextMonth = () => bulan === 12 ? (setBulan(1), setTahun(t => t + 1)) : setBulan(b => b + 1)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <a href="/admin/dashboard" className="text-gray-400 hover:text-gray-600">← Kembali</a>
        <h1 className="text-sm font-semibold text-gray-900">Laporan & Rekap</h1>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-2 flex items-center gap-2">
            <button onClick={prevMonth} className="text-gray-400 hover:text-gray-600">←</button>
            <span className="text-sm font-medium text-gray-900">{periode?.namaBulan || '...'}</span>
            <button onClick={nextMonth} className="text-gray-400 hover:text-gray-600">→</button>
          </div>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm">
            <option value="">Semua Role</option>
            <option value="GURU">Guru</option>
            <option value="SISWA">Siswa</option>
            <option value="KEPALA_SEKOLAH">Kepala Sekolah</option>
          </select>
          <div className="flex gap-2 ml-auto">
            <button onClick={exportExcel} className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-medium hover:bg-green-700">
              📊 Export Excel
            </button>
            <button onClick={exportPDF} className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-medium hover:bg-red-700">
              📄 Export PDF
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Memuat...</div>
          ) : data.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">Tidak ada data</div>
          ) : (
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Nama</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Role</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center">Hadir</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center">Telat</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center">Izin</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center">Sakit</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center">Alpha</th>
                </tr>
              </thead>
              <tbody>
                {data.map(d => (
                  <tr key={d.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-900 font-medium">{d.nama}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{d.role}</td>
                    <td className="px-3 py-2.5 text-center text-green-600 font-medium">{d.hadir}</td>
                    <td className="px-3 py-2.5 text-center text-amber-600 font-medium">{d.terlambat}</td>
                    <td className="px-3 py-2.5 text-center text-blue-600 font-medium">{d.izin}</td>
                    <td className="px-3 py-2.5 text-center text-purple-600 font-medium">{d.sakit}</td>
                    <td className="px-3 py-2.5 text-center text-red-600 font-medium">{d.alpha}</td>
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
