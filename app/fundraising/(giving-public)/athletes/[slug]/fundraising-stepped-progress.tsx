/**
 * Stepped fundraising progress - gamified milestone visualization.
 * Mobile-first design optimized for iPhone (90% of users).
 * Each tier "unlocks" as donations accumulate, creating a sense of achievement.
 */

"use client"

import { formatUsdWhole } from "@/app/fundraising/components/FundraisingHero"
import {
  DEFAULT_FUNNEL_GOAL_CENTS,
  milestonesCentsForGoal,
  resolvedGoalCents,
} from "@/lib/fundraising/milestone-trail"
import { Trophy, Star, Target, Flame, Crown, Check } from "lucide-react"

type Props = {
  raisedCents: number
  goalCents?: number | null
  athleteLabel?: string
  showOwnerHints?: boolean
  giftCount?: number
}

const TIER_ICONS = [Target, Flame, Star, Trophy, Crown]
const TIER_LABELS = ["Starter", "Rising", "Strong", "Elite", "Champion"]

export function FundraisingSteppedProgress({ raisedCents, goalCents, athleteLabel, showOwnerHints = false, giftCount }: Props) {
  const goalForFill = resolvedGoalCents(goalCents)
  const milestones = milestonesCentsForGoal(goalForFill)
  const hasCustomGoal = goalCents != null && goalCents > 0
  const labelForHints = athleteLabel?.trim() || "this athlete"

  // Calculate overall progress percentage
  const overallProgress = goalForFill > 0 ? Math.min(100, Math.round((raisedCents / goalForFill) * 100)) : 0

  // Find current tier (how many milestones have been hit)
  const completedTiers = milestones.filter((m) => raisedCents >= m).length
  const totalTiers = milestones.length

  // Calculate progress within current tier
  const currentTierIndex = completedTiers
  const prevMilestone = currentTierIndex > 0 ? milestones[currentTierIndex - 1] : 0
  const nextMilestone = milestones[currentTierIndex] ?? goalForFill
  const tierProgress =
    nextMilestone > prevMilestone
      ? Math.min(100, Math.round(((raisedCents - prevMilestone) / (nextMilestone - prevMilestone)) * 100))
      : 100

  return (
    <div className="mt-6 rounded-xl border border-[#C8A94A]/25 bg-gradient-to-b from-[#0B2545]/70 to-[#061224]/90 px-4 py-5">
      {/* Header - stacked on mobile */}
      <div className="flex flex-col gap-1">
        <h2 className="font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]">
          Support Journey
        </h2>
        <p className="text-xs text-white/50">
          {completedTiers} of {totalTiers} milestones unlocked
        </p>
      </div>

      {/* Main stats - large touch-friendly display */}
      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="flex flex-col">
          <span className="font-[family-name:var(--font-fundraising-display)] text-4xl font-black tabular-nums text-white">
            {formatUsdWhole(raisedCents)}
          </span>
          <span className="mt-1 text-sm text-white/50">
            {hasCustomGoal ? (
              <>of {formatUsdWhole(goalCents)} goal</>
            ) : showOwnerHints ? (
              <>raised (set a goal above)</>
            ) : (
              <>raised</>
            )}
          </span>
        </div>
        {giftCount != null && giftCount > 0 && (
          <div className="flex flex-col items-end">
            <span className="font-[family-name:var(--font-fundraising-display)] text-2xl font-black tabular-nums text-white">
              {giftCount}
            </span>
            <span className="text-xs text-white/50">{giftCount === 1 ? "gift" : "gifts"}</span>
          </div>
        )}
      </div>

      {/* Overall progress bar - thicker for mobile visibility */}
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#C8A94A] to-[#d4b75c] transition-[width] duration-700 ease-out"
          style={{ width: `${overallProgress}%` }}
        />
      </div>
      <p className="mt-2 text-right text-xs font-semibold tabular-nums text-[#C8A94A]">{overallProgress}% complete</p>

      {/* Milestones - vertical stack on mobile for better touch targets */}
      <div className="mt-6 flex flex-col gap-3">
        {milestones.map((cent, idx) => {
          const isCompleted = raisedCents >= cent
          const isCurrent = idx === currentTierIndex
          const Icon = TIER_ICONS[idx % TIER_ICONS.length]
          const tierLabel = TIER_LABELS[idx % TIER_LABELS.length]

          return (
            <div
              key={cent}
              className={`flex items-center gap-4 rounded-lg border px-4 py-3 transition-all ${
                isCompleted
                  ? "border-[#C8A94A]/40 bg-[#C8A94A]/10"
                  : isCurrent
                    ? "border-[#C8A94A]/30 bg-white/5"
                    : "border-white/10 bg-white/[0.02]"
              }`}
            >
              {/* Icon circle - 44px minimum touch target */}
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 ${
                  isCompleted
                    ? "border-[#C8A94A] bg-[#C8A94A] text-[#061224]"
                    : isCurrent
                      ? "border-[#C8A94A] bg-[#C8A94A]/20 text-[#C8A94A]"
                      : "border-white/20 bg-white/5 text-white/30"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" strokeWidth={3} />
                ) : (
                  <Icon className="h-5 w-5" strokeWidth={2} />
                )}
              </div>

              {/* Tier info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`text-sm font-bold ${
                      isCompleted ? "text-[#C8A94A]" : isCurrent ? "text-white" : "text-white/40"
                    }`}
                  >
                    {tierLabel}
                  </span>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      isCompleted ? "text-[#C8A94A]" : isCurrent ? "text-white/80" : "text-white/35"
                    }`}
                  >
                    {formatUsdWhole(cent)}
                  </span>
                </div>
                <p
                  className={`mt-0.5 text-xs ${
                    isCompleted ? "text-emerald-400" : isCurrent ? "text-[#C8A94A]/80" : "text-white/30"
                  }`}
                >
                  {isCompleted ? "Unlocked" : isCurrent ? "In progress" : "Locked"}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Current tier progress (if not all complete) */}
      {currentTierIndex < totalTiers && (
        <div className="mt-5 rounded-lg border border-white/10 bg-black/25 px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-white/70">
              Next: <span className="font-semibold tabular-nums text-[#C8A94A]">{formatUsdWhole(nextMilestone)}</span>
            </p>
            <p className="text-sm font-semibold tabular-nums text-white/60">{tierProgress}%</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0d9488] to-[#4ade80] transition-[width] duration-500"
              style={{ width: `${tierProgress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-white/40">
            {formatUsdWhole(nextMilestone - raisedCents)} to go
          </p>
        </div>
      )}

      {/* All milestones complete celebration */}
      {completedTiers === totalTiers && (
        <div className="mt-5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-4 text-center">
          <p className="text-sm font-semibold text-emerald-300">
            Goal reached! Thank you to everyone who supported {labelForHints}.
          </p>
        </div>
      )}

      {/* Footer hint */}
      {showOwnerHints ? (
        <p className="mt-5 text-center text-xs leading-relaxed text-white/40">
          {hasCustomGoal ? (
            <>
              Milestones based on {labelForHints}&apos;s goal of{" "}
              <span className="tabular-nums text-white/55">{formatUsdWhole(goalCents)}</span>.
            </>
          ) : (
            <>
              Set {labelForHints}&apos;s goal above to customize milestones.
            </>
          )}
        </p>
      ) : (
        <p className="mt-5 text-center text-xs leading-relaxed text-white/45">
          Help {labelForHints} unlock the next milestone.
        </p>
      )}
    </div>
  )
}
