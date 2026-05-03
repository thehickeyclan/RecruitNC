"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import type { FundraisingHubLeaderRow } from "@/lib/fundraising/hub-data"
import { fundraisingAthletePublicHrefFromCode } from "@/lib/fundraising/athlete-fundraising-slug"
import { HardLink } from "@/components/hard-link"
import { formatUsdWhole } from "./FundraisingHero"

function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

function isPaidSpartanRow(row: Record<string, unknown>): boolean {
  return row.status === "paid"
}

export function AthleteLeaderboard({ rows }: { rows: FundraisingHubLeaderRow[] }) {
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
          .channel("fundraising_hub_leaderboard_v2")
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
        /* Realtime unavailable — polling below */
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
    <section className="border-y border-white/[0.06] bg-[#040f22] px-4 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className={`${displayFont("text-[11px] font-extrabold uppercase tracking-[0.28em] text-[#CC0000]")}`}>
              Field report
            </p>
            <h2
              className={`${displayFont("mt-2 text-[clamp(1.85rem,4.5vw,2.65rem)] font-black uppercase tracking-tight text-white")}`}
            >
              Athlete leaderboard
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/55">
              Top ten by credited gifts across NC United drives — numbers refresh as checkout clears.
            </p>
          </div>
          <HardLink
            href="/fundraising/leaderboard"
            className={`${displayFont("shrink-0 text-sm font-extrabold uppercase tracking-wide text-[#C8A94A] underline-offset-4 hover:underline")}`}
          >
            View all athletes →
          </HardLink>
        </div>

        {/* Mobile: cards */}
        <div className="mt-12 space-y-4 md:hidden">
          {rows.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-[#0B2545]/50 px-4 py-12 text-center text-sm text-white/45">
              Paid gifts will populate this board as athletes earn support.
            </p>
          ) : (
            rows.map((r) => (
              <div
                key={r.athleteCode}
                className="rounded-xl border border-white/10 bg-[#0B2545]/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`${displayFont("text-2xl font-black tabular-nums text-[#CC0000]")}`}>{r.rank}</span>
                    {(() => {
                      const href = fundraisingAthletePublicHrefFromCode(r.athleteCode)
                      return href ? (
                        <HardLink
                          href={href}
                          className="mt-1 block font-bold text-white underline-offset-4 hover:text-[#C8A94A] hover:underline"
                        >
                          {r.athleteName}
                        </HardLink>
                      ) : (
                        <h3 className="mt-1 font-bold text-white">{r.athleteName}</h3>
                      )
                    })()}
                    {(() => {
                      const href = fundraisingAthletePublicHrefFromCode(r.athleteCode)
                      return href ? (
                        <HardLink href={href} className="font-mono text-[11px] text-white/60 hover:text-[#C8A94A] hover:underline">
                          {r.athleteCode}
                        </HardLink>
                      ) : (
                        <p className="font-mono text-[11px] text-white/35">{r.athleteCode}</p>
                      )
                    })()}
                  </div>
                  <div className="text-right">
                    <p className={`${displayFont("text-lg font-extrabold tabular-nums text-white")}`}>
                      {formatUsdWhole(r.raisedCents)}
                    </p>
                    <p className="text-xs text-white/50">{r.donorCount} donors</p>
                  </div>
                </div>
                <p className="mt-3 truncate text-sm text-white/50">{r.school || "—"}</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/45">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#CC0000] to-[#C8A94A]"
                    style={{ width: `${r.progressPct}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop: table */}
        <div className="mt-12 hidden overflow-x-auto rounded-xl border border-white/10 bg-[#0B2545]/55 md:block">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr
                className={`${displayFont("border-b border-white/10 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/40")}`}
              >
                <th className="px-4 py-4">#</th>
                <th className="px-4 py-4">Athlete</th>
                <th className="px-4 py-4">School</th>
                <th className="px-4 py-4 text-right">Raised</th>
                <th className="px-4 py-4 text-right">Donors</th>
                <th className="min-w-[160px] px-4 py-4">Momentum</th>
              </tr>
            </thead>
            <tbody className="text-white/88">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-white/45">
                    Paid gifts will populate this board as athletes earn support.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.athleteCode} className="border-b border-white/[0.05] last:border-0">
                    <td className={`${displayFont("px-4 py-4 text-xl font-black tabular-nums text-[#CC0000]")}`}>
                      {r.rank}
                    </td>
                    <td className="px-4 py-4">
                      {(() => {
                        const href = fundraisingAthletePublicHrefFromCode(r.athleteCode)
                        return href ? (
                          <>
                            <HardLink
                              href={href}
                              className="block font-bold text-white underline-offset-4 hover:text-[#C8A94A] hover:underline"
                            >
                              {r.athleteName}
                            </HardLink>
                            <HardLink
                              href={href}
                              className="mt-0.5 block font-mono text-[11px] text-white/55 hover:text-[#C8A94A] hover:underline"
                            >
                              {r.athleteCode}
                            </HardLink>
                          </>
                        ) : (
                          <>
                            <span className="font-bold text-white">{r.athleteName}</span>
                            <span className="mt-0.5 block font-mono text-[11px] text-white/35">{r.athleteCode}</span>
                          </>
                        )
                      })()}
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-4 text-white/55">{r.school || "—"}</td>
                    <td className={`${displayFont("px-4 py-4 text-right text-base font-extrabold tabular-nums text-white")}`}>
                      {formatUsdWhole(r.raisedCents)}
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums text-white/65">{r.donorCount}</td>
                    <td className="px-4 py-4">
                      <div className="h-2.5 overflow-hidden rounded-full bg-black/45">
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
