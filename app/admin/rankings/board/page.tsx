"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ArrowDown, ArrowUp, Bot, CheckCircle2, Eye, Lock, Save, Search, Sparkles, UploadCloud } from "lucide-react"

type Evidence = {
  kind: string
  label: string
  points?: number
  tone?: "gold" | "blue" | "purple" | "green" | "orange" | "red" | "slate"
}

type BoardAthlete = {
  id: string
  name: string
  highschool: string | null
  graduationyear: number | string | null
  gender: string | null
  weightclass: string | number | null
  prospect_ranking: number | null
  previous_ranking: number | null
  rankwrestler_rank: number | null
  ai_rank: number
  ai_score: number
  confidence: "High" | "Medium" | "Low"
  confidence_reason: string
  score_breakdown: Record<string, number>
  evidence: Evidence[]
  data_gaps: string[]
  match_count: number
  win_loss?: string | null
  college?: string | null
  college_opens_experience?: string | null
  final_rank?: number
  locked?: boolean
  reviewer_note?: string
}

const years = ["2026", "2027", "2028", "2029"]
const genders = ["Male", "Female"]
const darkOutlineButton = "border-blue-800 bg-slate-950 text-blue-100 hover:bg-blue-950 hover:text-white"
const activeGoldButton = "bg-[#d6b75d] text-slate-950 hover:bg-[#e6c86b]"

function evidenceClass(tone: Evidence["tone"]): string {
  switch (tone) {
    case "gold":
      return "bg-amber-100 text-amber-950 border-amber-300"
    case "blue":
      return "bg-blue-100 text-blue-900 border-blue-300"
    case "purple":
      return "bg-purple-100 text-purple-900 border-purple-300"
    case "green":
      return "bg-emerald-100 text-emerald-900 border-emerald-300"
    case "orange":
      return "bg-orange-100 text-orange-900 border-orange-300"
    case "red":
      return "bg-red-100 text-red-900 border-red-300"
    default:
      return "bg-slate-100 text-slate-800 border-slate-300"
  }
}

function confidenceClass(confidence: BoardAthlete["confidence"]): string {
  if (confidence === "High") return "bg-emerald-600 text-white"
  if (confidence === "Medium") return "bg-amber-500 text-slate-950"
  return "bg-red-600 text-white"
}

function move<T>(items: T[], from: number, to: number): T[] {
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export default function RankingBoardPage() {
  const [year, setYear] = useState("2027")
  const [gender, setGender] = useState("Male")
  const [athletes, setAthletes] = useState<BoardAthlete[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState("")
  const [view, setView] = useState<"final" | "ai" | "review" | "gaps">("final")
  const [status, setStatus] = useState("")

  const loadBoard = async () => {
    setLoading(true)
    setStatus("")
    try {
      const res = await fetch(`/api/admin/rankings/board?year=${year}&gender=${gender}`, { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load board")
      const rows = (data.athletes || []) as BoardAthlete[]
      const withFinal = rows
        .map((athlete) => ({
          ...athlete,
          final_rank: athlete.prospect_ranking || athlete.ai_rank,
          locked: false,
          reviewer_note: "",
        }))
        .sort((a, b) => (a.final_rank || 999) - (b.final_rank || 999))
        .map((athlete, index) => ({ ...athlete, final_rank: index + 1 }))
      setAthletes(withFinal)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load board")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBoard()
  }, [year, gender])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    let rows = athletes
    if (view === "ai") rows = [...rows].sort((a, b) => a.ai_rank - b.ai_rank)
    if (view === "review") {
      rows = rows.filter(
        (a) =>
          a.confidence !== "High" ||
          Math.abs((a.final_rank || 999) - a.ai_rank) >= 5 ||
          a.data_gaps.length >= 3 ||
          !a.prospect_ranking,
      )
    }
    if (view === "gaps") {
      rows = [...rows]
        .filter((a) => a.match_count < 20)
        .sort((a, b) => a.match_count - b.match_count || a.ai_rank - b.ai_rank)
    }
    if (term) {
      rows = rows.filter(
        (a) =>
          a.name.toLowerCase().includes(term) ||
          String(a.highschool || "").toLowerCase().includes(term) ||
          String(a.weightclass || "").toLowerCase().includes(term),
      )
    }
    return rows
  }, [athletes, query, view])

  const top30 = athletes.filter((a) => (a.final_rank || 999) <= 30).length
  const highConfidence = athletes.filter((a) => a.confidence === "High").length
  const needsReview = athletes.filter((a) => a.confidence !== "High" || a.data_gaps.length >= 3).length
  const missingMatches = athletes.filter((a) => a.match_count === 0).length
  const thinMatches = athletes.filter((a) => a.match_count > 0 && a.match_count < 20).length

  const reorderAthlete = (id: string, direction: "up" | "down") => {
    setAthletes((prev) => {
      const currentIndex = prev.findIndex((a) => a.id === id)
      if (currentIndex < 0) return prev
      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
      if (targetIndex < 0 || targetIndex >= prev.length) return prev
      if (prev[currentIndex].locked || prev[targetIndex].locked) return prev
      return move(prev, currentIndex, targetIndex).map((athlete, index) => ({ ...athlete, final_rank: index + 1 }))
    })
  }

  const applyAiOrder = () => {
    setAthletes((prev) => {
      const locked = prev.filter((a) => a.locked).sort((a, b) => (a.final_rank || 999) - (b.final_rank || 999))
      const unlocked = prev.filter((a) => !a.locked).sort((a, b) => a.ai_rank - b.ai_rank)
      const next: BoardAthlete[] = []
      let unlockedIndex = 0
      for (let rank = 1; rank <= prev.length; rank++) {
        const lockedAtRank = locked.find((a) => a.final_rank === rank)
        if (lockedAtRank) next.push(lockedAtRank)
        else if (unlocked[unlockedIndex]) next.push(unlocked[unlockedIndex++])
      }
      while (unlocked[unlockedIndex]) next.push(unlocked[unlockedIndex++])
      return next.map((athlete, index) => ({ ...athlete, final_rank: index + 1 }))
    })
  }

  const saveFinalRanks = async () => {
    setSaving(true)
    setStatus("")
    try {
      const rankings = athletes.map((athlete, index) => ({
        id: athlete.id,
        final_rank: index + 1,
        previous_ranking: athlete.prospect_ranking,
      }))
      const res = await fetch("/api/admin/rankings/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rankings, year, gender }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to save rankings")
      setStatus(`Saved ${data.updated} final ranks. Public rankings now use this order.`)
      await loadBoard()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save rankings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <AdminHeader />
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-3xl border border-blue-800/60 bg-gradient-to-br from-[#041532] via-[#071f4a] to-[#010817] p-6 shadow-2xl">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <Badge className="mb-3 bg-[#d6b75d] text-slate-950">RecruitNC Rankings Lab</Badge>
                <h1 className="text-3xl font-black tracking-tight md:text-5xl">AI Ranking Board</h1>
                <p className="mt-3 max-w-3xl text-sm text-blue-100 md:text-base">
                  Transparent ranking recommendations from match data, NCHSAA, NHSCA, Super32, Fargo, college opens,
                  and profile achievements. The model suggests. You make the final call.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="w-40 border-blue-700 bg-slate-900 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y}>
                        Class of {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="w-32 border-blue-700 bg-slate-900 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {genders.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={loadBoard} variant="outline" className="border-blue-700 bg-slate-900 text-white hover:bg-blue-950">
                  Refresh
                </Button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-5">
            <Card className="border-blue-900 bg-slate-900 text-white">
              <CardContent className="p-5">
                <p className="text-sm text-blue-200">Candidates</p>
                <p className="text-3xl font-black">{athletes.length}</p>
              </CardContent>
            </Card>
            <Card className="border-blue-900 bg-slate-900 text-white">
              <CardContent className="p-5">
                <p className="text-sm text-blue-200">Published Top 30</p>
                <p className="text-3xl font-black">{top30}</p>
              </CardContent>
            </Card>
            <Card className="border-blue-900 bg-slate-900 text-white">
              <CardContent className="p-5">
                <p className="text-sm text-blue-200">High Confidence</p>
                <p className="text-3xl font-black">{highConfidence}</p>
              </CardContent>
            </Card>
            <Card className="border-blue-900 bg-slate-900 text-white">
              <CardContent className="p-5">
                <p className="text-sm text-blue-200">Needs Review</p>
                <p className="text-3xl font-black">{needsReview}</p>
              </CardContent>
            </Card>
            <button
              type="button"
              onClick={() => setView("gaps")}
              className="rounded-lg border border-red-900 bg-red-950/50 text-left text-white transition hover:border-red-500 hover:bg-red-950"
            >
              <div className="p-5">
                <p className="text-sm text-red-100">Match Data Gaps</p>
                <p className="text-3xl font-black">{missingMatches + thinMatches}</p>
                <p className="mt-1 text-xs text-red-100/80">{missingMatches} missing · {thinMatches} thin</p>
              </div>
            </button>
          </section>

          <Card className="border-blue-900 bg-slate-900 text-white">
            <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setView("final")} variant={view === "final" ? "default" : "outline"} className={view === "final" ? activeGoldButton : darkOutlineButton}>
                  <Eye className="mr-2 h-4 w-4" />
                  Final order
                </Button>
                <Button onClick={() => setView("ai")} variant={view === "ai" ? "default" : "outline"} className={view === "ai" ? activeGoldButton : darkOutlineButton}>
                  <Bot className="mr-2 h-4 w-4" />
                  AI order
                </Button>
                <Button onClick={() => setView("review")} variant={view === "review" ? "default" : "outline"} className={view === "review" ? activeGoldButton : darkOutlineButton}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Needs review
                </Button>
                <Button onClick={() => setView("gaps")} variant={view === "gaps" ? "default" : "outline"} className={view === "gaps" ? activeGoldButton : darkOutlineButton}>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Match gaps
                </Button>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search athlete, school, weight"
                    className="w-full border-blue-800 bg-slate-950 pl-9 text-white placeholder:text-slate-500 sm:w-72"
                  />
                </div>
                <Button onClick={applyAiOrder} className="bg-purple-600 hover:bg-purple-700">
                  Apply AI order
                </Button>
                <Button onClick={saveFinalRanks} disabled={saving || loading} className="bg-[#d6b75d] text-slate-950 hover:bg-[#e6c86b]">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save final ranks"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {status ? (
            <div className="rounded-2xl border border-blue-800 bg-blue-950/60 p-4 text-sm text-blue-100">{status}</div>
          ) : null}

          {view === "gaps" && !loading ? (
            <Card className="border-red-900 bg-gradient-to-br from-red-950/70 to-slate-950 text-white">
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-100">Upload queue</p>
                    <h2 className="text-2xl font-black">Ranked candidates missing match history</h2>
                    <p className="mt-1 max-w-3xl text-sm text-red-50/80">
                      Direct wins and quality wins need match history. Start with the athletes at the top of this list, then sync or paste their RankWrestler match data in Match Manager.
                    </p>
                  </div>
                  <Button asChild className="bg-[#d6b75d] text-slate-950 hover:bg-[#e6c86b]">
                    <Link href="/admin/match-manager">
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Open Match Manager
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-blue-900 bg-slate-900 p-12 text-center text-blue-100">
              Building ranking evidence...
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((athlete) => {
                const finalRank = athlete.final_rank || 999
                const aiDelta = athlete.prospect_ranking ? athlete.prospect_ranking - athlete.ai_rank : null
                return (
                  <Card key={athlete.id} className="overflow-hidden border-blue-900 bg-slate-900 text-white">
                    <CardHeader className="border-b border-blue-950 bg-slate-950/70 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex gap-4">
                          <div className="flex min-w-16 flex-col items-center rounded-2xl bg-[#d6b75d] p-3 text-slate-950">
                            <span className="text-xs font-bold uppercase">Final</span>
                            <span className="text-3xl font-black">#{finalRank}</span>
                          </div>
                          <div>
                            <CardTitle className="text-2xl">
                              <Link href={`/view-profile?id=${athlete.id}`} className="hover:text-[#d6b75d]">
                                {athlete.name}
                              </Link>
                            </CardTitle>
                            <p className="mt-1 text-sm text-blue-100">
                              {athlete.highschool || "School TBD"} · {athlete.weightclass || "TBD"} lbs · Class of {athlete.graduationyear}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge className="bg-blue-700 text-white">AI #{athlete.ai_rank}</Badge>
                              <Badge className="bg-slate-700 text-white">Score {athlete.ai_score}</Badge>
                              {athlete.rankwrestler_rank ? <Badge className="bg-slate-700 text-white">RW #{athlete.rankwrestler_rank}</Badge> : null}
                              {athlete.win_loss ? <Badge className="bg-emerald-700 text-white">Matches {athlete.win_loss}</Badge> : null}
                              {athlete.match_count === 0 ? (
                                <Badge className="bg-red-700 text-white">No match data</Badge>
                              ) : athlete.match_count < 20 ? (
                                <Badge className="bg-orange-600 text-white">Thin match data · {athlete.match_count}</Badge>
                              ) : null}
                              <Badge className={confidenceClass(athlete.confidence)}>{athlete.confidence} confidence</Badge>
                              {aiDelta ? (
                                <Badge className={aiDelta > 0 ? "bg-emerald-700 text-white" : "bg-orange-700 text-white"}>
                                  AI says {aiDelta > 0 ? `+${aiDelta}` : aiDelta}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" className={darkOutlineButton} onClick={() => reorderAthlete(athlete.id, "up")}>
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" className={darkOutlineButton} onClick={() => reorderAthlete(athlete.id, "down")}>
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={athlete.locked ? "default" : "outline"}
                            className={athlete.locked ? activeGoldButton : darkOutlineButton}
                            onClick={() =>
                              setAthletes((prev) =>
                                prev.map((row) => (row.id === athlete.id ? { ...row, locked: !row.locked } : row)),
                              )
                            }
                          >
                            <Lock className="mr-2 h-4 w-4" />
                            {athlete.locked ? "Locked" : "Lock"}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              setAthletes((prev) => {
                                const without = prev.filter((row) => row.id !== athlete.id)
                                const target = Math.max(0, Math.min(athlete.ai_rank - 1, without.length))
                                without.splice(target, 0, athlete)
                                return without.map((row, index) => ({ ...row, final_rank: index + 1 }))
                              })
                            }
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            Accept AI
                          </Button>
                          {athlete.match_count < 20 ? (
                            <Button size="sm" asChild className="bg-[#d6b75d] text-slate-950 hover:bg-[#e6c86b]">
                              <Link href={`/admin/match-manager?athleteId=${athlete.id}`}>
                                <UploadCloud className="mr-2 h-4 w-4" />
                                Upload matches
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4">
                      <div className="grid gap-3 md:grid-cols-6">
                        {Object.entries(athlete.score_breakdown).map(([key, value]) => (
                          <div key={key} className="rounded-xl border border-blue-950 bg-slate-950 p-3">
                            <p className="text-xs capitalize text-blue-200">{key.replace(/([A-Z])/g, " $1")}</p>
                            <p className="text-xl font-black">{value}</p>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Ranking evidence</p>
                        <div className="flex flex-wrap gap-2">
                          {athlete.evidence.length ? (
                            athlete.evidence.map((item, index) => (
                              <Badge key={`${item.label}-${index}`} variant="outline" className={evidenceClass(item.tone)}>
                                {item.points ? `+${item.points} · ` : ""}
                                {item.label}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className="border-red-300 bg-red-100 text-red-900">
                              No ranking evidence found
                            </Badge>
                          )}
                        </div>
                      </div>
                      {athlete.college_opens_experience ? (
                        <div className="rounded-xl border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-100">
                          <strong>College opens:</strong> {athlete.college_opens_experience}
                        </div>
                      ) : null}
                      <div className="flex items-center gap-2 text-xs text-blue-200">
                        <CheckCircle2 className="h-4 w-4" />
                        {athlete.confidence_reason}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
