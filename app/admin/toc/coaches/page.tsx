"use client"

import { useCallback, useEffect, useState } from "react"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import type { CheckInCoach } from "@/lib/toc/coach-designation"

/**
 * The coach list, as the door will use it.
 *
 * One row per person, however many wrestlers they corner — a club coach named by twelve families
 * is one lanyard. The wrestlers are shown underneath because that is what settles a question at
 * the check-in table about whether somebody belongs on the floor.
 */
export default function TocCoachesPage() {
  const [coaches, setCoaches] = useState<CheckInCoach[]>([])
  const [totals, setTotals] = useState({ coaches: 0, wrestlers: 0, approved: 0, pending: 0, awaitingSend: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [onlyApproved, setOnlyApproved] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/toc/coaches", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Could not load coaches.")
      setCoaches(data.coaches ?? [])
      setTotals(data.totals ?? { coaches: 0, wrestlers: 0, approved: 0, pending: 0, awaitingSend: 0 })
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load coaches.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function notify(coachKey?: string, channel?: "email" | "sms") {
    setSaving(coachKey ? `${coachKey}:${channel ?? "auto"}` : "all")
    setError(null)
    try {
      const res = await fetch("/api/admin/toc/coaches/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(coachKey ? { coachKey } : {}), ...(channel ? { channel } : {}) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Could not send.")
      if (data.sent === 0 && data.attempted === 0) setError("Nobody to contact — approve a coach first.")
      else if (data.failed?.length) setError(`Sent ${data.sent} of ${data.attempted}. Failed: ${data.failed.map((f: { coach: string }) => f.coach).join(", ")}`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send.")
    } finally {
      setSaving(null)
    }
  }

  async function review(coachKey: string, status: string) {
    setSaving(coachKey)
    try {
      const res = await fetch("/api/admin/toc/coaches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachKey, status }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? "Could not save.")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.")
    } finally {
      setSaving(null)
    }
  }

  const shown = onlyApproved ? coaches.filter((c) => c.status === "approved") : coaches

  return (
    <main className="admin-dark-page min-h-screen bg-rnc-ink px-4 py-8 text-white sm:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-rnc-gold">Tournament of Champions</p>
        <h1 className="mt-2 text-3xl font-extrabold">Corner coaches</h1>

        {/* A handful of headline numbers, so a KPI row rather than a chart. Values carry no
            colour of their own: the label is what distinguishes them, and a number that turns
            red on its own tells a reader nothing they can act on. */}
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5 print:hidden">
          {[
            { label: "Coaches", value: totals.coaches, hint: "lanyards to print" },
            { label: "Wrestlers covered", value: totals.wrestlers, hint: "have named a coach" },
            { label: "Approved", value: totals.approved, hint: "cleared for the floor" },
            { label: "Pending review", value: totals.pending, hint: "waiting on you" },
            { label: "To contact", value: totals.awaitingSend, hint: "approved, not yet told" },
          ].map((tile) => (
            <div key={tile.label} className="rounded-xl border border-rnc-line bg-rnc-surface px-4 py-3">
              <dt className="text-xs font-semibold text-slate-400">{tile.label}</dt>
              <dd className="mt-1 text-3xl font-semibold leading-none text-white">{tile.value}</dd>
              <p className="mt-1 text-xs text-slate-500">{tile.hint}</p>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex flex-wrap gap-3 print:hidden">
          <button
            type="button"
            onClick={() => setOnlyApproved((v) => !v)}
            className="rounded-lg border border-rnc-line px-4 py-2 text-sm font-semibold"
          >
            {onlyApproved ? "Show everyone" : "Approved only"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg border border-rnc-line px-4 py-2 text-sm font-semibold"
          >
            Print check-in list
          </button>
          <button
            type="button"
            disabled={saving === "all" || totals.awaitingSend === 0}
            onClick={() => void notify()}
            className="rounded-lg bg-rnc-gold px-4 py-2 text-sm font-bold text-rnc-ink disabled:opacity-40"
          >
            {saving === "all"
              ? "Sending…"
              : `Text tickets to ${totals.awaitingSend} coach${totals.awaitingSend === 1 ? "" : "es"}`}
          </button>
        </div>

        {error ? <p className="mt-4 rounded-lg bg-rnc-red/15 px-4 py-3 text-sm text-red-300">{error}</p> : null}

        {loading ? (
          <p className="mt-8 text-slate-400">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="mt-8 rounded-xl border border-rnc-line bg-rnc-surface p-6 text-slate-400">
            No coaches designated yet.
          </p>
        ) : (
          <ol className="mt-6 flex flex-col gap-3">
            {shown.map((coach) => (
              <li key={coach.coachKey} className="rounded-xl border border-rnc-line bg-rnc-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold">{coach.coachName}</p>
                    <p className="text-sm text-slate-400">
                      {coach.coachEmail}
                      {coach.coachPhone ? ` · ${coach.coachPhone}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 print:hidden">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                        coach.status === "approved"
                          ? "bg-rnc-gold text-rnc-ink"
                          : coach.status === "declined"
                            ? "bg-rnc-red/20 text-red-300"
                            : "bg-rnc-raised text-slate-300"
                      }`}
                    >
                      {coach.status}
                    </span>
                    {coach.status !== "approved" ? (
                      <button
                        type="button"
                        disabled={saving?.startsWith(coach.coachKey) ?? false}
                        onClick={() => void review(coach.coachKey, "approved")}
                        className="rounded-lg bg-rnc-gold px-3 py-2 text-xs font-bold text-rnc-ink disabled:opacity-50"
                      >
                        Approve
                      </button>
                    ) : null}
                    {coach.status === "approved" && coach.coachPhone ? (
                      <button
                        type="button"
                        disabled={saving?.startsWith(coach.coachKey) ?? false}
                        onClick={() => void notify(coach.coachKey, "sms")}
                        className="rounded-lg border border-rnc-gold px-3 py-2 text-xs font-bold text-rnc-gold disabled:opacity-50"
                      >
                        {coach.notifiedChannel === "sms" ? "Text again" : "Text ticket"}
                      </button>
                    ) : null}
                    {coach.status === "approved" && coach.coachEmail ? (
                      <button
                        type="button"
                        disabled={saving?.startsWith(coach.coachKey) ?? false}
                        onClick={() => void notify(coach.coachKey, "email")}
                        className="rounded-lg border border-rnc-line px-3 py-2 text-xs font-semibold text-slate-200 disabled:opacity-50"
                      >
                        {coach.notifiedChannel === "email" ? "Email again" : "Email ticket"}
                      </button>
                    ) : null}
                    {coach.status !== "declined" ? (
                      <button
                        type="button"
                        disabled={saving?.startsWith(coach.coachKey) ?? false}
                        onClick={() => void review(coach.coachKey, "declined")}
                        className="rounded-lg border border-rnc-line px-3 py-2 text-xs font-semibold disabled:opacity-50"
                      >
                        Decline
                      </button>
                    ) : null}
                  </div>
                </div>

                {coach.notifiedAt ? (
                  <p className="mt-2 text-xs text-rnc-gold">
                    Ticket sent by {coach.notifiedChannel === "sms" ? "text" : "email"} on{" "}
                    {new Date(coach.notifiedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                ) : null}

                <p className="mt-3 text-sm text-slate-300">
                  <span className="font-semibold text-white">
                    {coach.athletes.length} {coach.athletes.length === 1 ? "wrestler" : "wrestlers"}:
                  </span>{" "}
                  {coach.athletes
                    .map((a) => `${a.athleteName}${a.weightClass ? ` (${a.weightClass})` : ""}`)
                    .join(", ")}
                </p>

                {/* Details a family gave because we had none on file. They are held here rather
                    than written to the athlete record, so they are only useful if they are seen. */}
                {coach.athletes.some((a) => a.submittedClub || a.submittedDob) ? (
                  <ul className="mt-2 flex flex-col gap-1 print:hidden">
                    {coach.athletes
                      .filter((a) => a.submittedClub || a.submittedDob)
                      .map((a) => (
                        <li key={`${a.athleteName}-${a.weightClass}`} className="text-xs text-rnc-gold">
                          {a.athleteName} — family supplied
                          {a.submittedClub ? ` club: ${a.submittedClub}` : ""}
                          {a.submittedClub && a.submittedDob ? "," : ""}
                          {a.submittedDob ? ` date of birth: ${a.submittedDob}` : ""}
                        </li>
                      ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        )}

        <p className="mt-8 text-xs text-slate-500 print:hidden">
          Weight classes: {TOC_WEIGHT_CLASSES.join(", ")}
        </p>
      </div>
    </main>
  )
}
