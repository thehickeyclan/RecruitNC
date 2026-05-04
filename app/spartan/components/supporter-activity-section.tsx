"use client"

import { useMemo, useState } from "react"
import type { SpartanPublicEntry } from "./spartan-metrics-provider"
import { useSpartanMetrics } from "./spartan-metrics-provider"

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    cents / 100,
  )
}

const FILTER_ALL = ""
const FILTER_UNCREDITED = "__uncredited__"

const SORT_OPTIONS = [
  { value: "date-desc", label: "Date · newest first" },
  { value: "date-asc", label: "Date · oldest first" },
  { value: "amount-desc", label: "Amount · high to low" },
  { value: "amount-asc", label: "Amount · low to high" },
  { value: "athlete-asc", label: "Athlete · A to Z" },
  { value: "athlete-desc", label: "Athlete · Z to A" },
] as const

type SortValue = (typeof SORT_OPTIONS)[number]["value"]

function athleteLabel(e: SpartanPublicEntry): string {
  return (e.creditLabel ?? "").trim()
}

function filterEntries(entries: SpartanPublicEntry[], athleteFilter: string): SpartanPublicEntry[] {
  if (athleteFilter === FILTER_ALL) return entries
  if (athleteFilter === FILTER_UNCREDITED) {
    return entries.filter((row) => !athleteLabel(row))
  }
  return entries.filter((row) => athleteLabel(row) === athleteFilter)
}

function sortEntries(entries: SpartanPublicEntry[], sort: SortValue): SpartanPublicEntry[] {
  const arr = [...entries]
  switch (sort) {
    case "date-desc":
      arr.sort((a, b) => new Date(b.createdIso).getTime() - new Date(a.createdIso).getTime())
      break
    case "date-asc":
      arr.sort((a, b) => new Date(a.createdIso).getTime() - new Date(b.createdIso).getTime())
      break
    case "amount-desc":
      arr.sort((a, b) => b.amountCents - a.amountCents)
      break
    case "amount-asc":
      arr.sort((a, b) => a.amountCents - b.amountCents)
      break
    case "athlete-asc": {
      const key = (e: SpartanPublicEntry) => athleteLabel(e).toLowerCase() || "\uFFFF"
      arr.sort((a, b) => key(a).localeCompare(key(b)))
      break
    }
    case "athlete-desc": {
      const key = (e: SpartanPublicEntry) => athleteLabel(e).toLowerCase() || ""
      arr.sort((a, b) => key(b).localeCompare(key(a)))
      break
    }
    default:
      break
  }
  return arr
}

const selectCls =
  "rounded border border-[#333] bg-[#141414] px-3 py-2 text-sm text-white outline-none focus:border-[#CC0000]"

export function SupporterActivitySection() {
  const { entries, byAthlete, summary, loading, error } = useSpartanMetrics()
  const [sort, setSort] = useState<SortValue>("date-desc")
  const [athleteFilter, setAthleteFilter] = useState<string>(FILTER_ALL)

  const athleteFilterOptions = useMemo(() => {
    const labels = new Set<string>()
    for (const e of entries) {
      const L = athleteLabel(e)
      if (L) labels.add(L)
    }
    return [...labels].sort((a, b) => a.localeCompare(b))
  }, [entries])

  const hasUncredited = useMemo(() => entries.some((e) => !athleteLabel(e)), [entries])

  const visibleEntries = useMemo(() => {
    const filtered = filterEntries(entries, athleteFilter)
    return sortEntries(filtered, sort)
  }, [entries, athleteFilter, sort])

  if (error) {
    return (
      <section className="border-b border-[#2A2A2A] bg-[#0A0A0A] py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-[#888]">Supporter activity unavailable.</div>
      </section>
    )
  }

  if (loading) {
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
          <>
            <div className="mx-auto mt-8 flex max-w-4xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
              <label className="flex flex-col gap-1 text-left sm:min-w-[200px]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#888]">Athlete</span>
                <select
                  className={selectCls}
                  value={athleteFilter}
                  onChange={(e) => setAthleteFilter(e.target.value)}
                  aria-label="Filter by credited athlete"
                >
                  <option value={FILTER_ALL}>All athletes</option>
                  {hasUncredited && (
                    <option value={FILTER_UNCREDITED}>Uncredited · NC United fund</option>
                  )}
                  {athleteFilterOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-left sm:min-w-[220px]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#888]">Sort</span>
                <select
                  className={selectCls}
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortValue)}
                  aria-label="Sort donations"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-3 text-center text-xs text-[#555]">
              Showing {visibleEntries.length} of {entries.length} gifts
            </p>

            <div className="mt-6 overflow-x-auto rounded border border-[#2A2A2A]">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#2A2A2A] bg-[#141414] text-[11px] font-semibold uppercase tracking-wider text-[#888]">
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Donor</th>
                    <th className="px-3 py-3">Runner</th>
                    <th className="px-3 py-3">Race / support</th>
                    <th className="px-3 py-3">Athlete</th>
                  </tr>
                </thead>
                <tbody className="text-[#ccc]">
                  {visibleEntries.map((row) => (
                    <tr key={row.id} className="border-b border-[#222] last:border-0">
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-[#999]">
                        {new Date(row.createdIso).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 font-semibold tabular-nums text-white">{formatUsd(row.amountCents)}</td>
                      <td className="max-w-[160px] truncate px-3 py-2.5">{row.displayName}</td>
                      <td className="max-w-[140px] truncate px-3 py-2.5 text-[#aaa]">
                        {row.raceParticipantName?.trim() ? row.raceParticipantName : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        {row.raceSignup ? (
                          <span className="rounded bg-[#CC0000]/25 px-2 py-0.5 text-[11px] font-medium text-[#f0a0a0]">
                            Race
                          </span>
                        ) : (
                          <span className="rounded bg-white/10 px-2 py-0.5 text-[11px] text-[#aaa]">Support</span>
                        )}
                      </td>
                      <td className="max-w-[220px] px-3 py-2.5 text-sm text-[#ddd]">{row.creditLabel ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {(byAthlete.length > 0 || (summary?.ncUnitedCommunityFundCents ?? 0) > 0) && (
          <div className="mt-14">
            <h3 className="text-center font-[family-name:var(--font-barlow-spartan)] text-xl font-bold uppercase tracking-tight text-white">
              Totals by athlete
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-center text-xs text-[#666]">
              NC United fund (no wrestler credit) and per-athlete totals for the same window as above.
            </p>
            <div className="mt-6 overflow-x-auto rounded border border-[#2A2A2A]">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#2A2A2A] bg-[#141414] text-[11px] font-semibold uppercase tracking-wider text-[#888]">
                    <th className="px-3 py-3">Athlete</th>
                    <th className="px-3 py-3">Raised</th>
                    <th className="px-3 py-3">Gifts</th>
                    <th className="px-3 py-3">Race signups</th>
                  </tr>
                </thead>
                <tbody className="text-[#ccc]">
                  {(summary?.ncUnitedCommunityFundCents ?? 0) > 0 && summary && (
                    <tr className="border-b border-[#222] bg-[#141414]/60">
                      <td className="px-3 py-2.5 text-sm text-[#ddd]">
                        <span className="font-medium text-white">NC United fund</span>
                        <span className="mt-0.5 block text-[11px] text-[#888]">Community · not credited to a wrestler</span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold tabular-nums text-white">
                        {formatUsd(summary.ncUnitedCommunityFundCents ?? 0)}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">{summary.ncUnitedCommunityGiftCount ?? 0}</td>
                      <td className="px-3 py-2.5 tabular-nums text-[#aaa]">
                        {summary.ncUnitedCommunityRaceSignupCount ?? 0}
                      </td>
                    </tr>
                  )}
                  {byAthlete.map((a) => (
                    <tr key={a.athleteCode} className="border-b border-[#222] last:border-0">
                      <td className="px-3 py-2.5 text-sm text-[#ddd]">
                        <span className="font-medium text-white">{a.athleteName}</span>
                        <span className="mt-0.5 block font-mono text-[11px] text-[#888]">{a.athleteCode}</span>
                      </td>
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
