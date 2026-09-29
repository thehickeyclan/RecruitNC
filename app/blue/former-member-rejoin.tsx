"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type Membership = { athleteName: string; status: string }

/**
 * "Welcome back" for a family whose Blue membership has ended.
 *
 * This page's only way in is the interest form, meant for new families. A parent whose card
 * expired and whose membership lapsed landed here, filled it in, and waited - the app and the
 * profile both sent them here. A former member is not a prospect: registration is open to them
 * straight away, so point them at it. Shows nothing to anyone else.
 */
export function FormerMemberRejoin() {
  const [names, setNames] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    fetch("/api/blue/my-memberships", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { memberships?: Membership[] } | null) => {
        if (cancelled || !data?.memberships) return
        const current = new Set(
          data.memberships
            .filter((m) => ["active", "paused", "pending_payment"].includes(m.status))
            .map((m) => m.athleteName),
        )
        // Graduated wrestlers ("alumni") are not coming back; only a lapsed membership is.
        const lapsed = data.memberships
          .filter((m) => m.status === "cancelled" && !current.has(m.athleteName))
          .map((m) => m.athleteName)
        setNames([...new Set(lapsed)])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (!names.length) return null

  return (
    <div className="mb-8 rounded-xl border-2 border-[#D3B574] bg-[#03154C] p-5 text-white">
      <p className="text-lg font-semibold">Welcome back</p>
      <p className="mt-1 text-sm text-white/80">
        {names.join(" and ")}&apos;s Blue membership has ended. You don&apos;t need to fill in the interest
        form again. Rejoin now with a current card.
      </p>
      <Link
        href="/blue/register"
        className="mt-4 inline-flex items-center rounded-md bg-[#D3B574] px-4 py-2 text-sm font-semibold text-[#03154C] hover:bg-[#c5a84d]"
      >
        Rejoin Blue
      </Link>
    </div>
  )
}
