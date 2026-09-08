"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ArrowDown, ArrowUp, Bot, CheckCircle2, ChevronDown, ChevronUp, Eye, Lock, Save, Search, Sparkles, UploadCloud } from "lucide-react"
import { getPublicRankingsMax } from "@/lib/public-rankings-cap"
import type { StarRating } from "@/lib/athlete-star-rating"

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
  head_to_head: Array<{ opponentId: string; opponent: string; wins: number; losses: number }>
  match_count: number
  win_loss?: string | null
  college?: string | null
  college_opens_experience?: string | null
  final_rank?: number
  locked?: boolean
  reviewer_note?: string
  all_american: string | null
  nhsca_by_year: string[]
  super32_by_year: string[]
  fargo_by_year: string[]
  star_rating: StarRating | null
  state_placements: string[]
  nhsca_record: string | null
  super32_record: string | null
  significant_wins: Array<{ opponent: string; result: string | null; event: string | null; standing: string }>
}

// 2030 is in the data already. A class missing from this list cannot be worked on at all.
const years = ["2026", "2027", "2028", "2029", "2030"]
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

/**
 * The star beside a ranking candidate, and the place to set one by hand.
 *
 * Shown next to the working rank because they answer different questions — the rank is where a
 * wrestler sits in this class, the star is how strong the record is against everyone — and a
 * reviewer wants both in one glance.
 *
 * An override always shows what the formula said as well. That is the point of reviewing here:
 * if hand-set stars start piling up, the bands are wrong and the fix belongs in the rating.
 */
function StarCell({
  rating,
  editing,
  error,
  onEdit,
  onChange,
  onCancel,
  onSave,
}: {
  rating?: StarRating
  editing: { stars: string; reason: string } | null
  error: string | null
  onEdit: () => void
  onChange: (patch: Partial<{ stars: string; reason: string }>) => void
  onCancel: () => void
  onSave: () => void
}) {
  if (!rating && !editing) {
    return (
      <div className="flex min-w-24 flex-col items-center justify-center rounded-2xl bg-slate-800 p-3 text-center">
        <span className="text-[10px] font-bold uppercase text-blue-200">Stars</span>
        <span className="mt-1 text-xs text-blue-300">Not rated</span>
      </div>
    )
  }
  return (
    <div className="flex min-w-24 flex-col items-center rounded-2xl bg-slate-800 p-3 text-center">
      <span className="text-[10px] font-bold uppercase text-blue-200">Stars</span>
      <span className="text-3xl font-black text-[#d6b75d]">{rating ? `${rating.stars}★` : "—"}</span>
      {rating ? (
        <span className="text-[10px] text-blue-300">
          {rating.score}/100{rating.provisional ? " · prov" : ""}
        </span>
      ) : null}
      {rating?.override ? (
        <span className="mt-1 rounded bg-amber-600 px-1 text-[9px] font-bold uppercase text-slate-950">
          Set by hand · formula {rating.override.computedStars}★
        </span>
      ) : null}

      {editing ? (
        <div className="mt-2 w-44 space-y-1 text-left">
          <select
            value={editing.stars}
            onChange={(e) => onChange({ stars: e.target.value })}
            className="w-full rounded border border-blue-800 bg-slate-950 p-1 text-xs text-white"
          >
            <option value="">Use the formula</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n} star{n === 1 ? "" : "s"}</option>
            ))}
          </select>
          {editing.stars ? (
            <textarea
              value={editing.reason}
              onChange={(e) => onChange({ reason: e.target.value })}
              rows={2}
              placeholder="Why? Shown wherever the rating is."
              className="w-full rounded border border-blue-800 bg-slate-950 p-1 text-xs text-white"
            />
          ) : null}
          {error ? <p className="text-[10px] text-red-300">{error}</p> : null}
          <div className="flex gap-1">
            <Button size="sm" className="h-6 flex-1 bg-[#d6b75d] text-[10px] text-slate-950" onClick={onSave}>Save</Button>
            <Button size="sm" variant="outline" className="h-6 flex-1 border-blue-800 bg-slate-950 text-[10px] text-blue-100" onClick={onCancel}>Cancel</Button>
          </div>
        </div>
      ) : (
        <button onClick={onEdit} className="mt-1 text-[10px] text-blue-300 underline hover:text-white">
          {rating?.override ? "Change" : "Override"}
        </button>
      )}
    </div>
  )
}

/**
 * Evidence, grouped the way the Tournament of Champions field board groups it.
 *
 * A flat wall of thirty badges is not reviewable. These buckets put a wrestler's state record
 * next to their national record next to who they actually beat, which is the order the questions
 * get asked in.
 */
const EVIDENCE_GROUPS: Array<{ label: string; match: RegExp }> = [
  { label: "State", match: /NCHSAA|state|\b\d+A\b/i },
  { label: "National", match: /NHSCA|Super\s*32|Fargo|Early Entry|qualifier/i },
  { label: "Schedule", match: /match record|quality win/i },
  { label: "Duals and other", match: /duals|college open|RankWrestler|elite achievement/i },
]

/** Longest first, so the reason a wrestler scores what they score is the first thing read. */
const SCORE_SEGMENTS: Array<{ key: string; label: string; className: string }> = [
  { key: "matchResume", label: "Schedule", className: "bg-emerald-500" },
  { key: "national", label: "National", className: "bg-[#d6b75d]" },
  { key: "state", label: "State", className: "bg-sky-500" },
  { key: "duals", label: "Duals", className: "bg-purple-500" },
  { key: "rankWrestler", label: "RankWrestler", className: "bg-slate-400" },
  { key: "collegeOpen", label: "College open", className: "bg-slate-500" },
  { key: "profile", label: "Profile", className: "bg-slate-600" },
]

function ScoreBar({ breakdown, total }: { breakdown: Record<string, number>; total: number }) {
  // A component scoring nothing is not worth a tile, a colour or a word.
  const parts = SCORE_SEGMENTS.map((seg) => ({ ...seg, value: Number(breakdown[seg.key] ?? 0) })).filter(
    (seg) => seg.value > 0,
  )
  const sum = parts.reduce((acc, seg) => acc + seg.value, 0) || 1

  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-950">
        {parts.map((seg) => (
          <div
            key={seg.key}
            className={seg.className}
            style={{ width: `${(seg.value / sum) * 100}%` }}
            title={`${seg.label}: ${seg.value}`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-blue-100">
        <span className="font-black text-white">{Math.round(total * 10) / 10}</span>
        {parts.map((seg) => (
          <span key={seg.key} className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${seg.className}`} aria-hidden />
            {seg.label} <span className="font-semibold text-white">{seg.value}</span>
          </span>
        ))}
      </div>
    </div>
  )
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
  // The class and gender live in the URL so the older ranking routes can redirect straight to
  // the right board rather than dropping somebody on a default they have to fix.
  const searchParams = useSearchParams()
  const requestedYear = searchParams.get("year")
  const requestedGender = searchParams.get("gender")
  const [year, setYear] = useState(requestedYear && years.includes(requestedYear) ? requestedYear : "2027")
  const [gender, setGender] = useState(requestedGender === "Female" ? "Female" : "Male")
  const [athletes, setAthletes] = useState<BoardAthlete[]>([])
  const [stars, setStars] = useState<Record<string, StarRating>>({})
  const [starEdit, setStarEdit] = useState<{ id: string; stars: string; reason: string } | null>(null)
  const [starError, setStarError] = useState<string | null>(null)
  /** Only one athlete's evidence is open at a time, the way the TOC field board does it. */
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState("")
  const [view, setView] = useState<"final" | "recommendation" | "review" | "gaps">("final")
  const [status, setStatus] = useState("")
  const publicCap = getPublicRankingsMax(Number(year))

  const loadBoard = async (forceRefresh = false) => {
    setLoading(true)
    setStatus("")
    try {
      const res = await fetch(
        `/api/admin/rankings/board?year=${year}&gender=${gender}${forceRefresh ? "&refresh=1" : ""}`,
        { cache: "no-store" },
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load board")
      const rows = (data.athletes || []) as BoardAthlete[]
      // The rating comes back on the board itself now. Fetching it separately meant a second
      // full pass over the class — ninety-two athletes, in series — and the page took minutes.
      setStars(Object.fromEntries(rows.filter((r) => r.star_rating).map((r) => [r.id, r.star_rating!])))
      // Passive by default: preserve the admin's published top 30 exactly as-is.
      // Formula recommendations order only the private watchlist until an admin
      // explicitly previews or accepts a recommendation.
      const published = rows
        .filter((athlete) => athlete.prospect_ranking != null && athlete.prospect_ranking <= publicCap)
        .sort((a, b) => (a.prospect_ranking || 999) - (b.prospect_ranking || 999))
      const watchlist = rows
        .filter((athlete) => athlete.prospect_ranking == null || athlete.prospect_ranking > publicCap)
        .sort((a, b) => a.ai_rank - b.ai_rank)
      const withFinal = [...published, ...watchlist]
        .map((athlete) => ({ ...athlete, locked: false, reviewer_note: "" }))
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
    if (view === "recommendation") rows = [...rows].sort((a, b) => a.ai_rank - b.ai_rank)
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

  const currentlyPublished = athletes.filter(
    (athlete) => athlete.prospect_ranking != null && athlete.prospect_ranking <= publicCap,
  ).length
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

  const applyRecommendationOrder = () => {
    setStatus("Formula order previewed on the working board. Nothing has been saved or published.")
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
      setStatus(
        `Published the top ${data.published}. ${data.cleared} additional candidates remain private and unranked publicly.`,
      )
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
                <Badge className="mb-3 bg-[#d6b75d] text-slate-950">TOC résumé formula · v2</Badge>
                <h1 className="text-3xl font-black tracking-tight md:text-5xl">Formula Recommendation Board</h1>
                <p className="mt-3 max-w-3xl text-sm text-blue-100 md:text-base">
                  The same evidence-first approach as the TOC field board: current-season direct wins over athletes
                  in the same graduation class, match résumé,
                  NCHSAA depth, NHSCA, Super32, Fargo freestyle, NC United/NHSCA Duals, RankWrestler, college opens,
                  and verified profile achievements. Direct winners break comparable résumés; you make the final call.
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
                <p className="text-sm text-blue-200">Currently published</p>
                <p className="text-3xl font-black">{currentlyPublished}/{publicCap}</p>
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
                <Button onClick={() => setView("recommendation")} variant={view === "recommendation" ? "default" : "outline"} className={view === "recommendation" ? activeGoldButton : darkOutlineButton}>
                  <Bot className="mr-2 h-4 w-4" />
                  Formula recommendations
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
                <Button onClick={applyRecommendationOrder} className="bg-purple-600 hover:bg-purple-700">
                  Preview formula order
                </Button>
                <Button
                  variant="outline"
                  className={darkOutlineButton}
                  onClick={() => { void loadBoard(true) }}
                  disabled={loading}
                  title="Skip the ten-minute cache and rebuild from current data"
                >
                  Refresh
                </Button>
                <Button onClick={saveFinalRanks} disabled={saving || loading} className="bg-[#d6b75d] text-slate-950 hover:bg-[#e6c86b]">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Publishing..." : `Publish top ${publicCap}`}
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
                const sameClassWins = (athlete.head_to_head || []).reduce((sum, record) => sum + record.wins, 0)
                const isPublicSlot = finalRank <= publicCap
                return (
                  <div key={athlete.id} className="space-y-4">
                    {finalRank === publicCap + 1 ? (
                      <div className="rounded-2xl border border-dashed border-blue-700 bg-blue-950/40 px-5 py-4">
                        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#d6b75d]">Private watchlist</p>
                        <p className="mt-1 text-sm text-blue-100">
                          Candidates below this line stay private. The formula continues ranking the full pool so you can identify who deserves top-{publicCap} consideration.
                        </p>
                      </div>
                    ) : null}
                    <Card className="overflow-hidden border-blue-900 bg-slate-900 text-white">
                    <CardHeader className="border-b border-blue-950 bg-slate-950/70 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex gap-4">
                          <div className={`flex min-w-16 flex-col items-center rounded-2xl p-3 ${isPublicSlot ? "bg-[#d6b75d] text-slate-950" : "bg-slate-800 text-blue-100"}`}>
                            <span className="text-xs font-bold uppercase">Working</span>
                            <span className="text-3xl font-black">#{finalRank}</span>
                          </div>
                          <StarCell
                            rating={stars[athlete.id]}
                            editing={starEdit?.id === athlete.id ? starEdit : null}
                            error={starEdit?.id === athlete.id ? starError : null}
                            onEdit={() => {
                              setStarError(null)
                              setStarEdit({
                                id: athlete.id,
                                stars: String(stars[athlete.id]?.override?.stars ?? ""),
                                reason: stars[athlete.id]?.override?.reason ?? "",
                              })
                            }}
                            onChange={(patch) => setStarEdit((prev) => (prev ? { ...prev, ...patch } : prev))}
                            onCancel={() => { setStarEdit(null); setStarError(null) }}
                            onSave={async () => {
                              const edit = starEdit!
                              const res = await fetch("/api/admin/rankings/stars", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  athleteId: edit.id,
                                  stars: edit.stars === "" ? null : Number(edit.stars),
                                  reason: edit.reason,
                                }),
                              })
                              const body = await res.json().catch(() => ({}))
                              if (!res.ok) { setStarError(body.error ?? "Could not save that."); return }
                              // Reflect the override locally; the board reloads it on the next fetch.
                              setStars((prev) => {
                                const current = prev[edit.id]
                                if (!current) return prev
                                const stars = edit.stars === "" ? current.override?.computedStars ?? current.stars : Number(edit.stars)
                                return { ...prev, [edit.id]: { ...current, stars, override: edit.stars === "" ? undefined : { stars, computedStars: current.override?.computedStars ?? current.stars, reason: edit.reason } } }
                              })
                              setStarEdit(null); setStarError(null)
                            }}
                          />
                          <div>
                            <CardTitle className="text-2xl">
                              <Link href={`/view-profile?id=${athlete.id}`} className="hover:text-[#d6b75d]">
                                {athlete.name}
                              </Link>
                            </CardTitle>
                            <p className="mt-1 text-sm text-blue-100">
                              {athlete.highschool || "School TBD"} · {athlete.weightclass || "TBD"} lbs · Class of {athlete.graduationyear}
                            </p>
                            {/*
                              The badges that say where a wrestler stands, and nothing else.
                              Everything explaining *why* now lives behind "See evidence", the way
                              the Tournament of Champions field board does it — a reviewer scanning
                              thirty athletes needs the order first and the argument on demand.
                            */}
                            {/*
                              Four facts, in the order they get asked about: where the outside
                              service has them, whether they are an All-American, what they have
                              done at the state tournament, and their record at the two national
                              events. Everything else moved into the evidence drawer.
                            */}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {athlete.rankwrestler_rank ? (
                                <Badge className="bg-slate-200 text-slate-900">RankWrestler #{athlete.rankwrestler_rank}</Badge>
                              ) : null}
                              {athlete.all_american ? (
                                <Badge className="bg-[#CC0000] text-white" title={athlete.all_american}>
                                  All-American
                                </Badge>
                              ) : null}
                              {athlete.state_placements.length ? (
                                <Badge
                                  className={
                                    athlete.state_placements.some((p) => /champion/i.test(p))
                                      ? "bg-[#d6b75d] text-slate-950"
                                      : "bg-sky-600 text-white"
                                  }
                                  title={athlete.state_placements.join(" · ")}
                                >
                                  {athlete.state_placements[0]}
                                  {athlete.state_placements.length > 1 ? ` +${athlete.state_placements.length - 1}` : ""}
                                </Badge>
                              ) : null}
                              {athlete.nhsca_record ? (
                                <Badge className="bg-slate-700 text-white">NHSCA {athlete.nhsca_record}</Badge>
                              ) : null}
                              {athlete.super32_record ? (
                                <Badge className="bg-slate-700 text-white">Super 32 {athlete.super32_record}</Badge>
                              ) : null}
                              {athlete.match_count === 0 ? (
                                <Badge className="bg-red-700 text-white">No match data</Badge>
                              ) : null}
                              <button
                                type="button"
                                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#d6b75d]/35 bg-[#d6b75d]/10 px-2 py-1 text-[10px] font-semibold text-[#d6b75d] hover:bg-[#d6b75d]/20"
                                onClick={() => setExpandedEvidenceId((id) => (id === athlete.id ? null : athlete.id))}
                                aria-expanded={expandedEvidenceId === athlete.id}
                              >
                                See evidence
                                {expandedEvidenceId === athlete.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </button>
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
                            Use recommendation
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
                    {expandedEvidenceId === athlete.id ? (
                      <CardContent className="space-y-3 p-4">
                        {/*
                          A bar, not seven boxes. Every component used to render its own tile,
                          including the ones that always score zero — college opens and profile text
                          no longer score at all, and RankWrestler has no column to read — so four of
                          the seven tiles on every card read "0" and one athlete filled the screen.
                        */}
                        <ScoreBar breakdown={athlete.score_breakdown} total={athlete.ai_score} />

                        {/* What the formula thinks, and how far it is from where you have them. */}
                        <div className="rounded-md border border-violet-400/25 bg-violet-400/10 p-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-violet-200">
                                <Sparkles className="h-3 w-3" aria-hidden="true" />
                                Formula recommendation
                              </span>
                              <span className="rounded bg-violet-300 px-1.5 py-0.5 text-xs font-black text-[#160d2b]">
                                #{athlete.ai_rank}
                              </span>
                              <span className="text-[10px] font-semibold text-violet-100/70">
                                score {athlete.ai_score} · {athlete.confidence.toLowerCase()} confidence
                              </span>
                            </div>
                            <span className="text-[9px] font-semibold uppercase tracking-wide text-white/35">
                              Advisory only
                            </span>
                          </div>
                          {aiDelta ? (
                            <p className="mt-2 text-[10px] font-semibold text-amber-200">
                              Review: working rank is #{finalRank}, formula says {aiDelta > 0 ? `+${aiDelta}` : aiDelta}.
                            </p>
                          ) : (
                            <p className="mt-2 text-[10px] font-semibold text-emerald-200">Matches the working rank.</p>
                          )}
                          <p className="mt-2 flex items-center gap-1.5 text-[10px] leading-snug text-violet-50/70">
                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                            {athlete.confidence_reason}
                          </p>
                          {athlete.data_gaps?.length ? (
                            <p className="mt-2 border-t border-violet-200/10 pt-2 text-[10px] leading-snug text-amber-100/70">
                              Data note: {athlete.data_gaps.join(" · ")}
                            </p>
                          ) : null}
                        </div>

                        {/* Direct results inside this class decide ties, so they lead. */}
                        {athlete.head_to_head?.length ? (
                          <div className="rounded-md border border-emerald-400/25 bg-emerald-400/10 p-2.5">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                              Same-class head-to-head, last 12 months
                              {athlete.win_loss ? ` · season ${athlete.win_loss}` : ""}
                            </p>
                            <ul className="mt-1 grid gap-1 text-xs text-emerald-100 sm:grid-cols-2">
                              {athlete.head_to_head.map((row) => (
                                <li key={row.opponent}>
                                  vs {row.opponent}: <strong>{row.wins}-{row.losses}</strong>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="rounded-md border border-white/10 bg-slate-950 p-2.5 text-xs text-white/35">
                            No direct result against another ranked wrestler in this class.
                          </p>
                        )}

                        {/*
                          Wins that mean something, named. A ranking argument is won or lost on who
                          a wrestler beat, and "quality win over X (99.6%)" buried in a badge wall
                          was the wrong place for it.
                        */}
                        {athlete.significant_wins?.length ? (
                          <div className="rounded-md border border-[#d6b75d]/25 bg-[#d6b75d]/10 p-2.5">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-[#d6b75d]">
                              Wins over ranked opponents · {athlete.significant_wins.length}
                            </p>
                            <ul className="mt-1 space-y-1 text-xs leading-snug text-white/80">
                              {athlete.significant_wins.map((win, i) => (
                                <li key={`${win.opponent}-${i}`}>
                                  <span className="font-semibold text-white">{win.opponent}</span>
                                  <span className="text-white/45"> ({win.standing})</span>
                                  {win.result ? <span className="font-mono text-emerald-200"> {win.result}</span> : null}
                                  {win.event ? <span className="text-white/40"> · {win.event}</span> : null}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="rounded-md border border-white/10 bg-slate-950 p-2.5 text-xs text-white/35">
                            No wins on file over a ranked, nationally ranked or TOC-field wrestler.
                          </p>
                        )}

                        {/* Every trip to a national event, newest first — what the badge summarises. */}
                        {(athlete.nhsca_by_year?.length || athlete.super32_by_year?.length || athlete.fargo_by_year?.length) ? (
                          <div className="grid gap-3 sm:grid-cols-3">
                            {([
                              ["NHSCA", athlete.nhsca_by_year],
                              ["Super 32", athlete.super32_by_year],
                              ["Fargo", athlete.fargo_by_year],
                            ] as const).map(([label, lines]) => (
                              <div key={label}>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-[#d6b75d]">{label}</p>
                                {lines?.length ? (
                                  <ul className="mt-1 space-y-1 text-xs leading-snug text-white/75">
                                    {lines.map((line) => <li key={line}>{line}</li>)}
                                  </ul>
                                ) : (
                                  <p className="mt-1 text-xs text-white/30">Never entered</p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {/* Every line the formula counted, grouped the way the TOC board groups them. */}
                        <div className="grid gap-3 sm:grid-cols-2">
                          {EVIDENCE_GROUPS.map(({ label, match }) => {
                            const lines = athlete.evidence.filter((e) => match.test(e.label))
                            return (
                              <div key={label}>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-[#d6b75d]">{label}</p>
                                {lines.length ? (
                                  <ul className="mt-1 space-y-1 text-xs leading-snug text-white/75">
                                    {lines.map((item, i) => (
                                      <li key={`${item.label}-${i}`}>
                                        {item.points ? <span className="text-emerald-300">+{item.points} · </span> : null}
                                        {item.label}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="mt-1 text-xs text-white/30">No result on file</p>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {athlete.college_opens_experience ? (
                          <p className="text-xs text-emerald-100">
                            <strong>College opens:</strong> {athlete.college_opens_experience}
                          </p>
                        ) : null}
                      </CardContent>
                    ) : null}
                    </Card>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
