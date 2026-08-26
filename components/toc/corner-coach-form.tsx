"use client"

import { useState } from "react"

type Athlete = { athleteId: string; name: string; weightClass: number; club: string | null }
type CoachFields = { coachName: string; coachEmail: string; coachPhone: string; relationship: string }

const EMPTY: CoachFields = { coachName: "", coachEmail: "", coachPhone: "", relationship: "" }

/** The signature the page was opened with — the API verifies it again before writing. */
function tokenFromUrl(): string {
  if (typeof window === "undefined") return ""
  return new URLSearchParams(window.location.search).get("t") ?? ""
}

/**
 * The family's side of coach credentialing.
 *
 * Two coaches, the second optional, and a wrestler chosen by typing a name rather than picked
 * from a list of ninety. Nothing is asked about the athlete: the roster is already public, and a
 * form that interrogates a family before it will accept help is a form they abandon.
 */
export function CornerCoachForm({ athlete }: { athlete: Athlete }) {
  const [coaches, setCoaches] = useState<CoachFields[]>([{ ...EMPTY }])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ athlete: string; saved: number } | null>(null)

  function update(index: number, field: keyof CoachFields, value: string) {
    setCoaches((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)))
  }

  async function submit() {
    const filled = coaches.filter((c) => c.coachName.trim() || c.coachEmail.trim())
    if (filled.length === 0) return setError("Add at least one coach.")

    setBusy(true)
    setError(null)
    try {
      const response = await fetch("/api/toc/coach-designation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId: athlete.athleteId, token: tokenFromUrl(), coaches: filled }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error ?? "Could not save that.")
      setDone({ athlete: data.athlete, saved: data.saved })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that.")
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="mt-8 rounded-xl border border-[#D3B574] bg-[#13294B] p-6">
        <h2 className="text-xl font-bold">Thank you</h2>
        <p className="mt-2 text-[#A8BBD1]">
          We have {done.saved === 1 ? "one coach" : `${done.saved} coaches`} on file for {done.athlete}.
          We will review and email them directly with what they need for check-in.
        </p>
        <button
          type="button"
          onClick={() => { setDone(null); setCoaches([{ ...EMPTY }]) }}
          className="mt-5 rounded-lg border border-[#1a3a5f] px-5 py-3 text-sm font-semibold"
        >
          Change these coaches
        </button>
      </div>
    )
  }

  const label = "mb-1 block text-xs font-bold uppercase tracking-wider text-[#6B829D]"
  const input =
    "w-full rounded-lg border border-[#1a3a5f] bg-[#0f1c2e] px-4 py-3 text-white placeholder-[#6B829D] focus:border-[#D3B574] focus:outline-none"

  return (
    <div className="mt-8 flex flex-col gap-6">
      {coaches.map((coach, index) => (
        <fieldset key={index} className="rounded-xl border border-[#1a3a5f] bg-[#0f1c2e] p-5">
          <legend className="px-2 text-sm font-bold text-[#D3B574]">
            Coach {index + 1}
            {index === 1 ? <span className="font-normal text-[#6B829D]"> (optional)</span> : null}
          </legend>
          <div className="flex flex-col gap-4">
            <div>
              <label className={label} htmlFor={`name-${index}`}>Full name</label>
              <input id={`name-${index}`} value={coach.coachName} className={input}
                onChange={(e) => update(index, "coachName", e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor={`email-${index}`}>Email</label>
              <input id={`email-${index}`} type="email" inputMode="email" value={coach.coachEmail} className={input}
                onChange={(e) => update(index, "coachEmail", e.target.value)} />
              <p className="mt-1 text-xs text-[#6B829D]">This is how we send them their credential details.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={label} htmlFor={`phone-${index}`}>Phone</label>
                <input id={`phone-${index}`} type="tel" inputMode="tel" value={coach.coachPhone} className={input}
                  onChange={(e) => update(index, "coachPhone", e.target.value)} />
              </div>
              <div>
                <label className={label} htmlFor={`rel-${index}`}>Club or school</label>
                <input id={`rel-${index}`} value={coach.relationship} className={input} placeholder="Darkhorse"
                  onChange={(e) => update(index, "relationship", e.target.value)} />
              </div>
            </div>
          </div>
        </fieldset>
      ))}

      {coaches.length < 2 ? (
        <button
          type="button"
          onClick={() => setCoaches((prev) => [...prev, { ...EMPTY }])}
          className="rounded-lg border border-[#1a3a5f] px-5 py-3 text-sm font-semibold text-[#D3B574]"
        >
          Add a second coach
        </button>
      ) : null}

      {error ? <p className="rounded-lg bg-[#BC0B03]/15 px-4 py-3 text-sm text-[#ff9d97]">{error}</p> : null}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy}
        className="rounded-xl bg-[#D3B574] px-6 py-4 text-base font-bold text-[#0A1628] disabled:opacity-50"
      >
        {busy ? "Saving…" : "Submit coaches"}
      </button>
    </div>
  )
}
