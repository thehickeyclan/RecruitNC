"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { HardLink } from "@/components/hard-link"
import {
  DEFAULT_FUNDRAISING_CAMPAIGN,
  fundraisingCampaignByStripeSlug,
} from "@/lib/fundraising/campaign-registry"
import { fundraisingAthletePublicHrefFromCode } from "@/lib/fundraising/athlete-fundraising-slug"
import { hubActivityCampaignFromStripeSlug } from "@/lib/fundraising/hub-activity-meta"

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

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [metaTitle, setMetaTitle] = useState<string | null>(null)

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
        }
        if (!res.ok) throw new Error(j.error || "Could not load")
        if (cancelled) return
        setEntries(Array.isArray(j.entries) ? j.entries : [])
        setMetaTitle(j.campaignDisplayName ?? null)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed")
          setEntries([])
          setMetaTitle(null)
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
            Paid checkouts in the selected window. Names follow public listing preferences on each gift.
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
                    {d} days
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-6 text-sm font-semibold text-slate-900">{metaTitle ?? "—"}</p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {resolvedCampaign === "all"
              ? "Every registered NC United Stripe campaign in this window."
              : `Stripe campaign · ${resolvedCampaign}`}
          </p>

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
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Campaign</th>
                    <th className="px-4 py-3">Supporter</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Credited to</th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  {sorted.map((e) => {
                    const { campaignShortLabel } = hubActivityCampaignFromStripeSlug(e.spartanCampaignSlug)
                    const credit = (e.creditLabel ?? "").trim() || e.athleteCode || "NC United fund"
                    const href = fundraisingAthletePublicHrefFromCode(e.athleteCode)
                    return (
                      <tr key={e.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3 tabular-nums text-slate-600">{formatWhen(e.createdIso)}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-700">{campaignShortLabel}</td>
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
