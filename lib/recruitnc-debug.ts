/**
 * Server / Edge: set in Vercel env (or .env.local):
 *   RECRUITNC_DEBUG=1           — full traces (NHSCA merge, profile bundle, dedupe)
 *   RECRUITNC_DEBUG_NHSCA=1     — NHSCA path only (merge, uniq, bracket dedupe)
 *   RECRUITNC_DEBUG_PROFILE=1   — GET /api/athlete bundle summary only
 *
 * Client (browser F12): add ?debug=1 to view-profile or unified-profile URL, or set
 *   NEXT_PUBLIC_RECRUITNC_DEBUG=1
 *
 * All logs use the [RecruitNC] prefix (filter in Vercel Runtime / browser console).
 */

function truthy(v: string | undefined): boolean {
  return v === "1" || v === "true" || v === "yes"
}

export function recruitNcDebugFull(): boolean {
  return truthy(process.env.RECRUITNC_DEBUG)
}

export function recruitNcDebugNhsca(): boolean {
  return recruitNcDebugFull() || truthy(process.env.RECRUITNC_DEBUG_NHSCA)
}

export function recruitNcDebugProfile(): boolean {
  return recruitNcDebugFull() || truthy(process.env.RECRUITNC_DEBUG_PROFILE)
}

/** NHSCA merge / dedupe / table paths */
export function recruitNcDebugLogNhsca(message: string, data?: Record<string, unknown>): void {
  if (!recruitNcDebugNhsca()) return
  if (data !== undefined) console.log("[RecruitNC]", message, data)
  else console.log("[RecruitNC]", message)
}

/** GET /api/athlete and similar profile bundles */
export function recruitNcDebugLogProfile(message: string, data?: Record<string, unknown>): void {
  if (!recruitNcDebugProfile()) return
  if (data !== undefined) console.log("[RecruitNC]", message, data)
  else console.log("[RecruitNC]", message)
}
