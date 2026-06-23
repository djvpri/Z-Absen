'use client'

import { useEffect, useRef, useState } from 'react'

export default function ProfilPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [user, setUser] = useState<any>(null)
  const [status, setStatus] = useState<'idle' | 'camera' | 'capturing' | 'done' | 'error'>('idle')
  const [pesan, setPesan] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)).catch(() => {})
  }, [])

  const mulaiDaftarWajah = async () => {
    setStatus('camera')
    setPesan('Mengaktifkan kamera...')
    setError('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      })
      if (videoRef.current) videoRef.current.srcObject = stream
      setPesan('Arahkan wajah ke kamera, lalu klik "Ambil Foto"')
    } catch {
      setError('Tidak bisa mengakses kamera')
      setStatus('idle')
    }
  }

  const ambilDanSimpan = async () => {
    if (!videoRef.current || !canvasRef.current) return
    setStatus('capturing')
    setPesan('Memproses wajah...')

    try {
      const faceapi = await import('face-api.js')
      const MODEL_URL = '/models'
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ])

      const deteksi = await faceapi
        .detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!deteksi) {
        setError('Wajah tidak terdeteksi. Coba lagi dengan pencahayaan lebih baik.')
        setStatus('camera')
        return
      }

      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')!
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      ctx.drawImage(videoRef.current, 0, 0)
      const fotoBase64 = canvas.toDataURL('image/jpeg', 0.7)
      const embedding = Array.from(deteksi.descriptor)

      const res = await fetch('/api/wajah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embedding, fotoBase64 }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal menyimpan wajah')
        setStatus('camera')
        return
      }

      // Stop camera
      const stream = videoRef.current.srcObject as MediaStream
      stream?.getTracks().forEach(t => t.stop())

      setPesan('Wajah berhasil didaftarkan! ✅')
      setStatus('done')
      setUser((prev: any) => ({ ...prev, fotoWajah: fotoBase64 }))
    } catch (e) {
      setError(String(e))
      setStatus('camera')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <a href="/check-in" className="text-gray-400 hover:text-gray-600">← Kembali</a>
        <h1 className="text-sm font-semibold text-gray-900">Profil Saya</h1>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-600 overflow-hidden">
              {user?.fotoWajah ? (
                <img src={user.fotoWajah} alt="Wajah" className="w-full h-full object-cover" />
              ) : (
                user?.nama?.charAt(0) || '?'
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user?.nama || '...'}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <p className="text-xs text-gray-400">{user?.role} · {user?.sekolah}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-2">Daftarkan Wajah</h2>
          <p className="text-sm text-gray-500 mb-4">
            Wajah digunakan untuk verifikasi absensi. Pastikan wajah terlihat jelas.
          </p>

          {status === 'done' && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center mb-4">
              <p className="text-green-700 text-sm font-medium">✅ Wajah sudah terdaftar!</p>
              <button onClick={() => { setStatus('idle'); setPesan('') }} className="text-xs text-green-600 underline mt-1">
                Daftarkan ulang
              </button>
            </div>
          )}

          {status === 'camera' && (
            <div className="mb-4">
              <div className="relative aspect-[4/3] bg-gray-900 rounded-xl overflow-hidden mb-3">
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-40 h-40 border-2 border-white/50 rounded-full" />
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {status === 'camera' && (
            <button onClick={ambilDanSimpan} disabled={status === 'capturing'}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-40 mb-2">
              {status === 'capturing' ? 'Memproses...' : 'Ambil Foto & Simpan'}
            </button>
          )}

          {(status === 'idle' || status === 'done') && (
            <button onClick={mulaiDaftarWajah}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700">
              {user?.fotoWajah ? 'Daftarkan Ulang Wajah' : 'Daftarkan Wajah Sekarang'}
            </button>
          )}

          {status === 'camera' && (
            <button onClick={() => {
              const stream = videoRef.current?.srcObject as MediaStream
              stream?.getTracks().forEach(t => t.stop())
              setStatus('idle')
              setError('')
            }} className="w-full py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
              Batal
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
