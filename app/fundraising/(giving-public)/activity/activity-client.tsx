"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { HardLink } from "@/components/hard-link"
import {
  DEFAULT_FUNDRAISING_CAMPAIGN,
  fundraisingCampaignByStripeSlug,
} from "@/lib/fundraising/campaign-registry"
import { fundraisingAthletePublicHrefFromCode } from "@/lib/fundraising/athlete-fundraising-slug"
import { hubActivityGiftSourceLabels } from "@/lib/fundraising/hub-activity-meta"

const NAVY = "#03154C"
const GOLD = "#CBAF5D"

type Entry = {
  id: string
  createdIso: string
  amountCents: number
  displayName: string
  athleteCode: string | null
  creditLabel: string | null
  spartanCampaignSlug: string | null
  fundraisingCheckoutSurface?: string | null
  giftSourceLabel?: string
  campaignNameLabel?: string
}

export type FundraisingActivityCampaignOption = {
  stripeCampaignSlug: string
  tabLabel: string
  publicPagePath: string
  campaignDisplayName: string
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatWhen(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function FundraisingActivityClient({ campaigns }: { campaigns: FundraisingActivityCampaignOption[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const resolvedCampaign = useMemo(() => {
    const raw = searchParams.get("campaign")?.trim()
    if (!raw || raw.toLowerCase() === "all") return "all"
    const found = fundraisingCampaignByStripeSlug(raw)
    return found?.stripeCampaignSlug ?? "all"
  }, [searchParams])

  const resolvedDays = useMemo(() => {
    const c =
      resolvedCampaign === "all"
        ? DEFAULT_FUNDRAISING_CAMPAIGN
        : fundraisingCampaignByStripeSlug(resolvedCampaign) ?? DEFAULT_FUNDRAISING_CAMPAIGN
    const n = Number(searchParams.get("days"))
    if (!Number.isFinite(n) || n < 1) return c.defaultLookbackDays
    return Math.min(400, Math.floor(n))
  }, [searchParams, resolvedCampaign])

  const hubDefaultDays = DEFAULT_FUNDRAISING_CAMPAIGN.defaultLookbackDays

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [metaTitle, setMetaTitle] = useState<string | null>(null)
  const [summary, setSummary] = useState<{
    totalRaisedCents: number
    giftCount: number
    raceEntryCount: number
    ncUnitedCommunityFundCents: number
  } | null>(null)

  const commit = useCallback(
    (campaign: string, days: number) => {
      const q = new URLSearchParams()
      q.set("campaign", campaign)
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
          campaign: resolvedCampaign,
          days: String(resolvedDays),
        })
        const res = await fetch(`/api/spartan/supporters?${q}`)
        const j = (await res.json()) as {
          error?: string
          entries?: Entry[]
          campaignDisplayName?: string
          summary?: {
            totalRaisedCents?: number
            giftCount?: number
            raceEntryCount?: number
            ncUnitedCommunityFundCents?: number
          }
        }
        if (!res.ok) throw new Error(j.error || "Could not load")
        if (cancelled) return
        setEntries(Array.isArray(j.entries) ? j.entries : [])
        setMetaTitle(j.campaignDisplayName ?? null)
        const s = j.summary
        if (s && typeof s.totalRaisedCents === "number") {
          setSummary({
            totalRaisedCents: s.totalRaisedCents,
            giftCount: typeof s.giftCount === "number" ? s.giftCount : 0,
            raceEntryCount: typeof s.raceEntryCount === "number" ? s.raceEntryCount : 0,
            ncUnitedCommunityFundCents: typeof s.ncUnitedCommunityFundCents === "number" ? s.ncUnitedCommunityFundCents : 0,
          })
        } else {
          setSummary(null)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed")
          setEntries([])
          setMetaTitle(null)
          setSummary(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [resolvedCampaign, resolvedDays])

  const sorted = useMemo(() => [...entries].sort((a, b) => +new Date(b.createdIso) - +new Date(a.createdIso)), [entries])

  const sumRowCents = useMemo(() => sorted.reduce((s, e) => s + (Number(e.amountCents) || 0), 0), [sorted])

  const dayPresets = useMemo(() => {
    const hub = hubDefaultDays
    return [...new Set([30, 90, hub, 365])].sort((a, b) => a - b)
  }, [hubDefaultDays])

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
          <HardLink href="/fundraising" className="text-sm font-semibold text-white/85 underline-offset-4 hover:text-[#CBAF5D] hover:underline">
            ← Fundraising hub
          </HardLink>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: GOLD }}>
            NC United Wrestling · Transparency
          </p>
          <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-[2rem] sm:leading-tight">
            Donor activity
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-white/88">
            Paid checkouts in the <strong className="text-white">lookback window you select below</strong>. A wider window
            only changes totals when there are older checkouts <em>outside</em> the shorter window — if your drive is newer
            than that, presets usually show the same raised amount. The <strong className="text-white">totals card</strong> is
            the Stripe-backed rollup for this page&apos;s filters and should match the sum of the table. The hub{" "}
            <strong className="text-white">leaderboard</strong> sums athlete-credited gifts only; headline &ldquo;Raised&rdquo;
            also includes NC United general-fund gifts, so adding leaderboard rows may be less than the hero.
          </p>
        </div>
      </header>

      <div className="relative z-[1] mx-auto max-w-4xl px-4 sm:px-6" style={{ marginTop: "-3rem" }}>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.25)] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div className="flex flex-col gap-2">
              <label htmlFor="activity-campaign" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Campaign
              </label>
              <select
                id="activity-campaign"
                className="max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#03154C]"
                value={resolvedCampaign}
                onChange={(e) => commit(e.target.value, resolvedDays)}
              >
                <option value="all">All campaigns (combined)</option>
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
                    onClick={() => commit(resolvedCampaign, d)}
                  >
                    {d === hubDefaultDays ? "Hub default" : `${d} days`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-6 text-sm font-semibold text-slate-900">{metaTitle ?? "—"}</p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {resolvedCampaign === "all"
              ? "Every registered NC United Stripe campaign in this window."
              : `Stripe campaign · ${resolvedCampaign}`}{" "}
            ·{" "}
            {resolvedDays === hubDefaultDays ? (
              <span className="font-semibold text-slate-700">Hub reporting window</span>
            ) : (
              <>
                <span className="tabular-nums font-semibold text-slate-700">{resolvedDays}</span>
                <span className="text-slate-700"> days</span>
              </>
            )}
          </p>

          {resolvedDays !== hubDefaultDays ? (
            <div
              className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
              role="status"
            >
              <strong className="font-semibold">Hub headline uses the fixed campaign reporting window.</strong>{" "}
              <HardLink href="/fundraising" className="font-semibold underline underline-offset-2">
                /fundraising
              </HardLink>{" "}
              &ldquo;Raised&rdquo; uses that window; this page uses the lookback you selected above. If every checkout falls
              inside both, totals should still match. If older checkouts sit outside the shorter window, widening this page
              can show more.{" "}
              <button
                type="button"
                className="ml-1 font-semibold text-[#03154C] underline underline-offset-2"
                onClick={() => commit(resolvedCampaign, hubDefaultDays)}
              >
                Match hub window
              </button>
            </div>
          ) : null}

          {!loading && !error && summary ? (
            <div className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total raised (this view)</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{formatUsd(summary.totalRaisedCents)}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">Stripe paid sessions + credit corrections</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Checkouts</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{summary.giftCount}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">Rows below: {sorted.length}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Event / race signups</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{summary.raceEntryCount}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">NC United fund (uncoded)</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                  {formatUsd(summary.ncUnitedCommunityFundCents)}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">Included in total raised</p>
              </div>
            </div>
          ) : null}

          {!loading && !error && summary && Math.abs(sumRowCents - summary.totalRaisedCents) > 2 ? (
            <p className="mt-3 text-xs font-medium text-amber-800">
              Row sum ({formatUsd(sumRowCents)}) differs from API total ({formatUsd(summary.totalRaisedCents)}). Refresh the page;
              if it persists, contact support with this URL.
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span className="text-slate-500">Give</span>
            {campaigns.map((c) => (
              <HardLink
                key={c.stripeCampaignSlug}
                href={c.publicPagePath}
                className="font-medium text-[#03154C] underline-offset-4 hover:underline"
              >
                {c.tabLabel}
              </HardLink>
            ))}
          </div>

          {loading ? (
            <p className="mt-10 text-center text-sm text-slate-500">Loading…</p>
          ) : error ? (
            <p className="mt-10 text-center text-sm text-red-600">{error}</p>
          ) : (
            <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Campaign</th>
                    <th className="px-4 py-3">Supporter</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Credited to</th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  {sorted.map((e) => {
                    const labels = hubActivityGiftSourceLabels(e.spartanCampaignSlug, e.fundraisingCheckoutSurface)
                    const giftSourceLabel = e.giftSourceLabel ?? labels.giftSourceLabel
                    const campaignNameLabel = e.campaignNameLabel ?? labels.campaignNameLabel
                    const credit = (e.creditLabel ?? "").trim() || e.athleteCode || "NC United fund"
                    const href = fundraisingAthletePublicHrefFromCode(e.athleteCode)
                    return (
                      <tr key={e.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3 tabular-nums text-slate-600">{formatWhen(e.createdIso)}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-800">{giftSourceLabel}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-700">{campaignNameLabel}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{e.displayName}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatUsd(e.amountCents)}</td>
                        <td className="px-4 py-3">
                          {href ? (
                            <HardLink href={href} className="font-medium text-[#03154C] underline-offset-4 hover:underline">
                              {credit}
                            </HardLink>
                          ) : (
                            <span className="font-medium text-slate-800">{credit}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && sorted.length === 0 ? (
            <p className="mt-8 text-center text-sm text-slate-500">No paid gifts in this window yet.</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
