'use client'

import { useState, useEffect, useCallback } from 'react'

interface Kriteria { id: string; nama: string; bobot: number; deskripsi: string }
interface Template {
  id: string; nama: string; periode: string; aktif: boolean
  kriteria: Kriteria[]
  _count: { penilaian: number }
}
interface Member { id: string; jabatan: string | null; user: { nama: string }; departemen: { nama: string } | null }
interface NilaiItem { kriteriaId: string; nama: string; nilai: number; catatan: string }
interface PenilaianRecord {
  id: string; memberId: string; templateId: string; periode: string
  nilaiTotal: number; status: string; catatan: string | null
  nilai: NilaiItem[]
  member: { user: { nama: string }; departemen: { nama: string } | null }
  template: { nama: string; kriteria: Kriteria[] }
}

const PERIODE_LABEL: Record<string, string> = {
  BULANAN: 'Bulanan', KUARTALAN: 'Kuartalan', SEMESTERAN: 'Semesteran', TAHUNAN: 'Tahunan',
}

const nilaiLabel = (n: number) => {
  if (n >= 90) return { label: 'Istimewa', cls: 'bg-green-100 text-green-700' }
  if (n >= 75) return { label: 'Baik', cls: 'bg-blue-100 text-blue-700' }
  if (n >= 60) return { label: 'Cukup', cls: 'bg-amber-100 text-amber-700' }
  return { label: 'Kurang', cls: 'bg-red-100 text-red-700' }
}

function NilaiBar({ nilai }: { nilai: number }) {
  const color = nilai >= 90 ? '#22c55e' : nilai >= 75 ? '#3b82f6' : nilai >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${nilai}%`, backgroundColor: color }} />
    </div>
  )
}

export default function AdminPenilaianPage() {
  const [view, setView] = useState<'list' | 'template' | 'isi'>('list')
  const [templates, setTemplates] = useState<Template[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [penilaian, setPenilaian] = useState<PenilaianRecord[]>([])
  const [selTemplate, setSelTemplate] = useState<Template | null>(null)
  const [selMember, setSelMember] = useState<Member | null>(null)
  const [periodeInput, setPeriodeInput] = useState('')
  const [nilaiForm, setNilaiForm] = useState<NilaiItem[]>([])
  const [catatan, setCatatan] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Template form
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editTemplate, setEditTemplate] = useState<Template | null>(null)
  const [tForm, setTForm] = useState({ nama: '', periode: 'TAHUNAN' })
  const [kriteriaList, setKriteriaList] = useState<Kriteria[]>([])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [tRes, mRes, pRes] = await Promise.all([
      fetch('/api/admin/template-penilaian').then((r) => r.json()),
      fetch('/api/admin/karyawan?limit=200').then((r) => r.json()),
      fetch('/api/admin/penilaian').then((r) => r.json()),
    ])
    setTemplates(tRes.templates || [])
    setMembers(mRes.members || [])
    setPenilaian(pRes.penilaian || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // --- Template CRUD ---
  const openCreateTemplate = () => {
    setEditTemplate(null)
    setTForm({ nama: '', periode: 'TAHUNAN' })
    setKriteriaList([{ id: crypto.randomUUID(), nama: '', bobot: 100, deskripsi: '' }])
    setShowTemplateModal(true)
  }

  const openEditTemplate = (t: Template) => {
    setEditTemplate(t)
    setTForm({ nama: t.nama, periode: t.periode })
    setKriteriaList(t.kriteria.map((k) => ({ ...k })))
    setShowTemplateModal(true)
  }

  const addKriteria = () =>
    setKriteriaList((prev) => [...prev, { id: crypto.randomUUID(), nama: '', bobot: 0, deskripsi: '' }])

  const removeKriteria = (id: string) =>
    setKriteriaList((prev) => prev.filter((k) => k.id !== id))

  const totalBobot = kriteriaList.reduce((s, k) => s + (Number(k.bobot) || 0), 0)

  const saveTemplate = async () => {
    if (!tForm.nama || kriteriaList.length === 0 || totalBobot !== 100) return
    setSaving(true)
    const payload = { nama: tForm.nama, periode: tForm.periode, kriteria: kriteriaList }
    if (editTemplate) {
      await fetch(`/api/admin/template-penilaian/${editTemplate.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
    } else {
      await fetch('/api/admin/template-penilaian', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
    }
    setSaving(false)
    setShowTemplateModal(false)
    fetchAll()
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Hapus template ini?')) return
    await fetch(`/api/admin/template-penilaian/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  // --- Isi penilaian ---
  const openIsi = (t: Template, m: Member, existing?: PenilaianRecord) => {
    setSelTemplate(t)
    setSelMember(m)
    setPeriodeInput(existing?.periode || '')
    setCatatan(existing?.catatan || '')
    setNilaiForm(
      existing?.nilai?.length
        ? existing.nilai
        : t.kriteria.map((k) => ({ kriteriaId: k.id, nama: k.nama, nilai: 0, catatan: '' }))
    )
    setView('isi')
  }

  const savePenilaian = async (status: 'DRAFT' | 'FINAL') => {
    if (!selTemplate || !selMember || !periodeInput) return
    setSaving(true)
    await fetch('/api/admin/penilaian', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: selMember.id,
        templateId: selTemplate.id,
        periode: periodeInput,
        nilai: nilaiForm,
        catatan,
        status,
      }),
    })
    setSaving(false)
    setView('list')
    fetchAll()
  }

  const deletePenilaian = async (id: string) => {
    if (!confirm('Hapus penilaian ini?')) return
    await fetch(`/api/admin/penilaian/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  // ===================== VIEW: ISI PENILAIAN =====================
  if (view === 'isi' && selTemplate && selMember) {
    const nilaiTotal = selTemplate.kriteria.reduce((sum, k) => {
      const n = nilaiForm.find((x) => x.kriteriaId === k.id)?.nilai ?? 0
      return sum + (n * k.bobot) / 100
    }, 0)

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={() => setView('list')} className="text-gray-400 hover:text-gray-600 p-1">
            <i className="bi bi-arrow-left" />
          </button>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">{selMember.user.nama}</p>
            <p className="text-xs text-gray-400">{selTemplate.nama}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-blue-700">{nilaiTotal.toFixed(1)}</p>
            <p className="text-xs text-gray-400">Total</p>
          </div>
        </header>

        <div className="max-w-lg mx-auto p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Periode ({PERIODE_LABEL[selTemplate.periode]}) <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={periodeInput}
              onChange={(e) => setPeriodeInput(e.target.value)}
              placeholder={selTemplate.periode === 'TAHUNAN' ? '2026' : selTemplate.periode === 'KUARTALAN' ? '2026-Q2' : '2026-07'}
              className={inputCls}
            />
          </div>

          {selTemplate.kriteria.map((k) => {
            const nilaiItem = nilaiForm.find((x) => x.kriteriaId === k.id)
            const n = nilaiItem?.nilai ?? 0
            return (
              <div key={k.id} className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{k.nama}</p>
                    {k.deskripsi && <p className="text-xs text-gray-400 mt-0.5">{k.deskripsi}</p>}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">bobot {k.bobot}%</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-500">Nilai (0–100)</label>
                    <span className="text-base font-bold text-gray-900">{n}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={n}
                    onChange={(e) =>
                      setNilaiForm((prev) =>
                        prev.map((x) => x.kriteriaId === k.id ? { ...x, nilai: parseInt(e.target.value) } : x)
                      )
                    }
                    className="w-full accent-blue-600"
                  />
                  <NilaiBar nilai={n} />
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Catatan</label>
                  <input
                    type="text"
                    placeholder="Opsional..."
                    value={nilaiItem?.catatan || ''}
                    onChange={(e) =>
                      setNilaiForm((prev) =>
                        prev.map((x) => x.kriteriaId === k.id ? { ...x, catatan: e.target.value } : x)
                      )
                    }
                    className={inputCls}
                  />
                </div>
              </div>
            )
          })}

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Catatan Umum</label>
            <textarea rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} className={inputCls + ' resize-none'} />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => savePenilaian('DRAFT')}
              disabled={saving || !periodeInput}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Simpan Draft
            </button>
            <button
              onClick={() => savePenilaian('FINAL')}
              disabled={saving || !periodeInput}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Finalisasi'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ===================== VIEW: LIST =====================
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <a href="/admin/dashboard" className="text-gray-400 hover:text-gray-600 p-1">
          <i className="bi bi-arrow-left" />
        </a>
        <h1 className="text-sm font-semibold text-gray-900 flex-1">Penilaian Kinerja (KPI)</h1>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Template section */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-900">Template KPI</p>
            <button
              onClick={openCreateTemplate}
              className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
            >
              <i className="bi bi-plus-lg" /> Buat Template
            </button>
          </div>

          {loading ? (
            <div className="py-6 flex justify-center">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-6">
              <i className="bi bi-clipboard-data text-3xl text-gray-300 block mb-1" />
              <p className="text-sm text-gray-400">Belum ada template</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className={`rounded-xl border p-3 ${!t.aktif ? 'opacity-60 border-gray-100 bg-gray-50' : 'border-gray-100'}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-medium text-gray-900 text-sm">{t.nama}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          {PERIODE_LABEL[t.periode]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {t.kriteria.length} kriteria · {t._count.penilaian} penilaian
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => openEditTemplate(t)}
                        className="text-xs px-2 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
                      >
                        <i className="bi bi-pencil" />
                      </button>
                      <button
                        onClick={() => deleteTemplate(t.id)}
                        className="text-xs px-2 py-1 border border-red-100 rounded-lg text-red-400 hover:bg-red-50"
                      >
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                  </div>

                  {/* Quick assign buttons per member */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {members.slice(0, 8).map((m) => {
                      const existing = penilaian.find(
                        (p) => p.memberId === m.id && p.templateId === t.id
                      )
                      return (
                        <button
                          key={m.id}
                          onClick={() => openIsi(t, m, existing)}
                          className={`text-xs px-2 py-1 rounded-lg flex items-center gap-1 ${
                            existing?.status === 'FINAL'
                              ? 'bg-green-100 text-green-700'
                              : existing?.status === 'DRAFT'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {existing?.status === 'FINAL' && <i className="bi bi-check2 text-xs" />}
                          {existing?.status === 'DRAFT' && <i className="bi bi-pencil-square text-xs" />}
                          {m.user.nama.split(' ')[0]}
                          {existing && <span className="font-semibold">{existing.nilaiTotal}</span>}
                        </button>
                      )
                    })}
                    {members.length > 8 && (
                      <span className="text-xs text-gray-400 px-2 py-1">+{members.length - 8} lainnya</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Penilaian history */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Riwayat Penilaian</p>
          {penilaian.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Belum ada penilaian</p>
          ) : (
            <div className="space-y-2">
              {penilaian.map((p) => {
                const lbl = nilaiLabel(p.nilaiTotal)
                return (
                  <div key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 shrink-0">
                      {p.member.user.nama.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{p.member.user.nama}</p>
                      <p className="text-xs text-gray-400">{p.template.nama} · {p.periode}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lbl.cls}`}>
                        {p.nilaiTotal} — {lbl.label}
                      </span>
                      {p.status === 'DRAFT' && (
                        <span className="ml-1 text-xs text-amber-500">Draft</span>
                      )}
                    </div>
                    <button
                      onClick={() => deletePenilaian(p.id)}
                      className="text-xs text-red-300 hover:text-red-500 shrink-0"
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">{editTemplate ? 'Edit Template' : 'Buat Template KPI'}</h3>
              <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-gray-600">
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Nama Template <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={tForm.nama}
                  onChange={(e) => setTForm((f) => ({ ...f, nama: e.target.value }))}
                  placeholder="cth: KPI Tahunan 2026"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Periode</label>
                <select value={tForm.periode} onChange={(e) => setTForm((f) => ({ ...f, periode: e.target.value }))} className={inputCls}>
                  <option value="BULANAN">Bulanan</option>
                  <option value="KUARTALAN">Kuartalan</option>
                  <option value="SEMESTERAN">Semesteran</option>
                  <option value="TAHUNAN">Tahunan</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-500">
                    Kriteria Penilaian
                    <span className={`ml-2 font-semibold ${totalBobot === 100 ? 'text-green-600' : 'text-red-500'}`}>
                      (total bobot: {totalBobot}%)
                    </span>
                  </label>
                  <button onClick={addKriteria} className="text-xs text-blue-600 hover:underline">
                    + Tambah
                  </button>
                </div>
                <div className="space-y-3">
                  {kriteriaList.map((k, i) => (
                    <div key={k.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">Kriteria {i + 1}</span>
                        {kriteriaList.length > 1 && (
                          <button onClick={() => removeKriteria(k.id)} className="text-xs text-red-400 hover:text-red-600">
                            <i className="bi bi-x-lg" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <input
                            type="text"
                            placeholder="Nama kriteria"
                            value={k.nama}
                            onChange={(e) => setKriteriaList((prev) => prev.map((x) => x.id === k.id ? { ...x, nama: e.target.value } : x))}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            placeholder="Bobot %"
                            min={0} max={100}
                            value={k.bobot}
                            onChange={(e) => setKriteriaList((prev) => prev.map((x) => x.id === k.id ? { ...x, bobot: parseInt(e.target.value) || 0 } : x))}
                            className={inputCls}
                          />
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Deskripsi (opsional)"
                        value={k.deskripsi}
                        onChange={(e) => setKriteriaList((prev) => prev.map((x) => x.id === k.id ? { ...x, deskripsi: e.target.value } : x))}
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setShowTemplateModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Batal
              </button>
              <button
                onClick={saveTemplate}
                disabled={saving || !tForm.nama || totalBobot !== 100}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
