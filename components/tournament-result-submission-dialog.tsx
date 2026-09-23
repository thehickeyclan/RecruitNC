"use client"

import { useState, type FormEvent } from "react"
import { Trophy } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * "Submit a result" — the companion to "Submit a win".
 *
 * A win tells us about one bout. This tells us about a tournament, and it exists because our
 * coverage has known shapes of hole that no amount of code will fill:
 *
 * - Ironman, Beast of the East and Powerade are not ingested at all.
 * - NHSCA Duals and AAU are ingested for NC United squads only, so a wrestler who travelled
 *   with another program leaves no trace.
 * - 67 of 343 wrestlers with match data have one season on file — transfers arrive with a
 *   career we cannot see.
 *
 * Every one of those makes an absence look like a fact about the wrestler. The family is the
 * only party who can close that gap, so this is the form that lets them.
 *
 * Same pipeline as the win: an edit request, reviewed by a person before anything is published.
 */
type ResultForm = {
  event: string
  date: string
  weight: string
  placement: string
  record: string
  team: string
  proof: string
}

const EMPTY_FORM: ResultForm = { event: "", date: "", weight: "", placement: "", record: "", team: "", proof: "" }

export function TournamentResultSubmissionDialog({ athleteId }: { athleteId: string }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<ResultForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const update = (field: keyof ResultForm, value: string) => setForm((current) => ({ ...current, [field]: value }))

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      const description = [
        `${form.event}${form.date ? ` (${form.date})` : ""}`,
        form.weight ? `at ${form.weight}` : "",
        form.placement ? `placed ${form.placement}` : "did not place",
        form.record ? `record ${form.record}` : "",
        form.team ? `wrestling for ${form.team}` : "",
        form.proof ? `Proof: ${form.proof}` : "",
      ]
        .filter(Boolean)
        .join(" · ")

      const response = await fetch("/api/edit-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId,
          editType: "tournament_result",
          description,
          currentData: { proposedTournamentResult: form },
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Could not submit this result.")

      setSubmitted(true)
      setForm(EMPTY_FORM)
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Could not submit this result.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) {
      setError("")
      setSubmitted(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-rnc-gold/50 px-3 py-1.5 text-xs font-bold text-rnc-gold transition hover:bg-rnc-gold/10"
      >
        <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
        Submit a result
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="border-rnc-gold/30 bg-rnc-surface text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit a tournament result</DialogTitle>
            <DialogDescription className="text-slate-400">
              A tournament we may not carry — Ironman, Beast of the East, Powerade, or duals you wrestled with another
              team. NC United will review it before it appears.
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">
                Thank you. The result was submitted for review.
              </div>
              {/* A wrestler catching up on a missed season has several to add, one form each. */}
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="w-full rounded-lg border border-rnc-gold/50 px-4 py-3 font-bold text-rnc-gold transition hover:bg-rnc-gold/10"
              >
                Submit another result
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="result-event">Tournament</Label>
                <Input id="result-event" required maxLength={160} placeholder="Example: Walsh Ironman" value={form.event} onChange={(e) => update("event", e.target.value)} className="border-rnc-line bg-rnc-ink" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="result-date">Date</Label>
                <Input id="result-date" type="date" required value={form.date} onChange={(e) => update("date", e.target.value)} className="border-rnc-line bg-rnc-ink [color-scheme:dark]" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="result-weight">Weight wrestled</Label>
                <Input id="result-weight" required maxLength={20} placeholder="Example: 132" value={form.weight} onChange={(e) => update("weight", e.target.value)} className="border-rnc-line bg-rnc-ink" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="result-placement">
                  Placement <span className="text-slate-400">(leave blank if you did not place)</span>
                </Label>
                <Input id="result-placement" maxLength={40} placeholder="Example: 3rd" value={form.placement} onChange={(e) => update("placement", e.target.value)} className="border-rnc-line bg-rnc-ink" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="result-record">Record at the event</Label>
                <Input id="result-record" required maxLength={20} placeholder="Example: 4-2" value={form.record} onChange={(e) => update("record", e.target.value)} className="border-rnc-line bg-rnc-ink" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="result-team">
                  Team you wrestled for <span className="text-slate-400">(optional)</span>
                </Label>
                <Input id="result-team" maxLength={120} placeholder="Example: Team NC, or your club" value={form.team} onChange={(e) => update("team", e.target.value)} className="border-rnc-line bg-rnc-ink" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="result-proof">
                  Link to the bracket or results <span className="text-slate-400">(optional, speeds up review)</span>
                </Label>
                <Input id="result-proof" maxLength={400} placeholder="Trackwrestling, FloArena, a results page" value={form.proof} onChange={(e) => update("proof", e.target.value)} className="border-rnc-line bg-rnc-ink" />
              </div>

              {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}

              <button type="submit" disabled={submitting} className="w-full rounded-lg bg-rnc-gold px-4 py-3 font-bold text-rnc-ink transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? "Submitting…" : "Submit for review"}
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
