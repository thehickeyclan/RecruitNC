"use client"

import { useEffect, useState } from "react"
import { ArrowRight, Lock, Star } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

/**
 * One slim bar on the public profile for a college coach whose program has this wrestler on its
 * board (Matt, 2 Nov 2026): "In your recruits · {stage} · {n} notes → Open file". It is the only
 * private thing on the profile; the notes, activity and family stay in the file
 * (app/my-recruits/[athleteId]). Renders nothing for anyone else.
 */
export function RecruitFileBar({ athleteId }: { athleteId: string }) {
  const { user } = useAuth()
  const [file, setFile] = useState<{ stage: string; notes: number } | null>(null)
  useEffect(() => {
    if (!user || !athleteId) return
    let cancelled = false
    fetch(`/api/coach-portal/recruit-file?athleteId=${encodeURIComponent(athleteId)}`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { file: null }))
      .then((b: { file: { stage: string; notes: number } | null }) => {
        if (!cancelled) setFile(b.file)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user, athleteId])
  if (!file) return null
  return (
    <a
      href={`/my-recruits/${athleteId}`}
      className="mb-3 mt-3 flex min-h-[44px] items-center justify-between gap-3 rounded-lg border border-[#D3B574]/40 bg-[#D3B574]/10 px-3 py-2 text-sm text-white hover:bg-[#D3B574]/15 lg:mt-0"
    >
      <span className="flex min-w-0 items-center gap-2">
        <Star className="h-4 w-4 shrink-0 fill-[#D3B574] text-[#D3B574]" aria-hidden />
        <span className="truncate">
          <span className="font-bold">In your recruits</span>
          <span className="text-white/70"> · {file.stage} · {file.notes === 1 ? "1 note" : `${file.notes} notes`}</span>
        </span>
        <Lock className="hidden h-3 w-3 shrink-0 text-white/40 sm:block" aria-label="Private to your staff" />
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 font-bold text-[#D3B574]">
        Open file <ArrowRight className="h-4 w-4" aria-hidden />
      </span>
    </a>
  )
}
