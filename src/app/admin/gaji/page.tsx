'use client'

import { useState, useEffect, useCallback } from 'react'

interface GajiItem {
  id: string
  bulan: number
  tahun: number
  jumlahHadir: number
  jumlahTerlambat: number
  jumlahAlpha: number
  jumlahIzin: number
  jumlahHariKerja: number
  gajiPokok: number
  tunjanganJabatan: number
  tunjanganHadir: number
  lemburJam: number
  lemburNominal: number
  gajiKotor: number
  potonganAlpha: number
  potonganTerlambat: number
  bpjsKes: number
  bpjsTK: number
  pph21: number
  totalPotongan: number
  takehomePay: number
  totalGaji: number
  catatan?: string
  dibayarkan: boolean
  tanggalBayar?: string
  member: {
    jabatan?: string
    namaBank?: string
    noRekening?: string
    atasNamaRek?: string
    departemen?: { nama: string }
    user: { nama: string; email: string }
  }
}

const BULAN_NAMA = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const rp = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`

export default function GajiPage() {
  const now = new Date()
  const [bulan, setBulan] = useState(now.getMonth() + 1)
  const [tahun, setTahun] = useState(now.getFullYear())
  const [data, setData] = useState<GajiItem[]>([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [slipId, setSlipId] = useState<string | null>(null)
  const [hitungBpjs, setHitungBpjs] = useState(true)
  const [hitungPph, setHitungPph] = useState(true)
  const [showSettings, setShowSettings] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/gaji?bulan=${bulan}&tahun=${tahun}`)
    const d = await res.json()
    setData(d.gaji || [])
    setLoading(false)
  }, [bulan, tahun])

  useEffect(() => { load() }, [load])

  const hitungGaji = async () => {
    setCalculating(true)
    await fetch('/api/gaji/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bulan, tahun, hitungBpjs, hitungPph }),
    })
    await load()
    setCalculating(false)
  }

  const markPaid = async (gajiId: string, dibayarkan: boolean) => {
    await fetch('/api/gaji', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gajiId, dibayarkan }),
    })
    load()
  }

  const prevMonth = () => bulan === 1 ? (setBulan(12), setTahun(t => t - 1)) : setBulan(b => b - 1)
  const nextMonth = () => bulan === 12 ? (setBulan(1), setTahun(t => t + 1)) : setBulan(b => b + 1)

  const totalGross = data.reduce((s, g) => s + g.gajiKotor, 0)
  const totalNet = data.reduce((s, g) => s + g.takehomePay, 0)
  const totalBpjs = data.reduce((s, g) => s + g.bpjsKes + g.bpjsTK, 0)
  const totalPph = data.reduce((s, g) => s + g.pph21, 0)
  const sudahBayar = data.filter(g => g.dibayarkan).length

  const slipData = slipId ? data.find(g => g.id === slipId) : null

  const cetakSlip = async (g: GajiItem) => {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
    const W = doc.internal.pageSize.getWidth()

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('SLIP GAJI', W / 2, 15, { align: 'center' })

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Periode: ${BULAN_NAMA[g.bulan]} ${g.tahun}`, W / 2, 21, { align: 'center' })

    doc.line(10, 24, W - 10, 24)

    doc.setFontSize(9)
    const leftCol = [
      ['Nama', g.member.user.nama],
      ['Jabatan', g.member.jabatan || '-'],
      ['Departemen', g.member.departemen?.nama || '-'],
      ['Bank', g.member.namaBank ? `${g.member.namaBank} - ${g.member.noRekening}` : '-'],
    ]
    let y = 29
    for (const [label, val] of leftCol) {
      doc.setFont('helvetica', 'bold')
      doc.text(`${label}:`, 12, y)
      doc.setFont('helvetica', 'normal')
      doc.text(String(val), 45, y)
      y += 5
    }

    doc.line(10, y + 1, W - 10, y + 1)
    y += 5

    // Penghasilan
    doc.setFont('helvetica', 'bold')
    doc.text('PENGHASILAN', 12, y)
    y += 4
    const penghasilan: [string, string][] = [
      ['Gaji Pokok', rp(g.gajiPokok)],
      ['Tunjangan Jabatan', rp(g.tunjanganJabatan)],
      ['Tunjangan Hadir', rp(g.tunjanganHadir)],
    ]
    if (g.lemburNominal > 0) penghasilan.push([`Lembur (${g.lemburJam} jam)`, rp(g.lemburNominal)])
    for (const [label, val] of penghasilan) {
      doc.setFont('helvetica', 'normal')
      doc.text(label, 14, y)
      doc.text(val, W - 12, y, { align: 'right' })
      y += 4
    }
    doc.setFont('helvetica', 'bold')
    doc.text('Gaji Kotor', 14, y)
    doc.text(rp(g.gajiKotor), W - 12, y, { align: 'right' })
    y += 6

    // Potongan
    doc.text('POTONGAN', 12, y)
    y += 4
    const potongan: [string, string][] = []
    if (g.potonganAlpha > 0) potongan.push(['Potongan Alpha', rp(g.potonganAlpha)])
    if (g.potonganTerlambat > 0) potongan.push(['Potongan Terlambat', rp(g.potonganTerlambat)])
    if (g.bpjsKes > 0) potongan.push(['BPJS Kesehatan (1%)', rp(g.bpjsKes)])
    if (g.bpjsTK > 0) potongan.push(['BPJS TK (3%)', rp(g.bpjsTK)])
    if (g.pph21 > 0) potongan.push(['PPh 21', rp(g.pph21)])
    for (const [label, val] of potongan) {
      doc.setFont('helvetica', 'normal')
      doc.text(label, 14, y)
      doc.text(`- ${val}`, W - 12, y, { align: 'right' })
      y += 4
    }
    doc.setFont('helvetica', 'bold')
    doc.text('Total Potongan', 14, y)
    doc.text(`- ${rp(g.totalPotongan)}`, W - 12, y, { align: 'right' })
    y += 6

    doc.line(10, y, W - 10, y)
    y += 4
    doc.setFontSize(11)
    doc.text('TAKE HOME PAY', 12, y)
    doc.text(rp(g.takehomePay), W - 12, y, { align: 'right' })

    doc.save(`slip-gaji-${g.member.user.nama.replace(/\s+/g, '-')}-${BULAN_NAMA[g.bulan]}-${g.tahun}.pdf`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <a href="/admin/dashboard" className="text-gray-400 hover:text-gray-600">
            <i className="bi bi-arrow-left"></i>
          </a>
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-1.5">
            <button onClick={prevMonth} className="text-gray-500 hover:text-gray-700 text-sm">‹</button>
            <span className="text-sm font-semibold text-gray-800 min-w-[140px] text-center">
              {BULAN_NAMA[bulan]} {tahun}
            </span>
            <button onClick={nextMonth} className="text-gray-500 hover:text-gray-700 text-sm">›</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <i className="bi bi-gear text-sm"></i>
          </button>
          <button
            onClick={hitungGaji}
            disabled={calculating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-40"
          >
            <i className="bi bi-calculator"></i>
            {calculating ? 'Menghitung...' : 'Hitung Gaji'}
          </button>
        </div>
      </header>

      {/* Settings panel */}
      {showSettings && (
        <div className="bg-white border-b border-gray-100 px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center gap-6">
            <p className="text-xs font-medium text-gray-500">Opsi perhitungan:</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={hitungBpjs} onChange={e => setHitungBpjs(e.target.checked)} className="rounded" />
              <span className="text-xs text-gray-700">Hitung BPJS</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={hitungPph} onChange={e => setHitungPph(e.target.checked)} className="rounded" />
              <span className="text-xs text-gray-700">Hitung PPh 21</span>
            </label>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Ringkasan */}
        {data.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Gaji Kotor', nilai: rp(totalGross), warna: 'text-gray-900' },
              { label: 'Take Home Pay', nilai: rp(totalNet), warna: 'text-blue-700' },
              { label: 'BPJS (karyawan)', nilai: rp(totalBpjs), warna: 'text-amber-700' },
              { label: 'PPh 21', nilai: rp(totalPph), warna: 'text-purple-700' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3">
                <p className="text-xs text-gray-400 mb-0.5">{s.label}</p>
                <p className={`text-sm font-semibold ${s.warna}`}>{s.nilai}</p>
              </div>
            ))}
          </div>
        )}

        {/* Status bayar */}
        {data.length > 0 && (
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-2.5">
            <p className="text-xs text-gray-500">{sudahBayar} / {data.length} karyawan sudah dibayar</p>
            <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${data.length ? (sudahBayar / data.length) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        {/* Tabel */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-10 text-center">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : data.length === 0 ? (
            <div className="p-10 text-center">
              <i className="bi bi-cash-coin text-4xl text-gray-300 block mb-2"></i>
              <p className="text-sm text-gray-400 mb-3">Belum ada data gaji bulan ini</p>
              <button onClick={hitungGaji} disabled={calculating}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
                {calculating ? 'Menghitung...' : 'Hitung Sekarang'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500">Karyawan</th>
                    <th className="px-3 py-3 text-xs font-medium text-gray-500 text-center">Hadir</th>
                    <th className="px-3 py-3 text-xs font-medium text-gray-500 text-right">Gaji Kotor</th>
                    <th className="px-3 py-3 text-xs font-medium text-gray-500 text-right">Potongan</th>
                    <th className="px-3 py-3 text-xs font-medium text-gray-500 text-right">Take Home</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 text-center">Status</th>
                    <th className="px-3 py-3 text-xs font-medium text-gray-500 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(g => (
                    <tr key={g.id} className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSlipId(slipId === g.id ? null : g.id)}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{g.member.user.nama}</p>
                        <p className="text-xs text-gray-400">{g.member.jabatan || g.member.departemen?.nama || '-'}</p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-green-600 font-medium">{g.jumlahHadir}</span>
                        {g.jumlahAlpha > 0 && <span className="text-red-500 text-xs ml-1">·{g.jumlahAlpha}α</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-700">{rp(g.gajiKotor)}</td>
                      <td className="px-3 py-3 text-right text-red-600">-{rp(g.totalPotongan)}</td>
                      <td className="px-3 py-3 text-right font-semibold text-blue-700">{rp(g.takehomePay)}</td>
                      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => markPaid(g.id, !g.dibayarkan)}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${g.dibayarkan ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-700'}`}
                        >
                          {g.dibayarkan ? '✓ Dibayar' : 'Belum Bayar'}
                        </button>
                      </td>
                      <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <button onClick={() => cetakSlip(g)} className="text-gray-400 hover:text-blue-600 p-1" title="Cetak slip">
                          <i className="bi bi-printer text-sm"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Slip detail (expandable) */}
        {slipData && (
          <div className="bg-white rounded-2xl border border-blue-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold text-gray-900">{slipData.member.user.nama}</p>
                <p className="text-xs text-gray-400">{BULAN_NAMA[slipData.bulan]} {slipData.tahun}</p>
              </div>
              <button onClick={() => cetakSlip(slipData)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                <i className="bi bi-download"></i> Unduh Slip PDF
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              {/* Penghasilan */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Penghasilan</p>
                <div className="space-y-1.5">
                  {[
                    ['Gaji Pokok', slipData.gajiPokok],
                    ['Tunjangan Jabatan', slipData.tunjanganJabatan],
                    ['Tunjangan Hadir', slipData.tunjanganHadir],
                    ...(slipData.lemburNominal > 0 ? [[`Lembur (${slipData.lemburJam}j)`, slipData.lemburNominal]] : []),
                  ].map(([label, val]) => val > 0 ? (
                    <div key={String(label)} className="flex justify-between">
                      <span className="text-gray-500">{label}</span>
                      <span className="text-gray-800">{rp(Number(val))}</span>
                    </div>
                  ) : null)}
                  <div className="flex justify-between font-semibold pt-1.5 border-t border-gray-100">
                    <span>Gaji Kotor</span>
                    <span className="text-gray-900">{rp(slipData.gajiKotor)}</span>
                  </div>
                </div>
              </div>

              {/* Potongan */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Potongan</p>
                <div className="space-y-1.5">
                  {[
                    ['Potongan Alpha', slipData.potonganAlpha],
                    ['Potongan Terlambat', slipData.potonganTerlambat],
                    ['BPJS Kesehatan (1%)', slipData.bpjsKes],
                    ['BPJS TK (3%)', slipData.bpjsTK],
                    ['PPh 21', slipData.pph21],
                  ].map(([label, val]) => val > 0 ? (
                    <div key={String(label)} className="flex justify-between">
                      <span className="text-gray-500">{label}</span>
                      <span className="text-red-500">-{rp(Number(val))}</span>
                    </div>
                  ) : null)}
                  <div className="flex justify-between font-semibold pt-1.5 border-t border-gray-100">
                    <span>Total Potongan</span>
                    <span className="text-red-600">-{rp(slipData.totalPotongan)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t-2 border-blue-100 flex justify-between items-center">
              <span className="font-semibold text-gray-700">TAKE HOME PAY</span>
              <span className="text-xl font-bold text-blue-700">{rp(slipData.takehomePay)}</span>
            </div>

            {slipData.member.namaBank && (
              <p className="mt-2 text-xs text-gray-400">
                Transfer ke: {slipData.member.namaBank} · {slipData.member.noRekening} a.n. {slipData.member.atasNamaRek}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
