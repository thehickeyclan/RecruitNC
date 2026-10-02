"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, Check, ExternalLink } from "lucide-react"

/**
 * The claims that looked wrong.
 *
 * Claiming is deliberately permissive - a parent stopped at a wall at 10pm does not come back -
 * so the safeguard is that an odd claim is visible afterwards. Without this page the flag was
 * written and never read, which is the same as not having one.
 */

type Claim = {
  id: string
  athleteId: string
  athleteName: string
  athleteClass: number | null
  athleteSchool: string | null
  stillClaimed: boolean
  claimerEmail: string
  claimerName: string | null
  relationship: "self" | "parent"
  signedName: string | null
  reason: string | null
  needsReview: boolean
  ip: string | null
  at: string
}

export default function ClaimReviewsPage() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [clearing, setClearing] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/claim-reviews${showAll ? "?all=1" : ""}`, { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to load")
      setClaims(data.claims ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [showAll])

  useEffect(() => {
    void load()
  }, [load])

  const clear = async (id: string) => {
    setClearing(id)
    try {
      await fetch("/api/admin/claim-reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      setClaims((prev) => prev.filter((c) => c.id !== id || showAll))
      if (showAll) void load()
    } finally {
      setClearing(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A1628] px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-[#D3B574] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Admin
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Claim reviews</h1>
            <p className="mt-1 text-sm text-slate-400">
              Claims we let through but flagged — a surname that does not match, or an account
              holding several wrestlers. The claim already happened; this is the look afterwards.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="h-4 w-4" />
            Show every claim
          </label>
        </div>

        {error && <p className="mt-6 rounded-md bg-red-950 p-3 text-sm text-red-200">{error}</p>}
        {loading && <p className="mt-8 text-sm text-slate-400">Loading…</p>}

        {!loading && claims.length === 0 && (
          <p className="mt-10 rounded-lg border border-[#1e3a5f] bg-[#0F1E32] p-8 text-center text-sm text-slate-400">
            {showAll ? "No claims recorded yet." : "Nothing flagged. Every claim so far looked ordinary."}
          </p>
        )}

        <ul className="mt-6 space-y-3">
          {claims.map((c) => (
            <li key={c.id} className="rounded-lg border border-[#1e3a5f] bg-[#0F1E32] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-white">
                    {c.athleteName}
                    <span className="ml-2 text-sm font-normal text-slate-400">
                      {[c.athleteClass, c.athleteSchool].filter(Boolean).join(" · ")}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    claimed as <strong>{c.relationship === "self" ? "himself" : "parent"}</strong> by{" "}
                    {c.claimerName ? `${c.claimerName} — ` : ""}
                    {c.claimerEmail}
                    {c.signedName ? <> , signed “{c.signedName}”</> : null}
                  </p>
                  {c.reason && (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded bg-amber-950/60 px-2 py-1 text-xs text-amber-300">
                      <AlertTriangle className="h-3 w-3" /> {c.reason}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-slate-500">
                    {new Date(c.at).toLocaleString()}
                    {c.ip ? ` · ${c.ip}` : ""}
                    {c.stillClaimed ? "" : " · profile no longer claimed"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <a
                    href={`/view-profile?id=${encodeURIComponent(c.athleteId)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded border border-[#1e3a5f] px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Profile
                  </a>
                  {c.needsReview && (
                    <button
                      type="button"
                      onClick={() => void clear(c.id)}
                      disabled={clearing === c.id}
                      className="inline-flex items-center gap-1 rounded bg-[#D3B574] px-3 py-1.5 text-sm font-semibold text-[#0A1628] disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" /> Looks fine
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
