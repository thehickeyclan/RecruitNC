/**
 * Stepped fundraising progress - gamified milestone visualization.
 * Each tier "unlocks" as donations accumulate, creating a sense of achievement.
 * Clean, professional aesthetic inspired by premium sports brands.
 */

"use client"

import { formatUsdWhole } from "@/app/fundraising/components/FundraisingHero"
import {
  DEFAULT_FUNNEL_GOAL_CENTS,
  milestonesCentsForGoal,
  resolvedGoalCents,
} from "@/lib/fundraising/milestone-trail"
import { Trophy, Star, Target, Flame, Crown } from "lucide-react"

type Props = {
  raisedCents: number
  goalCents?: number | null
  athleteLabel?: string
  showOwnerHints?: boolean
}

const TIER_ICONS = [Target, Flame, Star, Trophy, Crown]
const TIER_LABELS = ["Starter", "Rising", "Strong", "Elite", "Champion"]

export function FundraisingSteppedProgress({ raisedCents, goalCents, athleteLabel, showOwnerHints = false }: Props) {
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
    <div className="mt-8 rounded-xl border border-[#C8A94A]/25 bg-gradient-to-b from-[#0B2545]/70 to-[#061224]/90 px-4 py-5 sm:px-6 sm:py-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]">
          Support Journey
        </h2>
        <p className="text-[11px] text-white/45">
          {completedTiers} of {totalTiers} milestones unlocked
        </p>
      </div>

      {/* Main stats */}
      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-[family-name:var(--font-fundraising-display)] text-3xl font-black tabular-nums text-white">
          {formatUsdWhole(raisedCents)}
        </span>
        <span className="text-sm text-white/50">
          {hasCustomGoal ? (
            <>of {formatUsdWhole(goalCents)} goal</>
          ) : showOwnerHints ? (
            <>raised (set a goal above)</>
          ) : (
            <>raised</>
          )}
        </span>
      </div>

      {/* Overall progress bar */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#C8A94A] to-[#d4b75c] transition-[width] duration-700 ease-out"
          style={{ width: `${overallProgress}%` }}
        />
      </div>
      <p className="mt-1.5 text-right text-[11px] font-medium tabular-nums text-[#C8A94A]">{overallProgress}%</p>

      {/* Stepped milestones */}
      <div className="mt-6">
        <div className="flex items-stretch justify-between gap-1">
          {milestones.map((cent, idx) => {
            const isCompleted = raisedCents >= cent
            const isCurrent = idx === currentTierIndex
            const isLocked = idx > currentTierIndex
            const Icon = TIER_ICONS[idx % TIER_ICONS.length]
            const tierLabel = TIER_LABELS[idx % TIER_LABELS.length]

            return (
              <div
                key={cent}
                className={`group relative flex flex-1 flex-col items-center ${
                  idx < milestones.length - 1 ? "after:absolute after:left-[calc(50%+16px)] after:top-5 after:h-[2px] after:w-[calc(100%-32px)] after:content-['']" : ""
                } ${
                  isCompleted
                    ? "after:bg-[#C8A94A]"
                    : isCurrent
                      ? "after:bg-gradient-to-r after:from-[#C8A94A] after:to-white/15"
                      : "after:bg-white/10"
                }`}
              >
                {/* Tier circle */}
                <div
                  className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    isCompleted
                      ? "border-[#C8A94A] bg-[#C8A94A] text-[#061224] shadow-[0_0_20px_rgba(200,169,74,0.4)]"
                      : isCurrent
                        ? "border-[#C8A94A] bg-[#C8A94A]/20 text-[#C8A94A]"
                        : "border-white/20 bg-white/5 text-white/30"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={isCompleted ? 2.5 : 2} />
                </div>

                {/* Amount label */}
                <p
                  className={`mt-2 text-center text-[10px] font-bold tabular-nums uppercase tracking-wide ${
                    isCompleted ? "text-[#C8A94A]" : isCurrent ? "text-white/80" : "text-white/35"
                  }`}
                >
                  {formatUsdWhole(cent)}
                </p>

                {/* Tier name - show on hover/focus or when current */}
                <p
                  className={`mt-0.5 text-center text-[9px] uppercase tracking-wider transition-opacity ${
                    isCompleted
                      ? "text-emerald-400/80"
                      : isCurrent
                        ? "text-[#C8A94A]/80"
                        : "text-white/25"
                  }`}
                >
                  {isCompleted ? "Unlocked" : isCurrent ? "Next" : tierLabel}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Current tier progress (if not all complete) */}
      {currentTierIndex < totalTiers && (
        <div className="mt-6 rounded-lg border border-white/10 bg-black/20 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-white/60">
              <span className="font-semibold text-white/80">Next milestone:</span>{" "}
              <span className="tabular-nums text-[#C8A94A]">{formatUsdWhole(nextMilestone)}</span>
            </p>
            <p className="text-[11px] font-medium tabular-nums text-white/50">{tierProgress}% there</p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0d9488] to-[#4ade80] transition-[width] duration-500"
              style={{ width: `${tierProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* All milestones complete celebration */}
      {completedTiers === totalTiers && (
        <div className="mt-6 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-center">
          <p className="text-sm font-semibold text-emerald-300">
            Goal reached! Thank you to everyone who supported {labelForHints}.
          </p>
        </div>
      )}

      {/* Footer hint */}
      {showOwnerHints ? (
        <p className="mt-5 text-center text-[11px] leading-snug text-white/40">
          {hasCustomGoal ? (
            <>
              Milestones are based on <strong className="text-white/55">{labelForHints}&apos;s goal</strong> of{" "}
              <span className="tabular-nums text-white/55">{formatUsdWhole(goalCents)}</span>. Each tier unlocks as
              donations accumulate.
            </>
          ) : (
            <>
              Set <strong className="text-white/55">{labelForHints}&apos;s goal</strong> above to customize milestones.
              Currently showing a{" "}
              <span className="tabular-nums text-white/55">{formatUsdWhole(DEFAULT_FUNNEL_GOAL_CENTS)}</span> sample.
            </>
          )}
        </p>
      ) : (
        <p className="mt-5 text-center text-[11px] leading-snug text-white/45">
          Help {labelForHints} unlock the next milestone. Every gift moves the journey forward.
        </p>
      )}
    </div>
  )
}
