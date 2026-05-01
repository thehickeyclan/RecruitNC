"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { HardLink } from "@/components/hard-link"
import {
  DEFAULT_FUNDRAISING_CAMPAIGN,
  fundraisingCampaignByStripeSlug,
} from "@/lib/fundraising/campaign-registry"

const NAVY = "#03154C"
const GOLD = "#CBAF5D"

export type LeaderboardCampaignOption = {
  stripeCampaignSlug: string
  campaignDisplayName: string
  tabLabel: string
  defaultLookbackDays: number
}

type SpartanMetricsSummary = {
  totalRaisedCents: number
  giftCount: number
  raceEntryCount: number
  ncUnitedCommunityFundCents?: number
  ncUnitedCommunityGiftCount?: number
  ncUnitedCommunityRaceSignupCount?: number
}

type SpartanByAthlete = {
  athleteCode: string
  athleteName: string
  totalCents: number
  donationCount: number
  raceSignupCount: number
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function LeaderboardSkeleton() {
  return (
    <div className="min-h-[50vh] bg-slate-100 pb-16 pt-12">
      <div className="mx-auto max-w-4xl px-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-8 h-64 animate-pulse rounded-xl bg-slate-200/80" />
      </div>
    </div>
  )
}

export function FundraisingLeaderboardContent({ campaigns }: { campaigns: LeaderboardCampaignOption[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const resolvedCampaignSlug = useMemo(() => {
    const raw = searchParams.get("campaign")?.trim()
    if (!raw) return DEFAULT_FUNDRAISING_CAMPAIGN.stripeCampaignSlug
    const found = fundraisingCampaignByStripeSlug(raw)
    return found?.stripeCampaignSlug ?? DEFAULT_FUNDRAISING_CAMPAIGN.stripeCampaignSlug
  }, [searchParams])

  const resolvedDays = useMemo(() => {
    const c = fundraisingCampaignByStripeSlug(resolvedCampaignSlug) ?? DEFAULT_FUNDRAISING_CAMPAIGN
    const n = Number(searchParams.get("days"))
    if (!Number.isFinite(n) || n < 1) return c.defaultLookbackDays
    return Math.min(400, Math.floor(n))
  }, [searchParams, resolvedCampaignSlug])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<SpartanMetricsSummary | null>(null)
  const [byAthlete, setByAthlete] = useState<SpartanByAthlete[]>([])
  const [meta, setMeta] = useState<{ campaignDisplayName: string } | null>(null)

  const commitFilters = useCallback(
    (slug: string, days: number) => {
      const q = new URLSearchParams()
      q.set("campaign", slug)
      q.set("days", String(days))
      router.push(`${pathname}?${q.toString()}`)
    },
    [pathname, router],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const q = new URLSearchParams({
          campaign: resolvedCampaignSlug,
          days: String(resolvedDays),
        })
        const res = await fetch(`/api/spartan/supporters?${q}`)
        const j = (await res.json()) as {
          error?: string
          summary?: SpartanMetricsSummary
          byAthlete?: SpartanByAthlete[]
          campaignDisplayName?: string
        }
        if (!res.ok) throw new Error(j.error || "Could not load leaderboard")
        if (cancelled) return
        setSummary(j.summary ?? null)
        setByAthlete(j.byAthlete ?? [])
        setMeta(j.campaignDisplayName ? { campaignDisplayName: j.campaignDisplayName } : null)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed")
          setSummary(null)
          setByAthlete([])
          setMeta(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [resolvedCampaignSlug, resolvedDays])

  const sortedAthletes = useMemo(() => [...byAthlete].sort((a, b) => b.totalCents - a.totalCents), [byAthlete])

  const campaignDefinition =
    fundraisingCampaignByStripeSlug(resolvedCampaignSlug) ?? DEFAULT_FUNDRAISING_CAMPAIGN
  const displayTitle = meta?.campaignDisplayName ?? campaignDefinition.campaignDisplayName

  const dayPresets = [30, 90, 120, 365]

  return (
    <div className="min-h-[70vh] bg-slate-100 pb-16">
      <header className="relative overflow-hidden px-4 pb-16 pt-12 sm:pb-20 sm:pt-14" style={{ backgroundColor: NAVY }}>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          aria-hidden
          style={{
            backgroundImage: `radial-gradient(circle at 20% 20%, ${GOLD} 0%, transparent 45%), radial-gradient(circle at 80% 80%, ${GOLD} 0%, transparent 40%)`,
          }}
        />
        <div className="relative mx-auto max-w-4xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: GOLD }}>
            NC United Wrestling · Transparency
          </p>
          <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-[2rem] sm:leading-tight">
            Fundraising leaderboard
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-white/88">
            Totals credited to athletes from paid gifts in the selected window. Donor names on gift feeds respect listing
            preferences (anonymous supporters appear without identification).
          </p>
        </div>
      </header>

      <div className="relative z-[1] mx-auto max-w-4xl px-4 sm:px-6" style={{ marginTop: "-3rem" }}>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.25)] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div className="flex flex-col gap-2">
              <label htmlFor="leaderboard-campaign" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Campaign
              </label>
              <select
                id="leaderboard-campaign"
                className="max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#03154C]"
                value={resolvedCampaignSlug}
                onChange={(e) => commitFilters(e.target.value, resolvedDays)}
              >
                {campaigns.map((c) => (
                  <option key={c.stripeCampaignSlug} value={c.stripeCampaignSlug}>
                    {c.tabLabel}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lookback window</span>
              <div className="flex flex-wrap gap-2">
                {dayPresets.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#03154C] focus-visible:ring-offset-2 ${
                      resolvedDays === d
                        ? "border-[#03154C] bg-[#03154C] text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                    onClick={() => commitFilters(resolvedCampaignSlug, d)}
                  >
                    {d} days
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-6 text-sm font-semibold text-slate-900">{displayTitle}</p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">Stripe campaign · {resolvedCampaignSlug}</p>

          {loading ? (
            <p className="mt-10 text-center text-sm text-slate-500">Loading totals…</p>
          ) : error ? (
            <p className="mt-10 text-center text-sm text-red-600">{error}</p>
          ) : (
            <>
              {summary && (
                <dl className="mt-8 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Raised (window)</dt>
                    <dd className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                      {formatUsd(summary.totalRaisedCents)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Paid gifts</dt>
                    <dd className="mt-1 text-xl font-bold tabular-nums text-slate-900">{summary.giftCount}</dd>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Race entries</dt>
                    <dd className="mt-1 text-xl font-bold tabular-nums text-slate-900">{summary.raceEntryCount}</dd>
                  </div>
                </dl>
              )}

              <div className="mt-10 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Athlete</th>
                      <th className="px-4 py-3 text-right">Raised</th>
                      <th className="px-4 py-3 text-right">Gifts</th>
                      <th className="px-4 py-3 text-right">Race</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-800">
                    {(summary?.ncUnitedCommunityFundCents ?? 0) > 0 && summary ? (
                      <tr className="border-b border-slate-100 bg-slate-50/90">
                        <td className="px-4 py-3 tabular-nums text-slate-500">—</td>
                        <td className="px-4 py-3 font-medium text-slate-900">NC United community fund</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">
                          {formatUsd(summary.ncUnitedCommunityFundCents ?? 0)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{summary.ncUnitedCommunityGiftCount ?? 0}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{summary.ncUnitedCommunityRaceSignupCount ?? 0}</td>
                      </tr>
                    ) : null}
                    {sortedAthletes.map((row, i) => (
                      <tr key={row.athleteCode} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3 tabular-nums text-slate-500">{i + 1}</td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900">{row.athleteName}</span>
                          <span className="mt-0.5 block font-mono text-[11px] text-slate-400">{row.athleteCode}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatUsd(row.totalCents)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{row.donationCount}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{row.raceSignupCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {sortedAthletes.length === 0 && !(summary?.ncUnitedCommunityFundCents ?? 0) ? (
                <p className="mt-8 text-center text-sm text-slate-500">No paid gifts in this window yet.</p>
              ) : null}
            </>
          )}

          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 pt-6 text-sm">
            <HardLink href="/fundraising" className="font-medium underline-offset-4 hover:underline" style={{ color: NAVY }}>
              ← Fundraising home
            </HardLink>
            <HardLink
              href={campaignDefinition.publicPagePath}
              className="font-medium underline-offset-4 hover:underline"
              style={{ color: NAVY }}
            >
              Donate ({campaignDefinition.publicPagePath})
            </HardLink>
          </div>
        </div>
      </div>
    </div>
  )
}
