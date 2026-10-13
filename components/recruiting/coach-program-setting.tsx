"use client"

import { useEffect, useState } from "react"

import { CoachProgramField } from "@/components/recruiting/coach-program-field"
import { useAuth } from "@/contexts/auth-context"
import { VIEW_GENDER_COOKIE, coachProgramOf, type CoachProgram } from "@/lib/recruiting/coach-program"
import { createClient } from "@/lib/supabase/client"
import { classifyViewer } from "@/lib/viewer-role"

/**
 * "Which program do you coach?" on a coach's own account page.
 *
 * Every coach who signed up before 13 October 2026 was never asked, and anyone can have been put
 * on the wrong side. Renders nothing for a family, a fan or a high school coach.
 */
export function CoachProgramSetting() {
  const { user, profile } = useAuth()
  const [program, setProgram] = useState<CoachProgram | null>(null)
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle")

  useEffect(() => {
    setProgram(coachProgramOf(user))
  }, [user])

  if (!user || !classifyViewer(profile ?? null).isCollegeCoach) return null

  const save = async (next: CoachProgram) => {
    const before = program
    setProgram(next)
    setState("saving")
    try {
      const res = await fetch("/api/coach/program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ program: next }),
      })
      if (!res.ok) throw new Error("save failed")
      // The program rides in the session; refresh it so the menu and the lists follow at once,
      // and drop the one-tap switch so the new program decides which side opens first.
      await createClient().auth.refreshSession().catch(() => undefined)
      document.cookie = `${VIEW_GENDER_COOKIE}=; path=/; max-age=0; samesite=lax`
      setState("saved")
    } catch {
      setProgram(before)
      setState("error")
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <CoachProgramField value={program} onChange={save} disabled={state === "saving"} />
      <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
        {state === "saved"
          ? "Saved. Your home, rankings and athlete lists now open on that side."
          : state === "error"
            ? "Could not save that. Try again."
            : program
              ? ""
              : "Not set yet. Until you choose, you see the men's lists first."}
      </p>
    </div>
  )
}
