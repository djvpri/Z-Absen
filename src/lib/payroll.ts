// ── PTKP (Penghasilan Tidak Kena Pajak) 2024 ──────────────────────────────
const PTKP: Record<string, number> = {
  TK0: 54_000_000,
  TK1: 58_500_000,
  TK2: 63_000_000,
  TK3: 67_500_000,
  K0:  58_500_000,
  K1:  63_000_000,
  K2:  67_500_000,
  K3:  72_000_000,
}

// ── PPh 21 tarif progresif ─────────────────────────────────────────────────
export function hitungPPh21(gajiKotorBulanan: number, statusPajak: string): number {
  const ptkp = PTKP[statusPajak] ?? PTKP.TK0
  const penghasilanSetahun = gajiKotorBulanan * 12
  const pkp = Math.max(0, penghasilanSetahun - ptkp)   // Penghasilan Kena Pajak

  let pajak = 0
  if (pkp <= 60_000_000) {
    pajak = pkp * 0.05
  } else if (pkp <= 250_000_000) {
    pajak = 60_000_000 * 0.05 + (pkp - 60_000_000) * 0.15
  } else if (pkp <= 500_000_000) {
    pajak = 60_000_000 * 0.05 + 190_000_000 * 0.15 + (pkp - 250_000_000) * 0.25
  } else {
    pajak = 60_000_000 * 0.05 + 190_000_000 * 0.15 + 250_000_000 * 0.25 + (pkp - 500_000_000) * 0.30
  }

  return Math.round(pajak / 12) // per bulan
}

// ── BPJS Kesehatan ─────────────────────────────────────────────────────────
// Karyawan: 1%, max base 12jt (cap 120rb/bln)
export function hitungBpjsKes(gajiPokok: number): number {
  const base = Math.min(gajiPokok, 12_000_000)
  return Math.round(base * 0.01)
}

// ── BPJS Ketenagakerjaan (karyawan): JHT 2% + JP 1% = 3% ─────────────────
export function hitungBpjsTK(gajiPokok: number): number {
  return Math.round(gajiPokok * 0.03)
}

// ── Hitung lembur ──────────────────────────────────────────────────────────
// Standar: upah sejam = gajiPokok / (173 jam sebulan)
// OT jam 1-7: 1.5x; jam 8+: 2x (Permenaker 78/2015 simplifed)
export function hitungLembur(gajiPokok: number, jamLembur: number): number {
  const upahJam = gajiPokok / 173
  if (jamLembur <= 0) return 0
  const jam17 = Math.min(jamLembur, 7)
  const jam8plus = Math.max(0, jamLembur - 7)
  return Math.round(upahJam * (jam17 * 1.5 + jam8plus * 2))
}

export interface PayrollInput {
  gajiPokok: number
  statusPajak: string
  tunjanganJabatan: number
  tunjanganMakan: number      // per hadir
  tunjanganTransport: number  // per hadir
  jumlahHadir: number
  jumlahTerlambat: number
  jumlahAlpha: number
  jumlahIzin: number
  jumlahHariKerja: number
  lemburJam?: number
  tunjanganLainnya?: Array<{ nama: string; nominal: number }>
  potonganLainnya?: Array<{ nama: string; nominal: number }>
  hitungBpjs?: boolean
  hitungPph?: boolean
}

export interface PayrollResult {
  // Kehadiran
  jumlahHadir: number
  jumlahTerlambat: number
  jumlahAlpha: number
  jumlahIzin: number
  jumlahHariKerja: number
  // Penghasilan
  gajiPokok: number
  tunjanganJabatan: number
  tunjanganHadir: number
  lemburJam: number
  lemburNominal: number
  tunjanganLainnya: Array<{ nama: string; nominal: number }>
  gajiKotor: number
  // Potongan
  potonganAlpha: number
  potonganTerlambat: number
  bpjsKes: number
  bpjsTK: number
  pph21: number
  potonganLainnya: Array<{ nama: string; nominal: number }>
  totalPotongan: number
  takehomePay: number
}

export function hitungPayroll(input: PayrollInput): PayrollResult {
  const {
    gajiPokok, statusPajak, tunjanganJabatan,
    tunjanganMakan, tunjanganTransport,
    jumlahHadir, jumlahTerlambat, jumlahAlpha, jumlahIzin, jumlahHariKerja,
    lemburJam = 0,
    tunjanganLainnya = [],
    potonganLainnya = [],
    hitungBpjs = true,
    hitungPph = true,
  } = input

  // Tunjangan kehadiran (makan + transport per hari hadir)
  const tunjanganHadir = (tunjanganMakan + tunjanganTransport) * jumlahHadir

  // Lembur
  const lemburNominal = hitungLembur(gajiPokok, lemburJam)

  // Total tunjangan tambahan
  const extraTunjangan = tunjanganLainnya.reduce((s, t) => s + t.nominal, 0)

  // Gaji kotor
  const gajiKotor = gajiPokok + tunjanganJabatan + tunjanganHadir + lemburNominal + extraTunjangan

  // Potongan kehadiran (1/26 hari kerja per alpha/terlambat)
  const potonganPerHari = jumlahHariKerja > 0 ? gajiPokok / jumlahHariKerja : 0
  const potonganAlpha = Math.round(potonganPerHari * jumlahAlpha)
  const potonganTerlambat = Math.round((potonganPerHari / 8) * jumlahTerlambat) // 1 jam per keterlambatan

  // Potongan wajib
  const bpjsKes = hitungBpjs ? hitungBpjsKes(gajiPokok) : 0
  const bpjsTK = hitungBpjs ? hitungBpjsTK(gajiPokok) : 0
  const pph21 = hitungPph ? hitungPPh21(gajiKotor, statusPajak) : 0

  // Total potongan
  const extraPotongan = potonganLainnya.reduce((s, p) => s + p.nominal, 0)
  const totalPotongan = potonganAlpha + potonganTerlambat + bpjsKes + bpjsTK + pph21 + extraPotongan

  const takehomePay = Math.max(0, gajiKotor - totalPotongan)

  return {
    jumlahHadir, jumlahTerlambat, jumlahAlpha, jumlahIzin, jumlahHariKerja,
    gajiPokok, tunjanganJabatan, tunjanganHadir,
    lemburJam, lemburNominal, tunjanganLainnya,
    gajiKotor,
    potonganAlpha, potonganTerlambat, bpjsKes, bpjsTK, pph21,
    potonganLainnya,
    totalPotongan, takehomePay,
  }
}

// ── Helper: hitung hari kerja dalam sebulan (Senin–Jumat) ─────────────────
export function hitungHariKerja(tahun: number, bulan: number): number {
  let count = 0
  const last = new Date(tahun, bulan, 0).getDate()
  for (let d = 1; d <= last; d++) {
    const day = new Date(tahun, bulan - 1, d).getDay()
    if (day !== 0 && day !== 6) count++
  }
  return count
}
