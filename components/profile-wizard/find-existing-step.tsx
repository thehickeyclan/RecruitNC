"use client"

import { useCallback, useEffect, useState } from "react"

export type ExistingMatch = {
  id: string
  name: string
  highSchool: string | null
  graduationYear: number | null
  weightClass: string | null
  club: string | null
  photoUrl: string | null
  claimed: boolean
  claimedByYou: boolean
  emailMatchesAccount: boolean
}

/**
 * The first step of creating a profile: making sure you do not already have one.
 *
 * Most wrestlers on RecruitNC never signed up. NC United created their profile because rankings
 * needed it, and nobody told them — 292 of 421 have no owner. So the person in front of this form
 * usually is not creating anything; they are looking for something that already exists and does
 * not know it. Asking first is also what stops the next Jacob-and-Jake McCord, one boy entered
 * twice because a form was easier to find than a search.
 */
export function FindExistingStep({
  onClaim,
  onCreateNew,
  initialName = "",
}: {
  onClaim: (match: ExistingMatch) => void
  onCreateNew: (typedName: string) => void
  initialName?: string
}) {
  const [name, setName] = useState(initialName)
  const [matches, setMatches] = useState<ExistingMatch[] | null>(null)
  const [searching, setSearching] = useState(false)

  const search = useCallback(async (value: string) => {
    const q = value.trim()
    if (q.length < 2) {
      setMatches(null)
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/profiles/find-existing?q=${encodeURIComponent(q)}`)
      const data = (await res.json()) as { matches?: ExistingMatch[] }
      setMatches(data.matches ?? [])
    } catch {
      setMatches([])
    } finally {
      setSearching(false)
    }
  }, [])

  /** Debounced, so a typed name is one request rather than one per keystroke. */
  useEffect(() => {
    const timer = window.setTimeout(() => void search(name), 300)
    return () => window.clearTimeout(timer)
  }, [name, search])

  const searched = matches !== null && !searching && name.trim().length >= 2

  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border border-white/10 bg-[#0f1c2e] p-6 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D3B574]">Step 1 of 2</p>
      <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">Let&apos;s find you first</h1>
      <p className="mt-3 text-white/70">
        We build profiles for ranked North Carolina wrestlers, so yours may already be here. Search your name
        before creating a new one.
      </p>

      <label className="mt-6 block">
        <span className="mb-2 block text-sm font-semibold text-white">Your full name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Jacob McCord"
          autoComplete="name"
          autoFocus
          className="w-full rounded-lg border border-white/10 bg-[#0A1628] px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#D3B574]"
        />
      </label>

      {searching ? <p className="mt-4 text-sm text-white/50">Searching…</p> : null}

      {matches && matches.length > 0 ? (
        <ul className="mt-5 space-y-2">
          {matches.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onClaim(m)}
                className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-[#0A1628] p-3 text-left hover:border-[#D3B574]/60"
              >
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- athlete photos come from mixed hosts
                  <img src={m.photoUrl} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
                ) : (
                  <span className="h-12 w-12 shrink-0 rounded bg-white/5" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-white">{m.name}</span>
                  <span className="block truncate text-sm text-white/55">
                    {[m.highSchool, m.graduationYear ? `Class of ${m.graduationYear}` : null, m.club]
                      .filter(Boolean)
                      .join(" · ") || "No details on file"}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-[#D3B574]">
                  {m.claimedByYou ? "Yours" : m.claimed ? "Claimed" : "That's me"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {searched && matches?.length === 0 ? (
        <p className="mt-5 rounded-lg border border-white/10 bg-[#0A1628] px-4 py-4 text-sm text-white/70">
          No profile found for <span className="font-semibold text-white">{name.trim()}</span>. Create a new one below.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => onCreateNew(name.trim())}
        disabled={name.trim().length < 2}
        className="mt-6 w-full rounded-lg border border-white/15 px-6 py-3 font-semibold text-white hover:border-[#D3B574]/60 disabled:opacity-40"
      >
        {matches && matches.length > 0 ? "None of these are me — create a new profile" : "Create a new profile"}
      </button>
    </div>
  )
}
