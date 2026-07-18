'use client'

import { useState, useEffect } from 'react'

interface GajiItem {
  id: string
  bulan: number
  tahun: number
  jumlahHadir: number
  jumlahTerlambat: number
  jumlahAlpha: number
  jumlahIzin: number
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
  dibayarkan: boolean
  tanggalBayar?: string
  member: {
    jabatan?: string
    namaBank?: string
    noRekening?: string
    atasNamaRek?: string
    user: { nama: string }
  }
}

const BULAN_NAMA = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const rp = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`

export default function SlipGajiPage() {
  const now = new Date()
  const [bulan, setBulan] = useState(now.getMonth() + 1)
  const [tahun, setTahun] = useState(now.getFullYear())
  const [data, setData] = useState<GajiItem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/gaji?bulan=${bulan}&tahun=${tahun}`)
      .then(r => r.json())
      .then(d => { setData(d.gaji?.[0] ?? null); setLoading(false) })
  }, [bulan, tahun])

  const prevMonth = () => bulan === 1 ? (setBulan(12), setTahun(t => t - 1)) : setBulan(b => b - 1)
  const nextMonth = () => bulan === 12 ? (setBulan(1), setTahun(t => t + 1)) : setBulan(b => b + 1)

  const cetakPdf = async () => {
    if (!data) return
    const { jsPDF } = await import('jspdf')
    await import('jspdf-autotable')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
    const W = doc.internal.pageSize.getWidth()
    doc.setFontSize(14); doc.setFont('helvetica', 'bold')
    doc.text('SLIP GAJI', W / 2, 15, { align: 'center' })
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.text(`Periode: ${BULAN_NAMA[data.bulan]} ${data.tahun}`, W / 2, 21, { align: 'center' })
    doc.line(10, 24, W - 10, 24)
    let y = 29
    for (const [label, val] of [['Nama', data.member.user.nama], ['Jabatan', data.member.jabatan || '-']]) {
      doc.setFont('helvetica', 'bold'); doc.text(`${label}:`, 12, y)
      doc.setFont('helvetica', 'normal'); doc.text(String(val), 45, y); y += 5
    }
    doc.line(10, y + 1, W - 10, y + 1); y += 5
    doc.setFont('helvetica', 'bold'); doc.text('PENGHASILAN', 12, y); y += 4
    for (const [label, val] of [
      ['Gaji Pokok', rp(data.gajiPokok)],
      ['Tunjangan Jabatan', rp(data.tunjanganJabatan)],
      ['Tunjangan Hadir', rp(data.tunjanganHadir)],
      ...(data.lemburNominal > 0 ? [[`Lembur (${data.lemburJam}j)`, rp(data.lemburNominal)]] : []),
    ]) {
      doc.setFont('helvetica', 'normal'); doc.text(String(label), 14, y)
      doc.text(String(val), W - 12, y, { align: 'right' }); y += 4
    }
    doc.setFont('helvetica', 'bold'); doc.text('Gaji Kotor', 14, y)
    doc.text(rp(data.gajiKotor), W - 12, y, { align: 'right' }); y += 6
    doc.text('POTONGAN', 12, y); y += 4
    for (const [label, val] of [
      data.potonganAlpha > 0 ? ['Potongan Alpha', rp(data.potonganAlpha)] : null,
      data.potonganTerlambat > 0 ? ['Potongan Terlambat', rp(data.potonganTerlambat)] : null,
      data.bpjsKes > 0 ? ['BPJS Kesehatan (1%)', rp(data.bpjsKes)] : null,
      data.bpjsTK > 0 ? ['BPJS TK (3%)', rp(data.bpjsTK)] : null,
      data.pph21 > 0 ? ['PPh 21', rp(data.pph21)] : null,
    ].filter(Boolean) as [string, string][]) {
      doc.setFont('helvetica', 'normal'); doc.text(label, 14, y)
      doc.text(`- ${val}`, W - 12, y, { align: 'right' }); y += 4
    }
    doc.setFont('helvetica', 'bold'); doc.text('Total Potongan', 14, y)
    doc.text(`- ${rp(data.totalPotongan)}`, W - 12, y, { align: 'right' }); y += 6
    doc.line(10, y, W - 10, y); y += 4
    doc.setFontSize(11); doc.text('TAKE HOME PAY', 12, y)
    doc.text(rp(data.takehomePay), W - 12, y, { align: 'right' })
    doc.save(`slip-gaji-${BULAN_NAMA[data.bulan]}-${data.tahun}.pdf`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <a href="/check-in" className="text-gray-400 hover:text-gray-600">
          <i className="bi bi-arrow-left"></i>
        </a>
        <h1 className="text-sm font-semibold text-gray-900">Slip Gaji</h1>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Navigasi bulan */}
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-2.5">
          <button onClick={prevMonth} className="text-gray-400 hover:text-gray-700 p-1">
            <i className="bi bi-chevron-left"></i>
          </button>
          <span className="text-sm font-semibold text-gray-800">{BULAN_NAMA[bulan]} {tahun}</span>
          <button onClick={nextMonth} className="text-gray-400 hover:text-gray-700 p-1">
            <i className="bi bi-chevron-right"></i>
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : !data ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <i className="bi bi-receipt text-4xl text-gray-300 block mb-2"></i>
            <p className="text-sm text-gray-400">Belum ada slip gaji untuk bulan ini</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Header slip */}
            <div className="bg-blue-600 px-5 py-4 text-white">
              <p className="text-xs opacity-75 mb-0.5">SLIP GAJI</p>
              <p className="font-bold text-lg">{data.member.user.nama}</p>
              <p className="text-sm opacity-80">{data.member.jabatan || '-'} · {BULAN_NAMA[data.bulan]} {data.tahun}</p>
              {data.dibayarkan && (
                <span className="inline-block mt-2 text-xs bg-green-400 text-green-900 px-2 py-0.5 rounded-full font-medium">
                  ✓ Sudah Dibayarkan
                </span>
              )}
            </div>

            <div className="p-5 space-y-4">
              {/* Kehadiran */}
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: 'Hadir', nilai: data.jumlahHadir, warna: 'text-green-600' },
                  { label: 'Terlambat', nilai: data.jumlahTerlambat, warna: 'text-amber-600' },
                  { label: 'Alpha', nilai: data.jumlahAlpha, warna: 'text-red-600' },
                  { label: 'Izin', nilai: data.jumlahIzin, warna: 'text-blue-600' },
                ].map(k => (
                  <div key={k.label} className="bg-gray-50 rounded-xl p-2">
                    <p className={`text-lg font-bold ${k.warna}`}>{k.nilai}</p>
                    <p className="text-xs text-gray-400">{k.label}</p>
                  </div>
                ))}
              </div>

              {/* Penghasilan */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Penghasilan</p>
                <div className="space-y-2">
                  {[
                    ['Gaji Pokok', data.gajiPokok],
                    ['Tunjangan Jabatan', data.tunjanganJabatan],
                    ['Tunjangan Hadir', data.tunjanganHadir],
                    ...(data.lemburNominal > 0 ? [[`Lembur (${data.lemburJam} jam)`, data.lemburNominal]] : []),
                  ].filter(([, v]) => Number(v) > 0).map(([label, val]) => (
                    <div key={String(label)} className="flex justify-between text-sm">
                      <span className="text-gray-500">{label}</span>
                      <span className="text-gray-800 font-medium">{rp(Number(val))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-semibold pt-1.5 border-t border-gray-100">
                    <span>Gaji Kotor</span>
                    <span>{rp(data.gajiKotor)}</span>
                  </div>
                </div>
              </div>

              {/* Potongan */}
              {data.totalPotongan > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Potongan</p>
                  <div className="space-y-2">
                    {[
                      ['Potongan Alpha', data.potonganAlpha],
                      ['Potongan Terlambat', data.potonganTerlambat],
                      ['BPJS Kesehatan (1%)', data.bpjsKes],
                      ['BPJS TK (3%)', data.bpjsTK],
                      ['PPh 21', data.pph21],
                    ].filter(([, v]) => Number(v) > 0).map(([label, val]) => (
                      <div key={String(label)} className="flex justify-between text-sm">
                        <span className="text-gray-500">{label}</span>
                        <span className="text-red-500 font-medium">-{rp(Number(val))}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-semibold pt-1.5 border-t border-gray-100">
                      <span>Total Potongan</span>
                      <span className="text-red-600">-{rp(data.totalPotongan)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Take home pay */}
              <div className="bg-blue-50 rounded-xl p-4 flex justify-between items-center">
                <p className="text-sm font-semibold text-gray-700">Take Home Pay</p>
                <p className="text-xl font-bold text-blue-700">{rp(data.takehomePay)}</p>
              </div>

              {data.member.namaBank && (
                <p className="text-xs text-gray-400 text-center">
                  Transfer ke {data.member.namaBank} · {data.member.noRekening}
                </p>
              )}

              <button
                onClick={cetakPdf}
                className="w-full py-2.5 flex items-center justify-center gap-2 border border-blue-200 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-50"
              >
                <i className="bi bi-download"></i> Unduh Slip PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
