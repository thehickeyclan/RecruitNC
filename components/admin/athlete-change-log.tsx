"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowRight, Loader2, RefreshCw, Search, ShieldCheck, UserPlus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

type Entry = {
  id: string
  createdAt: string
  athleteId: string
  athleteName: string
  athleteSchool: string | null
  editorName: string
  editorEmail: string | null
  editorType: string | null
  fieldName: string
  oldValue: string
  newValue: string
  changeType: string
  ipAddress: string | null
}

/** Ownership events read differently from field edits, so they are labelled and coloured apart. */
const CHANGE_TYPES: Array<{ value: string; label: string; tone: string; icon?: typeof ShieldCheck }> = [
  { value: "all", label: "Everything", tone: "bg-white/10 text-white/70" },
  { value: "athlete_edit", label: "Profile edits", tone: "bg-white/10 text-white/70" },
  { value: "profile_created", label: "Created", tone: "bg-sky-500/15 text-sky-200", icon: UserPlus },
  { value: "profile_claimed", label: "Claimed", tone: "bg-amber-500/20 text-amber-100", icon: ShieldCheck },
  { value: "parent_linked", label: "Parent linked", tone: "bg-violet-500/15 text-violet-200", icon: Users },
  { value: "parent_unlinked", label: "Parent unlinked", tone: "bg-violet-500/10 text-violet-200/70", icon: Users },
]

function toneFor(changeType: string) {
  return CHANGE_TYPES.find((t) => t.value === changeType) ?? CHANGE_TYPES[1]
}

function when(iso: string): string {
  const then = new Date(iso).getTime()
  const mins = Math.round((Date.now() - then) / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`
  if (mins < 60 * 24 * 30) return `${Math.round(mins / 1440)}d ago`
  return new Date(iso).toLocaleDateString()
}

function truncate(value: string, max = 90): string {
  const clean = value.replace(/\s+/g, " ").trim()
  if (!clean) return "—"
  return clean.length > max ? `${clean.slice(0, max)}…` : clean
}

export function AthleteChangeLog({ athleteId }: { athleteId?: string }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [changeType, setChangeType] = useState("all")
  const [search, setSearch] = useState("")
  const [total, setTotal] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (changeType !== "all") params.set("changeType", changeType)
    if (athleteId) params.set("athleteId", athleteId)
    if (search.trim()) params.set("search", search.trim())

    const response = await fetch(`/api/admin/athlete-audit?${params}`, { credentials: "include", cache: "no-store" })
    const data = await response.json().catch(() => ({}))
    setLoading(false)
    if (!response.ok) {
      setError(data.error ?? "Unable to load the change log.")
      return
    }
    setError(null)
    setEntries(data.entries ?? [])
    setTotal(data.total ?? 0)
  }, [changeType, search, athleteId])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search ? 300 : 0)
    return () => window.clearTimeout(timer)
  }, [load, search])

  if (error) {
    return (
      <div className="rounded-sm border border-red-400/40 bg-red-500/10 p-5 text-red-100">
        <h3 className="flex items-center gap-2 font-black">
          <AlertTriangle className="h-4 w-4" />
          Unable to load the change log
        </h3>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-white/40" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search athlete, editor, field or value…"
            className="rounded-sm border-white/15 bg-[#020b18] pl-9 text-white placeholder:text-white/30"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => void load()}
          className="rounded-sm border-white/15 bg-white/5 text-white hover:bg-white/10"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {CHANGE_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => setChangeType(type.value)}
            className={`rounded-sm px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
              changeType === type.value ? "bg-[#D7B968] text-[#071427]" : "bg-white/5 text-white/55 hover:bg-white/10"
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 rounded-sm border border-white/10 bg-[#071427]/70 p-6 text-white/70">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading changes…
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-sm border border-white/10 bg-[#071427]/70 p-6 text-center text-white/50">
          No changes match that filter.
        </div>
      ) : (
        <>
          <p className="text-xs text-white/40">
            Showing {entries.length} of {total.toLocaleString()} recorded changes, newest first.
          </p>
          <div className="space-y-2">
            {entries.map((entry) => {
              const tone = toneFor(entry.changeType)
              const Icon = tone.icon
              return (
                <div key={entry.id} className="rounded-sm border border-white/10 bg-[#071427]/70 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={`rounded-sm ${tone.tone}`}>
                      {Icon ? <Icon className="mr-1 h-3 w-3" /> : null}
                      {tone.label}
                    </Badge>
                    {athleteId ? null : (
                      <Link
                        href={`/view-profile?id=${encodeURIComponent(entry.athleteId)}`}
                        className="font-bold text-white hover:text-[#D7B968]"
                      >
                        {entry.athleteName}
                      </Link>
                    )}
                    {entry.athleteSchool && !athleteId ? (
                      <span className="text-sm text-white/35">{entry.athleteSchool}</span>
                    ) : null}
                    <span className="ml-auto text-xs text-white/35">{when(entry.createdAt)}</span>
                  </div>

                  <div className="mt-2 text-sm">
                    <span className="font-semibold text-[#D7B968]">{entry.fieldName}</span>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-white/70">
                      <span className="rounded-sm bg-white/5 px-2 py-1 line-through decoration-white/25">
                        {truncate(entry.oldValue)}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-white/30" />
                      <span className="rounded-sm bg-emerald-500/10 px-2 py-1 text-emerald-100">
                        {truncate(entry.newValue)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/40">
                    <span>
                      by <span className="text-white/65">{entry.editorName}</span>
                    </span>
                    {entry.editorType ? <span>· {entry.editorType}</span> : null}
                    {entry.ipAddress ? <span>· {entry.ipAddress}</span> : null}
                    <span>· {new Date(entry.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
