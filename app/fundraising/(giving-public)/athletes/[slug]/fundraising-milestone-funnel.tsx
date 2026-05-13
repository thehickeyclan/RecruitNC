/**
 * Milestone funnel for public gift pages. Pass `showOwnerHints` only for signed-in family/staff.
 */

import { formatUsdWhole } from "@/app/fundraising/components/FundraisingHero"

export const FUNDRAISING_MILESTONE_DOLLARS = [250, 500, 1000, 2500, 5000, 10000, 25000, 50000] as const

/** When no `campaign_goal_cents` in profile, the fill scales to this amount (not persisted). */
export const DEFAULT_FUNNEL_GOAL_CENTS = 1000 * 100

type Props = {
  raisedCents: number
  goalCents?: number | null
  /** First name or short label for aria / microcopy */
  athleteLabel?: string
  /** Family/staff signed in — show setup hints; donors get short encouragement-only copy */
  showOwnerHints?: boolean
}

/** Body of the funnel (clip + fill); stem is drawn below and not filled */
const VB = { w: 200, h: 260, innerTopY: 56, innerBottomY: 182, innerTopLeft: 38, innerTopRight: 162, innerBotLeft: 88, innerBotRight: 112 }

/** Full ladder for the milestone list (always show every tier). */
function milestoneListCents(): number[] {
  return FUNDRAISING_MILESTONE_DOLLARS.map((d) => d * 100)
}

function resolvedGoalCents(goal: number | null | undefined): number {
  if (goal != null && goal > 0) return goal
  return DEFAULT_FUNNEL_GOAL_CENTS
}

/** Inner tick marks: milestones not above the active goal (custom or default $1k). */
function funnelTicksMaxCents(goal: number | null | undefined): number {
  const resolved = resolvedGoalCents(goal)
  const lastMilestoneCents = FUNDRAISING_MILESTONE_DOLLARS[FUNDRAISING_MILESTONE_DOLLARS.length - 1]! * 100
  return Math.min(lastMilestoneCents, resolved)
}

export function FundraisingMilestoneFunnel({ raisedCents, goalCents, athleteLabel, showOwnerHints = false }: Props) {
  const goalForFill = resolvedGoalCents(goalCents)
  const tickCap = funnelTicksMaxCents(goalCents)
  const fillRatio = goalForFill > 0 ? Math.min(1, raisedCents / goalForFill) : 0

  const innerH = VB.innerBottomY - VB.innerTopY
  const fillH = innerH * fillRatio
  const milestones = milestoneListCents()
  const funnelTicks = milestones.filter((c) => c <= tickCap)

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

  const trapezoidD = `M ${VB.innerTopLeft} ${VB.innerTopY} L ${VB.innerTopRight} ${VB.innerTopY} L ${VB.innerBotRight} ${VB.innerBottomY} L ${VB.innerBotLeft} ${VB.innerBottomY} Z`

  return (
    <div className="mt-8 rounded-xl border border-[#C8A94A]/25 bg-[#0B2545]/55 px-4 py-5 sm:px-6 sm:py-6">
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

      <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-center sm:gap-10">
        <div className="mx-auto shrink-0 sm:mx-0">
          <svg
            width={200}
            height={260}
            viewBox={`0 0 ${VB.w} ${VB.h}`}
            className="overflow-visible"
            role="img"
            aria-label={aria}
          >
            <defs>
              <linearGradient id="funnelFillGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#7a1e1e" />
                <stop offset="45%" stopColor="#CC0000" />
                <stop offset="100%" stopColor="#C8A94A" />
              </linearGradient>
              <linearGradient id="funnelStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e8d48b" />
                <stop offset="50%" stopColor="#C8A94A" />
                <stop offset="100%" stopColor="#8a7029" />
              </linearGradient>
              <clipPath id="funnelBodyClip">
                <path d={trapezoidD} />
              </clipPath>
            </defs>

            {/* Funnel outline (body + neck) */}
            <path
              d={`${trapezoidD} M ${VB.innerBotLeft} ${VB.innerBottomY} L 92 205 L 108 205 L ${VB.innerBotRight} ${VB.innerBottomY}`}
              fill="none"
              stroke="url(#funnelStrokeGrad)"
              strokeWidth={2.75}
              strokeLinejoin="round"
            />
            <line
              x1={92}
              x2={108}
              y1={205}
              y2={205}
              stroke="url(#funnelStrokeGrad)"
              strokeWidth={2}
              strokeLinecap="round"
            />

            <g clipPath="url(#funnelBodyClip)">
              <rect x={0} y={VB.innerBottomY - fillH} width={VB.w} height={fillH + 2} fill="url(#funnelFillGrad)" opacity={0.92} />
            </g>

            <path d={`M ${VB.innerTopLeft} ${VB.innerTopY} L ${VB.innerTopRight} ${VB.innerTopY}`} fill="none" stroke="white" strokeWidth={1} strokeOpacity={0.28} />

            {funnelTicks.map((cent) => {
              const ratio = goalForFill > 0 ? cent / goalForFill : 0
              const y = VB.innerBottomY - innerH * Math.min(1, ratio)
              const hit = raisedCents >= cent
              return (
                <g key={cent}>
                  <line
                    x1={VB.innerTopLeft - 4}
                    x2={VB.innerTopRight + 4}
                    y1={y}
                    y2={y}
                    stroke={hit ? "#f5e6a8" : "rgba(255,255,255,0.2)"}
                    strokeWidth={hit ? 1.5 : 1}
                    strokeDasharray={hit ? undefined : "4 3"}
                  />
                </g>
              )
            })}

            {/* Drop hint at mouth */}
            <ellipse cx={100} cy={VB.innerTopY - 6} rx={64} ry={5} fill="none" stroke="url(#funnelStrokeGrad)" strokeWidth={1.25} strokeOpacity={0.65} />
          </svg>
        </div>

        <ul className="min-w-0 flex-1 space-y-2">
          {milestones.map((cent) => {
            const hit = raisedCents >= cent
            const isNext = !hit && milestones.find((m) => m > raisedCents) === cent
            return (
              <li
                key={cent}
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${
                  hit
                    ? "border-[#C8A94A]/40 bg-[#C8A94A]/10 text-white"
                    : isNext
                      ? "border-white/20 bg-white/[0.06] text-white/90"
                      : "border-white/10 bg-black/15 text-white/55"
                }`}
              >
                <span className="flex items-center gap-2 font-medium tabular-nums">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      hit ? "bg-[#C8A94A] text-[#061224]" : "border border-white/25 text-white/45"
                    }`}
                    aria-hidden
                  >
                    {hit ? "✓" : ""}
                  </span>
                  {formatUsdWhole(cent)}
                </span>
                {isNext ? <span className="text-[10px] font-bold uppercase tracking-wide text-[#C8A94A]">Next</span> : null}
              </li>
            )
          })}
        </ul>
      </div>

      {showOwnerHints ? (
        <p className="mt-4 text-center text-[11px] leading-snug text-white/40">
          {hasCustomGoal ? (
            <>
              Fill matches the <strong className="text-white/55">goal</strong> in the gold section — same running total as the counter above. Checkmarks mark tiers along the way.
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
        <p className="mt-4 text-center text-[11px] leading-snug text-white/45">
          Each checkmark celebrates a tier this community has unlocked together. Your gift pushes {labelForHints} up the trail — thank you.
        </p>
      )}
    </div>
  )
}
