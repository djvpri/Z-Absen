'use client'

import { useState, useEffect, Fragment } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

type Tab = 'ikhtisar' | 'kehadiran' | 'payroll' | 'cuti'

interface KpiData {
  totalKaryawan: number
  rataKehadiran: number
  totalAlpha: number
  totalTerlambat: number
  totalGajiKotor: number
  totalBpjsKes: number
  totalBpjsTK: number
  totalPph21: number
  totalTakehome: number
  jumlahSlip: number
}
interface SdmData {
  kpi: KpiData
  perDepartemen: { nama: string; pctKehadiran: number }[]
  topTerlambat: { nama: string; count: number }[]
  distribusiTipe: { tipe: string; count: number }[]
  trend6Bulan: { label: string; hadir: number; terlambat: number; alpha: number }[]
}

interface RekapItem {
  id: string
  nama: string
  jabatan: string | null
  tipeKaryawan: string | null
  departemen: { id: string; nama: string } | null
  hadir: number
  terlambat: number
  sakit: number
  izin: number
  alpha: number
  pctKehadiran: number
  hariKerja: number
}

interface GajiItem {
  id: string
  gajiPokok: number
  tunjanganJabatan: number
  tunjanganHadir: number
  lemburNominal: number
  gajiKotor: number
  bpjsKes: number
  bpjsTK: number
  pph21: number
  totalPotongan: number
  takehomePay: number
  dibayarkan: boolean
  member: {
    jabatan: string | null
    departemen: { nama: string } | null
    user: { nama: string }
  }
}

interface CutiKaryawan {
  memberId: string
  nama: string
  jabatan: string | null
  kuota: { jenis: string; jatah: number; terpakai: number; sisa: number }[]
}

const BULAN_NAMA = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const rp = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`

const TIPE_LABEL: Record<string, string> = {
  TETAP: 'Tetap', KONTRAK: 'Kontrak', MAGANG: 'Magang', FREELANCE: 'Freelance',
  PARUH_WAKTU: 'Paruh Waktu', BELUM_DISET: 'Belum Diset',
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function LaporanPage() {
  const now = new Date()
  const [tab, setTab] = useState<Tab>('ikhtisar')
  const [bulan, setBulan] = useState(now.getMonth() + 1)
  const [tahun, setTahun] = useState(now.getFullYear())

  // Ikhtisar
  const [sdm, setSdm] = useState<SdmData | null>(null)
  const [sdmLoading, setSdmLoading] = useState(false)

  // Kehadiran
  const [rekap, setRekap] = useState<RekapItem[]>([])
  const [rekapLoading, setRekapLoading] = useState(false)
  const [filterDept, setFilterDept] = useState('')
  const [deptList, setDeptList] = useState<{ id: string; nama: string }[]>([])
  const [searchQ, setSearchQ] = useState('')
  const [periode, setPeriode] = useState<{ namaBulan: string } | null>(null)

  // Payroll
  const [gaji, setGaji] = useState<GajiItem[]>([])
  const [gajiLoading, setGajiLoading] = useState(false)

  // Cuti
  const [cuti, setCuti] = useState<CutiKaryawan[]>([])
  const [cutiLoading, setCutiLoading] = useState(false)

  useEffect(() => {
    if (tab !== 'ikhtisar') return
    setSdmLoading(true)
    fetch(`/api/laporan/sdm?bulan=${bulan}&tahun=${tahun}`)
      .then((r) => r.json())
      .then((d) => { setSdm(d); setSdmLoading(false) })
      .catch(() => setSdmLoading(false))
  }, [tab, bulan, tahun])

  useEffect(() => {
    if (tab !== 'kehadiran') return
    setRekapLoading(true)
    const p = new URLSearchParams({ bulan: String(bulan), tahun: String(tahun) })
    if (filterDept) p.set('departemenId', filterDept)
    fetch(`/api/laporan?${p}`)
      .then((r) => r.json())
      .then((d) => {
        setRekap(d.rekap || [])
        setDeptList(d.departemenList || [])
        setPeriode(d.periode)
        setRekapLoading(false)
      })
      .catch(() => setRekapLoading(false))
  }, [tab, bulan, tahun, filterDept])

  useEffect(() => {
    if (tab !== 'payroll') return
    setGajiLoading(true)
    fetch(`/api/gaji?bulan=${bulan}&tahun=${tahun}`)
      .then((r) => r.json())
      .then((d) => { setGaji(d.gaji || []); setGajiLoading(false) })
      .catch(() => setGajiLoading(false))
  }, [tab, bulan, tahun])

  useEffect(() => {
    if (tab !== 'cuti') return
    setCutiLoading(true)
    fetch(`/api/admin/jatah-cuti?tahun=${tahun}`)
      .then((r) => r.json())
      .then((d) => { setCuti(d.karyawan || []); setCutiLoading(false) })
      .catch(() => setCutiLoading(false))
  }, [tab, tahun])

  const prevMonth = () => bulan === 1 ? (setBulan(12), setTahun((t) => t - 1)) : setBulan((b) => b - 1)
  const nextMonth = () => bulan === 12 ? (setBulan(1), setTahun((t) => t + 1)) : setBulan((b) => b + 1)

  const filteredRekap = searchQ
    ? rekap.filter((r) => r.nama.toLowerCase().includes(searchQ.toLowerCase()))
    : rekap

  // Export kehadiran Excel
  const exportKehadiranXlsx = async () => {
    const XLSX = await import('xlsx')
    const rows = filteredRekap.map((d) => ({
      Nama: d.nama, Jabatan: d.jabatan || '-',
      Departemen: d.departemen?.nama || '-',
      Hadir: d.hadir, Terlambat: d.terlambat,
      Izin: d.izin, Sakit: d.sakit, Alpha: d.alpha,
      'Kehadiran %': d.pctKehadiran + '%',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Kehadiran')
    XLSX.writeFile(wb, `kehadiran-${bulan}-${tahun}.xlsx`)
  }

  const exportKehadiranPdf = async () => {
    const { jsPDF } = await import('jspdf')
    await import('jspdf-autotable')
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(13)
    doc.text(`Rekap Kehadiran — ${periode?.namaBulan || `${bulan}/${tahun}`}`, 14, 16)
    ;(doc as any).autoTable({
      head: [['Nama', 'Jabatan', 'Departemen', 'Hadir', 'Telat', 'Izin', 'Sakit', 'Alpha', '%']],
      body: filteredRekap.map((d) => [
        d.nama, d.jabatan || '-', d.departemen?.nama || '-',
        d.hadir, d.terlambat, d.izin, d.sakit, d.alpha, d.pctKehadiran + '%',
      ]),
      startY: 22, styles: { fontSize: 8 },
    })
    doc.save(`kehadiran-${bulan}-${tahun}.pdf`)
  }

  const exportPayrollXlsx = async () => {
    const XLSX = await import('xlsx')
    const rows = gaji.map((g) => ({
      Nama: g.member.user.nama, Jabatan: g.member.jabatan || '-',
      Departemen: g.member.departemen?.nama || '-',
      'Gaji Kotor': g.gajiKotor, 'BPJS Kes': g.bpjsKes,
      'BPJS TK': g.bpjsTK, 'PPh 21': g.pph21,
      'Total Potongan': g.totalPotongan, 'Take Home': g.takehomePay,
      Dibayarkan: g.dibayarkan ? 'Ya' : 'Belum',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll')
    XLSX.writeFile(wb, `payroll-${bulan}-${tahun}.xlsx`)
  }

  const exportPayrollPdf = async () => {
    const { jsPDF } = await import('jspdf')
    await import('jspdf-autotable')
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(13)
    doc.text(`Rekap Payroll — ${BULAN_NAMA[bulan]} ${tahun}`, 14, 16)
    ;(doc as any).autoTable({
      head: [['Nama', 'Departemen', 'Gaji Kotor', 'BPJS Kes', 'BPJS TK', 'PPh21', 'Take Home', 'Status']],
      body: gaji.map((g) => [
        g.member.user.nama, g.member.departemen?.nama || '-',
        rp(g.gajiKotor), rp(g.bpjsKes), rp(g.bpjsTK),
        rp(g.pph21), rp(g.takehomePay),
        g.dibayarkan ? 'Dibayar' : 'Belum',
      ]),
      startY: 22, styles: { fontSize: 7.5 },
    })
    doc.save(`payroll-${bulan}-${tahun}.pdf`)
  }

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'ikhtisar', label: 'Ikhtisar', icon: 'bi-bar-chart-line' },
    { key: 'kehadiran', label: 'Kehadiran', icon: 'bi-calendar-check' },
    { key: 'payroll', label: 'Payroll', icon: 'bi-cash-coin' },
    { key: 'cuti', label: 'Cuti', icon: 'bi-calendar2-heart' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <a href="/admin/dashboard" className="text-gray-400 hover:text-gray-600 p-1">
          <i className="bi bi-arrow-left" />
        </a>
        <h1 className="text-sm font-semibold text-gray-900">Laporan SDM</h1>
      </header>

      {/* Period navigator */}
      <div className="bg-white border-b border-gray-100 px-4 py-2">
        <div className="flex items-center justify-center gap-4">
          {tab !== 'cuti' ? (
            <>
              <button onClick={prevMonth} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <i className="bi bi-chevron-left text-sm" />
              </button>
              <span className="text-sm font-semibold text-gray-800 min-w-[140px] text-center">
                {BULAN_NAMA[bulan]} {tahun}
              </span>
              <button onClick={nextMonth} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <i className="bi bi-chevron-right text-sm" />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setTahun((t) => t - 1)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <i className="bi bi-chevron-left text-sm" />
              </button>
              <span className="text-sm font-semibold text-gray-800 min-w-[80px] text-center">{tahun}</span>
              <button onClick={() => setTahun((t) => t + 1)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <i className="bi bi-chevron-right text-sm" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-100 px-2">
        <div className="flex overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <i className={`bi ${t.icon} text-base`} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4">

        {/* ── IKHTISAR ── */}
        {tab === 'ikhtisar' && (
          sdmLoading ? <Spinner /> : !sdm ? null : (
            <div className="space-y-4">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Karyawan', nilai: sdm.kpi.totalKaryawan, suffix: 'orang', icon: 'bi-people', color: 'text-blue-600' },
                  { label: 'Rata Kehadiran', nilai: sdm.kpi.rataKehadiran, suffix: '%', icon: 'bi-person-check', color: 'text-green-600' },
                  { label: 'Total Alpha', nilai: sdm.kpi.totalAlpha, suffix: 'absen', icon: 'bi-person-x', color: 'text-red-600' },
                  { label: 'Total Terlambat', nilai: sdm.kpi.totalTerlambat, suffix: 'kali', icon: 'bi-clock', color: 'text-amber-600' },
                ].map((k) => (
                  <div key={k.label} className="bg-white border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <i className={`bi ${k.icon} ${k.color}`} />
                      <p className="text-xs text-gray-400">{k.label}</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {k.nilai}<span className="text-xs font-normal text-gray-400 ml-1">{k.suffix}</span>
                    </p>
                  </div>
                ))}
              </div>

              {/* Payroll summary */}
              {sdm.kpi.jumlahSlip > 0 && (
                <div className="bg-blue-600 rounded-xl p-4 text-white">
                  <p className="text-xs opacity-75 mb-3">Ringkasan Payroll Bulan Ini ({sdm.kpi.jumlahSlip} slip)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Total Payroll', nilai: sdm.kpi.totalGajiKotor },
                      { label: 'Total BPJS', nilai: sdm.kpi.totalBpjsKes + sdm.kpi.totalBpjsTK },
                      { label: 'Total PPh21', nilai: sdm.kpi.totalPph21 },
                      { label: 'Total Take Home', nilai: sdm.kpi.totalTakehome },
                    ].map((k) => (
                      <div key={k.label}>
                        <p className="text-xs opacity-75">{k.label}</p>
                        <p className="text-base font-bold">{rp(k.nilai)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trend 6 bulan */}
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-sm font-medium text-gray-900 mb-3">Trend Kehadiran 6 Bulan</p>
                {sdm.trend6Bulan.every((t) => t.hadir === 0 && t.alpha === 0) ? (
                  <p className="text-sm text-gray-400 text-center py-6">Belum ada data absensi</p>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={sdm.trend6Bulan} barGap={2} barCategoryGap="25%">
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Bar dataKey="hadir" name="Hadir" fill="#22c55e" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="alpha" name="Alpha" fill="#ef4444" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Per departemen */}
                {sdm.perDepartemen.length > 0 && (
                  <div className="bg-white border border-gray-100 rounded-xl p-4">
                    <p className="text-sm font-medium text-gray-900 mb-3">Kehadiran per Departemen</p>
                    <div className="space-y-2.5">
                      {sdm.perDepartemen.map((d) => (
                        <div key={d.nama}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600 truncate">{d.nama}</span>
                            <span className="font-semibold text-gray-800 ml-2">{d.pctKehadiran}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${d.pctKehadiran >= 80 ? 'bg-green-500' : d.pctKehadiran >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${d.pctKehadiran}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top terlambat + distribusi tipe */}
                <div className="space-y-4">
                  {sdm.topTerlambat.length > 0 && (
                    <div className="bg-white border border-gray-100 rounded-xl p-4">
                      <p className="text-sm font-medium text-gray-900 mb-3">Top 5 Terlambat</p>
                      <div className="space-y-2">
                        {sdm.topTerlambat.map((t, i) => (
                          <div key={t.nama} className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-400 w-5">{i + 1}</span>
                            <span className="text-sm text-gray-700 flex-1 truncate">{t.nama}</span>
                            <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                              {t.count}×
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {sdm.distribusiTipe.length > 0 && (
                    <div className="bg-white border border-gray-100 rounded-xl p-4">
                      <p className="text-sm font-medium text-gray-900 mb-3">Komposisi Karyawan</p>
                      <div className="space-y-1.5">
                        {sdm.distribusiTipe.map((t) => (
                          <div key={t.tipe} className="flex justify-between text-sm">
                            <span className="text-gray-600">{TIPE_LABEL[t.tipe] || t.tipe}</span>
                            <span className="font-semibold text-gray-800">{t.count} orang</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        )}

        {/* ── KEHADIRAN ── */}
        {tab === 'kehadiran' && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Cari nama..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {deptList.length > 0 && (
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Semua Departemen</option>
                  {deptList.map((d) => (
                    <option key={d.id} value={d.id}>{d.nama}</option>
                  ))}
                </select>
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={exportKehadiranXlsx}
                  className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-medium hover:bg-emerald-700"
                >
                  <i className="bi bi-file-earmark-spreadsheet" /> Excel
                </button>
                <button
                  onClick={exportKehadiranPdf}
                  className="flex items-center gap-1.5 bg-rose-600 text-white px-3 py-2 rounded-xl text-xs font-medium hover:bg-rose-700"
                >
                  <i className="bi bi-file-earmark-pdf" /> PDF
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
              {rekapLoading ? (
                <Spinner />
              ) : filteredRekap.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">Tidak ada data</p>
              ) : (
                <table className="w-full text-sm min-w-[680px]">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Nama</th>
                      <th className="px-3 py-2.5 text-xs font-medium text-gray-500">Departemen</th>
                      <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center">Hadir</th>
                      <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center">Telat</th>
                      <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center">Izin</th>
                      <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center">Sakit</th>
                      <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center">Alpha</th>
                      <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center">Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRekap.map((d) => (
                      <tr key={d.id} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-900">{d.nama}</p>
                          <p className="text-xs text-gray-400">{d.jabatan || '-'}</p>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-500">{d.departemen?.nama || '-'}</td>
                        <td className="px-3 py-2.5 text-center font-medium text-green-600">{d.hadir}</td>
                        <td className="px-3 py-2.5 text-center font-medium text-amber-600">{d.terlambat}</td>
                        <td className="px-3 py-2.5 text-center font-medium text-blue-600">{d.izin}</td>
                        <td className="px-3 py-2.5 text-center font-medium text-purple-600">{d.sakit}</td>
                        <td className="px-3 py-2.5 text-center font-medium text-red-600">{d.alpha}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-xs font-semibold ${d.pctKehadiran >= 80 ? 'text-green-600' : d.pctKehadiran >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                              {d.pctKehadiran}%
                            </span>
                            <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${d.pctKehadiran >= 80 ? 'bg-green-500' : d.pctKehadiran >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${d.pctKehadiran}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="px-4 py-2.5 text-xs font-semibold text-gray-600" colSpan={2}>
                        Total ({filteredRekap.length} karyawan)
                      </td>
                      {(['hadir', 'terlambat', 'izin', 'sakit', 'alpha'] as const).map((k) => (
                        <td key={k} className="px-3 py-2.5 text-center text-xs font-semibold text-gray-700">
                          {filteredRekap.reduce((s, r) => s + r[k], 0)}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center text-xs font-semibold text-gray-700">
                        {filteredRekap.length > 0
                          ? Math.round(filteredRekap.reduce((s, r) => s + r.pctKehadiran, 0) / filteredRekap.length)
                          : 0}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── PAYROLL ── */}
        {tab === 'payroll' && (
          <div className="space-y-4">
            {gajiLoading ? <Spinner /> : gaji.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                <i className="bi bi-receipt text-4xl text-gray-300 block mb-2" />
                <p className="text-sm text-gray-400">Belum ada data payroll untuk periode ini</p>
                <a href="/admin/gaji" className="inline-block mt-3 text-sm text-blue-600 hover:underline">
                  Buka halaman Penggajian →
                </a>
              </div>
            ) : (
              <>
                {/* Payroll summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Payroll', nilai: gaji.reduce((s, g) => s + g.gajiKotor, 0), color: 'text-blue-600' },
                    { label: 'Total BPJS', nilai: gaji.reduce((s, g) => s + g.bpjsKes + g.bpjsTK, 0), color: 'text-purple-600' },
                    { label: 'Total PPh 21', nilai: gaji.reduce((s, g) => s + g.pph21, 0), color: 'text-amber-600' },
                    { label: 'Total Take Home', nilai: gaji.reduce((s, g) => s + g.takehomePay, 0), color: 'text-green-600' },
                  ].map((k) => (
                    <div key={k.label} className="bg-white border border-gray-100 rounded-xl p-4">
                      <p className="text-xs text-gray-400 mb-1">{k.label}</p>
                      <p className={`text-lg font-bold ${k.color}`}>{rp(k.nilai)}</p>
                    </div>
                  ))}
                </div>

                {/* Progress dibayarkan */}
                <div className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-gray-700">Status Pembayaran</span>
                    <span className="text-gray-500">
                      {gaji.filter((g) => g.dibayarkan).length} / {gaji.length} sudah dibayar
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${(gaji.filter((g) => g.dibayarkan).length / gaji.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Toolbar */}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={exportPayrollXlsx}
                    className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-medium hover:bg-emerald-700"
                  >
                    <i className="bi bi-file-earmark-spreadsheet" /> Excel
                  </button>
                  <button
                    onClick={exportPayrollPdf}
                    className="flex items-center gap-1.5 bg-rose-600 text-white px-3 py-2 rounded-xl text-xs font-medium hover:bg-rose-700"
                  >
                    <i className="bi bi-file-earmark-pdf" /> PDF
                  </button>
                </div>

                {/* Payroll table */}
                <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Nama</th>
                        <th className="px-3 py-2.5 text-xs font-medium text-gray-500">Departemen</th>
                        <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-right">Gaji Kotor</th>
                        <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-right">BPJS</th>
                        <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-right">PPh21</th>
                        <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-right">Take Home</th>
                        <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gaji.map((g) => (
                        <tr key={g.id} className="border-t border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-gray-900">{g.member.user.nama}</p>
                            <p className="text-xs text-gray-400">{g.member.jabatan || '-'}</p>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-500">{g.member.departemen?.nama || '-'}</td>
                          <td className="px-3 py-2.5 text-right text-gray-700">{rp(g.gajiKotor)}</td>
                          <td className="px-3 py-2.5 text-right text-gray-500 text-xs">{rp(g.bpjsKes + g.bpjsTK)}</td>
                          <td className="px-3 py-2.5 text-right text-gray-500 text-xs">{rp(g.pph21)}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-gray-900">{rp(g.takehomePay)}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${g.dibayarkan ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {g.dibayarkan ? 'Dibayar' : 'Belum'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── CUTI ── */}
        {tab === 'cuti' && (
          <div className="space-y-4">
            {cutiLoading ? <Spinner /> : cuti.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                <i className="bi bi-calendar2-heart text-4xl text-gray-300 block mb-2" />
                <p className="text-sm text-gray-400">Belum ada data kuota cuti</p>
                <a href="/admin/jatah-cuti" className="inline-block mt-3 text-sm text-blue-600 hover:underline">
                  Kelola Kuota Cuti →
                </a>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Nama</th>
                      <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center" colSpan={3}>Cuti Tahunan</th>
                      <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center" colSpan={3}>Cuti Sakit</th>
                      <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center" colSpan={3}>Izin</th>
                    </tr>
                    <tr className="bg-gray-50/50">
                      <th className="px-4 py-1" />
                      {['Jatah', 'Pakai', 'Sisa', 'Jatah', 'Pakai', 'Sisa', 'Jatah', 'Pakai', 'Sisa'].map((h, i) => (
                        <th key={i} className="px-2 py-1 text-[10px] font-medium text-gray-400 text-center">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cuti.map((k) => (
                      <tr key={k.memberId} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-900">{k.nama}</p>
                          <p className="text-xs text-gray-400">{k.jabatan || '-'}</p>
                        </td>
                        {k.kuota.map((q) => (
                          <Fragment key={q.jenis}>
                            <td className="px-2 py-2.5 text-center text-xs text-gray-600">{q.jatah}</td>
                            <td className={`px-2 py-2.5 text-center text-xs font-medium ${q.terpakai > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                              {q.terpakai}
                            </td>
                            <td className={`px-2 py-2.5 text-center text-xs font-semibold ${q.sisa === 0 ? 'text-red-600' : q.sisa <= 3 ? 'text-amber-600' : 'text-green-600'}`}>
                              {q.sisa}
                            </td>
                          </Fragment>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
