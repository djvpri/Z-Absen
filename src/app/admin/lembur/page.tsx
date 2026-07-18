'use client'

import { useState, useEffect, useCallback } from 'react'

interface LemburItem {
  id: string
  tanggal: string
  jamLembur: number
  keterangan: string | null
  status: 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK'
  catatanApproval: string | null
  tanggalApproval: string | null
  member: {
    jabatan: string | null
    departemen: { nama: string } | null
    user: { nama: string }
  }
}

interface MemberOption { id: string; nama: string }

const BULAN_NAMA = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const STATUS_BADGE: Record<string, string> = {
  MENUNGGU: 'bg-amber-100 text-amber-700',
  DISETUJUI: 'bg-green-100 text-green-700',
  DITOLAK: 'bg-red-100 text-red-700',
}

const STATUS_LABEL: Record<string, string> = {
  MENUNGGU: 'Menunggu',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
}

export default function AdminLemburPage() {
  const now = new Date()
  const [bulan, setBulan] = useState(now.getMonth() + 1)
  const [tahun, setTahun] = useState(now.getFullYear())
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMember, setFilterMember] = useState('')
  const [data, setData] = useState<LemburItem[]>([])
  const [stats, setStats] = useState({ pending: 0, totalJamDisetujui: 0 })
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<MemberOption[]>([])

  // Modal tambah lembur
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ memberId: '', tanggal: '', jamLembur: '', keterangan: '' })
  const [saving, setSaving] = useState(false)

  // Approval modal
  const [approveTarget, setApproveTarget] = useState<{ id: string; nama: string; jam: number; action: 'DISETUJUI' | 'DITOLAK' } | null>(null)
  const [catatanApproval, setCatatanApproval] = useState('')
  const [approving, setApproving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams({ bulan: String(bulan), tahun: String(tahun) })
    if (filterStatus) p.set('status', filterStatus)
    if (filterMember) p.set('memberId', filterMember)
    const res = await fetch(`/api/admin/lembur?${p}`)
    const d = await res.json()
    setData(d.lembur || [])
    setStats(d.stats || { pending: 0, totalJamDisetujui: 0 })
    setLoading(false)
  }, [bulan, tahun, filterStatus, filterMember])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    fetch('/api/admin/karyawan')
      .then((r) => r.json())
      .then((d) =>
        setMembers((d.karyawan || []).map((k: any) => ({ id: k.id, nama: k.user.nama })))
      )
  }, [])

  const handleApprove = async () => {
    if (!approveTarget) return
    setApproving(true)
    await fetch(`/api/admin/lembur/${approveTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: approveTarget.action, catatanApproval }),
    })
    setApproveTarget(null)
    setCatatanApproval('')
    setApproving(false)
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus catatan lembur ini?')) return
    await fetch(`/api/admin/lembur/${id}`, { method: 'DELETE' })
    fetchData()
  }

  const handleTambah = async () => {
    if (!form.memberId || !form.tanggal || !form.jamLembur) return
    setSaving(true)
    await fetch('/api/admin/lembur', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: form.memberId,
        tanggal: form.tanggal,
        jamLembur: Number(form.jamLembur),
        keterangan: form.keterangan,
        status: 'DISETUJUI',
      }),
    })
    setSaving(false)
    setShowModal(false)
    setForm({ memberId: '', tanggal: '', jamLembur: '', keterangan: '' })
    fetchData()
  }

  const prevMonth = () => bulan === 1 ? (setBulan(12), setTahun((t) => t - 1)) : setBulan((b) => b - 1)
  const nextMonth = () => bulan === 12 ? (setBulan(1), setTahun((t) => t + 1)) : setBulan((b) => b + 1)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <a href="/admin/dashboard" className="text-gray-400 hover:text-gray-600 p-1">
          <i className="bi bi-arrow-left" />
        </a>
        <h1 className="text-sm font-semibold text-gray-900 flex-1">Kelola Lembur</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700"
        >
          <i className="bi bi-plus-lg" /> Tambah
        </button>
      </header>

      {/* Period + filters */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1 text-gray-400 hover:text-gray-700">
            <i className="bi bi-chevron-left text-sm" />
          </button>
          <span className="text-sm font-semibold text-gray-800 min-w-[130px] text-center">
            {BULAN_NAMA[bulan]} {tahun}
          </span>
          <button onClick={nextMonth} className="p-1 text-gray-400 hover:text-gray-700">
            <i className="bi bi-chevron-right text-sm" />
          </button>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white"
        >
          <option value="">Semua Status</option>
          <option value="MENUNGGU">Menunggu</option>
          <option value="DISETUJUI">Disetujui</option>
          <option value="DITOLAK">Ditolak</option>
        </select>
        {members.length > 0 && (
          <select
            value={filterMember}
            onChange={(e) => setFilterMember(e.target.value)}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white max-w-[160px]"
          >
            <option value="">Semua Karyawan</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
          </select>
        )}
      </div>

      {/* Stats */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <i className="bi bi-hourglass-split text-amber-600" />
              <p className="text-xs text-amber-700">Menunggu Persetujuan</p>
            </div>
            <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <i className="bi bi-check-circle text-green-600" />
              <p className="text-xs text-green-700">Total Jam Disetujui</p>
            </div>
            <p className="text-2xl font-bold text-green-700">{stats.totalJamDisetujui.toFixed(1)} jam</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data.length === 0 ? (
            <div className="py-12 text-center">
              <i className="bi bi-clock-history text-4xl text-gray-300 block mb-2" />
              <p className="text-sm text-gray-400">Tidak ada data lembur</p>
            </div>
          ) : (
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Karyawan</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500">Tanggal</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center">Jam</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500">Keterangan</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center">Status</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.map((l) => (
                  <tr key={l.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-gray-900">{l.member.user.nama}</p>
                      <p className="text-xs text-gray-400">
                        {l.member.jabatan || '-'}{l.member.departemen ? ` · ${l.member.departemen.nama}` : ''}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-600">
                      {new Date(l.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-3 py-2.5 text-center font-semibold text-gray-800">
                      {l.jamLembur}j
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 max-w-[180px] truncate">
                      {l.keterangan || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[l.status]}`}>
                        {STATUS_LABEL[l.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        {l.status === 'MENUNGGU' && (
                          <>
                            <button
                              onClick={() => setApproveTarget({ id: l.id, nama: l.member.user.nama, jam: l.jamLembur, action: 'DISETUJUI' })}
                              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"
                              title="Setujui"
                            >
                              <i className="bi bi-check-lg text-sm" />
                            </button>
                            <button
                              onClick={() => setApproveTarget({ id: l.id, nama: l.member.user.nama, jam: l.jamLembur, action: 'DITOLAK' })}
                              className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                              title="Tolak"
                            >
                              <i className="bi bi-x-lg text-sm" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(l.id)}
                          className="p-1.5 rounded-lg bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                          title="Hapus"
                        >
                          <i className="bi bi-trash text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Tambah Lembur */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Tambah Lembur</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Karyawan</label>
                <select
                  value={form.memberId}
                  onChange={(e) => setForm((f) => ({ ...f, memberId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pilih karyawan...</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Tanggal</label>
                  <input
                    type="date"
                    value={form.tanggal}
                    onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Jam Lembur</label>
                  <input
                    type="number"
                    min="0.5"
                    max="24"
                    step="0.5"
                    placeholder="mis. 2.5"
                    value={form.jamLembur}
                    onChange={(e) => setForm((f) => ({ ...f, jamLembur: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Keterangan</label>
                <input
                  type="text"
                  placeholder="mis. Lembur closing laporan Q2"
                  value={form.keterangan}
                  onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleTambah}
                disabled={saving || !form.memberId || !form.tanggal || !form.jamLembur}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Confirmation */}
      {approveTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-5 space-y-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${approveTarget.action === 'DISETUJUI' ? 'bg-green-100' : 'bg-red-100'}`}>
                <i className={`bi text-xl ${approveTarget.action === 'DISETUJUI' ? 'bi-check-circle text-green-600' : 'bi-x-circle text-red-600'}`} />
              </div>
              <p className="text-center text-sm text-gray-700">
                {approveTarget.action === 'DISETUJUI' ? 'Setujui' : 'Tolak'} lembur{' '}
                <strong>{approveTarget.jam}j</strong> untuk{' '}
                <strong>{approveTarget.nama}</strong>?
              </p>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Catatan (opsional)</label>
                <input
                  type="text"
                  value={catatanApproval}
                  onChange={(e) => setCatatanApproval(e.target.value)}
                  placeholder="Catatan untuk karyawan..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setApproveTarget(null); setCatatanApproval('') }}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600"
                >
                  Batal
                </button>
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50 ${approveTarget.action === 'DISETUJUI' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  {approving ? '...' : approveTarget.action === 'DISETUJUI' ? 'Setujui' : 'Tolak'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
