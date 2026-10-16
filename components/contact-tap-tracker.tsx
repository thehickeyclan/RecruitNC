"use client"

import { useEffect } from "react"

/**
 * Records a tap on a wrestler's Call, Text or Email link inside an element marked
 * data-contact-athlete="<athlete id>" (the profile's contact row, the scouting report).
 *
 * Coaches find wrestlers here and contact them by phone and email, off the site (Matt, 16 Oct
 * 2026). A tap is the closest signal we have that contact happened. The server keeps it only for a
 * verified college coach (app/api/track/contact-tap); a family tapping its own number is ignored.
 */
const CHANNEL: Array<[string, "call" | "text" | "email"]> = [
  ["tel:", "call"],
  ["sms:", "text"],
  ["mailto:", "email"],
]

export function ContactTapTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target instanceof Element ? e.target : null
      const link = el?.closest("a[href]") as HTMLAnchorElement | null
      const scope = link?.closest("[data-contact-athlete]") as HTMLElement | null
      if (!link || !scope) return
      const href = link.getAttribute("href") ?? ""
      const channel = CHANNEL.find(([prefix]) => href.startsWith(prefix))?.[1]
      const athleteId = scope.dataset.contactAthlete
      if (!channel || !athleteId) return
      const body = JSON.stringify({ athleteId, channel })
      try {
        if (!navigator.sendBeacon?.("/api/track/contact-tap", new Blob([body], { type: "application/json" }))) {
          void fetch("/api/track/contact-tap", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true })
        }
      } catch {}
    }
    document.addEventListener("click", onClick, true)
    return () => document.removeEventListener("click", onClick, true)
  }, [])
  return null
}
