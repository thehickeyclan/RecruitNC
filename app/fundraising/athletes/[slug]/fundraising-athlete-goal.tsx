"use client"

import { Pencil } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import { formatUsdWhole } from "@/app/fundraising/components/FundraisingHero"

const MIN_GOAL_DOLLARS = 50
const MAX_GOAL_DOLLARS = 500_000

type Props = {
  displayName: string
  athleteId: string
  hasFundraisingProfile: boolean
  canEdit: boolean
  isRecruitNcAdmin: boolean
  initialGoalCents: number | null
  raisedCents: number
}

function dollarsFromCents(cents: number | null): string {
  if (cents == null || cents <= 0) return ""
  return String(Math.round(cents / 100))
}

export function FundraisingAthleteGoalSection({
  displayName,
  athleteId,
  hasFundraisingProfile,
  canEdit,
  isRecruitNcAdmin,
  initialGoalCents,
  raisedCents,
}: Props) {
  const router = useRouter()
  const firstName = (displayName.split(/\s+/).filter(Boolean)[0] ?? displayName).trim()
  const [goalCents, setGoalCents] = useState<number | null>(initialGoalCents)
  const [dollarInput, setDollarInput] = useState(() => dollarsFromCents(initialGoalCents))
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setGoalCents(initialGoalCents)
    setDollarInput(dollarsFromCents(initialGoalCents))
  }, [initialGoalCents])

  const progressPct =
    goalCents != null && goalCents > 0 ? Math.min(100, Math.round((raisedCents / goalCents) * 100)) : null

  const saveGoal = useCallback(
    async (clear: boolean) => {
      setSaving(true)
      setMessage(null)
      setError(null)
      try {
        let payloadCents: number | null
        if (clear) {
          payloadCents = null
        } else {
          const d = Number.parseFloat(dollarInput || "0")
          if (!Number.isFinite(d)) {
            setError("Enter a dollar amount.")
            setSaving(false)
            return
          }
          const cents = Math.round(d * 100)
          if (cents < MIN_GOAL_DOLLARS * 100) {
            setError(`Goal must be at least $${MIN_GOAL_DOLLARS}.`)
            setSaving(false)
            return
          }
          if (cents > MAX_GOAL_DOLLARS * 100) {
            setError(`Goal cannot exceed $${MAX_GOAL_DOLLARS.toLocaleString("en-US")}.`)
            setSaving(false)
            return
          }
          payloadCents = cents
        }

        const res = await fetch(`/api/athletes/${encodeURIComponent(athleteId)}/fundraising-bio`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaign_goal_cents: payloadCents }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Could not save.")
          return
        }
        const next =
          typeof data.profile?.campaign_goal_cents === "number"
            ? data.profile.campaign_goal_cents
            : clear
              ? null
              : payloadCents
        setGoalCents(next ?? null)
        setDollarInput(dollarsFromCents(next ?? null))
        setMessage(clear ? "Goal cleared." : "Goal saved.")
        setEditing(false)
        router.refresh()
      } catch {
        setError("Network error.")
      } finally {
        setSaving(false)
      }
    },
    [athleteId, dollarInput, router],
  )

  const cancelEdit = useCallback(() => {
    setEditing(false)
    setDollarInput(dollarsFromCents(goalCents))
    setMessage(null)
    setError(null)
  }, [goalCents])

  const showPublicGoal = goalCents != null && goalCents > 0
  if (!canEdit && !showPublicGoal) return null

  return (
    <section className="mt-8 rounded-xl border border-[#C8A94A]/30 bg-[#0B2545]/45 px-4 py-5 sm:px-6 sm:py-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]">
          {firstName}&apos;s fundraising goal
        </h2>
        {canEdit && !editing ? (
          <button
            type="button"
            onClick={() => {
              setEditing(true)
              setMessage(null)
              setError(null)
              setDollarInput(dollarsFromCents(goalCents))
            }}
            className="-mr-1 -mt-0.5 flex shrink-0 items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-[#C8A94A] hover:border-[#C8A94A]/50 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A94A]/60"
            aria-label="Edit fundraising goal"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Edit
          </button>
        ) : null}
      </div>

      {canEdit && !hasFundraisingProfile && !isRecruitNcAdmin ? (
        <p className="mt-3 text-sm leading-relaxed text-white/65">
          Tap <strong className="text-white/90">Edit</strong> to set a goal — saving creates your gift page record if you&apos;re on the roster with an NCU code (same as your note above).
        </p>
      ) : null}

      {canEdit && editing ? (
        <>
          <p className="mt-2 text-xs leading-relaxed text-white/50">
            Donors see this above your note. The trophy fills as gifts come in and reaches full when totals reach this goal.
          </p>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-white/55">
            Goal (USD)
            <input
              type="number"
              inputMode="numeric"
              min={MIN_GOAL_DOLLARS}
              max={MAX_GOAL_DOLLARS}
              step={1}
              value={dollarInput}
              onChange={(e) => setDollarInput(e.target.value)}
              className="mt-2 w-full rounded-lg border border-white/18 bg-[#061224] px-3 py-2.5 text-sm tabular-nums text-white/90 placeholder:text-white/35 focus:border-[#C8A94A] focus:outline-none focus:ring-1 focus:ring-[#C8A94A]/45"
              placeholder={`e.g. ${MIN_GOAL_DOLLARS * 20}`}
              aria-label="Fundraising goal in dollars"
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void saveGoal(false)}
              disabled={saving}
              className="rounded-md bg-[#C8A94A] px-4 py-2 text-sm font-bold uppercase tracking-wide text-[#061224] hover:bg-[#d4b75c] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save goal"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="rounded-md border border-white/25 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/10 disabled:opacity-50"
            >
              Cancel
            </button>
            {showPublicGoal ? (
              <button
                type="button"
                onClick={() => void saveGoal(true)}
                disabled={saving}
                className="rounded-md border border-red-400/35 px-4 py-2 text-sm font-semibold text-red-300/90 hover:bg-red-500/10 disabled:opacity-50"
              >
                Clear goal
              </button>
            ) : null}
            {message ? <span className="text-sm text-emerald-400/90">{message}</span> : null}
            {error ? <span className="text-sm text-red-400/90">{error}</span> : null}
          </div>
        </>
      ) : showPublicGoal ? (
        <>
          <p className="mt-4 text-sm text-white/70">
            <span className="tabular-nums font-semibold text-white/90">{formatUsdWhole(raisedCents)}</span> raised of{" "}
            <span className="tabular-nums text-white/90">{formatUsdWhole(goalCents!)}</span>
            {progressPct != null ? (
              <>
                {" "}
                · <span className="tabular-nums text-[#C8A94A]">{progressPct}%</span>
              </>
            ) : null}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#C8A94A] transition-[width] duration-500"
              style={{ width: `${progressPct ?? 0}%` }}
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-white/45">
            The trophy below fills with the same running total and reaches full at this goal.
          </p>
        </>
      ) : (
        <p className="mt-4 text-sm italic text-white/50">
          Set a fundraising goal so supporters see your target — it also sets when the trophy reads full.
        </p>
      )}
    </section>
  )
}
