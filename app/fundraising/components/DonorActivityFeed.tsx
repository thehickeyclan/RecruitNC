"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { HardLink } from "@/components/hard-link"
import type { FundraisingHubActivityRow } from "@/lib/fundraising/hub-data"
import { fundraisingAthletePublicHrefFromCode } from "@/lib/fundraising/athlete-fundraising-slug"
import { formatUsdWhole } from "./FundraisingHero"

function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
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
    athlete_display_name || athlete_code || "NC United general fund"

  return {
    id,
    createdIso: created_at,
    donorDisplay,
    amountCents: amount_cents,
    athleteCredit,
    athleteCode: athlete_code || null,
  }
}

const FEED_LIMIT = 20

export function DonorActivityFeed({ initial }: { initial: FundraisingHubActivityRow[] }) {
  const [rows, setRows] = useState(initial)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pauseScrollRef = useRef(false)

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
          .channel("fundraising_hub_feed_v2")
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

  /** Gentle auto-scroll when content overflows; cycle through list (pause on hover / focus). */
  useEffect(() => {
    const el = scrollRef.current
    if (!el || rows.length < 4) return

    let rafId = 0
    const step = () => {
      if (pauseScrollRef.current) {
        rafId = requestAnimationFrame(step)
        return
      }
      const max = el.scrollHeight - el.clientHeight
      if (max <= 4) {
        rafId = requestAnimationFrame(step)
        return
      }
      el.scrollTop += 0.42
      if (el.scrollTop >= max - 1) {
        el.scrollTop = 0
      }
      rafId = requestAnimationFrame(step)
    }
    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [rows.length])

  return (
    <section
      id="fundraising-activity"
      className="scroll-mt-28 border-b border-white/[0.06] bg-[#061224] px-4 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between">
          <div>
            <p className={`${displayFont("text-[11px] font-extrabold uppercase tracking-[0.28em] text-[#C8A94A]")}`}>
              Wire
            </p>
            <h2
              className={`${displayFont("mt-2 text-[clamp(1.85rem,4.5vw,2.65rem)] font-black uppercase tracking-tight text-white")}`}
            >
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
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80">
          Last {FEED_LIMIT} paid gifts from checkout, newest first — Supabase realtime + Stripe mirror.
        </p>

        <div
          ref={scrollRef}
          onMouseEnter={() => {
            pauseScrollRef.current = true
          }}
          onMouseLeave={() => {
            pauseScrollRef.current = false
          }}
          onFocus={() => {
            pauseScrollRef.current = true
          }}
          onBlur={() => {
            pauseScrollRef.current = false
          }}
          className="mt-10 max-h-[440px] overflow-y-auto rounded-xl border border-white/10 bg-[#0B2545]/45 shadow-[inset_0_0_60px_rgba(0,0,0,0.35)] scroll-smooth"
        >
          <ul className="divide-y divide-white/[0.06]">
            {rows.length === 0 ? (
              <li className="px-4 py-14 text-center text-sm text-white/80">No gifts logged yet.</li>
            ) : (
              rows.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-2 px-4 py-4 text-sm transition-colors hover:bg-white/[0.03] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1"
                >
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-white sm:w-[118px]">
                    {new Date(r.createdIso).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="min-w-0 flex-1 font-semibold text-white">{r.donorDisplay}</span>
                  <span className={`${displayFont("shrink-0 font-extrabold tabular-nums text-[#C8A94A]")}`}>
                    {formatUsdWhole(r.amountCents)}
                  </span>
                  <span className="max-w-full truncate text-white sm:max-w-[280px]">
                    <span className="text-white/80">→</span>{" "}
                    {(() => {
                      const href = fundraisingAthletePublicHrefFromCode(r.athleteCode)
                      if (!href) return r.athleteCredit
                      return (
                        <HardLink
                          href={href}
                          className="font-semibold text-white underline-offset-4 hover:text-[#C8A94A] hover:underline"
                        >
                          {r.athleteCredit}
                        </HardLink>
                      )
                    })()}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </section>
  )
}
