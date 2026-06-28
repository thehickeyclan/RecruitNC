"use client"

import { Sparkles } from "lucide-react"
import { HardLink } from "@/components/hard-link"
import {
  aauPanelClass,
  aauPanelDescClass,
  aauPanelHeaderClass,
  aauPanelTitleClass,
} from "@/components/national-team/aau-scholastic-theme"
import { aauScholasticProfileHref } from "@/lib/content/aau-scholastic-duals-2026-profile-ids"
import type { AauScholasticWrestlerQualityWins } from "@/lib/aau-scholastic-duals-2026-quality-wins"
import { cn } from "@/lib/utils"

function QualityWinBlock({
  entry,
  profileIdMap,
}: {
  entry: AauScholasticWrestlerQualityWins
  profileIdMap: Record<string, string>
}) {
  const profileHref = aauScholasticProfileHref(entry.wrestler, profileIdMap)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <HardLink href={profileHref} className="text-lg sm:text-xl font-black text-white hover:text-[#FF7070] hover:underline">
          {entry.wrestler}
        </HardLink>
        <span className="text-sm font-semibold text-[#D3B574] tabular-nums">
          {entry.weightLabel} · {entry.record}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="bg-[#0a2040]/80 text-left text-white/90">
              <th className="px-3 sm:px-4 py-2.5 font-bold">Opponent</th>
              <th className="px-3 sm:px-4 py-2.5 font-bold w-28">State</th>
              <th className="px-3 sm:px-4 py-2.5 font-bold">Credentials</th>
              <th className="px-3 sm:px-4 py-2.5 font-bold hidden md:table-cell w-36">Result</th>
            </tr>
          </thead>
          <tbody>
            {entry.wins.map((win) => (
              <tr key={win.opponentName} className="border-t border-white/10 hover:bg-white/[0.03]">
                <td className="px-3 sm:px-4 py-3 font-semibold text-white">{win.opponentName}</td>
                <td className="px-3 sm:px-4 py-3 text-white/75">{win.state}</td>
                <td className="px-3 sm:px-4 py-3 text-white/80">{win.credentials}</td>
                <td className="px-3 sm:px-4 py-3 hidden md:table-cell text-white/60 text-xs">
                  {win.resultLine ? (
                    <span className="block">
                      <span className="font-bold text-[#FF7070] tabular-nums">{win.resultLine}</span>
                      {win.opponentTeam ? (
                        <span className="block mt-0.5 truncate max-w-[160px]">{win.opponentTeam}</span>
                      ) : null}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-[#B31B1B]/25 bg-[#0a2040]/50 px-4 py-4">
        <p className="text-xs font-bold uppercase tracking-wider text-[#FF7070] mb-3">
          {entry.wrestler} · Quality win summary
        </p>
        <ul className="grid gap-2 sm:grid-cols-2 text-sm text-white/85">
          {entry.summaryBullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF7070]" aria-hidden />
              {bullet}
            </li>
          ))}
        </ul>
        <p className="text-sm text-white/70 mt-4 leading-relaxed italic">{entry.summaryNote}</p>
      </div>
    </div>
  )
}

export function AauScholasticQualityWinsSection({
  entries,
  profileIdMap = {},
}: {
  entries: AauScholasticWrestlerQualityWins[]
  profileIdMap?: Record<string, string>
}) {
  if (entries.length === 0) return null

  return (
    <section id="quality-wins" className={aauPanelClass}>
      <div className={cn(aauPanelHeaderClass, "flex items-center gap-2")}>
        <Sparkles className="w-5 h-5 text-[#FF7070]" aria-hidden />
        <div>
          <h2 className={aauPanelTitleClass}>Quality wins</h2>
          <p className={aauPanelDescClass}>
            Signature wins over state champions, placers, and national-level opponents
          </p>
        </div>
      </div>
      <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-10">
        {entries.map((entry) => (
          <QualityWinBlock key={entry.wrestler} entry={entry} profileIdMap={profileIdMap} />
        ))}
      </div>
    </section>
  )
}
