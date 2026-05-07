"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

function dollarsToCents(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  const n = Number.parseFloat(t.replace(/,/g, ""))
  if (!Number.isFinite(n) || n <= 0) return null
  const cents = Math.round(n * 100)
  return cents >= 1 ? cents : null
}

export function AdminTrainingFundAllocationForm({
  scholarshipId,
  scholarshipSlug,
  scholarshipName,
}: {
  scholarshipId: string
  scholarshipSlug: string
  scholarshipName: string
}) {
  const router = useRouter()
  const [amountDollars, setAmountDollars] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const amountCents = dollarsToCents(amountDollars)
    if (amountCents == null) {
      setError("Enter a positive dollar amount.")
      return
    }

    setBusy(true)
    try {
      const res = await fetch("/api/admin/scholarships/training-fund-allocation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scholarshipSlug: scholarshipSlug.trim().toLowerCase(),
          amountCents,
          note: note.trim().slice(0, 2000),
        }),
      })
      const data = (await res.json()) as { error?: string; ok?: boolean }
      if (!res.ok) {
        setError(data.error ?? `Request failed (${res.status})`)
        return
      }
      setSuccess(
        `Recorded ${amountDollars.trim().startsWith("$") ? amountDollars.trim() : `$${amountDollars.trim()}`} to ${scholarshipName}.`,
      )
      setAmountDollars("")
      setNote("")
      router.refresh()
    } catch {
      setError("Network error — try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/80 px-4 py-4">
      <h3 className="text-base font-semibold text-gray-900">Training fund → scholarship</h3>
      <p className="mt-1 text-sm text-gray-700">
        Record dollars moving <strong>from</strong> the NC United Training Fund pool <strong>into</strong> this scholarship.
        One row: adds to this scholarship&apos;s public total, counts toward “committed to scholarships” on the training
        fund page, and lowers “available in pool” by the same amount (no Stripe charge).
      </p>
      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <div>
          <label htmlFor={`alloc-amt-${scholarshipId}`} className="block text-xs font-medium text-gray-700">
            Amount (USD)
          </label>
          <input
            id={`alloc-amt-${scholarshipId}`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="1000"
            value={amountDollars}
            onChange={(ev) => setAmountDollars(ev.target.value)}
            className="mt-1 w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </div>
        <div>
          <label htmlFor={`alloc-note-${scholarshipId}`} className="block text-xs font-medium text-gray-700">
            Note (optional)
          </label>
          <textarea
            id={`alloc-note-${scholarshipId}`}
            rows={2}
            placeholder="Board approval, date, reference…"
            value={note}
            onChange={(ev) => setNote(ev.target.value)}
            className="mt-1 w-full max-w-lg rounded border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {success ? <p className="text-sm text-green-800">{success}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Record allocation"}
        </button>
      </form>
    </div>
  )
}
