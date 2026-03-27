import { NextResponse } from "next/server"

/** Default when no env is set. */
const DEFAULT_DASHBOARD_URL = "https://v0-real-time-dashboard-delta.vercel.app/nhsca"

/**
 * Redirect only — `/nhsca` is the NHSCA hub page (page.tsx). This path is for sharing a short link.
 * Set NHSCA_LIVE_DASHBOARD_URL in Vercel env for this app (server-only).
 */
export function GET() {
  const url =
    process.env.NHSCA_LIVE_DASHBOARD_URL?.trim() ||
    process.env.NEXT_PUBLIC_NHSCA_LIVE_DASHBOARD_URL?.trim() ||
    DEFAULT_DASHBOARD_URL
  return NextResponse.redirect(url, 307)
}
