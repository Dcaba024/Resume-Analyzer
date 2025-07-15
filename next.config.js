/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      canvas: false,
      path: false,
      stream: false,
    }

    return config
  },
}

module.exports = nextConfig
