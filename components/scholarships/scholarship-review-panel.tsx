"use client"

import { useState } from "react"

import { submitScholarshipReviewAction } from "@/app/actions/scholarships/submit-review"

export function ScholarshipReviewPanel(props: {
  applicationId: string
  scholarshipId: string
  role: "family" | "committee" | "admin"
  existingRank?: number | null
  existingComment?: string | null
}) {
  const [comment, setComment] = useState(props.existingComment ?? "")
  const [score, setScore] = useState(props.existingRank ? String(props.existingRank) : "")
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
    })
    setPending(false)
    if (!res.ok) {
      setErr(res.error)
      return
    }
    setMsg("Ranking saved.")
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
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-white/72">
          <p>Rank all three anonymous finalists. Use each placement once: 1 is your strongest choice, 3 is your third choice.</p>
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-[#C8A94A]">What the award recognizes</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><strong>Response to genuine adversity:</strong> courage and resilience when circumstances became difficult.</li>
              <li><strong>Character and integrity:</strong> how the wrestler acted, not simply what they achieved.</li>
              <li><strong>Impact on others:</strong> compassion, leadership, service, or encouragement.</li>
              <li><strong>Wrestling-forged mindset:</strong> discipline, heart, and a demonstrated refusal to quit.</li>
            </ul>
            <p className="mt-3 text-xs text-white/55">Do not consider rankings, records, championships, recruiting status, academics, school, or club affiliation.</p>
          </div>
        </div>
      )}

      {props.role !== "family" ? (
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-white/55">
          Final ranking
          <select
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="mt-2 w-full rounded-lg border border-white/18 bg-[#061224] px-3 py-2.5 text-sm text-white/90 focus:border-[#C8A94A] focus:outline-none"
          >
            <option value="">Select…</option>
            <option value="1">1 — strongest choice</option>
            <option value="2">2 — second choice</option>
            <option value="3">3 — third choice</option>
          </select>
        </label>
      ) : null}

      <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-white/55">
        Comments supporting your ranking
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
