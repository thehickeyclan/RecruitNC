const WP_ORIGIN = "https://ncwrestlingunited.com";

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
