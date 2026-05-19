"use client"

import { Trophy } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { HardLink } from "@/components/hard-link"
import { FundraisingFooter } from "@/app/fundraising/components/FundraisingFooter"
import {
  DEFAULT_FUNDRAISING_CAMPAIGN,
  fundraisingCampaignByStripeSlug,
} from "@/lib/fundraising/campaign-registry"
import { fundraisingAthletePublicHrefFromCode } from "@/lib/fundraising/athlete-fundraising-slug"

/** Matches fundraising hub / Spartan fundraising rails */
const NAVY = "#0B2545"
const NAVY_DEEP = "#061224"
const GOLD = "#C8A94A"
const CRIMSON = "#CC0000"

function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

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
    <div className="min-h-screen pb-16 text-white" style={{ backgroundColor: NAVY }}>
      <section className="relative overflow-hidden border-b border-white/[0.08] px-4 pb-24 pt-12">
        <div className="mx-auto max-w-6xl">
          <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
          <div className="mt-6 h-10 max-w-md animate-pulse rounded bg-white/10" />
          <div className="mt-4 h-20 max-w-2xl animate-pulse rounded bg-white/5" />
        </div>
      </section>
      <div className="relative z-[1] mx-auto max-w-6xl px-4" style={{ marginTop: "-3rem" }}>
        <div
          className="rounded-2xl border border-white/10 p-6 sm:p-8"
          style={{ backgroundColor: `${NAVY_DEEP}f2` }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-10 animate-pulse rounded-lg bg-white/10" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((k) => (
                <div key={k} className="h-9 flex-1 animate-pulse rounded-lg bg-white/10" />
              ))}
            </div>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[1, 2, 3].map((k) => (
              <div key={k} className="h-24 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
          <div className="mt-10 h-64 animate-pulse rounded-xl bg-white/5" />
          <p className={`${displayFont("mt-10 text-center text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]/70")}`}>
            Loading Training Fund contribution totals…
          </p>
        </div>
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
    if (!raw || raw.toLowerCase() === "all") return "all"
    const found = fundraisingCampaignByStripeSlug(raw)
    return found?.stripeCampaignSlug ?? DEFAULT_FUNDRAISING_CAMPAIGN.stripeCampaignSlug
  }, [searchParams])

  const resolvedDays = useMemo(() => {
    const c =
      resolvedCampaignSlug === "all"
        ? DEFAULT_FUNDRAISING_CAMPAIGN
        : fundraisingCampaignByStripeSlug(resolvedCampaignSlug) ?? DEFAULT_FUNDRAISING_CAMPAIGN
    const n = Number(searchParams.get("days"))
    if (!Number.isFinite(n) || n < 1) return c.defaultLookbackDays
    return Math.min(400, Math.floor(n))
  }, [searchParams, resolvedCampaignSlug])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryNonce, setRetryNonce] = useState(0)
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
        const res = await fetch(`/api/spartan/supporters?${q}`, { cache: "no-store" })
        const j = (await res.json()) as {
          error?: string
          summary?: SpartanMetricsSummary
          byAthlete?: SpartanByAthlete[]
          campaignDisplayName?: string
        }
        if (!res.ok) throw new Error(j.error || "Could not load Training Fund contribution leaderboard")
        if (cancelled) return
        setSummary(j.summary ?? null)
        setByAthlete(Array.isArray(j.byAthlete) ? j.byAthlete : [])
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
  }, [resolvedCampaignSlug, resolvedDays, retryNonce])

  const sortedAthletes = useMemo(() => [...byAthlete].sort((a, b) => b.totalCents - a.totalCents), [byAthlete])

  const campaignDefinition =
    resolvedCampaignSlug === "all"
      ? DEFAULT_FUNDRAISING_CAMPAIGN
      : fundraisingCampaignByStripeSlug(resolvedCampaignSlug) ?? DEFAULT_FUNDRAISING_CAMPAIGN
  const displayTitle = meta?.campaignDisplayName ?? campaignDefinition.campaignDisplayName
  const giveHref = resolvedCampaignSlug === "all" ? "/fundraising" : campaignDefinition.publicPagePath

  const dayPresets = useMemo(() => {
    const hub = campaignDefinition.defaultLookbackDays
    return [...new Set([30, 90, hub, 365])].sort((a, b) => a - b)
  }, [campaignDefinition.defaultLookbackDays])

  const avgGiftCents =
    summary && summary.giftCount > 0 ? Math.round(summary.totalRaisedCents / summary.giftCount) : null

  return (
    <div id="fundraising-leaderboard-root" className="min-h-screen text-white" style={{ backgroundColor: NAVY }}>
      <section className="relative overflow-hidden border-b border-white/[0.08] px-4 pb-28 pt-12 sm:pb-32 sm:pt-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          aria-hidden
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px),
              linear-gradient(125deg, ${CRIMSON} 0%, transparent 38%),
              radial-gradient(ellipse 80% 60% at 100% -10%, ${GOLD}22 0%, transparent 55%)
            `,
            backgroundSize: "48px 48px, 48px 48px, auto, auto",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background: `linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 42%, rgba(0,0,0,0.22) 100%)`,
          }}
        />

        <div className="relative mx-auto max-w-6xl">
          <nav aria-label="Breadcrumb" className={`${displayFont("flex flex-wrap items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.22em]")}`}>
            <HardLink href="/fundraising" className="text-[#C8A94A]/90 underline-offset-4 hover:text-[#C8A94A] hover:underline">
              Fundraising home
            </HardLink>
            <span className="text-white/25" aria-hidden>
              /
            </span>
            <span className="text-white/60">Training Fund contributions</span>
          </nav>

          <div className="mt-8 flex flex-wrap items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#CC0000]/35 bg-[#CC0000]/15 text-[#ffb4b4]">
              <Trophy className="h-7 w-7" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#C8A94A] sm:text-[11px]")}`}>
                NC United · Transparency
              </p>
              <h1
                className={`${displayFont("mt-3 text-balance text-[clamp(1.85rem,5vw,3rem)] font-black uppercase leading-[0.95] tracking-tight text-white")}`}
              >
                NC United Training Fund — athlete contributions
              </h1>
              <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-white/88">
                Rows sum paid supporter checkout routed to NC United Wrestling for the <strong className="text-white">NC United Training Fund</strong>
                {" — "}
                when donors name a wrestler at checkout we show totals as that athlete&apos;s Training Fund-linked contributions for the reporting window you
                pick (same Stripe ledger as the fundraising hub). Donor names elsewhere respect listing preferences.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-[1] mx-auto max-w-6xl px-4 pb-8 sm:px-6" style={{ marginTop: "-5rem" }}>
        <div
          className="rounded-2xl border border-white/10 px-5 py-8 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.55)] sm:px-10 sm:py-10"
          style={{
            background: `linear-gradient(165deg, ${NAVY_DEEP} 0%, rgba(11,37,69,0.97) 50%, ${NAVY_DEEP} 100%)`,
          }}
        >
          <div className="flex flex-col gap-8 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
            <div className="flex min-w-[200px] flex-col gap-2">
              <label
                htmlFor="leaderboard-campaign"
                className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#C8A94A]/90")}`}
              >
                Campaign
              </label>
              <select
                id="leaderboard-campaign"
                className={`${displayFont("max-w-full rounded-lg border border-white/15 bg-[#0B2545]/90 px-4 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-inner focus:border-[#C8A94A]/50 focus:outline-none focus:ring-2 focus:ring-[#C8A94A]/35")}`}
                style={{ colorScheme: "dark" }}
                value={resolvedCampaignSlug}
                onChange={(e) => commitFilters(e.target.value, resolvedDays)}
              >
                <option value="all" className="bg-[#0B2545] text-white">
                  All campaigns (combined)
                </option>
                {campaigns.map((c) => (
                  <option key={c.stripeCampaignSlug} value={c.stripeCampaignSlug} className="bg-[#0B2545] text-white">
                    {c.tabLabel}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-3">
              <span className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#C8A94A]/90")}`}>
                Lookback window
              </span>
              <div className="flex flex-wrap gap-2">
                {dayPresets.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`${displayFont("min-h-[44px] rounded-lg border px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] transition focus:outline-none focus:ring-2 focus:ring-[#C8A94A]/45 focus:ring-offset-2 focus:ring-offset-[#061224]")} ${
                      resolvedDays === d
                        ? "border-[#CC0000] bg-[#CC0000] text-white shadow-[0_12px_40px_-12px_rgba(204,0,0,0.55)]"
                        : "border-white/15 bg-white/5 text-white/90 hover:border-[#C8A94A]/35 hover:bg-white/[0.08]"
                    }`}
                    onClick={() => commitFilters(resolvedCampaignSlug, d)}
                  >
                    {d === campaignDefinition.defaultLookbackDays ? "Hub default" : `${d} days`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-8">
            <p className={`${displayFont("text-lg font-black uppercase tracking-tight text-white")}`}>{displayTitle}</p>
            <p className="mt-2 text-sm tabular-nums text-white/55">
              {resolvedCampaignSlug === "all"
                ? "Athlete-linked Training Fund contribution totals combine every registered NC United Stripe campaign in this window."
                : `Stripe campaign · ${resolvedCampaignSlug}`}{" "}
              ·{" "}
              {resolvedDays === campaignDefinition.defaultLookbackDays ? (
                <span className="text-white/75">Hub reporting window</span>
              ) : (
                <span className="text-white/75">{resolvedDays}-day window</span>
              )}
            </p>
          </div>

          {loading ? (
            <div className="mt-14 flex flex-col items-center gap-4">
              <div
                className="h-10 w-10 animate-spin rounded-full border-2 border-[#C8A94A]/25 border-t-[#C8A94A]"
                aria-hidden
              />
              <p className={`${displayFont("text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]/80")}`}>
                Loading totals…
              </p>
            </div>
          ) : error ? (
            <div className="mt-12 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-6 text-center">
              <p className="font-semibold text-amber-100">Could not load Training Fund contribution totals</p>
              <p className="mt-2 text-sm text-amber-100/85">{error}</p>
              <p className="mt-4 text-xs text-amber-100/70">
                Check your connection and try again — totals load directly from our supporter API.
              </p>
              <button
                type="button"
                className={`${displayFont("mt-6 inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 bg-white/10 px-6 text-xs font-extrabold uppercase tracking-[0.14em] text-white hover:bg-white/15")}`}
                onClick={() => setRetryNonce((n) => n + 1)}
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {summary && (
                <dl className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-white/10 bg-[#0B2545]/65 px-5 py-4">
                    <dt className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#C8A94A]")}`}>
                      Raised
                    </dt>
                    <dd className="mt-2 text-2xl font-black tabular-nums text-white">{formatUsd(summary.totalRaisedCents)}</dd>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#0B2545]/65 px-5 py-4">
                    <dt className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#C8A94A]")}`}>
                      Donations
                    </dt>
                    <dd className="mt-2 text-2xl font-black tabular-nums text-white">{summary.giftCount}</dd>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#0B2545]/65 px-5 py-4">
                    <dt className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#C8A94A]")}`}>
                      Event checkouts
                    </dt>
                    <dd className="mt-2 text-2xl font-black tabular-nums" style={{ color: CRIMSON }}>
                      {summary.raceEntryCount}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#0B2545]/65 px-5 py-4">
                    <dt className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#C8A94A]")}`}>
                      Avg gift
                    </dt>
                    <dd className="mt-2 text-2xl font-black tabular-nums text-white">
                      {avgGiftCents != null ? formatUsd(avgGiftCents) : "—"}
                    </dd>
                  </div>
                </dl>
              )}

              {(summary?.ncUnitedCommunityFundCents ?? 0) > 0 && summary ? (
                <p className="mt-6 rounded-xl border border-[#C8A94A]/20 bg-[#C8A94A]/10 px-4 py-3 text-sm leading-relaxed text-white/90">
                  <span className={`${displayFont("font-extrabold text-[#C8A94A]")}`}>NC United fund</span> (community
                  programs, not tied to one athlete):{" "}
                  <span className="font-semibold tabular-nums text-white">{formatUsd(summary.ncUnitedCommunityFundCents ?? 0)}</span>
                  <span className="text-white/60">
                    {" "}
                    · {summary.ncUnitedCommunityGiftCount ?? 0} gift{(summary.ncUnitedCommunityGiftCount ?? 0) === 1 ? "" : "s"}
                  </span>
                </p>
              ) : null}

              <div className="mt-10 overflow-hidden rounded-xl border border-white/10">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr
                      className={`${displayFont("border-b border-white/10 bg-black/25 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#C8A94A]/95")}`}
                    >
                      <th className="px-4 py-4">Rank</th>
                      <th className="px-4 py-4">Athlete</th>
                      <th className="px-4 py-4 text-right">Contribution total</th>
                      <th className="px-4 py-4 text-right">Gifts</th>
                      <th className="px-4 py-4 text-right">Event</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/90">
                    {(summary?.ncUnitedCommunityFundCents ?? 0) > 0 && summary ? (
                      <tr className="border-b border-white/[0.06] bg-[#C8A94A]/10">
                        <td className="px-4 py-3.5 tabular-nums text-white/45">—</td>
                        <td className={`${displayFont("px-4 py-3.5 font-bold uppercase tracking-wide text-[#C8A94A]")}`}>
                          NC United community fund
                        </td>
                        <td className="px-4 py-3.5 text-right text-base font-black tabular-nums text-white">
                          {formatUsd(summary.ncUnitedCommunityFundCents ?? 0)}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-white/80">
                          {summary.ncUnitedCommunityGiftCount ?? 0}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-white/80">
                          {summary.ncUnitedCommunityRaceSignupCount ?? 0}
                        </td>
                      </tr>
                    ) : null}
                    {sortedAthletes.map((row, i) => {
                      const athleteHref = fundraisingAthletePublicHrefFromCode(row.athleteCode)
                      const rank = i + 1
                      const podium = rank <= 3
                      return (
                        <tr
                          key={row.athleteCode}
                          className={`border-b border-white/[0.06] transition hover:bg-white/[0.04] ${
                            podium ? "bg-white/[0.02]" : ""
                          }`}
                        >
                          <td className="px-4 py-3.5 tabular-nums">
                            <span
                              className={`inline-flex min-w-[2rem] items-center justify-center rounded-md px-2 py-1 text-xs font-black ${
                                rank === 1
                                  ? "bg-[#C8A94A]/25 text-[#C8A94A]"
                                  : rank === 2
                                    ? "bg-white/10 text-white/85"
                                    : rank === 3
                                      ? "bg-[#CC0000]/15 text-[#ffb4b4]"
                                      : "text-white/45"
                              }`}
                            >
                              {rank}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {athleteHref ? (
                              <>
                                <HardLink
                                  href={athleteHref}
                                  className={`${displayFont("block text-base font-black uppercase tracking-tight text-white underline-offset-4 hover:text-[#C8A94A] hover:underline")}`}
                                >
                                  {row.athleteName}
                                </HardLink>
                                <HardLink
                                  href={athleteHref}
                                  className="mt-1 block font-mono text-[11px] text-[#C8A94A]/75 hover:text-[#C8A94A] hover:underline"
                                >
                                  {row.athleteCode}
                                </HardLink>
                              </>
                            ) : (
                              <>
                                <span className={`${displayFont("block text-base font-black uppercase text-white")}`}>
                                  {row.athleteName}
                                </span>
                                <span className="mt-1 block font-mono text-[11px] text-white/40">{row.athleteCode}</span>
                              </>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right text-base font-black tabular-nums text-white">
                            {formatUsd(row.totalCents)}
                          </td>
                          <td className="px-4 py-3.5 text-right tabular-nums text-white/75">{row.donationCount}</td>
                          <td className={`${displayFont("px-4 py-3.5 text-right text-sm font-bold tabular-nums text-[#CC0000]/95")}`}>
                            {row.raceSignupCount}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {sortedAthletes.length === 0 && !(summary?.ncUnitedCommunityFundCents ?? 0) ? (
                <p className="mt-12 text-center text-sm text-white/55">No paid gifts in this window yet.</p>
              ) : null}
            </>
          )}

          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-white/10 pt-8">
            <HardLink
              href="/fundraising"
              className={`${displayFont("text-xs font-extrabold uppercase tracking-[0.16em] text-[#C8A94A] underline-offset-4 hover:underline")}`}
            >
              ← Fundraising hub
            </HardLink>
            <HardLink
              href="/fundraising/activity?campaign=all"
              className={`${displayFont("text-xs font-extrabold uppercase tracking-[0.16em] text-white/75 underline-offset-4 hover:text-[#C8A94A] hover:underline")}`}
            >
              Gift log
            </HardLink>
            <HardLink
              href={giveHref}
              className={`${displayFont("inline-flex min-h-11 items-center justify-center rounded-sm bg-[#CC0000] px-6 text-xs font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_14px_40px_-12px_rgba(204,0,0,0.55)] transition hover:bg-[#a80000]")}`}
            >
              Give now
            </HardLink>
          </div>
        </div>
      </div>

      <FundraisingFooter />
    </div>
  )
}
