"use client"

import { useCallback, useEffect, useState } from "react"
import { HardLink } from "@/components/hard-link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatTiedRank } from "@/lib/historical-wins/display"
import {
  shouldLinkWinningestAthlete,
  winningestAthleteHref,
  type WinningestWrestlerPublicRow,
} from "@/lib/historical-wins/public"
import { ArrowLeft, Loader2, Trophy } from "lucide-react"

type SourceInfo = { title: string; dataset_key: string; version: number } | null

export default function SingleSeasonWinsPage() {
  const [rows, setRows] = useState<WinningestWrestlerPublicRow[]>([])
  const [source, setSource] = useState<SourceInfo>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [athlete, setAthlete] = useState("")
  const [school, setSchool] = useState("")
  const [season, setSeason] = useState("")
  const [sort, setSort] = useState<"wins" | "rank">("wins")
  const [athleteDraft, setAthleteDraft] = useState("")
  const [schoolDraft, setSchoolDraft] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      if (athlete.trim().length >= 2) qs.set("athlete", athlete.trim())
      if (school.trim().length >= 2) qs.set("school", school.trim())
      if (season) qs.set("season", season)
      qs.set("sort", sort)
      qs.set("limit", "521")
      const res = await fetch(`/api/history/single-season-wins?${qs}`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to load")
      setRows(data.rows ?? [])
      setSource(data.source ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [athlete, school, season, sort])

  useEffect(() => {
    void load()
  }, [load])

  const applyFilters = () => {
    setAthlete(athleteDraft)
    setSchool(schoolDraft)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <HardLink href="/nchsaa">
            <Button
              variant="outline"
              size="sm"
              className="border-[#B91C1C] text-[#B91C1C] hover:bg-[#B91C1C] hover:text-white bg-transparent"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              NCHSAA
            </Button>
          </HardLink>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#003366] flex items-center gap-2">
              <Trophy className="w-8 h-8 text-[#B91C1C]" />
              Single-season most victories
            </h1>
            <p className="text-slate-600 text-sm md:text-base">
              NCHSAA Wrestling Most Victories (Season–All Time)
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4 mb-4">
          <div>
            <Label htmlFor="athlete">Athlete</Label>
            <Input
              id="athlete"
              value={athleteDraft}
              onChange={(e) => setAthleteDraft(e.target.value)}
              placeholder="Search name"
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            />
          </div>
          <div>
            <Label htmlFor="school">School</Label>
            <Input
              id="school"
              value={schoolDraft}
              onChange={(e) => setSchoolDraft(e.target.value)}
              placeholder="Filter school"
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            />
          </div>
          <div>
            <Label htmlFor="season">Season</Label>
            <Input
              id="season"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              placeholder="e.g. 2006-2007"
            />
          </div>
          <div>
            <Label>Sort</Label>
            <Select value={sort} onValueChange={(v) => setSort(v as "wins" | "rank")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wins">Wins (desc)</SelectItem>
                <SelectItem value="rank">Rank</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Button onClick={applyFilters} className="bg-[#003366] hover:bg-[#002244]">
            Apply search
          </Button>
          <p className="text-sm text-slate-600">
            Showing <strong>{rows.length}</strong> record{rows.length === 1 ? "" : "s"}
          </p>
        </div>

        {source ? (
          <p className="text-xs text-slate-500 mb-4">
            Source: {source.title} · dataset {source.dataset_key} v{source.version}
          </p>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 text-slate-600 py-12 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <p className="text-red-700 py-8">{error}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-[#003366] text-white">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Rank</th>
                  <th className="text-left px-3 py-2 font-medium">Athlete</th>
                  <th className="text-left px-3 py-2 font-medium">School</th>
                  <th className="text-left px-3 py-2 font-medium">Record</th>
                  <th className="text-left px-3 py-2 font-medium">Season</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const rank =
                    r.rank_position?.trim() ||
                    formatTiedRank(r.rank_numeric, Boolean(r.is_tied))
                  const link = shouldLinkWinningestAthlete(r)
                  return (
                    <tr key={r.id} className="border-t border-slate-100 odd:bg-slate-50/60">
                      <td className="px-3 py-2 tabular-nums">{rank}</td>
                      <td className="px-3 py-2 font-medium text-[#003366]">
                        {link && r.athlete_id ? (
                          <a
                            href={winningestAthleteHref(r.athlete_id)}
                            className="underline underline-offset-2 hover:text-[#B91C1C]"
                          >
                            {r.wrestler_name}
                          </a>
                        ) : (
                          r.wrestler_name
                        )}
                      </td>
                      <td className="px-3 py-2">{r.school}</td>
                      <td className="px-3 py-2 tabular-nums">{r.record}</td>
                      <td className="px-3 py-2">{r.year}</td>
                    </tr>
                  )
                })}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                      No records match these filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
