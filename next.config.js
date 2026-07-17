const path = require('path')
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: true, // next-pwa v5 tidak kompatibel dengan Next.js 14 App Router
  register: true,
  skipWaiting: true,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src')
    return config
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
}

module.exports = withPWA(nextConfig)
