'use client'

import { useState, useEffect, useCallback } from 'react'

interface Shift {
  id: string
  nama: string
  jamMasuk: string
  jamKeluar: string
  warna: string
}

interface JadwalItem {
  id: string
  memberId: string
  tanggal: string
  shiftId: string | null
  libur: boolean
  shift: Shift | null
}

interface Member {
  id: string
  jabatan: string | null
  user: { nama: string }
}

const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

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

export default function AdminJadwalPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(new Date()))
  const [members, setMembers] = useState<Member[]>([])
  const [jadwal, setJadwal] = useState<JadwalItem[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCell, setActiveCell] = useState<{ memberId: string; tanggal: string } | null>(null)

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const fetchData = useCallback(async () => {
    setLoading(true)
    const start = isoDate(days[0])
    const end = isoDate(days[6])
    const res = await fetch(`/api/admin/jadwal?startDate=${start}&endDate=${end}`)
    const d = await res.json()
    setMembers(d.members || [])
    setJadwal(d.jadwal || [])
    setShifts(d.shifts || [])
    setLoading(false)
  }, [weekStart]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData() }, [fetchData])

  const getJadwal = (memberId: string, tgl: string) =>
    jadwal.find((j) => j.memberId === memberId && j.tanggal.slice(0, 10) === tgl)

  const handleAssign = async (memberId: string, tanggal: string, shiftId: string | null, libur = false) => {
    if (!shiftId && !libur) {
      // Clear: delete
      await fetch(`/api/admin/jadwal?memberId=${memberId}&tanggal=${tanggal}`, { method: 'DELETE' })
      setJadwal((prev) => prev.filter((j) => !(j.memberId === memberId && j.tanggal.slice(0, 10) === tanggal)))
    } else {
      const res = await fetch('/api/admin/jadwal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, tanggal, shiftId, libur }),
      })
      const data = await res.json()
      setJadwal((prev) => {
        const idx = prev.findIndex((j) => j.memberId === memberId && j.tanggal.slice(0, 10) === tanggal)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = data.jadwal
          return next
        }
        return [...prev, data.jadwal]
      })
    }
    setActiveCell(null)
  }

  const todayStr = isoDate(new Date())

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <a href="/admin/dashboard" className="text-gray-400 hover:text-gray-600 p-1">
          <i className="bi bi-arrow-left" />
        </a>
        <h1 className="text-sm font-semibold text-gray-900 flex-1">Jadwal Kerja</h1>
        <a href="/admin/shift" className="text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50">
          <i className="bi bi-clock mr-1" />Shift
        </a>
      </header>

      {/* Week navigator */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between">
        <button
          onClick={() => setWeekStart((d) => addDays(d, -7))}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <i className="bi bi-chevron-left" />
        </button>
        <p className="text-sm font-medium text-gray-700">
          {days[0].toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
          {' – '}
          {days[6].toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
        <button
          onClick={() => setWeekStart((d) => addDays(d, 7))}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <i className="bi bi-chevron-right" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">Belum ada anggota aktif</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-white border-b border-gray-100">
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-36 sticky left-0 bg-white z-10 border-r border-gray-100">
                  Nama
                </th>
                {days.map((d, i) => (
                  <th
                    key={i}
                    className={`text-center px-2 py-2 text-xs font-medium ${
                      isoDate(d) === todayStr ? 'text-blue-600' : 'text-gray-500'
                    }`}
                  >
                    <div>{HARI[i]}</div>
                    <div className={`text-base font-semibold ${isoDate(d) === todayStr ? 'text-blue-600' : 'text-gray-800'}`}>
                      {d.getDate()}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-white/50">
                  <td className="px-4 py-2 sticky left-0 bg-gray-50 z-10 border-r border-gray-100">
                    <p className="text-xs font-medium text-gray-900 truncate max-w-[120px]">{m.user.nama}</p>
                    {m.jabatan && (
                      <p className="text-xs text-gray-400 truncate max-w-[120px]">{m.jabatan}</p>
                    )}
                  </td>
                  {days.map((d, i) => {
                    const tgl = isoDate(d)
                    const j = getJadwal(m.id, tgl)
                    const isActive = activeCell?.memberId === m.id && activeCell?.tanggal === tgl

                    return (
                      <td key={i} className="px-1 py-1.5 text-center relative">
                        <button
                          onClick={() => setActiveCell(isActive ? null : { memberId: m.id, tanggal: tgl })}
                          className={`w-full min-h-[52px] rounded-lg text-xs transition-colors relative ${
                            j?.libur
                              ? 'bg-gray-200 text-gray-400'
                              : j?.shift
                              ? 'text-white'
                              : 'bg-gray-50 text-gray-300 hover:bg-gray-100 border border-dashed border-gray-200'
                          }`}
                          style={j?.shift ? { backgroundColor: j.shift.warna } : {}}
                        >
                          {j?.libur ? (
                            <span className="font-medium text-gray-500 text-xs">Libur</span>
                          ) : j?.shift ? (
                            <>
                              <div className="font-semibold leading-tight">{j.shift.nama}</div>
                              <div className="opacity-80 text-xs">{j.shift.jamMasuk}</div>
                            </>
                          ) : (
                            <i className="bi bi-plus text-base" />
                          )}
                        </button>

                        {/* Dropdown picker */}
                        {isActive && (
                          <div className="absolute top-full left-0 z-30 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 w-44 py-1">
                            {shifts.map((s) => (
                              <button
                                key={s.id}
                                onClick={() => handleAssign(m.id, tgl, s.id)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2"
                              >
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: s.warna }}
                                />
                                <span className="font-medium text-gray-800">{s.nama}</span>
                                <span className="text-gray-400 ml-auto">{s.jamMasuk}</span>
                              </button>
                            ))}
                            <div className="border-t border-gray-100 mt-1 pt-1">
                              <button
                                onClick={() => handleAssign(m.id, tgl, null, true)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 text-gray-500"
                              >
                                <i className="bi bi-slash-circle text-gray-400" />
                                Hari Libur
                              </button>
                              {j && (
                                <button
                                  onClick={() => handleAssign(m.id, tgl, null, false)}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 flex items-center gap-2 text-red-400"
                                >
                                  <i className="bi bi-x-circle" />
                                  Hapus Jadwal
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      {shifts.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2 flex gap-3 overflow-x-auto">
          {shifts.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5 shrink-0">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.warna }} />
              <span className="text-xs text-gray-600">{s.nama} ({s.jamMasuk}–{s.jamKeluar})</span>
            </div>
          ))}
        </div>
      )}

      {/* Dismiss overlay for active cell */}
      {activeCell && (
        <div className="fixed inset-0 z-20" onClick={() => setActiveCell(null)} />
      )}
    </div>
  )
}
