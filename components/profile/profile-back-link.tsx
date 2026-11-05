"use client"

import { useEffect, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { usesRecruitingShell } from "@/lib/recruiting/brand"

/**
 * The way back from a profile: to the page the reader came from, named.
 *
 * It always said "Back to Athletes" and went there, wherever a coach had been - so a coach who
 * opened a wrestler from the 2028 rankings or from Coach Home was sent somewhere else when he went
 * back, and had to find his place again. Now it returns to that page and says which it is. With
 * no page of ours to return to (a shared link), a coach goes to Coach Home and anyone else to
 * Athletes.
 */
const PLACES: Array<[RegExp, string]> = [
  [/^\/coach-home/, "Coach Home"],
  [/^\/public-rankings\/college-prospects/, "Top 75"],
  [/^\/public-rankings\/(\d{4})/, "Class of $1 rankings"],
  [/^\/public-rankings|^\/rankings/, "Rankings"],
  [/^\/prospects/, "Athletes"],
  [/^\/my-recruits/, "My Recruits"],
  [/^\/recently-claimed/, "Recently Claimed"],
  [/^\/interested/, "Interested"],
  [/^\/coach-reports/, "Reports"],
  [/^\/perfect-recruit/, "Perfect Recruit"],
  [/^\/compare/, "Compare"],
  [/^\/inbox/, "Messages"],
  [/^\/college-commitments/, "Commitments"],
]

function placeName(path: string): string | null {
  for (const [pattern, name] of PLACES) {
    const m = path.match(pattern)
    if (m) return name.replace("$1", m[1] ?? "")
  }
  return null
}

export function ProfileBackLink({ className }: { className?: string }) {
  const { profile } = useAuth()
  const coach = usesRecruitingShell(profile)
  const [back, setBack] = useState<{ href: string; label: string } | null>(null)

  useEffect(() => {
    // A profile, its /athletes/<id> redirect and the sign-in pages are hops, never the place to return to.
    const hop = (path: string) => /^\/(athletes\/|view-profile|auth)/.test(path)
    try {
      // The newest page of ours in this tab's trail (recorded by AppChrome).
      const trail: string[] = JSON.parse(window.sessionStorage.getItem("nav:trail") ?? "[]")
      for (const href of [...trail].reverse()) {
        if (hop(href)) continue
        const label = placeName(href.split("?")[0]!)
        if (label) setBack({ href, label })
        return
      }
    } catch {}
    try {
      // A first load in this tab: the referrer is all there is.
      const ref = document.referrer ? new URL(document.referrer) : null
      const label = ref && ref.origin === window.location.origin && !hop(ref.pathname) ? placeName(ref.pathname) : null
      if (ref && label) setBack({ href: ref.pathname + ref.search, label })
    } catch {
      // No usable referrer: the fallback below.
    }
  }, [])

  const fallback = coach ? { href: "/coach-home", label: "Coach Home" } : { href: "/prospects/all", label: "Athletes" }
  const { href, label } = back ?? fallback

  return (
    <a
      // A link to the page itself, not history.back(): one step back is the /athletes/<id> redirect, which comes straight back here.
      href={href}
      className={className}
    >
      <ArrowLeft className="h-4 w-4" />
      Back to {label}
    </a>
  )
}
