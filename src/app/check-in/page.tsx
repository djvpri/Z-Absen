'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ambilLokasi } from '@/lib/gps'

type Status = 'idle' | 'loading-models' | 'ready' | 'scanning' | 'success' | 'error'

interface HasilAbsen {
  status: 'HADIR' | 'TERLAMBAT'
  waktu: string
}

export default function CheckInPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<Status>('loading-models')
  const [pesan, setPesan] = useState('Memuat model pengenalan wajah...')
  const [hasil, setHasil] = useState<HasilAbsen | null>(null)
  const [error, setError] = useState('')
  const faceApiLoaded = useRef(false)

  const mulaiKamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch {
      setError('Tidak bisa mengakses kamera. Pastikan izin kamera diberikan.')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    const loadFaceApi = async () => {
      try {
        const faceapi = await import('face-api.js')
        const MODEL_URL = '/models'
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ])
        faceApiLoaded.current = true
        setPesan('Model siap. Mulai kamera...')
        await mulaiKamera()
        setStatus('ready')
        setPesan('Arahkan wajah ke kamera, lalu klik tombol absen')
      } catch {
        setError('Gagal memuat model face recognition')
        setStatus('error')
      }
    }
    loadFaceApi()
  }, [mulaiKamera])

  const lakukan = async () => {
    if (status !== 'ready' || !videoRef.current || !canvasRef.current) return

    setStatus('scanning')
    setPesan('Memverifikasi wajah dan lokasi...')
    setError('')

    try {
      const faceapi = await import('face-api.js')

      const deteksi = await faceapi
        .detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!deteksi) {
        setError('Wajah tidak terdeteksi. Pastikan wajah terlihat jelas.')
        setStatus('ready')
        return
      }

      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')!
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      ctx.drawImage(videoRef.current, 0, 0)
      const fotoBase64 = canvas.toDataURL('image/jpeg', 0.7)

      const koordinat = await ambilLokasi()

      const embedding = Array.from(deteksi.descriptor)

      const res = await fetch('/api/absensi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: koordinat.latitude,
          longitude: koordinat.longitude,
          fotoBase64,
          waktu: new Date().toISOString(),
          embedding,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Gagal melakukan absensi')
        setStatus('ready')
        return
      }

      setHasil({
        status: data.status,
        waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      })
      setStatus('success')
    } catch (e) {
      setError(String(e))
      setStatus('ready')
    }
  }

  if (status === 'success' && hasil) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
          <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl ${
            hasil.status === 'HADIR' ? 'bg-green-100' : 'bg-amber-100'
          }`}>
            {hasil.status === 'HADIR' ? '✅' : '⚠️'}
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-1">
            {hasil.status === 'HADIR' ? 'Absen Berhasil!' : 'Terlambat'}
          </h1>
          <p className="text-gray-500 text-sm mb-2">Waktu masuk: {hasil.waktu}</p>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
            hasil.status === 'HADIR'
              ? 'bg-green-100 text-green-800'
              : 'bg-amber-100 text-amber-800'
          }`}>
            {hasil.status}
          </span>
          <p className="text-xs text-gray-400 mt-4">
            Notifikasi telah dikirim ke WhatsApp
          </p>
          <button
            onClick={() => { setStatus('ready'); setHasil(null) }}
            className="mt-6 w-full py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Tutup
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white text-sm font-bold">S</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">SiHadir</p>
          <p className="text-xs text-gray-400">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        <div className="relative w-full max-w-sm aspect-[4/3] bg-gray-900 rounded-2xl overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover scale-x-[-1]"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-white/60 rounded-full" />
          </div>
          {status === 'scanning' && (
            <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />

        <div className="w-full max-w-sm">
          <p className="text-center text-sm text-gray-500 mb-3">{pesan}</p>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-3">
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}

          <button
            onClick={lakukan}
            disabled={status !== 'ready'}
            className="w-full py-3.5 bg-blue-600 text-white font-medium rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 active:scale-[0.98] transition-all"
          >
            {status === 'scanning' ? 'Memverifikasi...' : 'Absen Sekarang'}
          </button>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <a href="/izin" className="py-2.5 text-sm text-center text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
              Ajukan Izin
            </a>
            <a href="/riwayat" className="py-2.5 text-sm text-center text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
              Riwayat
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
