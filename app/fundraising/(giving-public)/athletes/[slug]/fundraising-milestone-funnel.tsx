/**
 * Milestone trail for public gift pages. Milestones scale to the active goal (default $1k visual target).
 * Pass `showOwnerHints` only for signed-in family/staff.
 */

import { formatUsdWhole } from "@/app/fundraising/components/FundraisingHero"
import {
  DEFAULT_FUNNEL_GOAL_CENTS,
  milestonesCentsForGoal,
  resolvedGoalCents,
} from "@/lib/fundraising/milestone-trail"

type Props = {
  raisedCents: number
  goalCents?: number | null
  /** First name or short label for aria / microcopy */
  athleteLabel?: string
  /** Family/staff signed in — show setup hints; donors get short encouragement-only copy */
  showOwnerHints?: boolean
}

export { DEFAULT_FUNNEL_GOAL_CENTS } from "@/lib/fundraising/milestone-trail"

export function FundraisingMilestoneFunnel({ raisedCents, goalCents, athleteLabel, showOwnerHints = false }: Props) {
  const goalForFill = resolvedGoalCents(goalCents)
  const fillRatio = goalForFill > 0 ? Math.min(1, raisedCents / goalForFill) : 0

  const milestones = milestonesCentsForGoal(goalForFill)

  const fillPctRounded = Math.min(100, Math.round(fillRatio * 100))
  const labelForHints = athleteLabel?.trim() || "this athlete"
  const hasCustomGoal = goalCents != null && goalCents > 0

  const aria = athleteLabel?.trim()
    ? hasCustomGoal
      ? `${athleteLabel}: ${formatUsdWhole(raisedCents)} raised toward goal ${formatUsdWhole(goalCents!)}.`
      : `${athleteLabel}: ${formatUsdWhole(raisedCents)} raised; milestone progress.`
    : hasCustomGoal
      ? `${formatUsdWhole(raisedCents)} raised toward goal ${formatUsdWhole(goalCents!)}.`
      : `${formatUsdWhole(raisedCents)} raised; milestone progress.`

  const barHeightPx = 280

  return (
    <div className="mt-8 rounded-xl border border-[#C8A94A]/25 bg-gradient-to-b from-[#0B2545]/70 to-[#061224]/90 px-4 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]">
          Milestone trail
        </h2>
        <p className="text-[11px] text-white/45">Community support · keep climbing</p>
      </div>
      <p className="mt-2 text-sm text-white/70">
        <span className="font-semibold text-[#C8A94A] tabular-nums">{formatUsdWhole(raisedCents)}</span> raised
        {hasCustomGoal ? (
          <>
            {" "}
            · goal <span className="tabular-nums text-white/85">{formatUsdWhole(goalCents)}</span>
          </>
        ) : showOwnerHints ? (
          <>
            {" "}
            ·{" "}
            <span className="text-white/65">
              visual target <span className="tabular-nums text-[#C8A94A]">{formatUsdWhole(DEFAULT_FUNNEL_GOAL_CENTS)}</span>
            </span>
            <span className="text-white/45"> (set a custom goal in the gold section)</span>
          </>
        ) : null}
      </p>

      <div className="mt-6 flex flex-col items-stretch gap-8 sm:flex-row sm:items-stretch sm:justify-center sm:gap-12">
        <div
          className="relative mx-auto flex w-full max-w-[88px] shrink-0 flex-col items-center sm:mx-0"
          style={{ height: barHeightPx }}
          role="img"
          aria-label={aria}
        >
          {/* Track */}
          <div className="relative h-full w-[14px] overflow-hidden rounded-full border border-[#C8A94A]/45 bg-[#020814]/90 shadow-[inset_0_2px_8px_rgba(0,0,0,0.45)]">
            {/* Fill */}
            <div
              className="absolute bottom-0 left-0 right-0 rounded-b-full bg-gradient-to-t from-[#5c1518] via-[#b91c1c] to-[#C8A94A] transition-[height] duration-500 ease-out"
              style={{ height: `${fillRatio * 100}%` }}
            />
            {/* Milestone ticks */}
            {milestones.map((cent) => {
              const ratio = goalForFill > 0 ? cent / goalForFill : 0
              const yFromBottomPct = ratio * 100
              const hit = raisedCents >= cent
              return (
                <div
                  key={cent}
                  className="pointer-events-none absolute left-1/2 h-[2px] w-[22px] -translate-x-1/2 rounded-full"
                  style={{ bottom: `calc(${yFromBottomPct}% - 1px)` }}
                  aria-hidden
                >
                  <div
                    className={`h-full w-full rounded-full ${hit ? "bg-[#f5e6a8] shadow-[0_0_6px_rgba(200,169,74,0.45)]" : "bg-white/22"}`}
                  />
                </div>
              )
            })}
          </div>
          <p className="mt-2 text-center text-[10px] font-medium uppercase tracking-[0.12em] text-white/35">Progress</p>
        </div>

        <ul className="min-w-0 flex-1 space-y-2">
          {milestones.map((cent) => {
            const hit = raisedCents >= cent
            const nextThreshold = milestones.find((m) => m > raisedCents)
            const isNext = !hit && nextThreshold === cent
            return (
              <li
                key={cent}
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  hit
                    ? "border-[#C8A94A]/50 bg-[#C8A94A]/12 text-white shadow-[0_0_0_1px_rgba(200,169,74,0.15)]"
                    : isNext
                      ? "border-[#C8A94A]/25 bg-white/[0.07] text-white"
                      : "border-white/[0.08] bg-black/20 text-white/50"
                }`}
              >
                <span className="flex items-center gap-2.5 font-medium tabular-nums">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      hit ? "bg-[#C8A94A] text-[#061224]" : "border border-white/20 bg-white/[0.04] text-white/40"
                    }`}
                    aria-hidden
                  >
                    {hit ? "✓" : ""}
                  </span>
                  {formatUsdWhole(cent)}
                </span>
                {isNext ? (
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#C8A94A]">Next</span>
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>

      {showOwnerHints ? (
        <p className="mt-5 text-center text-[11px] leading-snug text-white/40">
          {hasCustomGoal ? (
            <>
              Fill matches the <strong className="text-white/55">goal</strong> in the gold section — same running total as the counter above.
              Checkmarks mark tiers along the way (milestones stay within your goal range).
            </>
          ) : (
            <>
              Until a custom goal is set in the gold section, fill scales to a <span className="tabular-nums text-white/55">{formatUsdWhole(DEFAULT_FUNNEL_GOAL_CENTS)}</span> visual target (
              <span className="tabular-nums text-white/55">{fillPctRounded}%</span> at{" "}
              <span className="tabular-nums text-white/55">{formatUsdWhole(raisedCents)}</span> raised). Set{" "}
              <strong className="text-white/55">{labelForHints}&apos;s goal</strong> there so this matches your real target.
            </>
          )}
        </p>
      ) : (
        <p className="mt-5 text-center text-[11px] leading-snug text-white/45">
          Each checkmark celebrates a tier this community has unlocked together. Your gift pushes {labelForHints} up the trail — thank you.
        </p>
      )}
    </div>
  )
}
