"use client"

import { useEffect, useState } from "react"

import { CoachProgramField } from "@/components/recruiting/coach-program-field"
import type { CoachProgram } from "@/lib/recruiting/coach-program"

/**
 * Staff set a coach's program in the user editor: men's, women's or both.
 *
 * For every coach who signed up before the question existed. Saves on its own the moment a button
 * is pressed - it lives in the login record, not the profile row the rest of the dialog saves.
 */
export function CoachProgramAdmin({ userId }: { userId: string }) {
  const [program, setProgram] = useState<CoachProgram | null>(null)
  const [note, setNote] = useState("Loading…")

  useEffect(() => {
    let live = true
    setNote("Loading…")
    fetch(`/api/coach/program?userId=${encodeURIComponent(userId)}`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!live) return
        setProgram(d?.program ?? null)
        setNote(d ? (d.program ? "" : "Never asked: this coach sees the men's lists first.") : "Could not load.")
      })
      .catch(() => live && setNote("Could not load."))
    return () => {
      live = false
    }
  }, [userId])

  const save = async (next: CoachProgram) => {
    const before = program
    setProgram(next)
    setNote("Saving…")
    const res = await fetch("/api/coach/program", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ program: next, userId }),
    }).catch(() => null)
    if (res?.ok) setNote("Saved. Takes effect the next time they open the site.")
    else {
      setProgram(before)
      setNote("Could not save that.")
    }
  }

  return (
    <div>
      <CoachProgramField value={program} onChange={save} />
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
    </div>
  )
}
