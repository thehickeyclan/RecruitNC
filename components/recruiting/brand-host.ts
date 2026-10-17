"use client"

import { useEffect, useState } from "react"

export type BrandHost = "guild" | "national" | null

/**
 * Which pre-launch brand address the page is on, known only in the browser after load. The Guild
 * and RecruitWrestlers parts are rendered only when this says so, so app.ncwrestlingunited.com's
 * HTML and the code it loads carry no trace of an unannounced brand (Matt, 16 Oct 2026).
 */
export function useBrandHost(): BrandHost {
  const [host, setHost] = useState<BrandHost>(null)
  useEffect(() => {
    const h = window.location.hostname.toLowerCase()
    setHost(h === "recruit.wrestlingguild.com" ? "guild" : /(^|\.)recruitwrestlers\.com$/.test(h) ? "national" : null)
  }, [])
  return host
}
