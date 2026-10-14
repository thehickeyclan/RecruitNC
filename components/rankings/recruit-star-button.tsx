"use client"

import { useState } from "react"
import { Star } from "lucide-react"

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
      className={`absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide shadow-lg backdrop-blur transition ${
        starred
          ? "border-[#D7B95A] bg-[#D7B95A] text-[#060f1f]"
          : "border-white/40 bg-black/60 text-white hover:border-[#D7B95A] hover:text-[#D7B95A]"
      } ${busy ? "opacity-60" : ""}`}
    >
      <Star className={`h-3.5 w-3.5 ${starred ? "fill-[#060f1f]" : ""}`} aria-hidden />
      {failed ? "Retry" : starred ? "My Recruits" : "Add"}
    </button>
  )
}
