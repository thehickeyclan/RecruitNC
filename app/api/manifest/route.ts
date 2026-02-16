import { NextResponse } from "next/server"

/**
 * Serves the PWA manifest as a public API route so it never returns 401.
 * Browsers request this without credentials; deployment protection must not block it.
 */
const MANIFEST = {
  name: "NC Wrestling Commits - Prospect Rankings",
  short_name: "NC Wrestling",
  description: "North Carolina wrestling prospect rankings and college commitments",
  start_url: "/",
  display: "standalone",
  background_color: "#001f3f",
  theme_color: "#001f3f",
  orientation: "portrait-primary",
  icons: [
    { src: "/icon-192.jpg", sizes: "192x192", type: "image/jpeg", purpose: "maskable any" },
    { src: "/icon-512.jpg", sizes: "512x512", type: "image/jpeg", purpose: "maskable any" },
  ],
  categories: ["sports", "education"],
  lang: "en-US",
  dir: "ltr",
  scope: "/",
  prefer_related_applications: false,
}

export const dynamic = "force-dynamic"
export const runtime = "edge"

export async function GET() {
  return NextResponse.json(MANIFEST, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
