"use client"

import { useEffect } from "react"
import { FIRST_TOUCH_COOKIE, FIRST_TOUCH_MAX_AGE_DAYS, classifyFirstTouch, encodeFirstTouch } from "@/lib/traffic-source"

/**
 * Remembers where this browser first came from (lib/traffic-source.ts). Written once and never
 * overwritten, so a family who found us on Instagram and came back a week later by typing the
 * address still counts as Instagram when they claim.
 */
export function FirstTouch() {
  useEffect(() => {
    try {
      if (document.cookie.split(/;\s*/).some((c) => c.startsWith(`${FIRST_TOUCH_COOKIE}=`))) return
      const q = new URLSearchParams(window.location.search)
      const touch = classifyFirstTouch({
        utmSource: q.get("utm_source"),
        utmMedium: q.get("utm_medium"),
        utmCampaign: q.get("utm_campaign"),
        src: q.get("src"),
        referrer: document.referrer,
        landing: window.location.pathname,
        at: new Date().toISOString(),
      })
      const secure = window.location.protocol === "https:" ? "; Secure" : ""
      document.cookie = `${FIRST_TOUCH_COOKIE}=${encodeFirstTouch(touch)}; Path=/; Max-Age=${FIRST_TOUCH_MAX_AGE_DAYS * 86400}; SameSite=Lax${secure}`
    } catch {
      /* A blocked cookie only loses the label. */
    }
  }, [])
  return null
}
