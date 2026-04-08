"use client"

import { useEffect, useState } from "react"

type PublicEntry = {
  id: string
  createdIso: string
  amountCents: number
  currency: string
  displayName: string
  raceSignup: boolean
  giftType: "race_donation" | "gift_only"
  athleteCode: string | null
  manualCreditName?: string | null
  creditLabel?: string | null
  attribution: string
}

type ByAthlete = {
  athleteCode: string
  totalCents: number
  donationCount: number
  raceSignupCount: number
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    cents / 100,
  )
}

export function SupporterActivitySection() {
  const [entries, setEntries] = useState<PublicEntry[] | null>(null)
  const [byAthlete, setByAthlete] = useState<ByAthlete[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch("/api/spartan/supporters?days=120")
        const j = (await res.json()) as {
          error?: string
          entries?: PublicEntry[]
          byAthlete?: ByAthlete[]
        }
        if (!res.ok) throw new Error(j.error || "Could not load")
        if (!cancelled) {
          setEntries(j.entries ?? [])
          setByAthlete(j.byAthlete ?? [])
          setErr(null)
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Failed")
          setEntries([])
          setByAthlete([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (err) {
    return (
      <section className="border-b border-[#2A2A2A] bg-[#0A0A0A] py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-[#888]">Supporter activity unavailable.</div>
      </section>
    )
  }

  if (entries === null) {
    return (
      <section className="border-b border-[#2A2A2A] bg-[#0A0A0A] py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-[#666]">Loading supporter activity…</div>
      </section>
    )
  }

  return (
    <section className="border-b border-[#2A2A2A] bg-[#0A0A0A] py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center font-[family-name:var(--font-barlow-spartan)] text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">
          Supporter activity
        </h2>

        {entries.length === 0 ? (
          <p className="mt-10 text-center text-sm text-[#666]">Paid gifts will appear here as they come in.</p>
        ) : (
          <div className="mt-10 overflow-x-auto rounded border border-[#2A2A2A]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A] bg-[#141414] text-[11px] font-semibold uppercase tracking-wider text-[#888]">
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Amount</th>
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Race / give</th>
                  <th className="px-3 py-3">Athlete</th>
                </tr>
              </thead>
              <tbody className="text-[#ccc]">
                {entries.map((row) => (
                  <tr key={row.id} className="border-b border-[#222] last:border-0">
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-[#999]">
                      {new Date(row.createdIso).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 font-semibold tabular-nums text-white">{formatUsd(row.amountCents)}</td>
                    <td className="max-w-[180px] truncate px-3 py-2.5">{row.displayName}</td>
                    <td className="px-3 py-2.5">
                      {row.raceSignup ? (
                        <span className="rounded bg-[#CC0000]/25 px-2 py-0.5 text-[11px] font-medium text-[#f0a0a0]">
                          Race
                        </span>
                      ) : (
                        <span className="rounded bg-white/10 px-2 py-0.5 text-[11px] text-[#aaa]">Give</span>
                      )}
                    </td>
                    <td className="max-w-[220px] px-3 py-2.5 text-sm text-[#ddd]">
                      {row.creditLabel ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {byAthlete && byAthlete.length > 0 && (
          <div className="mt-14">
            <h3 className="text-center font-[family-name:var(--font-barlow-spartan)] text-xl font-bold uppercase tracking-tight text-white">
              Totals by athlete
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-center text-xs text-[#666]">
              Aggregated from gifts with an athlete code in the same window as above.
            </p>
            <div className="mt-6 overflow-x-auto rounded border border-[#2A2A2A]">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#2A2A2A] bg-[#141414] text-[11px] font-semibold uppercase tracking-wider text-[#888]">
                    <th className="px-3 py-3">Athlete code</th>
                    <th className="px-3 py-3">Raised</th>
                    <th className="px-3 py-3">Gifts</th>
                    <th className="px-3 py-3">Race signups</th>
                  </tr>
                </thead>
                <tbody className="text-[#ccc]">
                  {byAthlete.map((a) => (
                    <tr key={a.athleteCode} className="border-b border-[#222] last:border-0">
                      <td className="px-3 py-2.5 font-mono text-xs text-[#C8A94A]">{a.athleteCode}</td>
                      <td className="px-3 py-2.5 font-semibold tabular-nums text-white">{formatUsd(a.totalCents)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{a.donationCount}</td>
                      <td className="px-3 py-2.5 tabular-nums text-[#aaa]">{a.raceSignupCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
