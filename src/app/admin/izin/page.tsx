'use client'

import { useState, useEffect } from 'react'

interface IzinItem {
  id: string
  jenis: string
  tanggalMulai: string
  tanggalSelesai: string
  alasan: string
  status: string
  catatanApprover?: string
  user: { nama: string; role: string }
  createdAt: string
}

export default function AdminIzinPage() {
  const [data, setData] = useState<IzinItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('MENUNGGU')

  const load = () => {
    setLoading(true)
    fetch('/api/izin').then(r => r.json()).then(d => {
      const all = d.izin || []
      setData(filter === 'ALL' ? all : all.filter((i: IzinItem) => i.status === filter))
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [filter])

  const handleAction = async (izinId: string, status: string, catatan: string) => {
    await fetch('/api/izin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ izinId, status, catatan }),
    })
    load()
  }

  const statusColor: Record<string, string> = {
    MENUNGGU: 'bg-amber-100 text-amber-700',
    DISETUJUI: 'bg-green-100 text-green-700',
    DITOLAK: 'bg-red-100 text-red-700',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <a href="/admin/dashboard" className="text-gray-400 hover:text-gray-600">← Kembali</a>
        <h1 className="text-sm font-semibold text-gray-900">Approve Izin</h1>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="flex gap-2">
          {['MENUNGGU', 'DISETUJUI', 'DITOLAK', 'ALL'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === f ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
              {f === 'ALL' ? 'Semua' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-8 text-sm text-gray-400">Memuat...</div>
        ) : data.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">Tidak ada pengajuan izin</div>
        ) : (
          <div className="space-y-3">
            {data.map(i => (
              <div key={i.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{i.user.nama}</p>
                    <p className="text-xs text-gray-400">{i.user.role}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[i.status]}`}>
                    {i.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mb-2 space-y-1">
                  <p>📋 {i.jenis} · {new Date(i.tanggalMulai).toLocaleDateString('id-ID')} — {new Date(i.tanggalSelesai).toLocaleDateString('id-ID')}</p>
                  <p>💬 {i.alasan}</p>
                </div>
                {i.status === 'MENUNGGU' && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleAction(i.id, 'DISETUJUI', '')}
                      className="flex-1 py-2 bg-green-600 text-white rounded-xl text-xs font-medium hover:bg-green-700">
                      ✅ Setujui
                    </button>
                    <button onClick={() => {
                      const cat = prompt('Alasan penolakan (opsional):')
                      handleAction(i.id, 'DITOLAK', cat || '')
                    }}
                      className="flex-1 py-2 bg-red-600 text-white rounded-xl text-xs font-medium hover:bg-red-700">
                      ❌ Tolak
                    </button>
                  </div>
                )}
                {i.catatanApprover && (
                  <p className="text-xs text-gray-400 mt-2 italic">Catatan: {i.catatanApprover}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
