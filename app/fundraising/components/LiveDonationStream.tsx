"use client"

import { useCallback, useEffect, useState } from "react"
import { HardLink } from "@/components/hard-link"
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
  const athleteCredit =
    !athlete_code && !athlete_display_name
      ? "NC United Training Fund"
      : athlete_display_name || athlete_code || "NC United Training Fund"

  return {
    id,
    createdIso: created_at,
    donorDisplay,
    amountCents: amount_cents,
    athleteCredit,
    athleteCode: athlete_code || null,
  }
}

function creditLabel(r: FundraisingHubActivityRow): string {
  if (!r.athleteCode?.trim()) return "NC United Training Fund"
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

  useEffect(() => {
    setRows(initial.slice(0, FEED_LIMIT))
  }, [initial])

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

  return (
    <section
      id="fundraising-live-donor-stream"
      className="scroll-mt-28 border-b border-white/[0.06] bg-[#061224] px-4 py-16 sm:py-20"
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
        <p className="mt-3 max-w-2xl text-sm text-white/65">
          Last {FEED_LIMIT} paid gifts · {hubTransparency.campaignDisplayName}, last {hubTransparency.lookbackDays} days.
        </p>

        <ul className="mt-8 divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/10 bg-[#0B2545]/45">
          {rows.length === 0 ? (
            <li className="px-4 py-12 text-center text-sm text-white/55">No gifts logged yet.</li>
          ) : (
            rows.map((r) => {
              const label = creditLabel(r)
              const href = fundraisingAthletePublicHrefFromCode(r.athleteCode)
              return (
                <li
                  key={r.id}
                  className="flex flex-col gap-1 px-4 py-3.5 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4"
                >
                  <span className="w-28 shrink-0 font-mono text-[11px] tabular-nums text-white/45">
                    {formatRelativeOrAbsolute(r.createdIso)}
                  </span>
                  <span className="min-w-0 flex-1 font-semibold text-white">{r.donorDisplay}</span>
                  <span className={`${displayFont("font-extrabold tabular-nums text-[#C8A94A]")}`}>
                    {formatUsdWhole(r.amountCents)}
                  </span>
                  <span className="text-white/50">→</span>
                  <span className="min-w-0 flex-1 truncate text-white/85 sm:max-w-md">
                    {href ? (
                      <HardLink href={href} className="font-semibold underline-offset-4 hover:text-[#C8A94A] hover:underline">
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

        <div className="mt-6 text-right">
          <HardLink
            href="/spartan"
            className={`${displayFont("text-sm font-extrabold uppercase tracking-wide text-[#C8A94A] underline-offset-4 hover:underline")}`}
          >
            View all donor activity →
          </HardLink>
        </div>
      </div>
    </section>
  )
}
