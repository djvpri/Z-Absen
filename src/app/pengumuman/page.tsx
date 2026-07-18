'use client'

import { useState, useEffect } from 'react'

interface PengumumanItem {
  id: string
  judul: string
  isi: string
  prioritas: 'RENDAH' | 'NORMAL' | 'PENTING' | 'URGENT'
  pinned: boolean
  createdAt: string
  sudahDibaca: boolean
  tanggalDibaca: string | null
}

const PRIORITAS_CONFIG = {
  RENDAH: { cls: 'bg-gray-100 text-gray-500', icon: 'bi-info-circle' },
  NORMAL: { cls: 'bg-blue-100 text-blue-600', icon: 'bi-bell' },
  PENTING: { cls: 'bg-amber-100 text-amber-600', icon: 'bi-exclamation-triangle' },
  URGENT: { cls: 'bg-red-100 text-red-600', icon: 'bi-exclamation-octagon' },
}

const PRIORITAS_LABEL: Record<string, string> = {
  RENDAH: 'Rendah', NORMAL: 'Normal', PENTING: 'Penting', URGENT: 'Urgent',
}

export default function PengumumanPage() {
  const [data, setData] = useState<PengumumanItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch('/api/pengumuman')
    const d = await res.json()
    setData(d.pengumuman || [])
    setUnreadCount(d.unreadCount || 0)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleExpand = async (p: PengumumanItem) => {
    const newId = expandedId === p.id ? null : p.id
    setExpandedId(newId)

    // Mark as read when opened
    if (newId && !p.sudahDibaca) {
      await fetch(`/api/pengumuman/${p.id}/baca`, { method: 'POST' })
      setData((prev) =>
        prev.map((item) => item.id === p.id ? { ...item, sudahDibaca: true, tanggalDibaca: new Date().toISOString() } : item)
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <a href="/check-in" className="text-gray-400 hover:text-gray-600 p-1">
          <i className="bi bi-arrow-left" />
        </a>
        <h1 className="text-sm font-semibold text-gray-900 flex-1">Pengumuman</h1>
        {unreadCount > 0 && (
          <span className="text-xs bg-red-500 text-white font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
            {unreadCount}
          </span>
        )}
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <i className="bi bi-megaphone text-4xl text-gray-300 block mb-2" />
            <p className="text-sm text-gray-400">Belum ada pengumuman</p>
          </div>
        ) : (
          <>
            {unreadCount > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <i className="bi bi-bell-fill text-blue-500 text-sm" />
                <p className="text-xs text-blue-700 font-medium">
                  {unreadCount} pengumuman belum dibaca
                </p>
              </div>
            )}

            {data.map((p) => {
              const cfg = PRIORITAS_CONFIG[p.prioritas]
              const isExpanded = expandedId === p.id
              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-xl border cursor-pointer transition-colors ${
                    !p.sudahDibaca
                      ? 'border-blue-200 shadow-sm'
                      : 'border-gray-100'
                  }`}
                  onClick={() => handleExpand(p)}
                >
                  <div className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${cfg.cls}`}>
                        <i className={`bi ${cfg.icon} text-sm`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {!p.sudahDibaca && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                          )}
                          {p.pinned && (
                            <i className="bi bi-pin-fill text-xs text-gray-400 shrink-0" />
                          )}
                          <p className={`text-sm leading-snug ${!p.sudahDibaca ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {p.judul}
                          </p>
                        </div>
                        {!isExpanded && (
                          <p className="text-xs text-gray-400 truncate">{p.isi}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">
                            {new Date(p.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          {p.prioritas !== 'NORMAL' && (
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cfg.cls}`}>
                              {PRIORITAS_LABEL[p.prioritas]}
                            </span>
                          )}
                        </div>
                      </div>
                      <i className={`bi ${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'} text-gray-400 text-sm shrink-0 mt-1`} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-50 pt-3">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{p.isi}</p>
                      {p.sudahDibaca && p.tanggalDibaca && (
                        <p className="text-xs text-gray-300 mt-3">
                          <i className="bi bi-check2-all mr-1" />
                          Dibaca {new Date(p.tanggalDibaca).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
