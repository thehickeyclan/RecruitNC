"use client"

import { useState } from "react"

export type ProfileOption = { id: string; name: string; detail: string; college: string | null }
type CollegeOption = { id: string; name: string; division: string | null }

type Result =
  | { ok: true; athleteName: string; college: string; announced: { sent: number } | null; unchanged: boolean; submitterTold: boolean }
  | { ok: false; error: string }

const AS_TYPED = "__typed"

export function ApproveCommitmentClient(props: {
  submissionId: string
  token: string
  status: string
  athleteName: string
  reportedDetail: string
  profiles: ProfileOption[]
  profileWasChosen: boolean
  collegeTyped: string
  collegeMatchId: string | null
  colleges: CollegeOption[]
  facts: Array<[string, string | null]>
  announcementUrl: string | null
  photoUrl: string | null
}) {
  const [athleteId, setAthleteId] = useState(props.profiles.length === 1 && props.profileWasChosen ? props.profiles[0]!.id : "")
  const [collegeId, setCollegeId] = useState(props.collegeMatchId ?? (props.collegeTyped ? AS_TYPED : ""))
  const [announce, setAnnounce] = useState(true)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [declined, setDeclined] = useState(false)

  const chosen = props.profiles.find((p) => p.id === athleteId) ?? null
  const collegeName = collegeId === AS_TYPED ? props.collegeTyped : (props.colleges.find((c) => c.id === collegeId)?.name ?? "")
  const changesCollege = chosen?.college && chosen.college.toLowerCase() !== collegeName.toLowerCase()

  const failure = result && !result.ok ? result.error : null

  async function send(action: "approve" | "reject") {
    setBusy(true)
    try {
      const res = await fetch(`/api/approve-commitment/${encodeURIComponent(props.submissionId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: props.token,
          action,
          athleteId: athleteId || null,
          collegeId: collegeId === AS_TYPED ? null : collegeId || null,
          announce,
          createProfile: !athleteId && props.profiles.length === 0,
        }),
      })
      const data = await res.json().catch(() => ({ error: "Something went wrong." }))
      if (action === "reject") {
        if (res.ok) setDeclined(true)
        else setResult({ ok: false, error: data.error ?? "Could not decline it." })
      } else setResult(res.ok ? { ...data, ok: true } : { ok: false, error: data.error ?? "Could not approve it." })
    } finally {
      setBusy(false)
    }
  }

  if (props.status === "approved" || (result?.ok ?? false)) {
    const r = result?.ok ? result : null
    return (
      <div className="rounded-2xl border border-[#A7F3D0]/40 bg-[#0f1c2e] p-6">
        <h1 className="text-2xl font-black">{r ? `${r.athleteName} to ${r.college} is live` : "Already approved"}</h1>
        {r ? (
          <ul className="mt-4 space-y-1.5 text-sm text-white/75">
            <li>On the profile and in College Commitments.</li>
            <li>
              {r.announced
                ? `App alert sent to ${r.announced.sent} ${r.announced.sent === 1 ? "phone" : "phones"}.`
                : r.unchanged
                  ? "The profile already had this college, so no alert went out."
                  : announce
                    ? "No app alert: this wrestler was announced before."
                    : "No app alert, as you chose."}
            </li>
            <li>{r.submitterTold ? "The person who sent it has been told it is live." : "The person who sent it could not be reached automatically."}</li>
          </ul>
        ) : null}
      </div>
    )
  }
  if (props.status === "rejected" || declined) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0f1c2e] p-6">
        <h1 className="text-2xl font-black">Declined</h1>
        <p className="mt-2 text-sm text-white/65">Nothing was published.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black leading-tight">
        {props.athleteName} <span className="text-white/50">to</span> {props.collegeTyped}
      </h1>

      <section className="rounded-xl border border-white/10 bg-[#0f1c2e] p-4">
        <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#D3B574]">Profile</p>
        {props.profiles.length === 0 ? (
          <p className="text-sm text-amber-200">
            No profile yet{props.reportedDetail ? ` (reported: ${props.reportedDetail})` : ""}. Approving makes one.
          </p>
        ) : (
          <ul className="space-y-2">
            {props.profiles.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 p-3 has-[:checked]:border-[#D3B574]">
                  <input type="radio" name="profile" className="mt-1 accent-[#D3B574]" checked={athleteId === p.id} onChange={() => setAthleteId(p.id)} />
                  <span className="min-w-0">
                    <span className="block font-bold">{p.name}</span>
                    <span className="block text-sm text-white/60">{p.detail || "No school on file"}</span>
                    {p.college ? <span className="block text-sm text-amber-200">Profile already says {p.college}</span> : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {!props.profileWasChosen && props.profiles.length > 0 ? (
          <p className="mt-2 text-xs text-white/50">The reporter did not pick a profile{props.reportedDetail ? `; they said ${props.reportedDetail}` : ""}. Choose the right one.</p>
        ) : null}
      </section>

      <section className="rounded-xl border border-white/10 bg-[#0f1c2e] p-4">
        <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#D3B574]">College</p>
        <select
          value={collegeId}
          onChange={(e) => setCollegeId(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-[#0A1628] px-3 py-3 text-white"
        >
          {props.collegeTyped && !props.collegeMatchId ? <option value={AS_TYPED}>{props.collegeTyped} (as typed, not in our list)</option> : null}
          {props.colleges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.division ? ` · ${c.division}` : ""}
            </option>
          ))}
        </select>
        {changesCollege ? <p className="mt-2 text-sm text-amber-200">This replaces {chosen?.college} on the profile.</p> : null}
      </section>

      <section className="rounded-xl border border-white/10 bg-[#0f1c2e] p-4">
        <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-sm">
          {props.facts
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-white/50">{k}</dt>
                <dd className="break-words">{v}</dd>
              </div>
            ))}
        </dl>
        {props.announcementUrl ? (
          <a href={props.announcementUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-bold text-[#D3B574] underline">
            Open the announcement post
          </a>
        ) : null}
        {props.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user upload
          <img src={props.photoUrl} alt="" className="mt-3 h-40 w-full rounded-lg object-cover" />
        ) : null}
      </section>

      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" checked={announce} onChange={(e) => setAnnounce(e.target.checked)} className="h-4 w-4 accent-[#D3B574]" />
        Send the app alert to everyone who follows commitments
      </label>

      {failure ? <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{failure}</p> : null}

      <button
        type="button"
        disabled={busy || (!athleteId && props.profiles.length > 0) || !collegeId}
        onClick={() => void send("approve")}
        className="w-full rounded-xl bg-[#D3B574] px-6 py-4 text-lg font-black text-[#0A1628] disabled:opacity-40"
      >
        {busy ? "Working…" : `${!athleteId && props.profiles.length === 0 ? "Make the profile, approve" : "Approve"}${announce ? " and announce" : ""}`}
      </button>
      <button type="button" disabled={busy} onClick={() => void send("reject")} className="w-full py-2 text-sm font-bold text-white/50 hover:text-white">
        Decline
      </button>
    </div>
  )
}
