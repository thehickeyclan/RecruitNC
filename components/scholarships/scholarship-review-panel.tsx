"use client"

import { useState } from "react"

import { submitScholarshipReviewAction } from "@/app/actions/scholarships/submit-review"

export function ScholarshipReviewPanel(props: {
  applicationId: string
  scholarshipId: string
  role: "family" | "committee" | "admin"
}) {
  const [comment, setComment] = useState("")
  const [score, setScore] = useState("")
  const [finalist, setFinalist] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function send() {
    setMsg(null)
    setErr(null)
    setPending(true)
    const sc =
      props.role === "family"
        ? null
        : score.trim()
          ? Number.parseInt(score, 10)
          : null
    const res = await submitScholarshipReviewAction({
      applicationId: props.applicationId,
      scholarshipId: props.scholarshipId,
      comment,
      score: Number.isFinite(sc as number) ? sc : null,
      isFinalistVote: finalist,
    })
    setPending(false)
    if (!res.ok) {
      setErr(res.error)
      return
    }
    setMsg("Saved.")
    setComment("")
    setScore("")
    setFinalist(false)
    window.location.reload()
  }

  return (
    <div className="rounded-xl border border-[#C8A94A]/25 bg-[#0B2545]/40 p-4 text-white">
      <p className="font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]">
        Your review
      </p>
      {props.role === "family" ? (
        <p className="mt-2 text-sm leading-relaxed text-white/65">
          Family reviewers can leave comments — scoring is handled by the selection committee.
        </p>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-white/65">
          Committee and admin: score 1–5, optional finalist recommendation, and notes.
        </p>
      )}

      {props.role !== "family" ? (
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-white/55">
          Score (1–5)
          <select
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="mt-2 w-full rounded-lg border border-white/18 bg-[#061224] px-3 py-2.5 text-sm text-white/90 focus:border-[#C8A94A] focus:outline-none"
          >
            <option value="">Select…</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={String(n)}>
                {n}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {props.role !== "family" ? (
        <label className="mt-4 flex items-center gap-2 text-sm text-white/80">
          <input type="checkbox" checked={finalist} onChange={(e) => setFinalist(e.target.checked)} />
          Recommend as finalist
        </label>
      ) : null}

      <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-white/55">
        Comment
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="mt-2 w-full resize-y rounded-lg border border-white/18 bg-[#061224] px-3 py-2.5 text-sm text-white/90 focus:border-[#C8A94A] focus:outline-none"
        />
      </label>

      {err ? <p className="mt-3 text-sm text-red-300/95">{err}</p> : null}
      {msg ? <p className="mt-3 text-sm text-emerald-400/95">{msg}</p> : null}

      <button
        type="button"
        disabled={pending}
        onClick={() => void send()}
        className="mt-4 rounded-md bg-[#C8A94A] px-4 py-2 text-sm font-bold uppercase tracking-wide text-[#061224] hover:bg-[#d4b75c] disabled:opacity-50"
      >
        {pending ? "Saving…" : "Submit"}
      </button>
    </div>
  )
}
