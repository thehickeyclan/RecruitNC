"use client"

import { useState, type FormEvent } from "react"
import { Plus } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type WinForm = {
  date: string
  event: string
  opponent: string
  accolade: string
  result: string
}

const EMPTY_FORM: WinForm = { date: "", event: "", opponent: "", accolade: "", result: "" }

export function SignificantWinSubmissionDialog({ athleteId }: { athleteId: string }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<WinForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const update = (field: keyof WinForm, value: string) => setForm((current) => ({ ...current, [field]: value }))

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      const response = await fetch("/api/edit-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId,
          editType: "significant_win",
          description: `${form.opponent} — ${form.result} at ${form.event} on ${form.date}. Opponent accolade: ${form.accolade}`,
          currentData: { proposedSignificantWin: form },
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Could not submit this win.")

      setSubmitted(true)
      setForm(EMPTY_FORM)
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Could not submit this win.")
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
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-rnc-gold/50 px-3 py-1.5 text-xs font-bold text-rnc-gold transition hover:bg-rnc-gold/10"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Submit a win
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="border-rnc-gold/30 bg-rnc-surface text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit a significant win</DialogTitle>
            <DialogDescription className="text-slate-400">
              Send us a win we may have missed. NC United will review it before it appears publicly.
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">
              Thank you. The win was submitted for review.
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="significant-win-date">Date</Label>
                <Input id="significant-win-date" type="date" required value={form.date} onChange={(e) => update("date", e.target.value)} className="border-rnc-line bg-rnc-ink" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="significant-win-event">Tournament or meet</Label>
                <Input id="significant-win-event" required maxLength={160} value={form.event} onChange={(e) => update("event", e.target.value)} className="border-rnc-line bg-rnc-ink" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="significant-win-opponent">Opponent name</Label>
                <Input id="significant-win-opponent" required maxLength={120} value={form.opponent} onChange={(e) => update("opponent", e.target.value)} className="border-rnc-line bg-rnc-ink" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="significant-win-accolade">Opponent accolade</Label>
                <Input id="significant-win-accolade" required maxLength={200} placeholder="Example: GA State Champion" value={form.accolade} onChange={(e) => update("accolade", e.target.value)} className="border-rnc-line bg-rnc-ink" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="significant-win-result">Result</Label>
                <Input id="significant-win-result" required maxLength={100} placeholder="Example: Decision, 6–4" value={form.result} onChange={(e) => update("result", e.target.value)} className="border-rnc-line bg-rnc-ink" />
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
