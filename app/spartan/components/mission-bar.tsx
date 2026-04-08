"use client"

import { useEffect, useState } from "react"

/** Public goal shown next to the progress bar — wire RAISED_CENTS from Stripe/DB when ready. */
const GOAL_CENTS = 1_000_000 // $10,000
const RAISED_CENTS = 0
const DONATIONS_COUNT = 0

export function MissionBar() {
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const target = Math.min(100, (RAISED_CENTS / GOAL_CENTS) * 100)
    const t = requestAnimationFrame(() => setPct(target > 0 ? target : 0.5))
    return () => cancelAnimationFrame(t)
  }, [])

  const raisedUsd = (RAISED_CENTS / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
  const goalUsd = (GOAL_CENTS / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

  return (
    <section className="border-b border-[#2A2A2A] bg-[#1A1A1A] py-14">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-10 md:grid-cols-3 md:gap-6">
          <div className="text-center md:text-left">
            <p className="font-[family-name:var(--font-barlow-spartan)] text-sm font-semibold uppercase tracking-[0.12em] text-[#999]">
              Fundraising
            </p>
            <p className="mt-2 font-[family-name:var(--font-barlow-spartan)] text-3xl font-black tabular-nums text-white md:text-4xl">
              {raisedUsd}{" "}
              <span className="text-lg font-bold text-[#666]">/ {goalUsd}</span>
            </p>
            <div className="mt-4 h-2 w-full max-w-md overflow-hidden rounded-sm bg-[#2A2A2A] md:max-w-none">
              <div
                className="h-full rounded-sm bg-[#CC0000] transition-[width] duration-1000 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <div className="text-center">
            <p className="font-[family-name:var(--font-barlow-spartan)] text-sm font-semibold uppercase tracking-[0.12em] text-[#999]">
              Runners registered
            </p>
            <p className="mt-2 font-[family-name:var(--font-barlow-spartan)] text-4xl font-black tabular-nums text-[#CC0000]">
              0
            </p>
            <p className="mt-1 text-sm text-[#666]">Via this campaign — updating soon</p>
          </div>
          <div className="text-center md:text-right">
            <p className="font-[family-name:var(--font-barlow-spartan)] text-sm font-semibold uppercase tracking-[0.12em] text-[#999]">
              Donations
            </p>
            <p className="mt-2 font-[family-name:var(--font-barlow-spartan)] text-4xl font-black tabular-nums text-white">
              {DONATIONS_COUNT}
            </p>
            <p className="mt-1 text-sm text-[#666]">Completed gifts via this page — updating soon</p>
          </div>
        </div>
      </div>
    </section>
  )
}
