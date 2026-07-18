'use client'

import { useState, useEffect, useCallback } from 'react'

interface Shift {
  id: string
  nama: string
  jamMasuk: string
  jamKeluar: string
  warna: string
  toleransi: number
}

interface JadwalItem {
  id: string
  tanggal: string
  shiftId: string | null
  libur: boolean
  keterangan: string | null
  shift: Shift | null
}

const HARI_PANJANG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export default function JadwalPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(new Date()))
  const [jadwal, setJadwal] = useState<JadwalItem[]>([])
  const [loading, setLoading] = useState(true)

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/jadwal?week=${isoDate(weekStart)}`)
    const d = await res.json()
    setJadwal(d.jadwal || [])
    setLoading(false)
  }, [weekStart])

  useEffect(() => { fetchData() }, [fetchData])

  const getJadwal = (tgl: string) =>
    jadwal.find((j) => j.tanggal.slice(0, 10) === tgl) ?? null

  const todayStr = isoDate(new Date())

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <a href="/check-in" className="text-gray-400 hover:text-gray-600 p-1">
          <i className="bi bi-arrow-left" />
        </a>
        <h1 className="text-sm font-semibold text-gray-900 flex-1">Jadwal Kerja Saya</h1>
      </header>

      {/* Week navigator */}
      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center justify-between">
        <button
          onClick={() => setWeekStart((d) => addDays(d, -7))}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <i className="bi bi-chevron-left" />
        </button>
        <p className="text-sm font-medium text-gray-700">
          {days[0].toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}
          {' – '}
          {days[6].toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <button
          onClick={() => setWeekStart((d) => addDays(d, 7))}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <i className="bi bi-chevron-right" />
        </button>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          days.map((d) => {
            const tgl = isoDate(d)
            const j = getJadwal(tgl)
            const isToday = tgl === todayStr
            const dayName = HARI_PANJANG[d.getDay()]
            const dateLabel = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

            return (
              <div
                key={tgl}
                className={`bg-white rounded-xl border px-4 py-3 flex items-center gap-4 ${
                  isToday ? 'border-blue-200 shadow-sm' : 'border-gray-100'
                }`}
              >
                {/* Date column */}
                <div className={`w-14 text-center shrink-0 ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                  <p className="text-xs font-medium">{dayName.slice(0, 3)}</p>
                  <p className={`text-2xl font-bold leading-none ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>
                    {d.getDate()}
                  </p>
                  {isToday && (
                    <p className="text-xs text-blue-500 font-medium mt-0.5">Hari ini</p>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {j?.libur ? (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
                        <i className="bi bi-house text-gray-400 text-sm" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Hari Libur</p>
                        {j.keterangan && (
                          <p className="text-xs text-gray-400">{j.keterangan}</p>
                        )}
                      </div>
                    </div>
                  ) : j?.shift ? (
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: j.shift.warna + '25' }}
                      >
                        <i className="bi bi-clock text-sm" style={{ color: j.shift.warna }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{j.shift.nama}</p>
                        <p className="text-xs text-gray-500 font-mono">
                          {j.shift.jamMasuk} – {j.shift.jamKeluar}
                          <span className="font-sans text-gray-400 ml-1.5">
                            toleransi {j.shift.toleransi} mnt
                          </span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center shrink-0">
                        <i className="bi bi-dash text-gray-300" />
                      </div>
                      <p className="text-sm text-gray-400">Belum dijadwalkan</p>
                    </div>
                  )}
                </div>

                {isToday && j?.shift && (
                  <a
                    href="/check-in"
                    className="shrink-0 flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                  >
                    <i className="bi bi-camera text-sm" />
                    Absen
                  </a>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
