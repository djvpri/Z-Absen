export interface Koordinat {
  latitude: number
  longitude: number
}

export function hitungJarak(titik1: Koordinat, titik2: Koordinat): number {
  const R = 6371000 // radius bumi dalam meter
  const lat1 = (titik1.latitude * Math.PI) / 180
  const lat2 = (titik2.latitude * Math.PI) / 180
  const dLat = lat2 - lat1
  const dLon = ((titik2.longitude - titik1.longitude) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function dalamRadius(
  posisiUser: Koordinat,
  posisiSekolah: Koordinat,
  radiusMeters: number
): boolean {
  return hitungJarak(posisiUser, posisiSekolah) <= radiusMeters
}

export function ambilLokasi(): Promise<Koordinat> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Browser tidak mendukung GPS'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(new Error(`GPS error: ${err.message}`)),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  })
}
