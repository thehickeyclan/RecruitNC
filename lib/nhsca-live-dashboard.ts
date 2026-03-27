/** Server redirect target is `app/nhsca-live/route.ts`. `/nhsca` stays the NHSCA hub page. */
export const NHSCA_LIVE_PATH = "/nhsca-live" as const

/** Prefer `NEXT_PUBLIC_APP_URL` (this app’s origin) so the CTA resolves correctly when set on Vercel. */
export function nhscaLiveEntryHref(): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "")
  return base ? `${base}${NHSCA_LIVE_PATH}` : NHSCA_LIVE_PATH
}
