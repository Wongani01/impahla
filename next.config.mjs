/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['192.168.0.192:3000', 'localhost:3000', '10.0.2.2:3000'],
}

export default nextConfig
