"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { HardLink } from "@/components/hard-link"
import { ArrowLeft, ArrowLeftRight, Loader2, Scale, Search } from "lucide-react"
import type { TocAthleteCompareResult } from "@/lib/toc/athlete-compare"

type SearchAthlete = {
  id: string
  name: string
  graduationyear: number | null
  weightclass: string | number | null
  highschool: string | null
}

function AthletePicker({
  label,
  query,
  onQueryChange,
  results,
  loading,
  selected,
  onSelect,
}: {
  label: string
  query: string
  onQueryChange: (v: string) => void
  results: SearchAthlete[]
  loading: boolean
  selected: SearchAthlete | null
  onSelect: (a: SearchAthlete | null) => void
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {selected ? (
        <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 bg-muted/30">
          <div className="min-w-0">
            <p className="font-medium truncate">{selected.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {selected.highschool ?? "—"}
              {selected.graduationyear ? ` · '${String(selected.graduationyear).slice(-2)}` : ""}
              {selected.weightclass ? ` · ${selected.weightclass} lbs` : ""}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => onSelect(null)}>
            Change
          </Button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search athlete name…"
              className="pl-9"
            />
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </p>
          ) : null}
          {results.length > 0 && !selected ? (
            <ul className="border rounded-md divide-y max-h-48 overflow-y-auto">
              {results.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm"
                    onClick={() => onSelect(a)}
                  >
                    <span className="font-medium">{a.name}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      — {a.highschool ?? "—"}
                      {a.weightclass ? ` · ${a.weightclass}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  )
}

function edgeBadge(edge: "a" | "b" | "even" | "unknown", nameA: string, nameB: string) {
  if (edge === "unknown") return <Badge variant="outline">No data</Badge>
  if (edge === "even") return <Badge variant="secondary">Even</Badge>
  return <Badge className="bg-[#002147]">{edge === "a" ? nameA : nameB}</Badge>
}

export default function TocCompareAdminPage() {
  const [queryA, setQueryA] = useState("")
  const [queryB, setQueryB] = useState("")
  const [resultsA, setResultsA] = useState<SearchAthlete[]>([])
  const [resultsB, setResultsB] = useState<SearchAthlete[]>([])
  const [loadingA, setLoadingA] = useState(false)
  const [loadingB, setLoadingB] = useState(false)
  const [selectedA, setSelectedA] = useState<SearchAthlete | null>(null)
  const [selectedB, setSelectedB] = useState<SearchAthlete | null>(null)
  const [comparing, setComparing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [comparison, setComparison] = useState<TocAthleteCompareResult | null>(null)

  const searchAthletes = useCallback(async (q: string, side: "a" | "b") => {
    if (q.trim().length < 2) {
      if (side === "a") setResultsA([])
      else setResultsB([])
      return
    }
    if (side === "a") setLoadingA(true)
    else setLoadingB(true)
    try {
      const res = await fetch(`/api/admin/athletes/search?q=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      const list = (data.athletes ?? []) as SearchAthlete[]
      if (side === "a") setResultsA(list)
      else setResultsB(list)
    } catch {
      if (side === "a") setResultsA([])
      else setResultsB([])
    } finally {
      if (side === "a") setLoadingA(false)
      else setLoadingB(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => void searchAthletes(queryA, "a"), 250)
    return () => clearTimeout(t)
  }, [queryA, searchAthletes])

  useEffect(() => {
    const t = setTimeout(() => void searchAthletes(queryB, "b"), 250)
    return () => clearTimeout(t)
  }, [queryB, searchAthletes])

  async function runCompare() {
    if (!selectedA || !selectedB) {
      setError("Select two athletes to compare.")
      return
    }
    if (selectedA.id === selectedB.id) {
      setError("Choose two different athletes.")
      return
    }
    setComparing(true)
    setError(null)
    setComparison(null)
    try {
      const res = await fetch("/api/admin/toc/compare", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteIdA: selectedA.id, athleteIdB: selectedB.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Compare failed")
        return
      }
      setComparison(data.comparison as TocAthleteCompareResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compare failed")
    } finally {
      setComparing(false)
    }
  }

  const recommendationLabel = comparison
    ? comparison.recommendation === "too_close"
      ? "Too close to call"
      : comparison.recommendation === "a"
        ? `Lean ${comparison.athleteA.name}`
        : `Lean ${comparison.athleteB.name}`
    : null

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <HardLink href="/admin/toc" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </HardLink>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Scale className="h-7 w-7 text-[#002147]" />
            Athlete compare
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Direct wins, state, NHSCA, NHSCA Duals, and Super32 — for TOC seeding decisions
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pick two wrestlers</CardTitle>
          <CardDescription>Uses the same tournament merge as public profiles and match database head-to-head.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <AthletePicker
              label="Wrestler A"
              query={queryA}
              onQueryChange={setQueryA}
              results={resultsA}
              loading={loadingA}
              selected={selectedA}
              onSelect={(a) => {
                setSelectedA(a)
                setQueryA("")
                setResultsA([])
              }}
            />
            <AthletePicker
              label="Wrestler B"
              query={queryB}
              onQueryChange={setQueryB}
              results={resultsB}
              loading={loadingB}
              selected={selectedB}
              onSelect={(a) => {
                setSelectedB(a)
                setQueryB("")
                setResultsB([])
              }}
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button
            onClick={() => void runCompare()}
            disabled={comparing || !selectedA || !selectedB}
            className="bg-[#CC0000] hover:bg-[#a30000] text-white"
          >
            {comparing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Comparing…
              </>
            ) : (
              <>
                <ArrowLeftRight className="h-4 w-4 mr-2" /> Compare athletes
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {comparison ? (
        <>
          <Card className="border-t-4 border-t-[#CC0000]">
            <CardHeader>
              <CardTitle>{recommendationLabel}</CardTitle>
              <CardDescription>{comparison.summary}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Score</span>
                <p className="font-semibold text-lg">
                  {comparison.athleteA.name}: {comparison.scoreA} · {comparison.athleteB.name}:{" "}
                  {comparison.scoreB}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Direct series</span>
                <p className="font-medium">{comparison.headToHead.summary}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {[comparison.athleteA, comparison.athleteB].map((athlete, idx) => (
              <Card key={athlete.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{athlete.name}</CardTitle>
                  <CardDescription>
                    {athlete.school ?? "—"}
                    {athlete.gradYear ? ` · Class of ${athlete.gradYear}` : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">State</p>
                    <p>{idx === 0 ? comparison.dimensions.find((d) => d.key === "state")?.athleteA : comparison.dimensions.find((d) => d.key === "state")?.athleteB}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">NHSCA</p>
                    <p>{idx === 0 ? comparison.dimensions.find((d) => d.key === "nhsca")?.athleteA : comparison.dimensions.find((d) => d.key === "nhsca")?.athleteB}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">NHSCA Duals / NC United</p>
                    <p>{idx === 0 ? comparison.dimensions.find((d) => d.key === "duals")?.athleteA : comparison.dimensions.find((d) => d.key === "duals")?.athleteB}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Super32</p>
                    <p>{idx === 0 ? comparison.dimensions.find((d) => d.key === "super32")?.athleteA : comparison.dimensions.find((d) => d.key === "super32")?.athleteB}</p>
                  </div>
                  <HardLink href={`/view-profile?id=${athlete.id}`} className="text-[#B31B1B] text-sm font-medium">
                    View profile →
                  </HardLink>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Breakdown by category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comparison.dimensions.map((d) => (
                <div key={d.key} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-medium">{d.label}</p>
                    {edgeBadge(d.edge, comparison.athleteA.name, comparison.athleteB.name)}
                  </div>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{comparison.athleteA.name} ({d.pointsA} pts)</p>
                      <p>{d.athleteA}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{comparison.athleteB.name} ({d.pointsB} pts)</p>
                      <p>{d.athleteB}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {comparison.headToHead.matches.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Direct meetings</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {comparison.headToHead.matches.map((m, i) => (
                    <li key={i} className="border rounded-md px-3 py-2">
                      <span className="font-medium">
                        {m.winnerSide === "a" ? comparison.athleteA.name : comparison.athleteB.name}
                      </span>{" "}
                      won
                      {m.tournament ? ` · ${m.tournament}` : ""}
                      {m.date ? ` · ${m.date}` : ""}
                      {m.weight ? ` · ${m.weight} lbs` : ""}
                      {m.method ? ` · ${m.method}` : ""}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
