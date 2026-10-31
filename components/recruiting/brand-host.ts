"use client"

import { useEffect, useState } from "react"

export type BrandHost = "guild" | "national" | null

/**
 * Which pre-launch brand address the page is on, known only in the browser after load. The Guild
 * and RecruitWrestlers parts are rendered only when this says so, so app.ncwrestlingunited.com's
 * HTML and the code it loads carry no trace of an unannounced brand (Matt, 16 Oct 2026).
 */
export function useBrandHost(): BrandHost {
  /*
   * On the RecruitWrestlers deployment the answer is known before load (NEXT_PUBLIC_RW_PROJECT, set at
   * build), so its server HTML - what Google and link previews read - names RecruitWrestlers too.
   * NC United's deployment still starts with nothing and learns only in the browser.
   */
  const [host, setHost] = useState<BrandHost>(process.env.NEXT_PUBLIC_RW_PROJECT === "1" ? "national" : null)
  useEffect(() => {
    const h = window.location.hostname.toLowerCase()
    setHost(h === "recruit.wrestlingguild.com" ? "guild" : /(^|\.)recruitwrestlers\.com$/.test(h) ? "national" : null)
  }, [])
  return host
}

/** On recruitwrestlers.com, which carries every live state; NC United's address carries North Carolina only. */
export function useOnRecruitWrestlers(): boolean {
  return useBrandHost() === "national"
}
