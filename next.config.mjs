const WP_ORIGIN = "https://ncwrestlingunited.com";

/**
 * Store prefetch: Next.js has no global prefetch disable. We avoid "store (canceled)"
 * requests by using StoreNavLink (no <a href="/store">) and StoreLink (prefetch={false})
 * for all /store and /store/* links. See components/store-nav-link.tsx and store-link.tsx.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "hebbkx1anhila5yf.public.blob.vercel-storage.com", port: "", pathname: "/**" },
    ],
  },
  experimental: {
    lightningCss: false,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Allow WordPress to embed this app in an iframe
          { 
            key: "Content-Security-Policy", 
            value: `frame-ancestors 'self' ${WP_ORIGIN}` 
          }
          // Do NOT set X-Frame-Options - it conflicts with CSP
        ],
      },
    ];
  },
}

export default nextConfig
