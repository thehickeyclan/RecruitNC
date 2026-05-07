/**
 * Vertical “trophy cup” fill visualization with dollar milestones for athlete fundraising pages.
 */

import { formatUsdWhole } from "@/app/fundraising/components/FundraisingHero"

export const FUNDRAISING_MILESTONE_DOLLARS = [250, 500, 1000, 2500, 5000, 10000, 25000, 50000] as const

type Props = {
  raisedCents: number
  goalCents?: number | null
  /** First name or short label for aria / microcopy */
  athleteLabel?: string
}

/** Cup interior: top and bottom Y in viewBox coords (fill grows upward from bottomY). */
const VB = { w: 200, h: 260, innerLeft: 52, innerRight: 148, topY: 52, bottomY: 188 }

/** Full ladder for the milestone list (always show every tier). */
function milestoneListCents(): number[] {
  return FUNDRAISING_MILESTONE_DOLLARS.map((d) => d * 100)
}

/**
 * Scale used only for cup fill + inner tick marks.
 * Previously we divided by the full $50k ladder, so ~$500 showed as ~1% fill (invisible).
 * Now the liquid rises toward the next milestone / goal so early dollars read clearly.
 */
function cupScaleMaxCents(raised: number, goal: number | null | undefined): number {
  const lastMilestoneCents = FUNDRAISING_MILESTONE_DOLLARS[FUNDRAISING_MILESTONE_DOLLARS.length - 1]! * 100
  const asc = FUNDRAISING_MILESTONE_DOLLARS.map((d) => d * 100)
  const nextAbove = asc.find((c) => c > raised) ?? lastMilestoneCents

  let target = nextAbove
  if (goal != null && goal > 0 && raised < goal) {
    target = Math.max(target, goal)
  }

  const MIN_SPAN = 25_000 // $250 — avoid divide-by-zero-ish sliver when idle
  return Math.min(lastMilestoneCents, Math.max(target, MIN_SPAN))
}

export function FundraisingMilestoneTrophy({ raisedCents, goalCents, athleteLabel }: Props) {
  const cupMaxCents = cupScaleMaxCents(raisedCents, goalCents)
  const fillRatio = cupMaxCents > 0 ? Math.min(1, raisedCents / cupMaxCents) : 0
  const innerH = VB.bottomY - VB.topY
  const fillH = innerH * fillRatio
  const milestones = milestoneListCents()

  const cupTicks = milestones.filter((c) => c <= cupMaxCents)

  const aria = athleteLabel?.trim()
    ? `${athleteLabel}: ${formatUsdWhole(raisedCents)} raised; cup fill scales toward ${formatUsdWhole(cupMaxCents)}.`
    : `${formatUsdWhole(raisedCents)} raised; cup fill scales toward ${formatUsdWhole(cupMaxCents)}.`

  return (
    <div className="mt-8 rounded-xl border border-[#C8A94A]/25 bg-[#0B2545]/55 px-4 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]">
          Fundraising trophy trail
        </h2>
        <p className="text-[11px] text-white/45">Milestone markers · keep climbing</p>
      </div>
      <p className="mt-2 text-sm text-white/70">
        <span className="font-semibold text-[#C8A94A] tabular-nums">{formatUsdWhole(raisedCents)}</span> raised
        {goalCents != null && goalCents > 0 ? (
          <>
            {" "}
            · goal <span className="tabular-nums text-white/85">{formatUsdWhole(goalCents)}</span>
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
              <linearGradient id="trophyFillGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#7a1e1e" />
                <stop offset="45%" stopColor="#CC0000" />
                <stop offset="100%" stopColor="#C8A94A" />
              </linearGradient>
              <linearGradient id="trophyStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e8d48b" />
                <stop offset="50%" stopColor="#C8A94A" />
                <stop offset="100%" stopColor="#8a7029" />
              </linearGradient>
              <clipPath id="trophyInnerClip">
                <path
                  d={`M ${VB.innerLeft} ${VB.topY} 
                      L ${VB.innerRight} ${VB.topY} 
                      L ${VB.innerRight} ${VB.bottomY} 
                      L ${VB.innerLeft} ${VB.bottomY} Z`}
                />
              </clipPath>
            </defs>

            {/* Handles */}
            <path
              d="M 38 78 Q 22 72 22 95 Q 22 118 38 112"
              fill="none"
              stroke="url(#trophyStrokeGrad)"
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.85}
            />
            <path
              d="M 162 78 Q 178 72 178 95 Q 178 118 162 112"
              fill="none"
              stroke="url(#trophyStrokeGrad)"
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.85}
            />

            {/* Cup outer */}
            <path
              d={`M 44 48 
                  L 156 48 
                  L 148 ${VB.bottomY + 2} 
                  L 52 ${VB.bottomY + 2} Z`}
              fill="none"
              stroke="url(#trophyStrokeGrad)"
              strokeWidth={3}
              strokeLinejoin="round"
            />

            {/* Liquid fill (clipped to inner rectangle) */}
            <g clipPath="url(#trophyInnerClip)">
              <rect
                x={VB.innerLeft}
                y={VB.bottomY - fillH}
                width={VB.innerRight - VB.innerLeft}
                height={fillH}
                fill="url(#trophyFillGrad)"
                opacity={0.92}
              />
            </g>

            {/* Inner rim highlight */}
            <path
              d={`M ${VB.innerLeft} ${VB.topY} L ${VB.innerRight} ${VB.topY}`}
              fill="none"
              stroke="white"
              strokeWidth={1}
              strokeOpacity={0.25}
            />

            {/* Milestone ticks inside cup */}
            {cupTicks.map((cent) => {
              const ratio = cent / cupMaxCents
              const y = VB.bottomY - innerH * ratio
              const hit = raisedCents >= cent
              return (
                <g key={cent}>
                  <line
                    x1={VB.innerLeft - 2}
                    x2={VB.innerRight + 2}
                    y1={y}
                    y2={y}
                    stroke={hit ? "#f5e6a8" : "rgba(255,255,255,0.22)"}
                    strokeWidth={hit ? 1.5 : 1}
                    strokeDasharray={hit ? undefined : "4 3"}
                  />
                </g>
              )
            })}

            {/* Stem + base */}
            <path
              d="M 76 192 L 76 218 L 60 232 L 140 232 L 124 218 L 124 192"
              fill="none"
              stroke="url(#trophyStrokeGrad)"
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
            <ellipse cx={100} cy={236} rx={44} ry={8} fill="none" stroke="url(#trophyStrokeGrad)" strokeWidth={2} />

            {/* Star / MOW nod */}
            <path
              d="M 100 28 L 104 38 L 115 38 L 106 45 L 110 56 L 100 50 L 90 56 L 94 45 L 85 38 L 96 38 Z"
              fill="#C8A94A"
              opacity={0.95}
            />
          </svg>
        </div>

        {/* Milestone list */}
        <ul className="min-w-0 flex-1 space-y-2">
          {milestones.map((cent) => {
            const hit = raisedCents >= cent
            const isNext =
              !hit &&
              milestones.find((m) => m > raisedCents) === cent
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

      <p className="mt-4 text-center text-[11px] leading-snug text-white/40">
        Fill level tracks progress toward your next milestone on this ladder (same ledger as your totals). Milestones on the
        right show the full trail
        {goalCents != null && goalCents > 0 ? "; your campaign goal also stretches the fill toward that target" : ""}.
      </p>
    </div>
  )
}
