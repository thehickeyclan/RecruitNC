"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ClipboardList } from "lucide-react"

import { AppRow } from "@/components/profile/app-profile-rows"
import { CoachNeedsList, programCount } from "@/components/recruiting/coach-needs-list"
import type { FamilyNeed } from "@/lib/recruiting/needs-server"

/**
 * "Programs recruiting your weight and class" on a wrestler's profile, for his family only. Asks
 * its own private route (app/api/athletes/[id]/recruiting-needs); for anyone else, and when no
 * program has posted a need that fits, there is no row.
 */
export function RecruitingNeedsBlock({ athleteId, className }: { athleteId: string; className?: string }) {
  const [needs, setNeeds] = useState<FamilyNeed[] | null>(null)
  useEffect(() => {
    let cancelled = false
    setNeeds(null)
    fetch(`/api/athletes/${athleteId}/recruiting-needs`, { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return
        const body = (await res.json()) as { visible?: boolean; needs?: FamilyNeed[] }
        if (!cancelled && body.visible) setNeeds(body.needs ?? [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [athleteId])

  if (!needs?.length) return null
  return (
    <AppRow
      icon={ClipboardList}
      title="Programs Recruiting Your Weight"
      subtitle={`${programCount(needs)} coach-confirmed ${programCount(needs) === 1 ? "program" : "programs"} · your weight and class`}
      defaultOpen
      className={className}
    >
      <CoachNeedsList needs={needs} />
      <Link href="/my-recruiting/colleges" className="mt-3 inline-block text-[13px] font-bold text-[#D3B574] hover:underline">
        Add to your list, compare costs and reach out in the Command Center
      </Link>
    </AppRow>
  )
}
