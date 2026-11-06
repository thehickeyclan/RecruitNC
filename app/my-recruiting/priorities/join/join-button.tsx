"use client"

import { useState } from "react"

/** The wrestler's tick and button: links their own account to the profile, then opens their questions. */
export function JoinButton({ athleteId, token, consentText, next }: { athleteId: string; token: string; consentText: string; next: string }) {
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const go = async () => {
    setBusy(true)
    setError(null)
    const res = await fetch("/api/recruiting-priorities/invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ a: athleteId, t: token, consent: true }),
    }).catch(() => null)
    if (res?.ok) {
      window.location.assign(next)
      return
    }
    const out = (await res?.json().catch(() => null)) as { error?: string } | null
    setError(out?.error && out.error.includes(" ") ? out.error : "That didn't work. Try again.")
    setBusy(false)
  }
  return (
    <div className="mt-4">
      <label className="flex gap-2 text-xs leading-5 text-white/75">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
        {consentText}
      </label>
      <button type="button" disabled={!agreed || busy} onClick={go} className="mt-4 w-full rounded-lg bg-[#D3B574] px-5 py-3 text-sm font-black text-[#0A1628] disabled:opacity-40">
        {busy ? "One moment" : "This is me. Start my questions"}
      </button>
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
    </div>
  )
}
