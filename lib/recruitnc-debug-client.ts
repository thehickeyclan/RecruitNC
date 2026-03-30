/**
 * Browser-only: `?debug=1` on the URL or NEXT_PUBLIC_RECRUITNC_DEBUG=1 — logs [RecruitNC] to F12 console.
 */

export function recruitNcClientDebugEnabled(): boolean {
  if (typeof window === "undefined") return false
  try {
    if (process.env.NEXT_PUBLIC_RECRUITNC_DEBUG === "1") return true
  } catch {
    /* ignore */
  }
  try {
    return new URLSearchParams(window.location.search).get("debug") === "1"
  } catch {
    return false
  }
}

export function recruitNcClientLog(message: string, data?: Record<string, unknown>): void {
  if (!recruitNcClientDebugEnabled()) return
  if (data !== undefined) console.log("[RecruitNC]", message, data)
  else console.log("[RecruitNC]", message)
}
