import { NextResponse } from "next/server"

/**
 * Web app manifest for /spartan only. Parent layout on /spartan links here so
 * "Add to Home Screen" / installed PWA opens the campaign page, not the site root.
 * Must stay public (no auth) like /api/manifest.
 */
const MANIFEST = {
  id: "/spartan",
  name: "Team NC × Spartan — Fayetteville 2026",
  short_name: "Team NC × Spartan",
  description:
    "Race with Team NC, sponsor a wrestler, or give to NC United — tax-deductible. Fayetteville May 2–3, 2026.",
  start_url: "/spartan",
  scope: "/",
  display: "standalone",
  background_color: "#0a0a0a",
  theme_color: "#0a0a0a",
  orientation: "portrait-primary",
  icons: [
    { src: "/images/spartan-app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable any" },
    { src: "/images/spartan-app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  ],
  categories: ["sports", "fitness", "lifestyle"],
  lang: "en-US",
  dir: "ltr",
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
