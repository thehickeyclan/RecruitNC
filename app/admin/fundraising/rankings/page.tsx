"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AdminHeader } from "@/components/admin-header"
import { HardLink } from "@/components/hard-link"
import { Button, buttonVariants } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  FUNDRAISING_CAMPAIGNS,
  DEFAULT_FUNDRAISING_CAMPAIGN,
  NC_UNITED_FUNDRAISING_BRAND,
} from "@/lib/fundraising/campaign-registry"
import { cn } from "@/lib/utils"
import { ArrowLeft, Download, RefreshCw } from "lucide-react"

const brand = NC_UNITED_FUNDRAISING_BRAND

type SpartanAthleteAggregate = {
  athleteCode: string
  totalCents: number
  donationCount: number
  raceSignupCount: number
  reimbursementsPaidCents?: number
  netAfterReimbursementsCents?: number
  guildAllocationsCents?: number
  athleteDisplayName?: string
}

function formatMoney(cents: number) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
  } catch {
    return `$${(cents / 100).toFixed(2)}`
  }
}

export default function AdminFundraisingRankingsPage() {
  const [campaignSlug, setCampaignSlug] = useState(DEFAULT_FUNDRAISING_CAMPAIGN.stripeCampaignSlug)
  const [days, setDays] = useState(DEFAULT_FUNDRAISING_CAMPAIGN.defaultLookbackDays)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [byAthlete, setByAthlete] = useState<SpartanAthleteAggregate[]>([])
  const [publicSummary, setPublicSummary] = useState<{
    totalRaisedCents: number
    giftCount: number
    raceEntryCount: number
    ncUnitedCommunityFundCents?: number
    ncUnitedCommunityGiftCount?: number
    ncUnitedCommunityRaceSignupCount?: number
  } | null>(null)
  const [totals, setTotals] = useState<{
    grossSessionTotalCents: number
    netAfterReimbursementsCents: number
    reimbursementsPaidTotalCents: number
  } | null>(null)

  const campaign = FUNDRAISING_CAMPAIGNS.find((c) => c.stripeCampaignSlug === campaignSlug) ?? DEFAULT_FUNDRAISING_CAMPAIGN

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/spartan-donations?days=${days}&campaign=${encodeURIComponent(campaignSlug)}`)
      const j = (await res.json()) as {
        error?: string
        byAthlete?: SpartanAthleteAggregate[]
        publicSummary?: typeof publicSummary
        grossSessionTotalCents?: number
        netAfterReimbursementsCents?: number
        reimbursementsPaidTotalCents?: number
      }
      if (!res.ok) throw new Error(j.error || "Failed to load")
      setByAthlete(j.byAthlete ?? [])
      setPublicSummary(j.publicSummary ?? null)
      setTotals(
        j.grossSessionTotalCents !== undefined &&
          j.netAfterReimbursementsCents !== undefined &&
          j.reimbursementsPaidTotalCents !== undefined
          ? {
              grossSessionTotalCents: j.grossSessionTotalCents,
              netAfterReimbursementsCents: j.netAfterReimbursementsCents,
              reimbursementsPaidTotalCents: j.reimbursementsPaidTotalCents,
            }
          : null,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed")
      setByAthlete([])
      setPublicSummary(null)
      setTotals(null)
    } finally {
      setLoading(false)
    }
  }, [campaignSlug, days])

  useEffect(() => {
    void load()
  }, [load])

  const ranked = useMemo(() => [...byAthlete].sort((a, b) => b.totalCents - a.totalCents), [byAthlete])

  const hubDefaultDays = DEFAULT_FUNDRAISING_CAMPAIGN.defaultLookbackDays

  const dayPresets = useMemo(() => [...new Set([30, 90, hubDefaultDays, 365])].sort((a, b) => a - b), [hubDefaultDays])

  const csvHref = (kind: string) =>
    `/api/admin/spartan-export?kind=${kind}&days=${days}&campaign=${encodeURIComponent(campaignSlug)}`

  return (
    <div className="min-h-screen bg-background pb-16">
      <AdminHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-start gap-4 border-b pb-6">
          <HardLink
            href="/admin/fundraising"
            aria-label="Back to fundraising playbook"
            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "shrink-0 border-[#003366]/25")}
          >
            <ArrowLeft className="h-4 w-4" />
          </HardLink>
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: brand.navy }}>
              NC United · Fundraising
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl" style={{ color: brand.navy }}>
              Rankings & totals
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
              Stripe-backed athlete totals for the selected campaign and lookback window (same pipeline as the playbook).
              Public donor-facing view matches gross credited totals and respects anonymous preferences — share{" "}
              <HardLink
                href={`/fundraising/leaderboard?campaign=${encodeURIComponent(campaignSlug)}&days=${days}`}
                className="text-primary font-medium underline-offset-4 hover:underline"
              >
                /fundraising/leaderboard
              </HardLink>
              .
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="flex flex-col gap-2">
            <Label htmlFor="rank-campaign">Campaign</Label>
            <select
              id="rank-campaign"
              className="border-input bg-background h-10 rounded-md border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={campaignSlug}
              onChange={(e) => setCampaignSlug(e.target.value)}
            >
              {FUNDRAISING_CAMPAIGNS.map((c) => (
                <option key={c.stripeCampaignSlug} value={c.stripeCampaignSlug}>
                  {c.tabLabel}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Lookback window</span>
            <div className="flex flex-wrap gap-2">
              {dayPresets.map((d) => (
                <Button
                  key={d}
                  type="button"
                  variant={days === d ? "default" : "outline"}
                  size="sm"
                  className={days === d ? "" : "border-[#003366]/20"}
                  onClick={() => setDays(d)}
                >
                  {d === hubDefaultDays ? "Hub default" : `${d}d`}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:ml-auto">
            <HardLink href={csvHref("ledger")} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}>
              <Download className="h-4 w-4" />
              Ledger CSV
            </HardLink>
            <HardLink href={csvHref("runners")} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}>
              <Download className="h-4 w-4" />
              Runners CSV
            </HardLink>
          </div>
        </div>

        {totals ? (
          <dl className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-card px-4 py-3">
              <dt className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">Gross (sessions)</dt>
              <dd className="mt-1 text-lg font-bold tabular-nums">{formatMoney(totals.grossSessionTotalCents)}</dd>
            </div>
            <div className="rounded-lg border bg-card px-4 py-3">
              <dt className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">Reimbursements paid</dt>
              <dd className="mt-1 text-lg font-bold tabular-nums">{formatMoney(totals.reimbursementsPaidTotalCents)}</dd>
            </div>
            <div className="rounded-lg border bg-card px-4 py-3">
              <dt className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">Net after reimbursements</dt>
              <dd className="mt-1 text-lg font-bold tabular-nums">{formatMoney(totals.netAfterReimbursementsCents)}</dd>
            </div>
          </dl>
        ) : null}

        {loading ? (
          <p className="mt-12 text-center text-sm text-muted-foreground">Loading rankings…</p>
        ) : error ? (
          <p className="mt-12 text-center text-sm text-destructive">{error}</p>
        ) : (
          <div className="mt-10 overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-3">#</th>
                  <th className="px-3 py-3">Athlete</th>
                  <th className="px-3 py-3 text-right">Raised</th>
                  <th className="px-3 py-3 text-right">Reimb. paid</th>
                  <th className="px-3 py-3 text-right">Net</th>
                  <th className="px-3 py-3 text-right">Guild</th>
                  <th className="px-3 py-3 text-right">Gifts</th>
                  <th className="px-3 py-3 text-right">Race</th>
                </tr>
              </thead>
              <tbody>
                {(publicSummary?.ncUnitedCommunityFundCents ?? 0) > 0 && publicSummary ? (
                  <tr className="border-b bg-muted/30">
                    <td className="text-muted-foreground px-3 py-2.5">—</td>
                    <td className="px-3 py-2.5 font-medium">NC United community fund</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                      {formatMoney(publicSummary.ncUnitedCommunityFundCents ?? 0)}
                    </td>
                    <td className="text-muted-foreground px-3 py-2.5 text-right">—</td>
                    <td className="text-muted-foreground px-3 py-2.5 text-right">—</td>
                    <td className="text-muted-foreground px-3 py-2.5 text-right">—</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{publicSummary.ncUnitedCommunityGiftCount ?? 0}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{publicSummary.ncUnitedCommunityRaceSignupCount ?? 0}</td>
                  </tr>
                ) : null}
                {ranked.map((row, i) => (
                  <tr key={row.athleteCode} className="border-b last:border-0">
                    <td className="text-muted-foreground px-3 py-2.5 tabular-nums">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <span className="font-medium">{row.athleteDisplayName ?? row.athleteCode}</span>
                      <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">{row.athleteCode}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{formatMoney(row.totalCents)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                      {formatMoney(row.reimbursementsPaidCents ?? 0)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                      {formatMoney(row.netAfterReimbursementsCents ?? row.totalCents)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {formatMoney(row.guildAllocationsCents ?? 0)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{row.donationCount}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{row.raceSignupCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && ranked.length === 0 && !(publicSummary?.ncUnitedCommunityFundCents ?? 0) ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">No athlete rows in this window.</p>
        ) : null}
      </main>
    </div>
  )
}
