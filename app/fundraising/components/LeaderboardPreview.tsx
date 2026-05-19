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
              NC United Training Fund
            </p>
            <h2 className={`${displayFont("mt-2 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl")}`}>
              Athlete contributions
            </h2>
            <p className="mt-2 max-w-xl text-sm text-white">
              Training Fund-linked supporter totals by wrestler for this hub reporting window — paid checkout routed to NC United Wrestling when donors noted an
              athlete at checkout (same combined hub scope as the headline totals above; sorted by contribution amount).
            </p>
          </div>
          <HardLink
            href={`/fundraising/leaderboard?campaign=all&days=${hubTransparency.lookbackDays}`}
            className={`${displayFont(
              "-mx-1 inline-flex min-h-[48px] touch-manipulation items-center justify-end rounded-lg px-3 py-2 text-right text-sm font-extrabold uppercase tracking-wide text-[#C8A94A] underline-offset-4 hover:bg-white/[0.06] hover:underline sm:justify-start sm:text-left",
            )}`}
          >
            View Training Fund contribution leaderboard →
          </HardLink>
        </div>

        <ul className="mt-10 max-h-[min(70vh,36rem)] space-y-3 overflow-y-auto overscroll-y-contain pr-1 md:hidden" aria-label="Athletes by Training Fund-linked contributions received, mobile layout">
          {rows.length === 0 ? (
            <li className="rounded-xl border border-white/10 bg-[#0B2545]/55 px-4 py-10 text-center text-sm text-white/85">
              Paid Training Fund-linked gifts will populate this board as wrestlers earn support.
            </li>
          ) : (
            rows.map((r) => {
              const href = fundraisingAthletePublicHrefFromCode(r.athleteCode)
              return (
                <li
                  key={r.athleteCode}
                  className="rounded-xl border border-white/10 bg-[#0B2545]/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`${displayFont("text-3xl font-black tabular-nums leading-none text-[#CC0000]")}`}>
                      {r.rank}
                    </span>
                    <span className={`${displayFont("text-right text-lg font-extrabold tabular-nums text-white")}`}>
                      {formatUsdWhole(r.raisedCents)}
                    </span>
                  </div>
                  <div className="mt-3 min-w-0">
                    {href ? (
                      <HardLink
                        href={href}
                        className="touch-manipulation text-lg font-bold leading-snug text-white underline-offset-4 hover:text-[#C8A94A] hover:underline"
                      >
                        {r.athleteName}
                      </HardLink>
                    ) : (
                      <span className="text-lg font-bold text-white">{r.athleteName}</span>
                    )}
                    <p className="mt-1 truncate text-sm text-white/70">{r.school || "—"}</p>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/45">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#CC0000] to-[#C8A94A]"
                      style={{ width: `${r.progressPct}%` }}
                    />
                  </div>
                </li>
              )
            })
          )}
        </ul>

        <div className="mt-10 hidden max-h-[min(70vh,36rem)] overflow-auto overscroll-y-contain rounded-xl border border-white/10 bg-[#0B2545]/55 md:block">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className={`${displayFont("border-b border-white/10 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/70")}`}>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Athlete</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3 text-right">Contributions</th>
                <th className="min-w-[120px] px-4 py-3">Momentum</th>
              </tr>
            </thead>
            <tbody className="text-white">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-white/85">
                    Paid Training Fund-linked gifts will populate this board as wrestlers earn support.
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
                          <HardLink
                            href={href}
                            className="touch-manipulation font-bold text-white underline-offset-4 hover:text-[#C8A94A] hover:underline"
                          >
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
        <p className="mt-3 hidden text-center text-[11px] text-white/45 md:block">Swipe sideways if columns are clipped on a narrow tablet.</p>
      </div>
    </section>
  )
}
