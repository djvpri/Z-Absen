'use client'

import { useState, useEffect } from 'react'

interface NilaiItem { kriteriaId: string; nama: string; nilai: number; catatan: string }
interface Kriteria { id: string; nama: string; bobot: number; deskripsi: string }
interface PenilaianRecord {
  id: string
  periode: string
  nilaiTotal: number
  status: string
  catatan: string | null
  nilai: NilaiItem[]
  template: { nama: string; kriteria: Kriteria[]; periode: string }
  createdAt: string
}

const PERIODE_LABEL: Record<string, string> = {
  BULANAN: 'Bulanan', KUARTALAN: 'Kuartalan', SEMESTERAN: 'Semesteran', TAHUNAN: 'Tahunan',
}

const nilaiInfo = (n: number) => {
  if (n >= 90) return { label: 'Istimewa', color: '#22c55e', bg: '#f0fdf4', text: '#166534' }
  if (n >= 75) return { label: 'Baik', color: '#3b82f6', bg: '#eff6ff', text: '#1e40af' }
  if (n >= 60) return { label: 'Cukup', color: '#f59e0b', bg: '#fffbeb', text: '#92400e' }
  return { label: 'Kurang', color: '#ef4444', bg: '#fef2f2', text: '#991b1b' }
}

function CircleScore({ nilai }: { nilai: number }) {
  const info = nilaiInfo(nilai)
  const r = 36
  const circ = 2 * Math.PI * r
  const progress = (nilai / 100) * circ

  return (
    <div className="relative flex items-center justify-center" style={{ width: 88, height: 88 }}>
      <svg width={88} height={88} className="-rotate-90">
        <circle cx={44} cy={44} r={r} fill="none" stroke="#f1f5f9" strokeWidth={7} />
        <circle
          cx={44} cy={44} r={r} fill="none"
          stroke={info.color} strokeWidth={7}
          strokeDasharray={`${progress} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-bold" style={{ color: info.text }}>{nilai}</span>
        <span className="text-[10px]" style={{ color: info.text }}>{info.label}</span>
      </div>
    </div>
  )
}

export default function PenilaianPage() {
  const [data, setData] = useState<PenilaianRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/penilaian')
      .then((r) => r.json())
      .then((j) => { setData(j.penilaian || []); setLoading(false) })
  }, [])

  const toggle = (id: string) => setExpanded((p) => (p === id ? null : id))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <a href="/check-in" className="text-gray-400 hover:text-gray-600 p-1">
          <i className="bi bi-arrow-left" />
        </a>
        <h1 className="text-sm font-semibold text-gray-900 flex-1">Penilaian Kinerja</h1>
        <span className="text-xs text-gray-400">{data.length} hasil</span>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 py-12 text-center">
            <i className="bi bi-clipboard-data text-4xl text-gray-300 block mb-2" />
            <p className="text-sm text-gray-500 font-medium">Belum Ada Penilaian</p>
            <p className="text-xs text-gray-400 mt-1">Penilaian kinerja Anda akan muncul di sini setelah difinalisasi oleh HRD.</p>
          </div>
        ) : (
          data.map((p) => {
            const info = nilaiInfo(p.nilaiTotal)
            const isOpen = expanded === p.id
            const avgContrib = p.template.kriteria.map((k) => {
              const n = p.nilai.find((x) => x.kriteriaId === k.id)?.nilai ?? 0
              return { ...k, nilai: n, kontribusi: (n * k.bobot) / 100 }
            })

            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => toggle(p.id)}
                  className="w-full px-4 py-4 flex items-center gap-4 text-left"
                >
                  <CircleScore nilai={p.nilaiTotal} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{p.template.nama}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {PERIODE_LABEL[p.template.periode]} · {p.periode}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: info.bg, color: info.text }}
                      >
                        {info.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {p.template.kriteria.length} kriteria
                      </span>
                    </div>
                  </div>
                  <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'} text-gray-400 shrink-0`} />
                </button>

                {isOpen && (
                  <div className="border-t border-gray-50 px-4 pb-4 space-y-4">
                    <div className="space-y-3 pt-3">
                      {avgContrib.map((k) => {
                        const kInfo = nilaiInfo(k.nilai)
                        const nc = p.nilai.find((x) => x.kriteriaId === k.id)?.catatan
                        return (
                          <div key={k.id}>
                            <div className="flex items-start justify-between mb-1">
                              <div>
                                <p className="text-sm text-gray-800 font-medium">{k.nama}</p>
                                {k.deskripsi && (
                                  <p className="text-xs text-gray-400">{k.deskripsi}</p>
                                )}
                              </div>
                              <div className="text-right shrink-0 ml-3">
                                <p className="text-base font-bold" style={{ color: kInfo.text }}>{k.nilai}</p>
                                <p className="text-[10px] text-gray-400">bobot {k.bobot}%</p>
                              </div>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${k.nilai}%`, backgroundColor: kInfo.color }}
                              />
                            </div>
                            {nc && (
                              <p className="text-xs text-gray-500 italic mt-0.5">{nc}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {p.catatan && (
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs font-medium text-gray-500 mb-1">Catatan Penilai</p>
                        <p className="text-sm text-gray-700">{p.catatan}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-50">
                      <span>
                        Kontribusi total:{' '}
                        {avgContrib.map((k) => (
                          <span key={k.id} className="mr-1">
                            {k.nama.split(' ')[0]} ({k.kontribusi.toFixed(1)})
                          </span>
                        ))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
