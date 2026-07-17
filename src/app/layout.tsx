import type { Metadata, Viewport } from 'next'
import './globals.css'
import 'bootstrap-icons/font/bootstrap-icons.css'

export const viewport: Viewport = {
  themeColor: '#2563eb',
}

export const metadata: Metadata = {
  title: 'SiHadir — Sistem Kehadiran Digital',
  description: 'Absensi sekolah berbasis face recognition dan GPS',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SiHadir',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
