"use client"

import { ArrowRight, Check } from "lucide-react"

/**
 * The first milestone in the Command Center (Matt, 2 Nov 2026): five colleges saved in the first
 * week, the activation the funnel dashboard counts (lib/funnel/compute.ts). My List still grows
 * toward ten across levels; five is where a family has enough to start reaching out.
 */
export const FIRST_LIST_GOAL = 5

/** "2 of 5 saved" until five, then the next step: tell those coaches. */
export function FirstListProgress({ count, firstName, className = "" }: { count: number; firstName?: string | null; className?: string }) {
  if (count >= FIRST_LIST_GOAL) {
    return (
      <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-white ${className}`}>
        <span className="flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-400" aria-hidden />
          <span>
            <b>List started.</b> Next: tell these coaches {firstName || "your wrestler"} is interested.
          </span>
        </span>
        <a href="/my-recruiting/reach-out" className="inline-flex items-center gap-1 rounded-lg bg-[#D3B574] px-3 py-1.5 text-sm font-black text-[#0A1628] hover:bg-[#e2c98d]">
          Reach out <ArrowRight className="h-4 w-4" aria-hidden />
        </a>
      </div>
    )
  }
  return (
    <div className={`rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span>
          <b>Start with {FIRST_LIST_GOAL} colleges.</b> <span className="text-white/60">Save the ones worth a closer look.</span>
        </span>
        <span className="shrink-0 font-black tabular-nums">
          {count} of {FIRST_LIST_GOAL}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
        <div className="h-full rounded-full bg-[#D3B574] transition-all" style={{ width: `${(count / FIRST_LIST_GOAL) * 100}%` }} />
      </div>
    </div>
  )
}
