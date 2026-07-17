'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type TenantOption = {
  memberId: string
  tenantId: string
  tenantSlug: string
  tenantNama: string
  tenantType: 'SEKOLAH' | 'PERUSAHAAN'
  role: string
  planStatus: string
  logoUrl?: string | null
}

export default function PilihOrganisasiPage() {
  const router = useRouter()
  const [tenants, setTenants] = useState<TenantOption[]>([])
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('z-absen-tenants')
    if (!stored) { router.replace('/sso'); return }
    setTenants(JSON.parse(stored))
  }, [router])

  async function pilihTenant(memberId: string) {
    setLoading(memberId)
    try {
      const res = await fetch('/api/auth/sso-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      })
      const data = await res.json()
      if (data.success) {
        sessionStorage.removeItem('z-absen-tenants')
        window.location.replace(data.redirect || '/dashboard')
      }
    } catch {
      setLoading(null)
    }
  }

  const roleLabel: Record<string, string> = {
    TENANT_ADMIN: 'Admin', ANGGOTA: 'Anggota', WALI: 'Wali', SUPER_ADMIN: 'Super Admin',
  }

  const statusLabel: Record<string, { label: string; color: string }> = {
    TRIAL: { label: 'Trial', color: 'bg-yellow-100 text-yellow-700' },
    ACTIVE: { label: 'Aktif', color: 'bg-green-100 text-green-700' },
    EXPIRED: { label: 'Kedaluwarsa', color: 'bg-red-100 text-red-700' },
    CANCELLED: { label: 'Dibatalkan', color: 'bg-gray-100 text-gray-600' },
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">Z</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Pilih Organisasi</h1>
          <p className="text-gray-500 text-sm mt-1">Anda terdaftar di beberapa organisasi</p>
        </div>

        <div className="space-y-3">
          {tenants.map((t) => {
            const status = statusLabel[t.planStatus] ?? { label: t.planStatus, color: 'bg-gray-100 text-gray-600' }
            return (
              <button
                key={t.memberId}
                onClick={() => pilihTenant(t.memberId)}
                disabled={loading !== null}
                className="w-full bg-white border border-gray-200 hover:border-blue-400 rounded-2xl p-4 text-left transition-all flex items-center gap-4 hover:shadow-sm disabled:opacity-60"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  {t.logoUrl
                    ? <img src={t.logoUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    : <span className="text-xl">{t.tenantType === 'SEKOLAH' ? '🏫' : '🏢'}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{t.tenantNama}</p>
                  <p className="text-xs text-gray-500">{roleLabel[t.role] ?? t.role}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                    {status.label}
                  </span>
                  {loading === t.memberId && (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          <a href="https://zone.zomet.my.id" className="hover:text-blue-500">Kembali ke Z One</a>
        </p>
      </div>
    </div>
  )
}
