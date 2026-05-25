"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { HardLink } from "@/components/hard-link"
import { NhscaDualsTeamPhotos } from "@/components/national-team/nhsca-duals-team-photo"
import { NhscaDualsBigWinsSection } from "@/components/national-team/nhsca-duals-big-wins-section"
import { NhscaDualsResultsCommandCenter } from "@/components/national-team/nhsca-duals-results-command-center"
import { NationalTeamWrestlerCards } from "@/components/national-team/national-team-wrestler-cards"
import { SelectTeamWrestlerCards } from "@/components/national-team/select-team-wrestler-cards"
import type { NhscaDualsBigWin } from "@/lib/nhsca-duals-big-wins"
import type { CommandCenterScope } from "@/lib/nhsca-duals-command-center"
import type { NhscaDualsResultsSnapshot } from "@/lib/nhsca-duals-live-results/types"
import {
  hubMainClass,
  hubPageClass,
  hubPanelClass,
  hubSectionDescClass,
  hubSectionTitleClass,
} from "@/components/national-team/nhsca-hub-theme"
import { cn } from "@/lib/utils"

type PublicSnapshot = NhscaDualsResultsSnapshot & {
  tablesReady?: boolean
  bigWins?: NhscaDualsBigWin[]
  message?: string
}

function parseTeamScope(raw: string | null): CommandCenterScope {
  if (raw === "national" || raw === "select") return raw
  return "all"
}

export function NhscaDuals2026ArchivePage() {
  const searchParams = useSearchParams()
  const initialScope = parseTeamScope(searchParams.get("team"))
  const [data, setData] = useState<PublicSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scope, setScope] = useState<CommandCenterScope>(initialScope)

  useEffect(() => {
    setScope(parseTeamScope(searchParams.get("team")))
  }, [searchParams])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch("/api/national-team/duals-results/public", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 503) {
          const body = (await r.json().catch(() => ({}))) as { message?: string }
          throw new Error(body.message ?? "Results not ready yet.")
        }
        if (!r.ok) throw new Error(`Failed (${r.status})`)
        return r.json() as Promise<PublicSnapshot>
      })
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load dual results.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const snapshot = useMemo(() => {
    if (!data?.teams?.length) return null
    return data as NhscaDualsResultsSnapshot
  }, [data])

  const bigWins = data?.bigWins ?? []

  if (loading) {
    return (
      <div className={cn(hubPageClass, "flex items-center justify-center min-h-[50vh]")}>
        <Loader2 className="h-8 w-8 animate-spin text-[#CBAF5D]" aria-label="Loading results" />
      </div>
    )
  }

  if (error || !snapshot) {
    return (
      <div className={cn(hubPageClass, hubMainClass)}>
        <article className={hubPanelClass}>
          <div className="p-8 text-center text-sm text-red-300">
            {error ?? data?.message ?? "Results are not available yet."}
          </div>
        </article>
      </div>
    )
  }

  return (
    <div className={hubPageClass}>
      <section className="border-b border-white/10 bg-gradient-to-b from-[#0a2040] to-[#001428]">
        <div className={cn(hubMainClass, "pt-8 md:pt-12 pb-8")}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#CBAF5D]/80 mb-2">
                Tournament archive
              </p>
              <h1 className={hubSectionTitleClass}>NHSCA Duals 2026</h1>
              <p className={cn(hubSectionDescClass, "mt-2 max-w-xl")}>
                NC United National &amp; Select teams — full dual results, athlete records, and team cards from
                Virginia Beach.
              </p>
              <p className="text-xs text-white/45 mt-3">May 23–26, 2026 · Virginia Beach, VA</p>
            </div>
            <HardLink
              href="/national-team/hub"
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl border border-[#CBAF5D]/35 bg-[#CBAF5D]/10 px-5 py-2.5 text-sm font-semibold text-[#CBAF5D] hover:bg-[#CBAF5D]/20 transition-colors"
            >
              Team hub →
            </HardLink>
          </div>

          <div className="flex rounded-xl bg-[#0a2040] border border-white/10 p-1 gap-1 max-w-md">
            {(
              [
                { id: "all", label: "Both teams" },
                { id: "national", label: "National" },
                { id: "select", label: "Select" },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setScope(o.id)}
                className={cn(
                  "flex-1 min-h-[44px] rounded-lg text-xs sm:text-sm font-bold transition-colors",
                  scope === o.id ? "bg-[#CBAF5D] text-[#002147]" : "text-white/65 hover:text-white"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className={cn(hubMainClass, "space-y-8 pb-12")}>
        <NhscaDualsTeamPhotos scope={scope} />

        <NhscaDualsResultsCommandCenter
          snapshot={snapshot}
          initialScope={scope}
          onScopeChange={setScope}
          archiveMode
        />

        <section className="rounded-2xl border border-white/10 bg-[#0a2040]/50 overflow-hidden">
          <header className="px-4 py-4 sm:px-5 border-b border-white/10 bg-[#002147]/35">
            <h2 className="text-lg font-bold text-white">Athlete cards</h2>
            <p className="text-xs text-white/55 mt-1">
              Photo, duals record, net team points, and big wins — ready to screenshot or share.
            </p>
          </header>
          {(scope === "all" || scope === "national") && (
            <NationalTeamWrestlerCards resultsSnapshot={snapshot} variant="archive" bigWins={bigWins} />
          )}
          {(scope === "all" || scope === "select") && (
            <SelectTeamWrestlerCards resultsSnapshot={snapshot} variant="archive" bigWins={bigWins} />
          )}
        </section>

        <NhscaDualsBigWinsSection bigWins={bigWins} scope={scope} />
      </main>
    </div>
  )
}
