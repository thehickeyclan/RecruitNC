"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export type CollegeOption = { id: string; name: string; division: string | null; logoUrl: string | null }

type AthleteHit = {
  id: string
  name: string
  graduationYear: number | null
  highSchool: string | null
  weightClass: string | null
  photoUrl: string | null
}

/**
 * Announcing a college commitment.
 *
 * Five things are asked and no more: who, where, what division, what they will study, and a photo.
 * Everything else the old form re-keyed — graduation year, high school, club, weight, gender — is
 * already on the athlete's profile, and asking again only created versions of it that disagreed.
 *
 * The athlete is chosen from the directory rather than typed, so a submission points at a profile
 * instead of describing one. Someone with no profile is told to make one first; that is the only
 * way the commitment can appear on their page afterwards.
 */
export function CommitmentForm({ colleges }: { colleges: readonly CollegeOption[] }) {
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<AthleteHit[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [athlete, setAthlete] = useState<AthleteHit | null>(null)

  const [collegeId, setCollegeId] = useState("")
  const [major, setMajor] = useState("")
  const [photoUrl, setPhotoUrl] = useState("")
  const [uploading, setUploading] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const college = useMemo(() => colleges.find((c) => c.id === collegeId) ?? null, [colleges, collegeId])

  /** Debounced so a typed name does not fire a request per keystroke. */
  useEffect(() => {
    if (athlete) return
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      setSearched(false)
      return
    }
    setSearching(true)
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/commitments/athlete-search?q=${encodeURIComponent(q)}`)
        const data = (await res.json()) as { athletes?: AthleteHit[] }
        setHits(data.athletes ?? [])
      } catch {
        setHits([])
      } finally {
        setSearching(false)
        setSearched(true)
      }
    }, 250)
    return () => window.clearTimeout(timer)
  }, [query, athlete])

  const upload = useCallback(async (file: File) => {
    setError("")
    if (file.size > 8 * 1024 * 1024) {
      setError("That image is over 8MB — please pick a smaller one.")
      return
    }
    setUploading(true)
    try {
      const body = new FormData()
      body.append("file", file)
      const res = await fetch("/api/blob-upload", { method: "POST", body })
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        setError(data.error || "That photo could not be uploaded. Try another one.")
        return
      }
      setPhotoUrl(data.url)
    } catch {
      setError("That photo could not be uploaded. Try another one.")
    } finally {
      setUploading(false)
    }
  }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    if (!athlete) return setError("Find your name first.")
    if (!college) return setError("Choose the college you committed to.")

    setSubmitting(true)
    try {
      const res = await fetch("/api/submit-commitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: athlete.id,
          firstName: athlete.name.split(" ")[0],
          lastName: athlete.name.split(" ").slice(1).join(" "),
          graduationYear: athlete.graduationYear,
          highSchool: athlete.highSchool,
          weightClass: athlete.weightClass,
          college: college.name,
          division: college.division,
          intendedMajor: major.trim() || null,
          commitPictureUrl: photoUrl || null,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string }
      if (!res.ok || !data.success) {
        setError(data.error || "That did not go through. Please try again.")
        return
      }
      setDone(true)
    } catch {
      setError("That did not go through. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-[#0f1c2e] p-8 text-center">
        <h2 className="text-2xl font-black text-white">Congratulations, {athlete?.name.split(" ")[0]}.</h2>
        <p className="mt-3 text-white/70">
          Your commitment to {college?.name} has been sent to us. We check every one before it goes up, and it will
          appear on your profile and in the commitment feed once it is approved.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-xl rounded-2xl border border-white/10 bg-[#0f1c2e] p-6 shadow-xl sm:p-8">
      <Step n={1} label="Who are you?" />
      {athlete ? (
        <div className="mb-8 flex items-center justify-between gap-4 rounded-lg border border-[#D3B574]/40 bg-[#D3B574]/10 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-bold text-white">{athlete.name}</p>
            <p className="truncate text-sm text-white/60">
              {[athlete.highSchool, athlete.graduationYear ? `Class of ${athlete.graduationYear}` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setAthlete(null)
              setQuery("")
              setHits([])
              setSearched(false)
            }}
            className="shrink-0 text-sm font-semibold text-[#D3B574] underline-offset-2 hover:underline"
          >
            Not you?
          </button>
        </div>
      ) : (
        <div className="mb-8">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Start typing your name"
            autoComplete="off"
            className="w-full rounded-lg border border-white/10 bg-[#0A1628] px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#D3B574]"
          />
          {hits.length > 0 && (
            <ul className="mt-2 divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10 bg-[#0A1628]">
              {hits.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setAthlete(a)}
                    className="block w-full px-4 py-3 text-left hover:bg-white/5"
                  >
                    <span className="block font-semibold text-white">{a.name}</span>
                    <span className="block text-sm text-white/55">
                      {[a.highSchool, a.graduationYear ? `Class of ${a.graduationYear}` : null].filter(Boolean).join(" · ") ||
                        "No school on file"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searched && !searching && hits.length === 0 && query.trim().length >= 2 && (
            <div className="mt-3 rounded-lg border border-white/10 bg-[#0A1628] px-4 py-4">
              <p className="text-sm text-white/80">
                We don&apos;t have a profile for <span className="font-semibold text-white">{query.trim()}</span> yet.
              </p>
              <p className="mt-2 text-sm text-white/55">
                Create one first — a commitment has to attach to a profile so it can appear on your page.
              </p>
              <a
                href="/create-profile"
                className="mt-3 inline-block rounded-lg bg-[#D3B574] px-4 py-2 text-sm font-bold text-[#0A1628] hover:bg-[#e0c68c]"
              >
                Create your profile
              </a>
            </div>
          )}
        </div>
      )}

      <Step n={2} label="Where did you commit?" />
      <select
        value={collegeId}
        onChange={(e) => setCollegeId(e.target.value)}
        disabled={!athlete}
        className="mb-2 w-full rounded-lg border border-white/10 bg-[#0A1628] px-4 py-3 text-white outline-none focus:border-[#D3B574] disabled:opacity-40"
      >
        <option value="">Choose a college</option>
        {colleges.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.division ? ` — ${c.division}` : ""}
          </option>
        ))}
      </select>
      <p className="mb-8 text-xs text-white/45">
        {college?.division
          ? `${college.name} competes in ${college.division}.`
          : "Division is filled in from the college, so you don't have to know it."}
      </p>

      <Step n={3} label="What do you plan to study?" optional />
      <input
        value={major}
        onChange={(e) => setMajor(e.target.value)}
        disabled={!athlete}
        placeholder="Kinesiology, Business, Undecided…"
        className="mb-8 w-full rounded-lg border border-white/10 bg-[#0A1628] px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#D3B574] disabled:opacity-40"
      />

      <Step n={4} label="Signing photo" optional />
      <div className="mb-8">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void upload(f)
          }}
        />
        {photoUrl ? (
          <div className="flex items-center gap-4 rounded-lg border border-white/10 bg-[#0A1628] p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- user upload, arbitrary dimensions */}
            <img src={photoUrl} alt="Your signing photo" className="h-20 w-20 rounded object-cover" />
            <button type="button" onClick={() => setPhotoUrl("")} className="text-sm font-semibold text-[#D3B574] hover:underline">
              Choose a different photo
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={!athlete || uploading}
            onClick={() => fileInput.current?.click()}
            className="w-full rounded-lg border border-dashed border-white/20 bg-[#0A1628] px-4 py-6 text-sm text-white/60 hover:border-[#D3B574]/60 disabled:opacity-40"
          >
            {uploading ? "Uploading…" : "Add a photo from your signing"}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !athlete || !college}
        className="w-full rounded-lg bg-[#D3B574] px-6 py-4 text-lg font-bold text-[#0A1628] transition hover:bg-[#e0c68c] disabled:opacity-40"
      >
        {submitting ? "Sending…" : "Announce my commitment"}
      </button>
      <p className="mt-4 text-center text-xs text-white/45">
        We check every commitment before it is published.
      </p>
    </form>
  )
}

function Step({ n, label, optional }: { n: number; label: string; optional?: boolean }) {
  return (
    <div className="mb-3 flex items-baseline gap-2">
      <span className="text-sm font-bold text-[#D3B574]">{n}</span>
      <span className="font-semibold text-white">{label}</span>
      {optional && <span className="text-xs text-white/40">optional</span>}
    </div>
  )
}
