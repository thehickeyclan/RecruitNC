"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import Link from "next/link"
import { Search, Star, MapPin, GraduationCap, Trophy, Award } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"

const NC_NAVY = "#002147"
const DEBOUNCE_MS = 300
const profileHref = (id: string) => `/unified-profile/${id}`

function normalizeSchool(s: string | null | undefined): string {
  if (s == null || typeof s !== "string") return "unknown"
  const t = s.trim().toLowerCase()
  return t === "" ? "unknown" : t
}

function getResultSchool(r: { school?: string; highschool?: string; high_school?: string }): string {
  return (r.school ?? r.highschool ?? r.high_school ?? "").toString().trim()
}

function isNameMatch(name1: string, name2: string): boolean {
  const norm = (n: string) =>
    (n ?? "")
      .toLowerCase()
      .replace(/,/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .sort()
      .join(" ")
  return norm(name1) === norm(name2) && norm(name1) !== ""
}

function getPlacementColor(place: string | number): string {
  const p = typeof place === "string" ? parseInt(String(place).replace(/\D/g, ""), 10) : Number(place)
  switch (p) {
    case 0:
      return "bg-slate-500 text-white"
    case 1:
      return "bg-[#CBAF5D] text-white"
    case 2:
      return "bg-gray-500 text-white"
    case 3:
      return "bg-[#B31B1B] text-white"
    case 4:
    case 5:
    case 8:
      return "bg-[#002147] text-white"
    case 6:
    case 7:
      return "bg-[#B31B1B] text-white"
    default:
      return "bg-gray-500 text-white"
  }
}

function dedupeNchsaaResults(results: { year?: number; classification?: string; weight_class?: string; place?: number }[]): typeof results {
  const byKey: Record<string, (typeof results)[0]> = {}
  const isPlacer = (r: (typeof results)[0]) => {
    const p = Number(r.place)
    const y = Number(r.year) || 0
    if (p >= 1 && p <= 4) return true
    if (y < 2026 && p >= 5 && p <= 8) return true
    return false
  }
  for (const r of results) {
    const key = `${r.year}-${r.classification ?? ""}-${r.weight_class ?? ""}`
    const existing = byKey[key]
    if (!existing) byKey[key] = r
    else if (isPlacer(r)) byKey[key] = r
  }
  return Object.values(byKey)
}

/** Comma-free name variations for .or(ilike). */
function getNameVariations(q: string): string[] {
  const t = (q || "").trim()
  if (!t) return []
  const out: string[] = []
  if (t.includes(",")) {
    const [last, first] = t.split(",").map((s) => s.trim())
    if (first && last) {
      out.push(`${first} ${last}`, `${last} ${first}`)
    } else {
      out.push(t.replace(/,/g, " "))
    }
  } else {
    out.push(t)
    const parts = t.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      const first = parts[0]!
      const last = parts.slice(1).join(" ")
      out.push(`${last} ${first}`)
    }
  }
  return [...new Set(out)]
}

function buildOrIlike(column: string, q: string): string {
  const variations = getNameVariations(q)
  const patterns = variations.map((v) => `%${v}%`)
  return patterns.map((p) => `${column}.ilike.${p}`).join(",")
}

export interface LegacyAthleteAggregate {
  name: string
  school: string
  profileId?: string
  profile?: { id: string; name: string; highschool?: string; graduationyear?: number; weightclass?: string; college?: string }
  commits: { id: string; name: string; college?: string; graduationyear?: number; weightclass?: string }[]
  nhscaResults: { year?: number; placement?: number; weight_class?: string; division?: string; high_school?: string }[]
  nchsaaResults: { year?: number; place?: number; school?: string; weight_class?: string; classification?: string }[]
  super32Results: { year?: number; weight_class?: string; record?: string; high_school?: string }[]
  daveSchultz?: { year?: number; high_school?: string }
  triciaSaunders?: { year?: number; high_school?: string }
  mostOutstanding?: { year?: number }[]
}

export function AthletesLegacySearchContent() {
  const [q, setQ] = useState("")
  const [results, setResults] = useState<LegacyAthleteAggregate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runSearch = useCallback(async (term: string) => {
    const searchTerm = term.trim()
    if (searchTerm.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    setError(null)
    const orName = () => buildOrIlike("name", searchTerm)
    const orAthleteName = () => buildOrIlike("athlete_name", searchTerm)
    const orWrestlerName = () => buildOrIlike("wrestler_name", searchTerm)

    try {
      const [
        profilesRes,
        commitsRes,
        nhscaRes,
        nchsaaRes,
        super32Res,
        mowRes,
        daveRes,
        triciaRes,
      ] = await Promise.all([
        Promise.resolve(supabase.from("athletes").select("id, name, highschool, graduationyear, weightclass, college").or(orName()).limit(300)),
        Promise.resolve(supabase.from("athletes").select("id, name, college, graduationyear, weightclass").in("recruiting_status", ["Committed", "Signed", "College Athlete", "committed", "signed"]).or(orName()).limit(300)),
        Promise.resolve(supabase.from("wrestling_nhsca_results").select("athlete_name, year, placement, weight_class, division, high_school").or(orAthleteName()).order("year", { ascending: false }).limit(500)),
        Promise.resolve(supabase.from("wrestling_nchsaa_results").select("wrestler_name, year, place, school, weight_class, classification").or(orWrestlerName()).order("year", { ascending: false }).limit(1000)),
        Promise.resolve(supabase.from("super32_results").select("athlete_name, year, weight_class, record, high_school").or(orAthleteName()).order("year", { ascending: false }).limit(300)),
        Promise.resolve(supabase.from("most_outstanding_wrestlers").select("name, year").or(orName()).order("year", { ascending: false }).limit(200)),
        Promise.resolve(supabase.from("dave_schultz_award").select("name, year, high_school").or(orName()).order("year", { ascending: false }).limit(100)),
        Promise.resolve(supabase.from("tricia_saunders_award").select("name, year, high_school").or(orName()).order("year", { ascending: false }).limit(100)),
      ])

      const profiles = (profilesRes.data || []) as { id: string; name: string; highschool?: string; graduationyear?: number; weightclass?: string; college?: string }[]
      const commits = (commitsRes.data || []) as { id: string; name: string; college?: string; graduationyear?: number; weightclass?: string }[]
      const nhscaRows = (nhscaRes.data || []) as { athlete_name?: string; year?: number; placement?: number; weight_class?: string; division?: string; high_school?: string }[]
      const nchsaaRows = (nchsaaRes.data || []) as { wrestler_name?: string; year?: number; place?: number; school?: string; weight_class?: string; classification?: string }[]
      const super32Rows = (super32Res.data || []) as { athlete_name?: string; year?: number; weight_class?: string; record?: string; high_school?: string }[]
      const mowRows = (mowRes.data || []) as { name?: string; year?: number }[]
      const daveRows = (daveRes.data || []) as { name?: string; year?: number; high_school?: string }[]
      const triciaRows = (triciaRes.data || []) as { name?: string; year?: number; high_school?: string }[]

      const athleteMap = new Map<string, LegacyAthleteAggregate>()

      const getOrCreate = (name: string, schoolDisplay: string): LegacyAthleteAggregate => {
        const schoolNorm = normalizeSchool(schoolDisplay)
        const key = `${(name || "").trim().toLowerCase()}|${schoolNorm}`
        let agg = athleteMap.get(key)
        if (!agg) {
          agg = { name: name.trim(), school: schoolDisplay || "—", commits: [], nhscaResults: [], nchsaaResults: [], super32Results: [] }
          athleteMap.set(key, agg)
        }
        return agg
      }

      profiles.forEach((p) => {
        const school = (p.highschool ?? "").toString().trim() || "—"
        const agg = getOrCreate(p.name, school)
        if (!agg.profileId) {
          agg.profileId = p.id
          agg.profile = { id: p.id, name: p.name, highschool: p.highschool, graduationyear: p.graduationyear, weightclass: p.weightclass, college: p.college }
        }
      })

      commits.forEach((c) => {
        const school = "—"
        const agg = getOrCreate(c.name, school)
        if (!agg.commits.some((x) => x.id === c.id)) agg.commits.push(c)
      })

      nhscaRows.forEach((r) => {
        const name = (r.athlete_name ?? "").toString().trim()
        const school = (r.high_school ?? "").toString().trim() || "—"
        const agg = getOrCreate(name, school)
        if (!agg.nhscaResults.some((x) => x.year === r.year && x.weight_class === r.weight_class && x.division === r.division)) {
          agg.nhscaResults.push({ year: r.year, placement: r.placement, weight_class: r.weight_class, division: r.division, high_school: r.high_school })
        }
      })

      nchsaaRows.forEach((r) => {
        const name = (r.wrestler_name ?? "").toString().trim()
        const school = (r.school ?? "").toString().trim() || "—"
        const agg = getOrCreate(name, school)
        agg.nchsaaResults.push({ year: r.year, place: r.place, school: r.school, weight_class: r.weight_class, classification: r.classification })
      })

      super32Rows.forEach((r) => {
        const name = (r.athlete_name ?? "").toString().trim()
        const school = (r.high_school ?? "").toString().trim() || "—"
        const agg = getOrCreate(name, school)
        agg.super32Results.push({ year: r.year, weight_class: r.weight_class, record: r.record, high_school: r.high_school })
      })

      mowRows.forEach((r) => {
        const name = (r.name ?? "").toString().trim()
        const agg = getOrCreate(name, "—")
        if (!agg.mostOutstanding) agg.mostOutstanding = []
        if (!agg.mostOutstanding.some((x) => x.year === r.year)) agg.mostOutstanding.push({ year: r.year })
      })

      daveRows.forEach((r) => {
        const name = (r.name ?? "").toString().trim()
        const agg = getOrCreate(name, (r.high_school ?? "").toString().trim() || "—")
        if (!agg.daveSchultz) agg.daveSchultz = { year: r.year, high_school: r.high_school }
      })

      triciaRows.forEach((r) => {
        const name = (r.name ?? "").toString().trim()
        const agg = getOrCreate(name, (r.high_school ?? "").toString().trim() || "—")
        if (!agg.triciaSaunders) agg.triciaSaunders = { year: r.year, high_school: r.high_school }
      })

      let list = Array.from(athleteMap.values())
      list = list.filter((a) => a.nhscaResults.length > 0 || a.nchsaaResults.length > 0 || a.super32Results.length > 0 || a.commits.length > 0 || a.profileId || a.daveSchultz || a.triciaSaunders)
      list.sort((a, b) => {
        const aScore = (a.profileId ? 1000 : 0) + a.commits.length * 100 + a.nchsaaResults.length * 10 + a.nhscaResults.length
        const bScore = (b.profileId ? 1000 : 0) + b.commits.length * 100 + b.nchsaaResults.length * 10 + b.nhscaResults.length
        return bScore - aScore
      })

      list.forEach((a) => {
        a.nhscaResults.sort((x, y) => (y.year ?? 0) - (x.year ?? 0))
        a.nchsaaResults = dedupeNchsaaResults(a.nchsaaResults).sort((x, y) => (y.year ?? 0) - (x.year ?? 0))
        a.super32Results.sort((x, y) => (y.year ?? 0) - (x.year ?? 0))
      })

      setResults(list)
    } catch (e) {
      console.error("Legacy search error:", e)
      setError(e instanceof Error ? e.message : "Search failed")
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) {
      setResults([])
      setError(null)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      runSearch(term)
    }, DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [q, runSearch])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <Card className="mb-6 border-2 shadow-lg" style={{ borderColor: `${NC_NAVY}33` }}>
          <CardContent className="p-6">
            <div className="max-w-2xl mx-auto">
              <div className="relative flex gap-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search by wrestler name for NHSCA nationals, NCHSAA state results, Super32, and awards"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="pl-10 flex-1"
                />
                <Button onClick={() => runSearch(q.trim())} disabled={loading || q.trim().length < 2} style={{ backgroundColor: NC_NAVY }}>
                  {loading ? "Searching…" : "Search"}
                </Button>
              </div>
              <p className="text-center text-gray-500 mt-3 text-sm">
                Enter at least 2 characters. Results merge NHSCA, NCHSAA, Super32, and awards.
              </p>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4 text-red-700">{error}</CardContent>
          </Card>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
            <p className="mt-4 text-gray-600">Searching…</p>
          </div>
        )}

        {!loading && q.trim().length >= 2 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: NC_NAVY }}>Search Results</h2>
              <Badge variant="secondary" className="text-sm">
                {results.length} athlete{results.length !== 1 ? "s" : ""} found
              </Badge>
            </div>

            <div className="space-y-6">
              {results.map((athlete, idx) => (
                <Card key={`${athlete.name}-${athlete.school}-${idx}`} className="border-2 shadow-md" style={{ borderColor: `${NC_NAVY}22` }}>
                  <CardHeader className="pb-2" style={{ backgroundColor: NC_NAVY }}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg text-white">{athlete.name}</CardTitle>
                        <CardDescription className="text-blue-100 flex items-center gap-1 mt-1">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          {athlete.school}
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {athlete.commits.length > 0 && (
                          <Badge className="bg-green-600 text-white text-xs">
                            <GraduationCap className="w-3 h-3 mr-1" />
                            Commit
                          </Badge>
                        )}
                        {athlete.daveSchultz && (
                          <Badge className="bg-[#CBAF5D] text-[#002147] text-xs font-semibold">
                            <Award className="w-3 h-3 mr-1" />
                            Dave Schultz Award
                          </Badge>
                        )}
                        {athlete.triciaSaunders && (
                          <Badge className="bg-[#CBAF5D] text-[#002147] text-xs font-semibold">
                            <Award className="w-3 h-3 mr-1" />
                            Tricia Saunders Award
                          </Badge>
                        )}
                        {(athlete.mostOutstanding?.length ?? 0) > 0 && (
                          <Badge className="bg-yellow-600 text-white text-xs">
                            <Star className="w-3 h-3 mr-1" />
                            MOW
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 space-y-4">
                    {(athlete.profile || athlete.commits.length > 0) && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: NC_NAVY }}>
                          <Star className="w-4 h-4" />
                          Athlete Profile
                        </h4>
                        <div className="space-y-2">
                          {athlete.profile && (
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="font-medium text-blue-800">
                                    {athlete.profile.name}
                                    {athlete.profile.graduationyear ? ` • Class of ${athlete.profile.graduationyear}` : ""}
                                  </div>
                                  <div className="text-sm text-blue-600">
                                    {athlete.profile.highschool ?? athlete.school} • {athlete.profile.weightclass ?? "—"}
                                  </div>
                                  {athlete.profile.college && (
                                    <div className="text-sm text-blue-600">Committed to: {athlete.profile.college}</div>
                                  )}
                                </div>
                                <Link href={profileHref(athlete.profile.id)}>
                                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                                    View Profile
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          )}
                          {!athlete.profile && athlete.commits.length > 0 && athlete.commits[0]?.id && (
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <div className="font-medium text-blue-800">{athlete.commits[0].name}</div>
                                <div className="text-sm text-blue-600">
                                  {athlete.commits[0].college} • Class of {athlete.commits[0].graduationyear ?? "—"}
                                </div>
                              </div>
                              <Link href={profileHref(athlete.commits[0].id)}>
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                                  View Profile
                                </Button>
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {athlete.commits.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: NC_NAVY }}>
                          <GraduationCap className="w-4 h-4" />
                          College Commitment{athlete.commits.length > 1 ? "s" : ""}
                        </h4>
                        <div className="space-y-2">
                          {athlete.commits.map((c, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                              <div className="font-medium text-green-800">{c.college ?? "—"}</div>
                              <div className="text-sm text-green-600">
                                Class of {c.graduationyear ?? "—"} • {c.weightclass ?? "—"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {athlete.nhscaResults.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2" style={{ color: NC_NAVY }}>
                          NHSCA National Results
                        </h4>
                        <div className="space-y-2">
                          {athlete.nhscaResults.map((r, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200 gap-3">
                              <div>
                                <div className="font-medium text-blue-800 text-sm">
                                  {r.year} • {r.weight_class ?? ""} • {r.division ?? ""}
                                </div>
                                {r.high_school && <div className="text-xs text-blue-600">{r.high_school}</div>}
                              </div>
                              {r.placement != null && (
                                <Badge className={`${getPlacementColor(r.placement)} text-xs`}>
                                  {r.placement === 1 ? "Champion" : r.placement <= 8 ? `${r.placement}th` : r.placement}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {athlete.nchsaaResults.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2" style={{ color: NC_NAVY }}>
                          NCHSAA State Results
                        </h4>
                        <div className="space-y-2">
                          {athlete.nchsaaResults.map((r, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200 gap-3">
                              <div>
                                <div className="font-medium text-green-800 text-sm">
                                  {r.year} • {r.weight_class ?? ""} • {r.classification ?? ""}
                                </div>
                                {r.school && <div className="text-xs text-green-600">{r.school}</div>}
                              </div>
                              {r.place != null && (
                                <Badge className={`${getPlacementColor(r.place)} text-xs`}>
                                  {r.place === 0 ? "SQ" : r.place === 1 ? "1" : r.place}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {athlete.super32Results.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: NC_NAVY }}>
                          <Trophy className="w-4 h-4" />
                          Super32
                        </h4>
                        <div className="space-y-2">
                          {athlete.super32Results.map((r, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200 gap-3">
                              <div>
                                <div className="font-medium text-orange-800 text-sm">
                                  {r.year} • {r.weight_class ?? ""}lbs
                                </div>
                                {r.high_school && <div className="text-xs text-orange-600">{r.high_school}</div>}
                                {r.record && <div className="text-xs font-semibold text-orange-700">Record: {r.record}</div>}
                              </div>
                              {r.record && (
                                <Badge className="bg-orange-200 text-orange-800 text-xs">{r.record}</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!athlete.profile && athlete.commits.length === 0 && athlete.nhscaResults.length === 0 && athlete.nchsaaResults.length === 0 && athlete.super32Results.length === 0 && (
                      <p className="text-gray-500 text-sm">No detailed results for this match.</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {results.length === 0 && !loading && (
              <Card className="border">
                <CardContent className="p-8 text-center text-gray-600">
                  No athletes found matching &quot;{q}&quot;. Try a different name or spelling.
                </CardContent>
              </Card>
            )}
          </>
        )}

        {!loading && q.trim().length < 2 && (
          <div className="text-center py-8 text-gray-500">
            Enter at least 2 characters to search NHSCA, NCHSAA, Super32, and awards.
          </div>
        )}
      </div>
    </div>
  )
}
