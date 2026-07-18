'use client'

import { useState, useEffect } from 'react'

interface GajiRecord {
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
  tanggalBayar: string | null
  member: {
    jabatan: string | null
    namaBank: string | null
    noRekening: string | null
    atasNamaRek: string | null
    user: { nama: string; email: string }
    departemen: { nama: string } | null
  }
}

const BULAN = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const rp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function SlipGajiPage() {
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [data, setData] = useState<GajiRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [slipOpenId, setSlipOpenId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        fetch(`/api/gaji?bulan=${i + 1}&tahun=${tahun}`).then((r) => r.json())
      )
    ).then((results) => {
      const all: GajiRecord[] = results.flatMap((r) => r.gaji || [])
      setData(all.sort((a, b) => b.bulan - a.bulan))
      setLoading(false)
    })
  }, [tahun])

  const handleDownloadPDF = async (g: GajiRecord) => {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF({ unit: 'mm', format: 'a5' })
    const margin = 12

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text('SLIP GAJI', margin, 16)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`${BULAN[g.bulan]} ${g.tahun}`, margin, 22)
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, 25, 148 - margin, 25)

    doc.setFontSize(9)
    doc.text(`Nama       : ${g.member.user.nama}`, margin, 31)
    doc.text(`Jabatan    : ${g.member.jabatan || '-'}`, margin, 36)
    doc.text(`Departemen : ${g.member.departemen?.nama || '-'}`, margin, 41)
    doc.line(margin, 45, 148 - margin, 45)

    const rows: [string, string][] = [
      ['Gaji Pokok', rp(g.gajiPokok)],
      ['Tunjangan Jabatan', rp(g.tunjanganJabatan)],
      ['Tunjangan Hadir', rp(g.tunjanganHadir)],
    ]
    if (g.lemburNominal > 0) rows.push([`Lembur (${g.lemburJam}j)`, rp(g.lemburNominal)])
    rows.push(['GAJI KOTOR', rp(g.gajiKotor)])
    if (g.potonganAlpha > 0) rows.push(['Potongan Alpha', `-${rp(g.potonganAlpha)}`])
    if (g.potonganTerlambat > 0) rows.push(['Potongan Terlambat', `-${rp(g.potonganTerlambat)}`])
    if (g.bpjsKes > 0) rows.push(['BPJS Kesehatan (1%)', `-${rp(g.bpjsKes)}`])
    if (g.bpjsTK > 0) rows.push(['BPJS TK (3%)', `-${rp(g.bpjsTK)}`])
    if (g.pph21 > 0) rows.push(['PPh 21', `-${rp(g.pph21)}`])
    rows.push(['TOTAL POTONGAN', `-${rp(g.totalPotongan)}`])
    rows.push(['TAKE HOME PAY', rp(g.takehomePay)])

    autoTable(doc, {
      startY: 48,
      margin: { left: margin, right: margin },
      head: [['Keterangan', 'Nominal']],
      body: rows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      columnStyles: { 1: { halign: 'right' } },
    })

    if (g.member.namaBank) {
      const finalY = (doc as any).lastAutoTable.finalY + 5
      doc.setFontSize(8)
      doc.text(
        `Transfer ke: ${g.member.namaBank} - ${g.member.noRekening} a.n. ${g.member.atasNamaRek}`,
        margin, finalY
      )
    }

    doc.save(`slip-gaji-${g.member.user.nama.replace(/\s+/g, '-')}-${BULAN[g.bulan]}-${g.tahun}.pdf`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <a href="/profil" className="text-gray-400 hover:text-gray-600 p-1">
          <i className="bi bi-arrow-left" />
        </a>
        <h1 className="text-sm font-semibold text-gray-900 flex-1">Slip Gaji Saya</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => setTahun((y) => y - 1)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <i className="bi bi-chevron-left text-xs" />
          </button>
          <span className="text-sm font-medium text-gray-700 w-12 text-center">{tahun}</span>
          <button
            onClick={() => setTahun((y) => y + 1)}
            disabled={tahun >= new Date().getFullYear()}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30"
          >
            <i className="bi bi-chevron-right text-xs" />
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <i className="bi bi-file-earmark-text text-4xl text-gray-300 block mb-2" />
            <p className="text-sm text-gray-400">Belum ada slip gaji untuk tahun {tahun}</p>
          </div>
        ) : (
          data.map((g) => (
            <div key={g.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  g.dibayarkan ? 'bg-green-100' : 'bg-amber-100'
                }`}>
                  <i className={`bi ${g.dibayarkan ? 'bi-check-circle' : 'bi-clock'} ${
                    g.dibayarkan ? 'text-green-600' : 'text-amber-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-gray-900 text-sm">{BULAN[g.bulan]} {g.tahun}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      g.dibayarkan ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {g.dibayarkan ? 'Dibayarkan' : 'Belum Dibayar'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Hadir {g.jumlahHadir}h · Alpha {g.jumlahAlpha}h · Izin {g.jumlahIzin}h
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <p className="text-xs text-gray-400">Take Home Pay</p>
                      <p className="text-base font-bold text-blue-700">{rp(g.takehomePay)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSlipOpenId(slipOpenId === g.id ? null : g.id)}
                        className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                      >
                        <i className={`bi ${slipOpenId === g.id ? 'bi-chevron-up' : 'bi-eye'} mr-1`} />
                        {slipOpenId === g.id ? 'Tutup' : 'Detail'}
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(g)}
                        className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <i className="bi bi-download mr-1" />PDF
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {slipOpenId === g.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Penghasilan</p>
                  {([
                    ['Gaji Pokok', g.gajiPokok],
                    ['Tunjangan Jabatan', g.tunjanganJabatan],
                    ['Tunjangan Hadir', g.tunjanganHadir],
                    ...(g.lemburNominal > 0 ? [[`Lembur (${g.lemburJam}j)`, g.lemburNominal]] : []),
                  ] as [string, number][]).filter(([, v]) => v > 0).map(([label, val]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-gray-500">{label}</span>
                      <span className="text-gray-800">{rp(val)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold pt-1 border-t border-gray-100 text-sm">
                    <span>Gaji Kotor</span><span>{rp(g.gajiKotor)}</span>
                  </div>

                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-3 mb-2">Potongan</p>
                  {([
                    ['Potongan Alpha', g.potonganAlpha],
                    ['Potongan Terlambat', g.potonganTerlambat],
                    ['BPJS Kesehatan (1%)', g.bpjsKes],
                    ['BPJS TK (3%)', g.bpjsTK],
                    ['PPh 21', g.pph21],
                  ] as [string, number][]).filter(([, v]) => v > 0).map(([label, val]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-gray-500">{label}</span>
                      <span className="text-red-500">-{rp(val)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold pt-1 border-t border-gray-100 text-sm">
                    <span>Total Potongan</span><span className="text-red-600">-{rp(g.totalPotongan)}</span>
                  </div>

                  <div className="flex justify-between text-base font-bold pt-2 border-t-2 border-blue-100 mt-2">
                    <span>TAKE HOME PAY</span>
                    <span className="text-blue-700">{rp(g.takehomePay)}</span>
                  </div>

                  {g.dibayarkan && g.tanggalBayar && (
                    <p className="text-xs text-gray-400 mt-2">
                      <i className="bi bi-calendar-check mr-1" />
                      Dibayarkan {new Date(g.tanggalBayar).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
