"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Star } from "lucide-react"

/**
 * Star a wrestler from the report (Matt, 26 Oct 2026: "so if they weren't originally on the coach
 * list they can add"). The same star as everywhere else (/api/coach-portal/star,
 * college_coach_stars), so the report and My Recruits stay one list. A wrestler a staffmate starred
 * is shown as the program's recruit and is not this coach's to remove.
 */
export function ReportStarButton({ athleteId, name, mine, staff, readOnly }: {
  athleteId: string; name: string; mine: boolean; staff: boolean; readOnly: boolean
}) {
  const router = useRouter()
  const [starred, setStarred] = useState(mine)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const yours = starred || staff

  async function toggle() {
    if (busy || readOnly) return
    setBusy(true)
    setFailed(false)
    try {
      const res = await fetch("/api/coach-portal/star", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ athleteId }) })
      if (!res.ok) throw new Error(String(res.status))
      const data = (await res.json()) as { action?: string }
      setStarred(data.action === "added")
      router.refresh()
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  if (yours && !starred) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#fff6d6] px-2 py-0.5 text-[11px] font-bold text-[#7a5d12]">
        <Star className="h-3.5 w-3.5 fill-[#f5c518] text-[#f5c518]" aria-hidden /> Your recruit · starred by your staff
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy || readOnly}
      aria-pressed={starred}
      title={failed ? "Could not save — try again" : starred ? `Remove ${name} from your recruits` : `Add ${name} to your recruits`}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold transition ${
        failed ? "border border-red-300 text-red-600"
          : starred ? "bg-[#fff6d6] text-[#7a5d12] hover:bg-[#ffefb3]"
          : "border border-gray-300 text-gray-600 hover:border-[#d4af55] hover:text-[#7a5d12] print:hidden"
      } ${busy ? "opacity-60" : ""}`}
    >
      <Star className={`h-3.5 w-3.5 ${starred ? "fill-[#f5c518] text-[#f5c518]" : ""}`} aria-hidden />
      {failed ? "Try again" : starred ? "Your recruit" : "Add to my recruits"}
    </button>
  )
}
