"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import type { FundraisingHubLeaderRow, FundraisingHubTransparencyMeta } from "@/lib/fundraising/hub-data"
import { fundraisingAthletePublicHrefFromCode } from "@/lib/fundraising/athlete-fundraising-slug"
import { HardLink } from "@/components/hard-link"
import { formatUsdWhole } from "./FundraisingHero"

function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

function isPaidSpartanRow(row: Record<string, unknown>): boolean {
  return row.status === "paid"
}

export function LeaderboardPreview({
  rows,
  hubTransparency,
}: {
  rows: FundraisingHubLeaderRow[]
  hubTransparency: FundraisingHubTransparencyMeta
}) {
  const router = useRouter()

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | undefined
    let iv: ReturnType<typeof setInterval> | undefined

    const bump = () => {
      clearTimeout(debounce)
      debounce = setTimeout(() => router.refresh(), 900)
    }

    let cancelled = false
    let unsub: (() => void) | undefined

    void (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const sb = createClient()
        const channel = sb
          .channel("fundraising_hub_leaderboard_preview")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "spartan_donations" },
            (payload) => {
              const row = (payload.new ?? {}) as Record<string, unknown>
              if (!isPaidSpartanRow(row)) return
              if (!cancelled) bump()
            },
          )
          .subscribe()
        unsub = () => {
          void sb.removeChannel(channel)
        }
      } catch {
        /* Realtime unavailable */
      }
    })()

    iv = setInterval(() => router.refresh(), 75000)

    return () => {
      cancelled = true
      clearTimeout(debounce)
      if (iv) clearInterval(iv)
      unsub?.()
    }
  }, [router])

  return (
    <section
      id="fundraising-leaderboard-preview"
      className="scroll-mt-28 border-y border-white/[0.06] bg-[#040f22] px-4 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#C8A94A]")}`}>
              Leaderboard
            </p>
            <h2 className={`${displayFont("mt-2 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl")}`}>
              Top athletes
            </h2>
            <p className="mt-2 max-w-xl text-sm text-white">
              Top five athletes by athlete-credited paid gifts in the last{" "}
              <span className="tabular-nums text-white">{hubTransparency.lookbackDays}</span> days — all NC United hub
              campaigns in Stripe combined (not only {hubTransparency.campaignDisplayName}).
            </p>
          </div>
          <HardLink
            href={`/fundraising/leaderboard?campaign=all&days=${hubTransparency.lookbackDays}`}
            className={`${displayFont("text-right text-sm font-extrabold uppercase tracking-wide text-[#C8A94A] underline-offset-4 hover:underline sm:text-left")}`}
          >
            View full leaderboard →
          </HardLink>
        </div>

        <div className="mt-10 overflow-x-auto rounded-xl border border-white/10 bg-[#0B2545]/55">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className={`${displayFont("border-b border-white/10 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/70")}`}>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Athlete</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3 text-right">Raised</th>
                <th className="min-w-[120px] px-4 py-3">Momentum</th>
              </tr>
            </thead>
            <tbody className="text-white">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-white/85">
                    Paid gifts will populate this board as athletes earn support.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.athleteCode} className="border-b border-white/[0.05] last:border-0">
                    <td className={`${displayFont("px-4 py-3 text-lg font-black tabular-nums text-[#CC0000]")}`}>
                      {r.rank}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const href = fundraisingAthletePublicHrefFromCode(r.athleteCode)
                        return href ? (
                          <HardLink href={href} className="font-bold text-white underline-offset-4 hover:text-[#C8A94A] hover:underline">
                            {r.athleteName}
                          </HardLink>
                        ) : (
                          <span className="font-bold text-white">{r.athleteName}</span>
                        )
                      })()}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-white">{r.school || "—"}</td>
                    <td className={`${displayFont("px-4 py-3 text-right text-base font-extrabold tabular-nums text-white")}`}>
                      {formatUsdWhole(r.raisedCents)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-2 overflow-hidden rounded-full bg-black/45">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#CC0000] to-[#C8A94A]"
                          style={{ width: `${r.progressPct}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
