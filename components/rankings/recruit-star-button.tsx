"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { SUPER32_2026, super32NoticeActive } from "@/lib/recruiting/super32-report"

/**
 * One tap to put a ranked wrestler on My Recruits, from the board itself (Matt, 14 October 2026).
 *
 * The old rankings table had this star; the card boards that replaced it did not, so a coach
 * reading a board had to open each profile to save anyone. Same endpoint and table as before
 * (/api/coach-portal/star, `college_coach_stars`), so the star and My Recruits stay one list.
 */
export function RecruitStarButton({ athleteId, name, initiallyStarred }: { athleteId: string; name: string; initiallyStarred: boolean }) {
  const [starred, setStarred] = useState(initiallyStarred)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function toggle(event: React.MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    if (busy) return
    setBusy(true)
    setFailed(false)
    try {
      const response = await fetch("/api/coach-portal/star", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId }),
      })
      if (!response.ok) throw new Error(String(response.status))
      const data = (await response.json()) as { action?: string }
      setStarred(data.action === "added")
      // Tell the coach what a star now gets them, while the Super 32 promise runs.
      if (data.action === "added" && super32NoticeActive()) {
        toast({ title: "Added to My Recruits", description: `You'll get a ${SUPER32_2026.name} report on this wrestler within ${SUPER32_2026.reportWithinHours} hours of the finals.` })
      }
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  const label = starred ? `On My Recruits — remove ${name}` : `Add ${name} to My Recruits`
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      title={failed ? "Could not save — try again" : label}
      aria-label={label}
      aria-pressed={starred}
      // Top-right of the photo, the corner people look to save something. Icon only: the label is
      // in the tooltip and for screen readers, and a word there would sit across faces.
      className={`absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-lg backdrop-blur transition ${
        failed
          ? "border-red-300 bg-black/70 text-red-300"
          : starred
            ? "border-[#D7B95A] bg-[#D7B95A] text-[#060f1f]"
            : "border-white/50 bg-black/55 text-white hover:border-[#D7B95A] hover:text-[#D7B95A]"
      } ${busy ? "opacity-60" : ""}`}
    >
      <Star className={`h-[18px] w-[18px] ${starred ? "fill-[#060f1f]" : ""}`} aria-hidden />
    </button>
  )
}
