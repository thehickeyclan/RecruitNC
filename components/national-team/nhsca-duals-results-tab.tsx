"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import {
  hubPanelClass,
  hubPanelDescClass,
  hubPanelHeaderClass,
  hubPanelTitleClass,
} from "@/components/national-team/nhsca-hub-theme"
import { NhscaDualsResultsPublic } from "@/components/national-team/nhsca-duals-results-public"
import { NhscaDualsResultsAdmin } from "@/components/national-team/nhsca-duals-results-admin"
import { NationalTeamWrestlerCards } from "@/components/national-team/national-team-wrestler-cards"
import { SelectTeamWrestlerCards } from "@/components/national-team/select-team-wrestler-cards"
import type { NhscaDualsResultsSnapshot } from "@/lib/nhsca-duals-live-results/types"
import { cn } from "@/lib/utils"

type SnapshotResponse = NhscaDualsResultsSnapshot & {
  tablesReady?: boolean
  isAdmin?: boolean
  message?: string
}

export function NhscaDualsResultsTab({ isAdmin = false }: { isAdmin?: boolean }) {
  const [data, setData] = useState<SnapshotResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adminMode, setAdminMode] = useState(isAdmin)

  const load = useCallback(async (seed?: boolean) => {
    setError(null)
    const url = seed ? "/api/national-team/duals-results?seed=1" : "/api/national-team/duals-results"
    const r = await fetch(url, { credentials: "include" })
    if (!r.ok) {
      if (r.status === 401) throw new Error("Sign in required.")
      const d = await r.json().catch(() => ({}))
      throw new Error((d as { error?: string }).error ?? `Failed (${r.status})`)
    }
    return (await r.json()) as SnapshotResponse
  }, [])

  const refresh = useCallback(async () => {
    const json = await load()
    setData(json)
    return json
  }, [load])

  const applySnapshot = useCallback(
    async (updated?: NhscaDualsResultsSnapshot) => {
      if (updated) {
        setData((prev) => ({
          ...(prev ?? {}),
          ...updated,
          tablesReady: true,
          isAdmin: prev?.isAdmin,
        }))
        return updated
      }
      return refresh()
    },
    [refresh]
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void load()
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load results.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [load])

  const showAdmin = isAdmin && data?.isAdmin
  const tablesReady = data?.tablesReady !== false && (data?.teams?.length ?? 0) > 0

  /** Fans (and admin preview) see score updates without manual refresh. */
  useEffect(() => {
    if (!tablesReady || (adminMode && showAdmin)) return
    const id = window.setInterval(() => {
      void load()
        .then((json) => setData(json))
        .catch(() => {})
    }, 10_000)
    return () => window.clearInterval(id)
  }, [tablesReady, adminMode, showAdmin, load])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#CBAF5D]" aria-label="Loading results" />
      </div>
    )
  }

  if (error) {
    return (
      <article className={hubPanelClass}>
        <div className="p-6 text-center text-sm text-red-300">{error}</div>
      </article>
    )
  }

  if (!tablesReady) {
    return (
      <article className={hubPanelClass}>
        <header className={hubPanelHeaderClass}>
          <h3 className={hubPanelTitleClass}>Live Results</h3>
          <p className={hubPanelDescClass}>
            Database tables are not set up yet. Run the Supabase scripts (STEP 1 → 2 → 3), then refresh.
          </p>
        </header>
        <div className="p-5 space-y-3 text-sm text-white/70">
          <p>{data?.message ?? "Tables missing in Supabase."}</p>
          {showAdmin && (
            <button
              type="button"
              className="min-h-[44px] w-full rounded-xl bg-[#CBAF5D] px-4 py-3 font-semibold text-[#002147]"
              onClick={() => {
                setLoading(true)
                void load(true)
                  .then(setData)
                  .catch((e) => setError(e instanceof Error ? e.message : "Seed failed"))
                  .finally(() => setLoading(false))
              }}
            >
              Admin: Initialize data (after SQL scripts)
            </button>
          )}
        </div>
      </article>
    )
  }

  const snapshot = data as NhscaDualsResultsSnapshot

  return (
    <div className="space-y-4">
      {showAdmin && (
        <div className="flex rounded-xl bg-[#0a2040] border border-white/10 p-1 gap-1">
          <button
            type="button"
            className={cn(
              "flex-1 min-h-[44px] rounded-lg text-sm font-semibold transition-colors",
              !adminMode ? "bg-[#CBAF5D] text-[#002147]" : "text-white/70 hover:text-white"
            )}
            onClick={() => setAdminMode(false)}
          >
            View results
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 min-h-[44px] rounded-lg text-sm font-semibold transition-colors",
              adminMode ? "bg-[#CBAF5D] text-[#002147]" : "text-white/70 hover:text-white"
            )}
            onClick={() => setAdminMode(true)}
          >
            Enter results
          </button>
        </div>
      )}

      {adminMode && showAdmin ? (
        <NhscaDualsResultsAdmin snapshot={snapshot} onSaved={applySnapshot} />
      ) : (
        <>
          <NhscaDualsResultsPublic snapshot={snapshot} />
          <NationalTeamWrestlerCards resultsSnapshot={snapshot} className="rounded-2xl border border-white/10 overflow-hidden bg-[#0a2040]/40" />
          <SelectTeamWrestlerCards resultsSnapshot={snapshot} className="rounded-2xl border border-white/10 overflow-hidden bg-[#0a2040]/40" />
        </>
      )}
    </div>
  )
}
