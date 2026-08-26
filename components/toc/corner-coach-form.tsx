"use client"

import { useEffect, useState } from "react"

type Athlete = {
  id: string
  name: string
  highSchool: string | null
  graduationYear: number | null
  needsClub: boolean
  needsDob: boolean
}
type CoachFields = { coachName: string; coachEmail: string; coachPhone: string; relationship: string }

const EMPTY: CoachFields = { coachName: "", coachEmail: "", coachPhone: "", relationship: "" }

const LABEL = "mb-1 block text-xs font-bold uppercase tracking-wider text-[#6B829D]"
const INPUT =
  "w-full rounded-lg border border-[#1a3a5f] bg-[#0f1c2e] px-4 py-3 text-white placeholder-[#6B829D] focus:border-[#D3B574] focus:outline-none"

/**
 * Find your wrestler, fill any gaps we have, name up to two coaches.
 *
 * The search covers every RecruitNC athlete rather than the TOC field, so it cannot be used to
 * work out who is competing. Only the gaps we actually have are asked for — a form that asks a
 * parent to retype what we already hold is a form they resent.
 */
export function CornerCoachForm() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Athlete[]>([])
  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [club, setClub] = useState("")
  const [dob, setDob] = useState("")
  const [coaches, setCoaches] = useState<CoachFields[]>([{ ...EMPTY }])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ athlete: string; saved: number } | null>(null)

  useEffect(() => {
    const q = query.trim()
    if (athlete || q.length < 2) return setResults([])
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/toc/athlete-lookup?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setResults(data.athletes ?? [])
      } catch {
        setResults([])
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [query, athlete])

  function update(index: number, field: keyof CoachFields, value: string) {
    setCoaches((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)))
  }

  async function submit() {
    if (!athlete) return setError("Choose your wrestler.")
    const filled = coaches.filter((c) => c.coachName.trim())
    if (filled.length === 0) return setError("Add at least one coach.")

    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/toc/coach-designation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: athlete.id,
          coaches: filled,
          submittedClub: club.trim() || undefined,
          submittedDob: dob.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Could not save that.")
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
          We will review and contact them directly with what they need for check-in.
        </p>
        {athlete ? (
          <a
            href={`/athletes/${athlete.id}`}
            className="mt-5 inline-block rounded-lg bg-[#D3B574] px-5 py-3 text-sm font-bold text-[#0A1628]"
          >
            Update {done.athlete.split(" ")[0]}&apos;s recruiting profile
          </a>
        ) : null}
      </div>
    )
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div>
        <label className={LABEL} htmlFor="wrestler">Your wrestler</label>
        {athlete ? (
          <div className="flex items-center justify-between rounded-lg border border-[#D3B574] bg-[#13294B] px-4 py-3">
            <span className="font-semibold">
              {athlete.name}
              {athlete.highSchool ? <span className="text-[#A8BBD1]"> · {athlete.highSchool}</span> : null}
            </span>
            <button
              type="button"
              onClick={() => { setAthlete(null); setQuery(""); setClub(""); setDob("") }}
              className="text-sm text-[#D3B574] underline"
            >
              Change
            </button>
          </div>
        ) : (
          <>
            <input
              id="wrestler"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Start typing their name"
              className={INPUT}
              autoComplete="off"
            />
            {results.length > 0 ? (
              <ul className="mt-2 overflow-hidden rounded-lg border border-[#1a3a5f]">
                {results.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => setAthlete(a)}
                      className="flex w-full items-center justify-between bg-[#0f1c2e] px-4 py-3 text-left hover:bg-[#13294B]"
                    >
                      <span className="font-semibold">{a.name}</span>
                      <span className="text-sm text-[#6B829D]">
                        {[a.highSchool, a.graduationYear ? `'${String(a.graduationYear).slice(2)}` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>

      {/* Only the gaps. Everything else we already hold, and asking again wastes their time. */}
      {athlete?.needsClub ? (
        <div>
          <label className={LABEL} htmlFor="club">Wrestling club</label>
          <input id="club" value={club} onChange={(e) => setClub(e.target.value)} className={INPUT}
            placeholder="Darkhorse" />
          <p className="mt-1 text-xs text-[#6B829D]">We do not have a club on file for {athlete.name}.</p>
        </div>
      ) : null}

      {athlete?.needsDob ? (
        <div>
          <label className={LABEL} htmlFor="dob">Date of birth (optional)</label>
          <input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={INPUT} />
        </div>
      ) : null}

      {athlete ? (
        <div className="rounded-xl border border-[#D3B574]/40 bg-[#13294B] p-5">
          <p className="text-sm font-bold text-[#D3B574]">While you are here</p>
          <p className="mt-2 text-sm leading-relaxed text-[#A8BBD1]">
            College coaches read {athlete.name.split(" ")[0]}&apos;s RecruitNC profile directly. A
            cell number, GPA and academic interests are the fields they look for first, and a
            profile without them is easy to pass over.
          </p>
          <a
            href={`/athletes/${athlete.id}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm font-bold text-[#D3B574] underline"
          >
            Open the recruiting profile
          </a>
        </div>
      ) : null}

      {coaches.map((coach, index) => (
        <fieldset key={index} className="rounded-xl border border-[#1a3a5f] bg-[#0f1c2e] p-5">
          <legend className="px-2 text-sm font-bold text-[#D3B574]">
            Coach {index + 1}
            {index === 1 ? <span className="font-normal text-[#6B829D]"> (optional)</span> : null}
          </legend>
          <div className="flex flex-col gap-4">
            <div>
              <label className={LABEL} htmlFor={`name-${index}`}>Full name</label>
              <input id={`name-${index}`} value={coach.coachName} className={INPUT}
                onChange={(e) => update(index, "coachName", e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL} htmlFor={`email-${index}`}>Email</label>
                <input id={`email-${index}`} type="email" inputMode="email" value={coach.coachEmail}
                  className={INPUT} onChange={(e) => update(index, "coachEmail", e.target.value)} />
              </div>
              <div>
                <label className={LABEL} htmlFor={`phone-${index}`}>Mobile</label>
                <input id={`phone-${index}`} type="tel" inputMode="tel" value={coach.coachPhone}
                  className={INPUT} onChange={(e) => update(index, "coachPhone", e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-[#6B829D]">Either one is enough — it is how we tell them they are credentialed.</p>
            <div>
              <label className={LABEL} htmlFor={`rel-${index}`}>Club or school</label>
              <input id={`rel-${index}`} value={coach.relationship} className={INPUT} placeholder="Darkhorse"
                onChange={(e) => update(index, "relationship", e.target.value)} />
            </div>
          </div>
        </fieldset>
      ))}

      {coaches.length < 2 ? (
        <button type="button" onClick={() => setCoaches((prev) => [...prev, { ...EMPTY }])}
          className="rounded-lg border border-[#1a3a5f] px-5 py-3 text-sm font-semibold text-[#D3B574]">
          Add a second coach
        </button>
      ) : null}

      {error ? <p className="rounded-lg bg-[#BC0B03]/15 px-4 py-3 text-sm text-[#ff9d97]">{error}</p> : null}

      <button type="button" onClick={() => void submit()} disabled={busy}
        className="rounded-xl bg-[#D3B574] px-6 py-4 text-base font-bold text-[#0A1628] disabled:opacity-50">
        {busy ? "Saving…" : "Submit coaches"}
      </button>
    </div>
  )
}
