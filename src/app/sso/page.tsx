'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function SsoContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    const invite = searchParams.get('invite')

    if (!token) {
      // Tidak ada token → redirect ke Z One
      const appUrl = window.location.origin
      window.location.href = `https://zone.zomet.my.id/sso?app=zabsen&redirect=${encodeURIComponent(appUrl + '/sso')}`
      return
    }

    fetch('/api/auth/sso-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, inviteToken: invite }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) {
          setStatus('error')
          setMsg(d.error || 'Login SSO gagal')
          return
        }
        // Simpan daftar tenant jika multi-tenant
        if (d.tenants) {
          sessionStorage.setItem('z-absen-tenants', JSON.stringify(d.tenants))
        }
        window.location.replace(d.redirect || '/check-in')
      })
      .catch(() => {
        setStatus('error')
        setMsg('Tidak dapat terhubung ke server')
      })
  }, [searchParams])

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-red-400 font-medium mb-2">Gagal Login</p>
          <p className="text-slate-500 text-sm mb-4">{msg}</p>
          <a href="https://zone.zomet.my.id" className="text-blue-400 text-sm underline">
            Kembali ke Z One
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm">Menghubungkan akun dari Z One...</p>
      </div>
    </div>
  )
}

export default function SsoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SsoContent />
    </Suspense>
  )
}
