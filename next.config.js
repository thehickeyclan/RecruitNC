/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ["v0.dev", "w8v0puzioqkz0xzh.public.blob.vercel-storage.com", "hebbkx1anhila5yf.public.blob.vercel-storage.com"],
    remotePatterns: [
      { protocol: "https", hostname: "v0.dev", port: "", pathname: "/**" },
      { protocol: "https", hostname: "w8v0puzioqkz0xzh.public.blob.vercel-storage.com", port: "", pathname: "/**" },
      { protocol: "https", hostname: "hebbkx1anhila5yf.public.blob.vercel-storage.com", port: "", pathname: "/**" },
    ],
    unoptimized: true,
  },
}

module.exports = nextConfig
