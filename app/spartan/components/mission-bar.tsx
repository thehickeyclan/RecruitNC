"use client"

import { useEffect, useState } from "react"
import { useSpartanMetrics } from "./spartan-metrics-provider"

/** Public goal next to the progress bar (same campaign window as supporter activity). */
const GOAL_CENTS = 1_000_000 // $10,000

export function MissionBar() {
  const { summary, loading, error } = useSpartanMetrics()
  const [pct, setPct] = useState(0)

  const raisedCents = summary?.totalRaisedCents ?? 0
  const runners = summary?.raceEntryCount ?? 0
  const donations = summary?.giftCount ?? 0
  const ncUnitedFundCents = summary?.ncUnitedCommunityFundCents ?? 0

  useEffect(() => {
    const target = GOAL_CENTS > 0 ? Math.min(100, (raisedCents / GOAL_CENTS) * 100) : 0
    const t = requestAnimationFrame(() => setPct(target > 0 ? target : 0.5))
    return () => cancelAnimationFrame(t)
  }, [raisedCents])

  const raisedUsd = (raisedCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
  const goalUsd = (GOAL_CENTS / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
  const ncUnitedUsd = (ncUnitedFundCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })

  return (
    <section className="border-b border-[#2A2A2A] bg-[#1A1A1A] py-14">
      <div className="mx-auto max-w-6xl px-4">
        {error && (
          <p className="mb-4 text-center text-xs text-amber-600/90">Live totals unavailable — refresh the page in a moment.</p>
        )}
        <div className="grid gap-10 md:grid-cols-3 md:gap-6">
          <div className="text-center md:text-left">
            <p className="font-[family-name:var(--font-barlow-spartan)] text-sm font-semibold uppercase tracking-[0.12em] text-[#999]">
              Fundraising
            </p>
            <p
              className={`mt-2 font-[family-name:var(--font-barlow-spartan)] text-3xl font-black tabular-nums text-white md:text-4xl ${loading ? "opacity-60" : ""}`}
            >
              {loading ? "…" : raisedUsd}{" "}
              <span className="text-lg font-bold text-[#666]">/ {goalUsd}</span>
            </p>
            <div className="mt-4 h-2 w-full max-w-md overflow-hidden rounded-sm bg-[#2A2A2A] md:max-w-none">
              <div
                className="h-full rounded-sm bg-[#CC0000] transition-[width] duration-1000 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            {!loading && ncUnitedFundCents > 0 && (
              <p className="mt-3 max-w-md text-left text-xs leading-snug text-[#888] md:max-w-none">
                <span className="font-semibold text-[#aaa]">NC United fund</span> (community programs, not tied to a
                single athlete): {ncUnitedUsd}
              </p>
            )}
          </div>
          <div className="text-center">
            <p className="font-[family-name:var(--font-barlow-spartan)] text-sm font-semibold uppercase tracking-[0.12em] text-[#999]">
              Race checkouts
            </p>
            <p
              className={`mt-2 font-[family-name:var(--font-barlow-spartan)] text-4xl font-black tabular-nums text-[#CC0000] ${loading ? "opacity-60" : ""}`}
            >
              {loading ? "…" : runners}
            </p>
            <p className="mt-1 text-sm text-[#666]">Any Spartan distance · checkout here</p>
          </div>
          <div className="text-center md:text-right">
            <p className="font-[family-name:var(--font-barlow-spartan)] text-sm font-semibold uppercase tracking-[0.12em] text-[#999]">
              Donations
            </p>
            <p
              className={`mt-2 font-[family-name:var(--font-barlow-spartan)] text-4xl font-black tabular-nums text-white ${loading ? "opacity-60" : ""}`}
            >
              {loading ? "…" : donations}
            </p>
            <p className="mt-1 text-sm text-[#666]">Completed gifts via this page</p>
          </div>
        </div>
      </div>
    </section>
  )
}
