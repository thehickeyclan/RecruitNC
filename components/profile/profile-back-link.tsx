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
  [/^\/compare/, "Compare"],
  [/^\/inbox/, "Messages"],
  [/^\/athletes/, "Commitments"],
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
  const [cameFrom, setCameFrom] = useState<string | null>(null)

  useEffect(() => {
    try {
      const ref = document.referrer ? new URL(document.referrer) : null
      if (ref && ref.origin === window.location.origin && !ref.pathname.startsWith("/view-profile") && !ref.pathname.startsWith("/auth")) {
        setCameFrom(placeName(ref.pathname))
      }
    } catch {
      // No usable referrer: the fallback below.
    }
  }, [])

  const fallback = coach ? { href: "/coach-home", label: "Coach Home" } : { href: "/prospects/all", label: "Athletes" }
  const label = cameFrom ?? fallback.label

  return (
    <a
      href={fallback.href}
      onClick={(e) => {
        if (!cameFrom) return
        e.preventDefault()
        window.history.back()
      }}
      className={className}
    >
      <ArrowLeft className="h-4 w-4" />
      Back to {label}
    </a>
  )
}
