"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { HardLink } from "@/components/hard-link"
import { FUNDRAISING_CAMPAIGNS } from "@/lib/fundraising/campaign-registry"
import { hubActivityCampaignFromStripeSlug, hubActivityRowMatchesCampaignFilter } from "@/lib/fundraising/hub-activity-meta"
import type { FundraisingHubActivityRow, FundraisingHubTransparencyMeta } from "@/lib/fundraising/hub-data"
import { fundraisingAthletePublicHrefFromCode } from "@/lib/fundraising/athlete-fundraising-slug"
import { formatUsdWhole } from "./FundraisingHero"

function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

function formatRelativeOrAbsolute(iso: string): string {
  const d = new Date(iso)
  const ms = Date.now() - d.getTime()
  const sec = Math.floor(ms / 1000)
  if (sec < 45) return "Just now"
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)} hr ago`
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

function mapRealtimeRow(payload: Record<string, unknown>): FundraisingHubActivityRow | null {
  if (payload.status !== "paid") return null
  const id = typeof payload.id === "string" ? payload.id : null
  const created_at = typeof payload.created_at === "string" ? payload.created_at : null
  if (!id || !created_at) return null
  const amount_cents = typeof payload.amount_cents === "number" ? payload.amount_cents : 0
  const donor_name = typeof payload.donor_name === "string" ? payload.donor_name.trim() : ""
  const donorDisplay = donor_name || "Anonymous supporter"
  const athlete_display_name =
    typeof payload.athlete_display_name === "string" ? payload.athlete_display_name.trim() : ""
  const athlete_code = typeof payload.athlete_code === "string" ? payload.athlete_code.trim() : ""
  const athleteCredit = !athlete_code && !athlete_display_name
    ? "NC United general fund"
    : athlete_display_name || athlete_code || "NC United general fund"
  const spartanRaw =
    typeof payload.spartan_campaign === "string" && payload.spartan_campaign.trim()
      ? payload.spartan_campaign.trim()
      : null
  const { campaignStripeSlug, campaignShortLabel } = hubActivityCampaignFromStripeSlug(spartanRaw)

  return {
    id,
    createdIso: created_at,
    donorDisplay,
    amountCents: amount_cents,
    athleteCredit,
    athleteCode: athlete_code || null,
    campaignStripeSlug,
    campaignShortLabel,
  }
}

function creditLabel(r: FundraisingHubActivityRow): string {
  if (!r.athleteCode?.trim()) return "NC United general fund"
  return r.athleteCredit
}

const FEED_LIMIT = 15

export function LiveDonationStream({
  initial,
  hubTransparency,
}: {
  initial: FundraisingHubActivityRow[]
  hubTransparency: FundraisingHubTransparencyMeta
}) {
  const [rows, setRows] = useState(initial)
  const [feedCampaignFilter, setFeedCampaignFilter] = useState<string>("all")

  useEffect(() => {
    setRows(initial.slice(0, FEED_LIMIT))
  }, [initial])

  const visibleRows = useMemo(
    () => rows.filter((r) => hubActivityRowMatchesCampaignFilter(r, feedCampaignFilter)),
    [rows, feedCampaignFilter],
  )

  const mergeIncoming = useCallback((mapped: FundraisingHubActivityRow) => {
    setRows((prev) => {
      const without = prev.filter((r) => r.id !== mapped.id)
      return [mapped, ...without].slice(0, FEED_LIMIT)
    })
  }, [])

  useEffect(() => {
    let unsub: (() => void) | undefined

    void (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const sb = createClient()
        const channel = sb
          .channel("fundraising_hub_live_stream")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "spartan_donations" },
            (payload) => {
              const row = (payload.new ?? {}) as Record<string, unknown>
              const mapped = mapRealtimeRow(row)
              if (!mapped) return
              mergeIncoming(mapped)
            },
          )
          .subscribe()

        unsub = () => {
          void sb.removeChannel(channel)
        }
      } catch {
        /* offline */
      }
    })()

    const iv = setInterval(() => {
      void fetch("/api/fundraising/hub-data")
        .then((r) => r.json())
        .then((j: { activity?: FundraisingHubActivityRow[] }) => {
          if (Array.isArray(j.activity)) setRows(j.activity.slice(0, FEED_LIMIT))
        })
        .catch(() => {})
    }, 55000)

    return () => {
      unsub?.()
      clearInterval(iv)
    }
  }, [mergeIncoming])

  const activityLogHref = `/fundraising/activity?campaign=${feedCampaignFilter === "all" ? "all" : encodeURIComponent(feedCampaignFilter)}&days=${hubTransparency.lookbackDays}`

  return (
    <section
      id="fundraising-live-donor-stream"
      className="scroll-mt-28 border-b border-white/[0.06] bg-[#061224] px-4 py-16 text-white sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <p className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#C8A94A]")}`}>Wire</p>
            <h2 className={`${displayFont("mt-2 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl")}`}>
              Live donor activity
            </h2>
          </div>
          <span
            className={`${displayFont("inline-flex items-center gap-2 rounded-full border border-[#CC0000]/40 bg-[#CC0000]/15 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ffb4b4]")}`}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#CC0000] opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#CC0000]" />
            </span>
            Live — updating in real time
          </span>
        </div>
        <p className="mt-3 max-w-2xl text-sm text-white">
          Last {FEED_LIMIT} paid gifts across <strong className="text-white">all NC United hub campaigns</strong> in Stripe,
          last <span className="tabular-nums text-white">{hubTransparency.lookbackDays}</span> days (newest first) — same
          combined scope as the headline totals. Filter by campaign below when you want a single drive.
        </p>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <label htmlFor="live-feed-campaign" className="text-xs font-semibold uppercase tracking-wide text-white/60">
              Show
            </label>
            <select
              id="live-feed-campaign"
              value={feedCampaignFilter}
              onChange={(e) => setFeedCampaignFilter(e.target.value)}
              className="min-h-[48px] min-w-[min(100%,14rem)] touch-manipulation rounded-md border border-white/15 bg-[#0B2545] px-3 py-2 text-base text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A94A]"
            >
              <option value="all">All campaigns</option>
              {FUNDRAISING_CAMPAIGNS.map((c) => (
                <option key={c.stripeCampaignSlug} value={c.stripeCampaignSlug}>
                  {c.tabLabel}
                </option>
              ))}
            </select>
          </div>
          <div
            className={`${displayFont("-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:gap-x-3 sm:gap-y-2 sm:overflow-visible sm:px-0 sm:pb-0 sm:snap-none [&::-webkit-scrollbar]:hidden")}`}
          >
            <span className="hidden shrink-0 items-center text-xs font-bold uppercase tracking-wide text-white/50 sm:inline">
              Give
            </span>
            {FUNDRAISING_CAMPAIGNS.map((c, i) => (
              <span key={c.stripeCampaignSlug} className="flex shrink-0 snap-start items-center gap-x-2">
                {i > 0 ? <span className="hidden text-white/25 sm:inline" aria-hidden>·</span> : null}
                <HardLink
                  href={c.publicPagePath}
                  className={`${displayFont(
                    "inline-flex min-h-[44px] touch-manipulation items-center whitespace-nowrap rounded-lg border border-transparent px-2 py-2 text-xs font-bold uppercase tracking-wide text-[#C8A94A] underline-offset-4 hover:border-white/10 hover:bg-white/[0.04] hover:underline sm:border-transparent sm:px-0 sm:py-0 sm:hover:bg-transparent",
                  )}`}
                >
                  {c.tabLabel}
                  {hubTransparency.timedDriveArchived ? (
                    <span className="font-normal normal-case text-white/45"> · archived</span>
                  ) : null}
                </HardLink>
              </span>
            ))}
          </div>
        </div>

        <p className="mt-2 text-center text-[11px] text-white/45 sm:hidden">Swipe campaign links sideways →</p>

        <ul className="mt-8 divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/10 bg-[#0B2545]/45">
          {visibleRows.length === 0 ? (
            <li className="px-4 py-12 text-center text-sm text-white/90">
              {rows.length === 0
                ? "No gifts logged yet."
                : "No gifts in this campaign for the current feed window — try “All campaigns”."}
            </li>
          ) : (
            visibleRows.map((r) => {
              const label = creditLabel(r)
              const href = fundraisingAthletePublicHrefFromCode(r.athleteCode)
              const campaignBadge = r.campaignShortLabel ?? "—"
              return (
                <li
                  key={r.id}
                  className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:py-3.5"
                >
                  <div className="flex items-center justify-between gap-3 sm:contents">
                    <span className="w-28 shrink-0 font-mono text-[11px] tabular-nums text-white/75">
                      {formatRelativeOrAbsolute(r.createdIso)}
                    </span>
                    <div className="flex shrink-0 items-center gap-2 sm:contents">
                      <span
                        className={`${displayFont("rounded border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#C8A94A]")}`}
                      >
                        {campaignBadge}
                      </span>
                      <span className={`${displayFont("font-extrabold tabular-nums text-[#C8A94A]")}`}>
                        {formatUsdWhole(r.amountCents)}
                      </span>
                    </div>
                  </div>
                  <span className="min-w-0 font-semibold leading-snug text-white">{r.donorDisplay}</span>
                  <span className="hidden text-white/80 sm:inline">→</span>
                  <span className="min-w-0 text-[15px] leading-snug text-white sm:flex-1 sm:truncate sm:text-sm sm:max-w-md">
                    {href ? (
                      <HardLink
                        href={href}
                        className="touch-manipulation font-semibold underline-offset-4 hover:text-[#C8A94A] hover:underline"
                      >
                        {label}
                      </HardLink>
                    ) : (
                      label
                    )}
                  </span>
                </li>
              )
            })
          )}
        </ul>

        <div className="mt-6 flex flex-col items-stretch gap-2 sm:flex-row sm:justify-end sm:gap-6">
          <HardLink
            href={activityLogHref}
            className={`${displayFont(
              "inline-flex min-h-[48px] touch-manipulation items-center justify-center rounded-lg px-3 text-sm font-extrabold uppercase tracking-wide text-[#C8A94A] underline-offset-4 hover:bg-white/[0.05] hover:underline sm:justify-end",
            )}`}
          >
            View all donor activity →
          </HardLink>
        </div>
      </div>
    </section>
  )
}
