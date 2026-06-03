"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Input } from "@/components/ui/input"
import { Loader2, Search, ChevronRight } from "lucide-react"
import type { BlueSignupRow } from "@/app/api/admin/blue/subscriptions/route"
import { BlueAdminAuthBanner, isBlueAuthError } from "@/components/blue-admin-auth-banner"
import { HardLink } from "@/components/hard-link"
import { cn } from "@/lib/utils"

const BLUE_DATA_RETRY_MS = 2000

function athleteName(s: BlueSignupRow) {
  return [s.athlete_first_name, s.athlete_last_name].filter(Boolean).join(" ").trim() || "—"
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return "—"
  }
}

type Filter = "all" | "paid" | "pending"

export default function AdminBlueRegistrationsPipelinePage() {
  const [signups, setSignups] = useState<BlueSignupRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>("all")
  const [search, setSearch] = useState("")
  const [signupsError, setSignupsError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [membershipsError, setMembershipsError] = useState<string | null>(null)
  const { isLoading: authLoading } = useAuth()
  const retryCountRef = useRef(0)

  const paidCount = signups.filter((s) => s.status === "paid").length
  const pendingCount = signups.length - paidCount

  const filteredSignups = useMemo(() => {
    let rows =
      filter === "paid" ? signups.filter((s) => s.status === "paid") : filter === "pending" ? signups.filter((s) => s.status !== "paid") : signups
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((s) => {
      const blob = [
        athleteName(s),
        s.parent_email,
        s.athlete_high_school,
        s.athlete_wrestling_club,
        String(s.athlete_graduation_year ?? ""),
      ]
        .join(" ")
        .toLowerCase()
      return blob.includes(q)
    })
  }, [signups, filter, search])

  useEffect(() => {
    if (authLoading) return
    let cancelled = false

    const load = () => {
      if (!cancelled) setLoading(true)
      fetch("/api/admin/blue/subscriptions", { credentials: "include" })
        .then((r) => {
          if (!r.ok) {
            throw new Error(r.status === 401 ? "Not signed in." : r.status === 403 ? "Admin access required." : `Could not load (${r.status}).`)
          }
          return r.json()
        })
        .then((data) => {
          if (cancelled) return
          if (data?.error) {
            setLoadError(data.error)
            return
          }
          setSignups(data.signups ?? [])
          setSignupsError(data.signupsError ?? null)
          setMembershipsError(data.membershipsError ?? null)
        })
        .catch((err) => {
          if (!cancelled) {
            const msg = err?.message ?? "Could not load."
            setLoadError(msg)
            setSignups([])
            if (isBlueAuthError(msg) && retryCountRef.current < 1) {
              retryCountRef.current += 1
              setTimeout(load, BLUE_DATA_RETRY_MS)
            }
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }

    load()
    return () => {
      cancelled = true
    }
  }, [authLoading])

  const pills: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: signups.length },
    { key: "paid", label: "Paid", count: paidCount },
    { key: "pending", label: "Pending", count: pendingCount },
  ]

  return (
    <div className="space-y-4">
      {loadError && isBlueAuthError(loadError) && (
        <BlueAdminAuthBanner returnTo="/admin/blue/subscriptions/registrations" />
      )}

      {(membershipsError || signupsError) && !loading && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
          {membershipsError || signupsError}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {pills.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                filter === key ? "bg-[#D3B574] text-[#03154C]" : "bg-white/10 text-white/80 hover:bg-white/15",
              )}
            >
              {label} <span className="opacity-70">{count}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <Input
            placeholder="Search name, school, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-white/15 bg-white/10 pl-9 text-white placeholder:text-white/40 focus-visible:ring-[#D3B574]/50"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#03154C]/40">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-white/60">
            <Loader2 className="h-8 w-8 animate-spin text-[#D3B574]" />
            <p className="text-sm">Loading signups…</p>
          </div>
        ) : loadError ? (
          <p className="px-4 py-8 text-center text-sm text-red-300">{loadError}</p>
        ) : filteredSignups.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-white/50">No signups match this filter.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {filteredSignups.map((s) => {
              const name = athleteName(s)
              const school = s.athlete_high_school || "—"
              const club = s.athlete_wrestling_club?.trim()
              const paid = s.status === "paid"
              return (
                <li key={s.id}>
                  <HardLink
                    href={`/admin/blue/signups/${s.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-white/5 sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-white">{name}</span>
                        {s.athlete_graduation_year && (
                          <span className="text-xs text-white/45">&apos;{String(s.athlete_graduation_year).slice(-2)}</span>
                        )}
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
                            paid ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-200",
                          )}
                        >
                          {paid ? "Paid" : "Pending"}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-white/55">
                        {school}
                        {club ? ` · ${club}` : ""}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-white/40">{s.parent_email}</p>
                    </div>
                    <div className="hidden shrink-0 text-right text-xs text-white/40 sm:block">
                      {fmtDate(s.created_at)}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
                  </HardLink>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {!loading && filteredSignups.length > 0 && (
        <p className="text-center text-xs text-white/35">
          {filteredSignups.length} signup{filteredSignups.length === 1 ? "" : "s"} · tap a row for full details
        </p>
      )}
    </div>
  )
}
