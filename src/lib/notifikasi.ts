import { prisma } from './prisma'

interface NotifOptions {
  userId: string
  noTujuan: string
  pesan: string
  via: 'whatsapp' | 'telegram'
}

export async function kirimNotifikasiWA(noHp: string, pesan: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: process.env.FONNTE_TOKEN || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ target: noHp, message: pesan }),
    })
    const data = await res.json()
    return data.status === true
  } catch {
    return false
  }
}

export async function kirimNotifikasiTelegram(chatId: string, pesan: string): Promise<boolean> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) return false
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: pesan, parse_mode: 'HTML' }),
    })
    const data = await res.json()
    return data.ok === true
  } catch {
    return false
  }
}

export async function kirimDanLog(opts: NotifOptions): Promise<void> {
  let berhasil = false
  let error: string | undefined

  try {
    if (opts.via === 'whatsapp') {
      berhasil = await kirimNotifikasiWA(opts.noTujuan, opts.pesan)
    } else {
      berhasil = await kirimNotifikasiTelegram(opts.noTujuan, opts.pesan)
    }
  } catch (e) {
    error = String(e)
  }

  await prisma.notifikasiLog.create({
    data: {
      userId: opts.userId,
      jenis: opts.via,
      pesan: opts.pesan,
      noTujuan: opts.noTujuan,
      berhasil,
      error,
    },
  })
}

export function pesanAbsenMasuk(nama: string, waktu: string, status: string): string {
  const statusEmoji = status === 'HADIR' ? '✅' : status === 'TERLAMBAT' ? '⚠️' : '❌'
  return `${statusEmoji} *SiHadir*\n\n${nama} telah absen masuk\nWaktu: ${waktu}\nStatus: ${status}`
}

export function pesanAlpha(nama: string, tanggal: string): string {
  return `❌ *SiHadir - Pemberitahuan*\n\n${nama} belum melakukan absensi pada ${tanggal}.\nMohon segera konfirmasi kehadiran.`
}
