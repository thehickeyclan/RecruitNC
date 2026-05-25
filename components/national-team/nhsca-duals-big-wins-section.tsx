"use client"

import { useMemo, useState } from "react"
import { ChevronDown, Sparkles, Trophy } from "lucide-react"
import type { NhscaDualsBigWin } from "@/lib/nhsca-duals-big-wins"
import type { CommandCenterScope } from "@/lib/nhsca-duals-command-center"
import { cn } from "@/lib/utils"

export function NhscaDualsBigWinsSection({
  bigWins,
  scope,
}: {
  bigWins: NhscaDualsBigWin[]
  scope: CommandCenterScope
}) {
  const [open, setOpen] = useState(true)

  const filtered = useMemo(() => {
    if (scope === "all") return bigWins
    return bigWins.filter((w) => w.teamType === scope)
  }, [bigWins, scope])

  return (
    <section className="rounded-2xl border border-[#CBAF5D]/25 bg-gradient-to-br from-[#0a2040]/90 to-[#001428] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-4 sm:px-5 text-left border-b border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
        aria-expanded={open}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#CBAF5D]/20 text-[#CBAF5D]">
          <Trophy className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold text-white tracking-tight">Big Wins</span>
          <span className="block text-xs text-white/55 mt-0.5">
            Signature NC United victories at NHSCA Duals 2026
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-[#CBAF5D]/15 px-2.5 py-1 text-sm font-black tabular-nums text-[#CBAF5D]">
          {filtered.length}
        </span>
        <ChevronDown className={cn("h-5 w-5 text-white/45 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="p-4 sm:p-5">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-10 text-center">
              <Sparkles className="h-8 w-8 mx-auto mb-3 text-[#CBAF5D]/40" aria-hidden />
              <p className="text-sm font-semibold text-white/75">Big wins coming soon</p>
              <p className="text-xs text-white/45 mt-2 max-w-sm mx-auto leading-relaxed">
                We&apos;ll highlight ranked upsets and signature team wins here. Share details anytime and
                we&apos;ll add them — or tag bouts as &quot;Big win&quot; in Enter results.
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((win) => (
                <li
                  key={win.id}
                  className="rounded-xl border border-emerald-500/25 bg-[#002147]/55 p-4 hover:border-emerald-400/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-base font-bold text-white truncate">{win.wrestlerName}</p>
                      <p className="text-[11px] font-semibold text-[#CBAF5D] tabular-nums">{win.weight} lbs</p>
                    </div>
                    <span className="shrink-0 rounded-md bg-emerald-600/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                      Win
                    </span>
                  </div>
                  <p className="text-sm text-white/85">
                    def. <span className="font-semibold text-white">{win.opponentName}</span>
                  </p>
                  <p className="text-xs text-white/50 mt-0.5 truncate">{win.opponentTeam}</p>
                  {win.highlight ? (
                    <p className="text-[11px] font-semibold text-amber-200/90 mt-2">{win.highlight}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-white/45">
                    <span className="rounded bg-white/8 px-1.5 py-0.5 font-bold text-white/70">
                      {win.resultLabel}
                      {win.scoreLine ? ` ${win.scoreLine}` : ""}
                    </span>
                    <span>{win.dayName}</span>
                    <span>·</span>
                    <span>{win.roundName}</span>
                    <span>·</span>
                    <span className="capitalize">{win.teamType}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  )
}
