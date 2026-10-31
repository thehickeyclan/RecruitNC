"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { COLLEGE_WEIGHTS, PROFILE_CLASS_YEARS, SUBMITTER_ROLE_LABEL, SUBMITTER_ROLES, contactKind, todayInNc, type SubmitterRole } from "@/lib/commitments/intake"

export type CollegeOption = { id: string; name: string; division: string | null; logoUrl: string | null }

export type AthleteHit = {
  id: string
  name: string
  graduationYear: number | null
  highSchool: string | null
  club?: string | null
  college?: string | null
  photoUrl: string | null
}

/**
 * Reporting a college commitment - by the wrestler, a parent, or a coach (Matt, 26 October 2026).
 *
 * It asks only for what we do not already hold. Pick the wrestler and the class, school and club
 * come from the profile and are shown back, not asked. What only the reporter knows is asked: the
 * college, the day it went public, the post. A wrestler we have no profile for can still be
 * reported with the four facts we need to find or make one.
 *
 * Nothing goes live from here. Matt gets a text with a link, approves it on his phone, and the
 * profile, the commitments list and the app alert all follow from that one tap.
 */
const INPUT =
  "w-full rounded-lg border border-white/10 bg-[#0A1628] px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#D3B574]"

export function CommitmentForm({
  colleges,
  initialAthlete = null,
  initialRole = null,
}: {
  colleges: readonly CollegeOption[]
  initialAthlete?: AthleteHit | null
  initialRole?: SubmitterRole | null
}) {
  const [role, setRole] = useState<SubmitterRole | null>(initialRole)

  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<AthleteHit[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [athlete, setAthlete] = useState<AthleteHit | null>(initialAthlete)
  const [noProfile, setNoProfile] = useState(false)
  const [newName, setNewName] = useState("")
  const [newSchool, setNewSchool] = useState("")
  const [newYear, setNewYear] = useState("")
  const [newGender, setNewGender] = useState<"Male" | "Female" | "">("")

  const [collegeQuery, setCollegeQuery] = useState("")
  const [collegeId, setCollegeId] = useState("")
  const [collegeTyped, setCollegeTyped] = useState("")
  const [date, setDate] = useState(todayInNc())
  const [postUrl, setPostUrl] = useState("")

  const [more, setMore] = useState(false)
  const [major, setMajor] = useState("")
  const [collegeWeight, setCollegeWeight] = useState("")
  const [photoUrl, setPhotoUrl] = useState("")
  const [uploading, setUploading] = useState(false)

  const [yourName, setYourName] = useState("")
  const [contact, setContact] = useState("")
  const [website, setWebsite] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const college = useMemo(() => colleges.find((c) => c.id === collegeId) ?? null, [colleges, collegeId])
  const collegeLabel = college?.name ?? collegeTyped
  const self = role === "athlete"

  const collegeHits = useMemo(() => {
    const q = collegeQuery.trim().toLowerCase()
    if (q.length < 2 || college || collegeTyped) return []
    return colleges.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6)
  }, [collegeQuery, colleges, college, collegeTyped])

  /** Debounced so a typed name does not fire a request per keystroke. */
  useEffect(() => {
    if (athlete || noProfile) return
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
  }, [query, athlete, noProfile])

  const upload = useCallback(async (file: File) => {
    setError("")
    if (file.size > 8 * 1024 * 1024) return setError("That image is over 8MB. Please pick a smaller one.")
    setUploading(true)
    try {
      const body = new FormData()
      body.append("file", file)
      const res = await fetch("/api/blob-upload", { method: "POST", body })
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!res.ok || !data.url) return setError(data.error || "That photo could not be uploaded. Try another one.")
      setPhotoUrl(data.url)
    } catch {
      setError("That photo could not be uploaded. Try another one.")
    } finally {
      setUploading(false)
    }
  }, [])

  const wrestlerReady = Boolean(athlete) || (noProfile && newName.trim().split(/\s+/).length >= 2 && newYear)
  const ready = Boolean(role && wrestlerReady && collegeLabel && photoUrl && yourName.trim() && contactKind(contact.trim()))

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    if (!role) return setError("Tell us who you are.")
    if (!wrestlerReady) return setError(noProfile ? "Add the wrestler's full name and class year." : "Find the wrestler first.")
    if (!collegeLabel) return setError("Which college did they commit to?")
    if (!photoUrl) return setError("Add the commitment photo.")
    if (!yourName.trim()) return setError("Add your name.")
    if (!contactKind(contact.trim())) return setError("Add an email or a cell number, so we can tell you when it's live.")

    setSubmitting(true)
    try {
      const res = await fetch("/api/submit-commitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: athlete?.id ?? null,
          athleteName: athlete ? null : newName,
          highSchool: athlete ? null : newSchool,
          graduationYear: athlete ? null : Number(newYear),
          gender: athlete ? null : newGender || null,
          collegeId: college?.id ?? null,
          collegeName: college ? null : collegeTyped,
          commitmentDate: date,
          announcementUrl: postUrl,
          collegeWeightClass: collegeWeight || null,
          intendedMajor: major.trim() || null,
          photoUrl: photoUrl || null,
          photoRequired: true,
          submitterName: yourName,
          submitterRole: role,
          submitterContact: contact,
          website,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string }
      if (!res.ok || !data.success) return setError(data.error || "That did not go through. Please try again.")
      setDone(true)
    } catch {
      setError("That did not go through. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const wrestlerName = athlete?.name ?? newName.trim()
  if (done) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-[#0f1c2e] p-8 text-center">
        <h2 className="text-2xl font-black text-white">{self ? `Congratulations, ${wrestlerName.split(" ")[0]}.` : "Thank you. We have it."}</h2>
        <p className="mt-3 text-white/70">
          {wrestlerName} to {collegeLabel} is with us now. Once we check it, it goes on {self ? "your" : "the"} profile and out to everyone on the
          NC United app, and we&apos;ll {contactKind(contact.trim()) === "phone" ? "text" : "email"} you when it&apos;s live.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-xl rounded-2xl border border-white/10 bg-[#0f1c2e] p-6 shadow-xl sm:p-8">
      {/* Bots fill every field; people never see this one. */}
      <input value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" name="website" />

      <Step n={1} label="Who are you?" />
      <div className="mb-8 flex flex-wrap gap-2">
        {SUBMITTER_ROLES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`rounded-full border px-4 py-2 text-sm font-bold ${role === r ? "border-[#D3B574] bg-[#D3B574] text-[#0A1628]" : "border-white/15 text-white/80 hover:border-[#D3B574]/60"}`}
          >
            {SUBMITTER_ROLE_LABEL[r]}
          </button>
        ))}
      </div>

      <Step n={2} label={self ? "Find your profile" : "Who committed?"} />
      {athlete ? (
        <div className="mb-8 rounded-lg border border-[#D3B574]/40 bg-[#D3B574]/10 px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate font-bold text-white">{athlete.name}</p>
              <p className="text-sm text-white/65">
                {[athlete.highSchool, athlete.graduationYear ? `Class of ${athlete.graduationYear}` : null, athlete.club].filter(Boolean).join(" · ") ||
                  "No school on file"}
              </p>
              <p className="mt-1 text-xs text-white/45">We already have these from the profile. Nothing to retype.</p>
              {athlete.college ? <p className="mt-1 text-sm text-amber-200">The profile already says {athlete.college}. Send this only if that has changed.</p> : null}
            </div>
            <button
              type="button"
              onClick={() => {
                setAthlete(null)
                setQuery("")
                setHits([])
                setSearched(false)
              }}
              className="shrink-0 text-sm font-semibold text-[#D3B574] hover:underline"
            >
              Change
            </button>
          </div>
        </div>
      ) : noProfile ? (
        <div className="mb-8 space-y-3 rounded-lg border border-white/10 bg-[#0A1628] p-4">
          <p className="text-sm text-white/70">No profile yet. These four are all we need to add one.</p>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="First and last name" className={INPUT} />
          <input value={newSchool} onChange={(e) => setNewSchool(e.target.value)} placeholder="High school" className={INPUT} />
          <div className="grid grid-cols-2 gap-3">
            <select value={newYear} onChange={(e) => setNewYear(e.target.value)} className={INPUT}>
              <option value="">Class of…</option>
              {PROFILE_CLASS_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select value={newGender} onChange={(e) => setNewGender(e.target.value as "Male" | "Female" | "")} className={INPUT}>
              <option value="">Boys or girls</option>
              <option value="Male">Boys</option>
              <option value="Female">Girls</option>
            </select>
          </div>
          <button type="button" onClick={() => setNoProfile(false)} className="text-sm font-semibold text-[#D3B574] hover:underline">
            Search again
          </button>
        </div>
      ) : (
        <div className="mb-8">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Start typing the wrestler's name" autoComplete="off" className={INPUT} />
          {hits.length > 0 && (
            <ul className="mt-2 divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10 bg-[#0A1628]">
              {hits.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => setAthlete(a)} className="block w-full px-4 py-3 text-left hover:bg-white/5">
                    <span className="block font-semibold text-white">{a.name}</span>
                    <span className="block text-sm text-white/55">
                      {[a.highSchool, a.graduationYear ? `Class of ${a.graduationYear}` : null, a.club].filter(Boolean).join(" · ") || "No school on file"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searched && !searching && query.trim().length >= 2 ? (
            <button
              type="button"
              onClick={() => {
                setNoProfile(true)
                setNewName(query.trim())
              }}
              className="mt-3 text-sm font-semibold text-[#D3B574] hover:underline"
            >
              {hits.length ? "Not in this list? Add the basics instead" : `No profile for ${query.trim()} yet. Add the basics`}
            </button>
          ) : null}
        </div>
      )}

      <Step n={3} label="Which college?" />
      {college || collegeTyped ? (
        <div className="mb-2 flex items-center justify-between gap-4 rounded-lg border border-[#D3B574]/40 bg-[#D3B574]/10 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            {college?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- college logo
              <img src={college.logoUrl} alt="" className="h-9 w-9 rounded-full bg-white object-contain p-1" />
            ) : null}
            <div className="min-w-0">
              <p className="truncate font-bold text-white">{collegeLabel}</p>
              <p className="text-sm text-white/60">{college?.division ?? "We'll fill in the division."}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setCollegeId("")
              setCollegeTyped("")
            }}
            className="shrink-0 text-sm font-semibold text-[#D3B574] hover:underline"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="mb-2">
          <input value={collegeQuery} onChange={(e) => setCollegeQuery(e.target.value)} placeholder="Start typing the college" autoComplete="off" className={INPUT} />
          {collegeHits.length > 0 || collegeQuery.trim().length >= 3 ? (
            <ul className="mt-2 divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10 bg-[#0A1628]">
              {collegeHits.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setCollegeId(c.id)} className="block w-full px-4 py-3 text-left hover:bg-white/5">
                    <span className="font-semibold text-white">{c.name}</span>
                    {c.division ? <span className="text-sm text-white/50"> · {c.division}</span> : null}
                  </button>
                </li>
              ))}
              {collegeQuery.trim().length >= 3 ? (
                <li>
                  <button type="button" onClick={() => setCollegeTyped(collegeQuery.trim())} className="block w-full px-4 py-3 text-left text-sm text-[#D3B574] hover:bg-white/5">
                    Use &ldquo;{collegeQuery.trim()}&rdquo;
                  </button>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      )}
      <div className="mb-8" />

      <Step n={4} label="When did it go public?" />
      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <input type="date" value={date} max={todayInNc()} onChange={(e) => setDate(e.target.value)} className={INPUT} />
        <input value={postUrl} onChange={(e) => setPostUrl(e.target.value)} placeholder="Link to the post (optional)" inputMode="url" className={INPUT} />
      </div>
      <p className="mb-8 text-xs text-white/45">The Instagram or X post helps us confirm it in one look.</p>

      {/* Required (Matt, 29 Oct 2026): every commitment goes out with its photo. */}
      <Step n={5} label="Commitment photo" />
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
            <img src={photoUrl} alt="The commitment photo" className="h-20 w-20 rounded object-cover" />
            <button type="button" onClick={() => setPhotoUrl("")} className="text-sm font-semibold text-[#D3B574] hover:underline">
              Choose a different photo
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
            className="w-full rounded-lg border border-dashed border-white/20 bg-[#0A1628] px-4 py-6 text-sm text-white/60 hover:border-[#D3B574]/60 disabled:opacity-40"
          >
            {uploading ? "Uploading…" : "Add the commitment photo"}
          </button>
        )}
      </div>

      {more ? (
        <>
          <Step n={6} label="College weight" optional />
          <select value={collegeWeight} onChange={(e) => setCollegeWeight(e.target.value)} className={`${INPUT} mb-6`}>
            <option value="">Not sure yet</option>
            {COLLEGE_WEIGHTS.map((w) => (
              <option key={w} value={w}>
                {w} lbs
              </option>
            ))}
          </select>
          <Step n={7} label="Planned major" optional />
          <input value={major} onChange={(e) => setMajor(e.target.value)} placeholder="Kinesiology, Business, Undecided…" className={`${INPUT} mb-6`} />
        </>
      ) : (
        <button type="button" onClick={() => setMore(true)} className="mb-8 text-sm font-semibold text-[#D3B574] hover:underline">
          + College weight or major (optional)
        </button>
      )}

      <Step n={more ? 8 : 6} label="Your name and how to reach you" />
      <div className="mb-2 grid gap-3 sm:grid-cols-2">
        <input value={yourName} onChange={(e) => setYourName(e.target.value)} placeholder="Your name" autoComplete="name" className={INPUT} />
        <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email or cell" autoComplete="email" className={INPUT} />
      </div>
      <p className="mb-8 text-xs text-white/45">Only to tell you it&apos;s live, or to ask if something is unclear. Never shown.</p>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !ready}
        className="w-full rounded-lg bg-[#D3B574] px-6 py-4 text-lg font-bold text-[#0A1628] transition hover:bg-[#e0c68c] disabled:opacity-40"
      >
        {submitting ? "Sending…" : "Send the commitment"}
      </button>
      <p className="mt-4 text-center text-xs text-white/45">We check every commitment, usually the same day, then it goes on the profile and out on the app.</p>
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
