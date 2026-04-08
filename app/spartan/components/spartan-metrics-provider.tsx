"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"

export const SPARTAN_METRICS_DAYS = 120

export type SpartanPublicEntry = {
  id: string
  createdIso: string
  amountCents: number
  currency: string
  displayName: string
  raceSignup: boolean
  giftType: "race_donation" | "gift_only"
  athleteCode: string | null
  manualCreditName?: string | null
  creditLabel?: string | null
  attribution: string
}

export type SpartanByAthlete = {
  athleteCode: string
  /** Directory full name when the code matches the fundraising roster */
  athleteName: string
  totalCents: number
  donationCount: number
  raceSignupCount: number
}

export type SpartanMetricsSummary = {
  totalRaisedCents: number
  giftCount: number
  raceEntryCount: number
}

type SpartanMetricsState = {
  loading: boolean
  error: string | null
  days: number
  summary: SpartanMetricsSummary | null
  entries: SpartanPublicEntry[]
  byAthlete: SpartanByAthlete[]
  refresh: () => void
}

const SpartanMetricsContext = createContext<SpartanMetricsState | null>(null)

export function SpartanMetricsProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<SpartanMetricsSummary | null>(null)
  const [entries, setEntries] = useState<SpartanPublicEntry[]>([])
  const [byAthlete, setByAthlete] = useState<SpartanByAthlete[]>([])

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const res = await fetch(`/api/spartan/supporters?days=${SPARTAN_METRICS_DAYS}`)
        const j = (await res.json()) as {
          error?: string
          summary?: SpartanMetricsSummary
          entries?: SpartanPublicEntry[]
          byAthlete?: SpartanByAthlete[]
        }
        if (!res.ok) throw new Error(j.error || "Could not load")
        setSummary(j.summary ?? null)
        setEntries(j.entries ?? [])
        setByAthlete(j.byAthlete ?? [])
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed")
        setSummary(null)
        setEntries([])
        setByAthlete([])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const value: SpartanMetricsState = {
    loading,
    error,
    days: SPARTAN_METRICS_DAYS,
    summary,
    entries,
    byAthlete,
    refresh: load,
  }

  return <SpartanMetricsContext.Provider value={value}>{children}</SpartanMetricsContext.Provider>
}

export function useSpartanMetrics(): SpartanMetricsState {
  const ctx = useContext(SpartanMetricsContext)
  if (!ctx) {
    throw new Error("useSpartanMetrics must be used within SpartanMetricsProvider")
  }
  return ctx
}
