"use client"

/**
 * The rankings board, rebuilt to be worked rather than read (Matt, 18 October 2026: "pretty
 * confusing ... should be easier ... drag drop, AI suggested should be plain sight").
 *
 * One list is the order you are building, dragged into place. The formula's order sits beside it
 * the whole time, and every row says where the formula has that wrestler, so a disagreement is
 * visible without opening anything. The reasons — score, wins, losses, events — open under a row
 * when you want them.
 *
 * Nothing about saving or publishing changed: Save writes the draft for this state, class and
 * gender; Publish copies the saved draft, admins only, North Carolina only. The previous board is
 * still at /admin/rankings/board/classic.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Flag,
  GripVertical,
  Lock,
  RefreshCw,
  Search,
  Sparkles,
  Unlock,
} from "lucide-react"
import { AdminHeader } from "@/components/admin-header"
import { reviewBoard, summariseReview, type ReviewAthlete, type ReviewFlag } from "@/lib/rankings/ranking-review"
import { getPublicRankingsMax } from "@/lib/public-rankings-cap"
import type { StarRating } from "@/lib/athlete-star-rating"
import { normalizeBoardAthlete } from "@/lib/rankings/board-athlete"
import { rankingBoardDefault } from "@/lib/rankings/ranking-board-home"
import { createClient } from "@/lib/supabase/client"

type Evidence = { kind: string; label: string; points?: number; tone?: string }

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
  draft_rank?: number | null
  locked?: boolean
  all_american: string[]
  national_rankings?: string[]
  competes_styles?: string | null
  last_competed: string | null
  nhsca_by_year: string[]
  super32_by_year: string[]
  fargo_by_year: string[]
  star_rating: StarRating | null
  state_placements: string[]
  nhsca_record: string | null
  toc_result: string | null
  super32_record: string | null
  significant_wins: Array<{ opponent: string; result: string | null; event: string | null; standing: string }>
  significant_losses: Array<{ opponent: string; result: string | null; event: string | null; standing: string; upset: boolean }>
}

const YEARS = ["2027", "2028", "2029", "2030", "2026"]
/** States with a board. North Carolina's is public; the others are worked here and saved only. */
const STATES: Array<{ code: string; label: string }> = [
  { code: "NC", label: "North Carolina" },
  { code: "SC", label: "South Carolina" },
]

const SCORE_SEGMENTS: Array<{ key: string; label: string; className: string }> = [
  { key: "national", label: "National", className: "bg-[#d6b75d]" },
  { key: "matchResume", label: "Season", className: "bg-emerald-500" },
  { key: "state", label: "State", className: "bg-sky-500" },
  { key: "rankedWins", label: "Ranked wins", className: "bg-rose-500" },
  { key: "allAmerican", label: "All-American", className: "bg-red-600" },
  { key: "duals", label: "Duals", className: "bg-purple-500" },
  { key: "nationalRanking", label: "National rank", className: "bg-white" },
  { key: "rankWrestler", label: "RankWrestler", className: "bg-slate-400" },
]

function parseLastCompeted(value: string | null | undefined): string | null {
  const match = String(value ?? "").match(/([A-Z][a-z]{2} \d{1,2}, \d{4})/)
  if (!match) return null
  const at = Date.parse(match[1]!)
  return Number.isFinite(at) ? new Date(at).toISOString().slice(0, 10) : null
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never"
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return "never"
  const minutes = Math.round((Date.now() - then) / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return days === 1 ? "yesterday" : `${days}d ago`
}

function renumber(rows: BoardAthlete[]): BoardAthlete[] {
  return rows.map((row, index) => ({ ...row, final_rank: index + 1 }))
}

function moveTo(rows: BoardAthlete[], id: string, toIndex: number): BoardAthlete[] {
  const from = rows.findIndex((r) => r.id === id)
  if (from < 0) return rows
  const next = [...rows]
  const [item] = next.splice(from, 1)
  next.splice(Math.max(0, Math.min(toIndex, next.length)), 0, item!)
  return renumber(next)
}

/** The best state result, for the one-line badge. */
function bestState(placements: string[]): string | null {
  if (!placements.length) return null
  return placements.find((p) => /champion/i.test(p)) ?? placements[0] ?? null
}

/** How far the formula is from where you have them: "Formula #4 ▲2". */
function FormulaChip({ aiRank, working }: { aiRank: number; working: number }) {
  const delta = working - aiRank
  const tone =
    delta === 0
      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
      : Math.abs(delta) <= 3
        ? "border-violet-400/40 bg-violet-400/10 text-violet-200"
        : "border-amber-400/50 bg-amber-400/15 text-amber-200"
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-bold ${tone}`}
      title={
        delta === 0
          ? "The formula agrees with this place"
          : `The formula has them #${aiRank}: ${Math.abs(delta)} ${delta > 0 ? "higher" : "lower"} than here`
      }
    >
      <Sparkles className="h-3 w-3" aria-hidden />#{aiRank}
      {delta !== 0 ? <span>{delta > 0 ? `▲${delta}` : `▼${-delta}`}</span> : null}
    </span>
  )
}

function ScoreBar({ breakdown, total }: { breakdown: Record<string, number>; total: number }) {
  const parts = SCORE_SEGMENTS.map((s) => ({ ...s, value: Math.round(Number(breakdown[s.key] ?? 0)) })).filter((s) => s.value > 0)
  const sum = parts.reduce((a, s) => a + s.value, 0) || 1
  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-950">
        {parts.map((s) => (
          <div key={s.key} className={s.className} style={{ width: `${(s.value / sum) * 100}%` }} title={`${s.label}: ${s.value}`} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-300">
        <span className="font-black text-white">Score {Math.round(total)}</span>
        {parts.map((s) => (
          <span key={s.key} className="flex items-center gap-1">
            <span className={`inline-block h-2 w-2 rounded-full ${s.className}`} aria-hidden />
            {s.label} <b className="text-white">{s.value}</b>
          </span>
        ))}
      </div>
    </div>
  )
}

function FlagList({ flags }: { flags: ReviewFlag[] }) {
  if (!flags.length) return null
  return (
    <ul className="space-y-1">
      {flags.map((flag, i) => (
        <li
          key={`${flag.kind}-${i}`}
          className={`rounded border px-2 py-1 text-[11px] leading-snug ${
            flag.severity === "high"
              ? "border-red-500/40 bg-red-500/10 text-red-200"
              : flag.severity === "medium"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                : "border-slate-600/50 bg-slate-800/40 text-slate-300"
          }`}
        >
          {flag.message}
        </li>
      ))}
    </ul>
  )
}

/** Where each alert comes from, so a hover says what to go and check. */
const FLAG_SOURCE: Record<ReviewFlag["kind"], string> = {
  beaten_by_lower: "Head-to-head",
  beaten_by_unranked: "Head-to-head",
  beat_higher: "Head-to-head",
  formula_gap: "Formula",
  outside_gap: "RankWrestler",
  rating_conflict: "Star rating",
  no_match_data: "Season matches",
  stale: "Activity",
}

/** The specific number behind an alert, from this wrestler's own row. */
function flagSourceDetail(flag: ReviewFlag, athlete: BoardAthlete): string | null {
  switch (flag.kind) {
    case "formula_gap":
      return `Formula #${athlete.ai_rank} · score ${Math.round(athlete.ai_score)}`
    case "stale":
      return athlete.last_competed ? `Last bout: ${athlete.last_competed}` : null
    case "rating_conflict":
      return athlete.star_rating ? `${athlete.star_rating.stars}★ · ${athlete.star_rating.score}/100` : null
    case "outside_gap":
      return athlete.rankwrestler_rank ? `RankWrestler #${athlete.rankwrestler_rank}` : null
    case "no_match_data":
      return "No in-season matches imported"
    default:
      return "Same class, last 12 months: season matches and national bouts"
  }
}

/**
 * The flag, and on hover what raised it (Matt, 19 October 2026: "on hover i should see what the
 * source of the alert is"). Red when any alert is high; yellow when all are worth a look only.
 */
function FlagBadge({ flags, athlete }: { flags: ReviewFlag[]; athlete: BoardAthlete }) {
  const high = flags.some((f) => f.severity === "high")
  return (
    <span className="group relative inline-flex" tabIndex={0}>
      <span
        className={`inline-flex cursor-help items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
          high ? "bg-red-600 text-white" : "bg-amber-500 text-slate-950"
        }`}
        aria-label={`${flags.length} review alert${flags.length === 1 ? "" : "s"}`}
      >
        <Flag className="h-3 w-3" aria-hidden />
        {flags.length}
      </span>
      <span className="pointer-events-none invisible absolute right-0 top-full z-30 mt-1.5 w-80 rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-left opacity-0 shadow-2xl transition group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100">
        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Review alerts · {athlete.name}
        </span>
        {flags.map((flag, i) => {
          const detail = flagSourceDetail(flag, athlete)
          return (
            <span key={`${flag.kind}-${i}`} className="mb-1.5 block border-l-2 pl-2 last:mb-0" style={{ borderColor: flag.severity === "high" ? "#dc2626" : flag.severity === "medium" ? "#f59e0b" : "#64748b" }}>
              <span className="block text-[10px] font-bold uppercase tracking-wide text-[#d6b75d]">
                {FLAG_SOURCE[flag.kind]}
                <span className="ml-1.5 font-semibold normal-case text-slate-500">{flag.severity === "high" ? "fix or have a reason" : "worth a look"}</span>
              </span>
              <span className="block text-xs leading-snug text-slate-100">{flag.message}</span>
              {detail ? <span className="block text-[11px] text-slate-400">{detail}</span> : null}
            </span>
          )
        })}
      </span>
    </span>
  )
}

/** What opens under a row: the reasons for the formula's number, and the results behind them. */
function Details({
  athlete,
  flags,
  stars,
  canOverrideStars,
  onStarsSaved,
}: {
  athlete: BoardAthlete
  flags: ReviewFlag[]
  stars: StarRating | undefined
  canOverrideStars: boolean
  onStarsSaved: (rating: StarRating) => void
}) {
  const [edit, setEdit] = useState<{ stars: string; reason: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const national: Array<[string, string[]]> = [
    ["NHSCA", athlete.nhsca_by_year],
    ["Super 32", athlete.super32_by_year],
    ["Fargo", athlete.fargo_by_year],
  ]
  return (
    <div className="space-y-3 border-t border-slate-800 bg-slate-950/60 p-3 text-xs sm:p-4">
      <FlagList flags={flags} />
      <ScoreBar breakdown={athlete.score_breakdown} total={athlete.ai_score} />

      <div className="grid gap-3 lg:grid-cols-3">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#d6b75d]">State</p>
          {athlete.state_placements.length ? (
            <ul className="space-y-0.5 text-slate-200">{athlete.state_placements.map((p) => <li key={p}>{p}</li>)}</ul>
          ) : (
            <p className="text-slate-500">No state result on file</p>
          )}
        </div>
        {national.map(([label, lines]) => (
          <div key={label}>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#d6b75d]">{label}</p>
            {lines?.length ? (
              <ul className="space-y-0.5 text-slate-200">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
            ) : (
              <p className="text-slate-500">Not on file</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-emerald-400/25 bg-emerald-400/5 p-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-300">
            Wins over ranked opponents · {athlete.significant_wins.length}
          </p>
          {athlete.significant_wins.length ? (
            <ul className="mt-1 space-y-0.5 text-slate-200">
              {athlete.significant_wins.map((w, i) => (
                <li key={`${w.opponent}-${i}`}>
                  <b className="text-white">{w.opponent}</b> <span className="text-slate-400">({w.standing})</span>
                  {w.result ? <span className="font-mono text-emerald-200"> {w.result}</span> : null}
                  {w.event ? <span className="text-slate-500"> · {w.event}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-slate-500">None on file</p>
          )}
        </div>
        <div className="rounded-md border border-red-400/25 bg-red-500/5 p-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-red-300">
            Losses to ranked opponents · {athlete.significant_losses.length}
          </p>
          {athlete.significant_losses.length ? (
            <ul className="mt-1 space-y-0.5 text-slate-200">
              {athlete.significant_losses.map((l, i) => (
                <li key={`${l.opponent}-${i}`}>
                  {l.upset ? <span className="mr-1 rounded bg-red-600 px-1 text-[9px] font-black uppercase text-white">Upset</span> : null}
                  <b className="text-white">{l.opponent}</b> <span className="text-slate-400">({l.standing})</span>
                  {l.result ? <span className="font-mono text-red-200"> {l.result}</span> : null}
                  {l.event ? <span className="text-slate-500"> · {l.event}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-slate-500">None on file</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Head-to-head in this class</p>
          {athlete.head_to_head.length ? (
            <p className="mt-0.5 text-slate-200">
              {athlete.head_to_head.map((h) => `${h.opponent} ${h.wins}-${h.losses}`).join(" · ")}
            </p>
          ) : (
            <p className="mt-0.5 text-slate-500">None on file</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Season</p>
          <p className="mt-0.5 text-slate-200">
            {athlete.match_count ? `${athlete.match_count} matches${athlete.win_loss ? ` · ${athlete.win_loss}` : ""}` : "No match data"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Stars</p>
          <p className="mt-0.5 text-slate-200">
            {stars ? `${stars.stars}★ (${stars.score}/100)${stars.override ? ` · set by hand, formula ${stars.override.computedStars}★` : ""}` : "Not rated"}
            {canOverrideStars && stars && !edit ? (
              <button
                className="ml-2 text-[11px] text-sky-300 underline"
                onClick={() => setEdit({ stars: String(stars.override?.stars ?? ""), reason: stars.override?.reason ?? "" })}
              >
                {stars.override ? "Change" : "Override"}
              </button>
            ) : null}
          </p>
          {edit ? (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <select
                value={edit.stars}
                onChange={(e) => setEdit({ ...edit, stars: e.target.value })}
                className="rounded border border-slate-700 bg-slate-950 p-1 text-xs text-white"
              >
                <option value="">Use the formula</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}★</option>
                ))}
              </select>
              {edit.stars ? (
                <input
                  value={edit.reason}
                  onChange={(e) => setEdit({ ...edit, reason: e.target.value })}
                  placeholder="Why?"
                  className="w-48 rounded border border-slate-700 bg-slate-950 p-1 text-xs text-white"
                />
              ) : null}
              <button
                className="rounded bg-[#d6b75d] px-2 py-1 text-[11px] font-bold text-slate-950"
                onClick={async () => {
                  const res = await fetch("/api/admin/rankings/stars", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ athleteId: athlete.id, stars: edit.stars === "" ? null : Number(edit.stars), reason: edit.reason }),
                  })
                  const body = await res.json().catch(() => ({}))
                  if (!res.ok) return setError(body.error ?? "Could not save that.")
                  const computed = stars!.override?.computedStars ?? stars!.stars
                  const n = edit.stars === "" ? computed : Number(edit.stars)
                  onStarsSaved({ ...stars!, stars: n, override: edit.stars === "" ? undefined : { stars: n, computedStars: computed, reason: edit.reason } })
                  setEdit(null)
                  setError(null)
                }}
              >
                Save
              </button>
              <button className="text-[11px] text-slate-400 underline" onClick={() => setEdit(null)}>Cancel</button>
              {error ? <span className="text-[11px] text-red-300">{error}</span> : null}
            </div>
          ) : null}
        </div>
      </div>
      {athlete.data_gaps.length ? <p className="text-[11px] text-amber-200/70">Data note: {athlete.data_gaps.join(" · ")}</p> : null}
    </div>
  )
}

export default function RankingBoardPage() {
  const searchParams = useSearchParams()
  const requestedYear = searchParams.get("year")
  const requestedGender = searchParams.get("gender")
  const requestedState = (searchParams.get("state") ?? "NC").toUpperCase()
  const [year, setYear] = useState(requestedYear && YEARS.includes(requestedYear) ? requestedYear : "2027")
  const [gender, setGender] = useState(requestedGender === "Female" ? "Female" : "Male")
  const [state, setState] = useState(STATES.some((s) => s.code === requestedState) ? requestedState : "NC")
  const [athletes, setAthletes] = useState<BoardAthlete[]>([])
  const [stars, setStars] = useState<Record<string, StarRating>>({})
  const [excluded, setExcluded] = useState<Array<{ id: string; name: string; highschool: string | null }>>([])
  const [open, setOpen] = useState<string | null>(null)
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null)
  const [publishedAt, setPublishedAt] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "review" | "gaps">("all")
  const [status, setStatus] = useState("")
  const [access, setAccess] = useState<"edit" | "read">("read")
  const [canPublish, setCanPublish] = useState(false)
  const latestLoad = useRef(0)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const publicCap = getPublicRankingsMax(Number(year), gender)
  const canEdit = access === "edit"
  const showing = `${state}|${year}|${gender}`
  const boardIsCurrent = loadedFor === showing

  // A link with no class on it opens a scoped ranker's own board.
  const cameWithoutBoard = useRef(!requestedYear && !requestedGender)
  useEffect(() => {
    if (!cameWithoutBoard.current) return
    cameWithoutBoard.current = false
    void createClient()
      .auth.getSession()
      .then(({ data }) => {
        const board = rankingBoardDefault(data.session?.user?.app_metadata)
        if (!board || !YEARS.includes(String(board.year))) return
        setYear(String(board.year))
        setGender(board.gender)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (searchParams.get("year") === year && searchParams.get("gender") === gender && (searchParams.get("state") ?? "NC") === state) return
    router.replace(`${pathname}?year=${year}&gender=${gender}${state !== "NC" ? `&state=${state}` : ""}`, { scroll: false })
  }, [year, gender, state, pathname, router, searchParams])

  const loadBoard = async (forceRefresh = false) => {
    const loadId = ++latestLoad.current
    const requested = `${state}|${year}|${gender}`
    if (requested !== loadedFor) setAthletes([])
    setLoading(true)
    setStatus("")
    try {
      const res = await fetch(
        `/api/admin/rankings/board?year=${year}&gender=${gender}&state=${state}${forceRefresh ? "&refresh=1" : ""}`,
        { cache: "no-store" },
      )
      const data = await res.json()
      if (loadId !== latestLoad.current) return
      if (!res.ok) throw new Error(data.error || "Failed to load board")
      const rows = ((data.athletes || []) as BoardAthlete[]).map(normalizeBoardAthlete)
      setStars(Object.fromEntries(rows.filter((r) => r.star_rating).map((r) => [r.id, r.star_rating!])))
      setDraftSavedAt(data.meta?.draft_saved_at ?? null)
      setPublishedAt(data.meta?.published_at ?? null)
      setExcluded(Array.isArray(data.meta?.excluded_no_gender) ? data.meta.excluded_no_gender : [])
      setAccess(data.meta?.access === "edit" ? "edit" : "read")
      setCanPublish(data.meta?.can_publish === true)
      // Saved draft first; with none, the published order, then the formula for everyone else.
      const drafted = rows.filter((a) => a.draft_rank != null).sort((a, b) => (a.draft_rank ?? 999) - (b.draft_rank ?? 999))
      const undrafted = rows.filter((a) => a.draft_rank == null).sort((a, b) => a.ai_rank - b.ai_rank)
      const published = rows
        .filter((a) => a.prospect_ranking != null && a.prospect_ranking <= publicCap)
        .sort((a, b) => (a.prospect_ranking || 999) - (b.prospect_ranking || 999))
      const rest = rows.filter((a) => a.prospect_ranking == null || a.prospect_ranking > publicCap).sort((a, b) => a.ai_rank - b.ai_rank)
      const ordered = drafted.length ? [...drafted, ...undrafted] : published.length ? [...published, ...rest] : [...rows].sort((a, b) => a.ai_rank - b.ai_rank)
      setAthletes(renumber(ordered.map((a) => ({ ...a, locked: false }))))
      setDirty(false)
      setLoadedFor(requested)
    } catch (error) {
      if (loadId !== latestLoad.current) return
      setStatus(error instanceof Error ? error.message : "Failed to load board")
    } finally {
      if (loadId === latestLoad.current) setLoading(false)
    }
  }

  useEffect(() => {
    void loadBoard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, gender, state])

  const reviewFlags = useMemo(() => {
    const rows: ReviewAthlete[] = athletes
      .filter((a) => (a.final_rank ?? 0) > 0 && (a.final_rank ?? 0) <= publicCap)
      .map((a) => ({
        id: a.id,
        name: a.name,
        workingRank: a.final_rank!,
        formulaRank: a.ai_rank,
        outsideRank: a.rankwrestler_rank ?? null,
        starScore: stars[a.id]?.score ?? a.star_rating?.score ?? null,
        matchCount: a.match_count,
        lastCompetedAt: parseLastCompeted(a.last_competed),
        headToHead: (a.head_to_head ?? []).map((h) => ({ opponentId: h.opponentId, opponent: h.opponent, wins: h.wins, losses: h.losses })),
      }))
    return reviewBoard(rows)
  }, [athletes, publicCap, stars])
  const reviewSummary = useMemo(() => summariseReview(reviewFlags), [reviewFlags])
  const gaps = athletes.filter((a) => a.match_count < 20).length

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    let rows = athletes
    if (filter === "review") rows = rows.filter((a) => (reviewFlags.get(a.id)?.length ?? 0) > 0)
    if (filter === "gaps") rows = rows.filter((a) => a.match_count < 20)
    if (term) {
      rows = rows.filter(
        (a) =>
          a.name.toLowerCase().includes(term) ||
          String(a.highschool || "").toLowerCase().includes(term) ||
          String(a.weightclass || "").includes(term),
      )
    }
    return rows
  }, [athletes, filter, query, reviewFlags])
  // Dragging only makes sense on the whole list; a filtered list has gaps in it.
  const canDrag = canEdit && filter === "all" && !query.trim()
  const formulaOrder = useMemo(() => [...athletes].sort((a, b) => a.ai_rank - b.ai_rank), [athletes])
  const agreeing = athletes.filter((a) => (a.final_rank ?? 0) <= publicCap && a.final_rank === a.ai_rank).length

  const change = (next: (prev: BoardAthlete[]) => BoardAthlete[]) => {
    setAthletes(next)
    setDirty(true)
  }

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index) return
    change((prev) => moveTo(prev, result.draggableId, result.destination!.index))
  }

  const useFormulaOrder = () => {
    change((prev) => {
      const locked = prev.filter((a) => a.locked)
      const unlocked = prev.filter((a) => !a.locked).sort((a, b) => a.ai_rank - b.ai_rank)
      const next: BoardAthlete[] = []
      let u = 0
      for (let rank = 1; rank <= prev.length; rank++) {
        const keep = locked.find((a) => a.final_rank === rank)
        if (keep) next.push(keep)
        else if (unlocked[u]) next.push(unlocked[u++]!)
      }
      while (unlocked[u]) next.push(unlocked[u++]!)
      return renumber(next)
    })
    setStatus("Formula order applied to your list (locked wrestlers stayed put). Nothing is saved until you press Save.")
  }

  const saveDraft = async () => {
    if (!boardIsCurrent) return setStatus("Still loading this board — wait for it before saving.")
    setSaving(true)
    setStatus("")
    try {
      const res = await fetch("/api/admin/rankings/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", year, gender, state, rankings: athletes.map((a, i) => ({ id: a.id, final_rank: i + 1 })) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not save the order.")
      setDraftSavedAt(data.draftSavedAt ?? new Date().toISOString())
      setDirty(false)
      setStatus(`Saved ${data.saved} wrestlers.${canPublish ? " Nothing is public until you publish." : ""}`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save the order.")
    } finally {
      setSaving(false)
    }
  }

  const publishDraft = async () => {
    if (!boardIsCurrent) return setStatus("Still loading this board — wait for it before publishing.")
    if (dirty) return setStatus("You have unsaved moves. Save first — Publish only ever publishes the saved order.")
    setPublishing(true)
    setStatus("")
    try {
      const res = await fetch("/api/admin/rankings/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", year, gender, state }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not publish.")
      setPublishedAt(data.publishedAt ?? new Date().toISOString())
      const app = data.app as { synced?: boolean; rows?: number; note?: string } | undefined
      const push = data.push as { sent?: number; failed?: number; note?: string } | undefined
      const parts = [
        `Published the top ${data.published}.`,
        data.released === false ? "Staged: not public until this class is released." : "",
        app?.synced ? `App has the same ${app.rows}.` : app?.note ? `App not updated — ${app.note}` : "",
        push?.sent ? `Push sent to ${push.sent} device${push.sent === 1 ? "" : "s"}.` : "No push sent.",
      ]
      setStatus(parts.filter(Boolean).join(" "))
      await loadBoard(true)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not publish.")
    } finally {
      setPublishing(false)
    }
  }

  const pill = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-semibold transition ${active ? "bg-[#d6b75d] text-slate-950" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`

  const row = (athlete: BoardAthlete, dragHandle?: Record<string, unknown>) => {
    const rank = athlete.final_rank ?? 0
    const isPublic = rank <= publicCap
    const flags = reviewFlags.get(athlete.id) ?? []
    const state1 = bestState(athlete.state_placements)
    const isOpen = open === athlete.id
    return (
      <div className={`rounded-lg border ${isOpen ? "border-[#d6b75d]/60" : "border-slate-800"} bg-slate-900`}>
        <div className="flex items-center gap-2 p-2 sm:gap-3 sm:p-2.5">
          {canDrag ? (
            <span {...(dragHandle ?? {})} className="cursor-grab text-slate-500 hover:text-white active:cursor-grabbing" aria-label="Drag to reorder">
              <GripVertical className="h-4 w-4" />
            </span>
          ) : null}
          <span
            className={`flex h-9 w-10 shrink-0 items-center justify-center rounded-md text-sm font-black ${
              isPublic ? "bg-[#d6b75d] text-slate-950" : "bg-slate-800 text-slate-300"
            }`}
          >
            {rank}
          </span>
          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpen(isOpen ? null : athlete.id)}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="truncate font-bold text-white">{athlete.name}</span>
              {athlete.locked ? <Lock className="h-3 w-3 text-[#d6b75d]" aria-label="Locked" /> : null}
              {stars[athlete.id] ? <span className="text-xs font-bold text-[#d6b75d]">{stars[athlete.id]!.stars}★</span> : null}
            </div>
            <div className="truncate text-xs text-slate-400">
              {[athlete.highschool, athlete.last_competed ? `last: ${athlete.last_competed}` : null].filter(Boolean).join(" · ")}
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {athlete.national_rankings?.slice(0, 1).map((r) => (
                <span key={r} className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-950">{r}</span>
              ))}
              {athlete.all_american.slice(0, 2).map((f) => (
                <span key={f} className="rounded bg-[#CC0000] px-1.5 py-0.5 text-[10px] font-bold text-white">{f}</span>
              ))}
              {state1 ? (
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${/champion/i.test(state1) ? "bg-[#d6b75d] text-slate-950" : "bg-sky-700 text-white"}`}>
                  {state1}
                  {athlete.state_placements.length > 1 ? ` +${athlete.state_placements.length - 1}` : ""}
                </span>
              ) : null}
              {athlete.toc_result ? <span className="rounded bg-emerald-800 px-1.5 py-0.5 text-[10px] font-bold text-white">TOC {athlete.toc_result}</span> : null}
              {athlete.super32_record ? <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-white">S32 {athlete.super32_record}</span> : null}
              {athlete.nhsca_record ? <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-white">NHSCA {athlete.nhsca_record}</span> : null}
              {athlete.match_count === 0 ? <span className="rounded bg-red-900 px-1.5 py-0.5 text-[10px] text-red-100">No season matches</span> : null}
            </div>
          </button>
          <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
            <FormulaChip aiRank={athlete.ai_rank} working={rank} />
            {flags.length ? <FlagBadge flags={flags} athlete={athlete} /> : null}
          </div>
          {canEdit ? (
            <div className="hidden shrink-0 items-center gap-0.5 md:flex">
              <button className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white" title="Up one" onClick={() => change((p) => moveTo(p, athlete.id, rank - 2))}>
                <ArrowUp className="h-4 w-4" />
              </button>
              <button className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white" title="Down one" onClick={() => change((p) => moveTo(p, athlete.id, rank))}>
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                title={`Move to the formula's place, #${athlete.ai_rank}`}
                onClick={() => change((p) => moveTo(p, athlete.id, athlete.ai_rank - 1))}
              >
                <Sparkles className="h-4 w-4" />
              </button>
              <button
                className={`rounded p-1 hover:bg-slate-800 ${athlete.locked ? "text-[#d6b75d]" : "text-slate-400 hover:text-white"}`}
                title={athlete.locked ? "Unlock (Use formula order will move him)" : "Lock here (Use formula order will not move him)"}
                onClick={() => setAthletes((p) => p.map((r) => (r.id === athlete.id ? { ...r, locked: !r.locked } : r)))}
              >
                {athlete.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </button>
            </div>
          ) : null}
          <button className="shrink-0 rounded p-1 text-slate-400 hover:text-white" onClick={() => setOpen(isOpen ? null : athlete.id)} aria-label="Details">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
        {isOpen ? (
          <Details
            athlete={athlete}
            flags={flags}
            stars={stars[athlete.id]}
            canOverrideStars={canPublish}
            onStarsSaved={(rating) => setStars((prev) => ({ ...prev, [athlete.id]: rating }))}
          />
        ) : null}
      </div>
    )
  }

  const stateLabel = STATES.find((s) => s.code === state)?.label ?? state

  return (
    <>
      <AdminHeader />
      {/* admin-dark-page: the admin layout paints every min-h-screen page light unless told not to. */}
      <main className="admin-dark-page min-h-screen bg-slate-950 text-white">
        {/* One bar: whose board, and what has happened to it. */}
        <div className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3">
            <div className="flex rounded-full bg-slate-900 p-1">
              {STATES.map((s) => (
                <button key={s.code} className={pill(state === s.code)} onClick={() => setState(s.code)} title={s.label}>
                  {s.code}
                </button>
              ))}
            </div>
            <div className="flex rounded-full bg-slate-900 p-1">
              {(["Male", "Female"] as const).map((g) => (
                <button key={g} className={pill(gender === g)} onClick={() => setGender(g)}>
                  {g === "Male" ? "Men" : "Women"}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap rounded-full bg-slate-900 p-1">
              {YEARS.map((y) => (
                <button key={y} className={pill(year === y)} onClick={() => setYear(y)}>
                  {y}
                </button>
              ))}
            </div>
            <button
              className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              onClick={() => void loadBoard(true)}
              title="Rebuild from current data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">
                Saved <b className="text-white">{timeAgo(draftSavedAt)}</b>
                {state === "NC" ? (
                  <>
                    {" · "}Published <b className="text-white">{timeAgo(publishedAt)}</b>
                  </>
                ) : (
                  <> · <b className="text-amber-200">review only, not published</b></>
                )}
                {dirty ? <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 font-semibold text-amber-200">Unsaved moves</span> : null}
              </span>
              {canEdit ? (
                <button
                  onClick={saveDraft}
                  disabled={saving || loading || !boardIsCurrent}
                  className="rounded-full border border-slate-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-40"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              ) : (
                boardIsCurrent && <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">Read only</span>
              )}
              {canPublish ? (
                <button
                  onClick={publishDraft}
                  disabled={publishing || loading || !boardIsCurrent || !draftSavedAt}
                  className="rounded-full bg-[#d6b75d] px-4 py-1.5 text-sm font-bold text-slate-950 hover:bg-[#e6c86b] disabled:opacity-40"
                >
                  {publishing ? "Publishing…" : `Publish top ${publicCap}`}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black tracking-tight">
                {stateLabel} · {gender === "Male" ? "Men" : "Women"} · Class of {year}
              </h1>
              <p className="text-sm text-slate-400">
                {athletes.length} wrestlers · top {publicCap} {state === "NC" ? "go public" : "would be the board"} · the formula agrees with{" "}
                <b className="text-white">{agreeing}</b> of your top {publicCap}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-full bg-slate-900 p-1 text-sm">
                <button className={pill(filter === "all")} onClick={() => setFilter("all")}>All</button>
                <button className={pill(filter === "review")} onClick={() => setFilter("review")}>
                  Needs review {reviewSummary.contested ? `· ${reviewSummary.contested}` : ""}
                </button>
                <button className={pill(filter === "gaps")} onClick={() => setFilter("gaps")}>
                  Thin match data {gaps ? `· ${gaps}` : ""}
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a wrestler or school"
                  className="w-56 rounded-full border border-slate-700 bg-slate-900 py-2 pl-8 pr-3 text-sm text-white placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>

          {status ? <div className="mb-4 rounded-lg border border-sky-800 bg-sky-950/60 p-3 text-sm text-sky-100">{status}</div> : null}
          {excluded.length ? (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
              <b>{excluded.length} missing from this class</b> — gender not set: {excluded.map((a) => a.name).join(", ")}
            </div>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* Your order. */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Your order</h2>
                <span className="text-xs text-slate-500">
                  {canDrag ? "Drag to reorder · tap a row for the details" : canEdit ? "Clear the filter to drag" : "Tap a row for the details"}
                </span>
              </div>
              {loading && !athletes.length ? (
                <div className="rounded-lg border border-slate-800 bg-slate-900 p-10 text-center text-slate-400">Building the board…</div>
              ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="board" isDropDisabled={!canDrag}>
                    {(drop) => (
                      <div ref={drop.innerRef} {...drop.droppableProps} className="space-y-1.5">
                        {visible.map((athlete, index) => (
                          <Draggable key={athlete.id} draggableId={athlete.id} index={index} isDragDisabled={!canDrag}>
                            {(drag) => (
                              <div ref={drag.innerRef} {...drag.draggableProps}>
                                {filter === "all" && !query && (athlete.final_rank ?? 0) === publicCap + 1 ? (
                                  <div className="my-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#d6b75d]">
                                    <span className="h-px flex-1 bg-[#d6b75d]/40" />
                                    {state === "NC" ? `Public cut · below #${publicCap} stays private` : `Cut · #${publicCap}`}
                                    <span className="h-px flex-1 bg-[#d6b75d]/40" />
                                  </div>
                                ) : null}
                                {row(athlete, drag.dragHandleProps as unknown as Record<string, unknown>)}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {drop.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </section>

            {/* The formula, always in view. */}
            <aside className="lg:sticky lg:top-20 lg:self-start">
              <div className="rounded-xl border border-violet-500/30 bg-violet-950/30">
                <div className="flex items-center justify-between gap-2 border-b border-violet-500/20 p-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-black text-violet-100">
                      <Sparkles className="h-4 w-4" /> Formula suggests
                    </p>
                    <p className="text-[11px] text-violet-200/60">State, national, season, ranked wins, head-to-head</p>
                  </div>
                  {canEdit ? (
                    <button
                      onClick={useFormulaOrder}
                      className="rounded-full bg-violet-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-400"
                      title="Reorder your list to the formula's order. Locked wrestlers stay where they are. Not saved until you press Save."
                    >
                      Use this order
                    </button>
                  ) : null}
                </div>
                <ol className="max-h-[70vh] overflow-y-auto p-1.5">
                  {formulaOrder.slice(0, Math.max(publicCap + 10, 40)).map((a) => {
                    const delta = (a.final_rank ?? 0) - a.ai_rank
                    return (
                      <li key={a.id}>
                        <button
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-violet-500/10"
                          onClick={() => {
                            setFilter("all")
                            setQuery("")
                            setOpen(a.id)
                          }}
                          title={`Score ${Math.round(a.ai_score)} · you have him #${a.final_rank}`}
                        >
                          <span className="w-6 text-right text-xs font-black text-violet-200">{a.ai_rank}</span>
                          <span className="min-w-0 flex-1 truncate text-sm text-white">{a.name}</span>
                          <span className="text-[11px] tabular-nums text-violet-200/60">{Math.round(a.ai_score)}</span>
                          <span
                            className={`w-12 text-right text-[11px] font-bold ${
                              delta === 0 ? "text-emerald-300" : Math.abs(delta) <= 3 ? "text-slate-400" : "text-amber-300"
                            }`}
                          >
                            {delta === 0 ? "✓" : `you #${a.final_rank}`}
                          </span>
                        </button>
                        {a.ai_rank === publicCap ? <div className="mx-2 my-1 h-px bg-violet-400/30" /> : null}
                      </li>
                    )
                  })}
                </ol>
              </div>
              <p className="mt-2 px-1 text-[11px] text-slate-500">
                Advisory. The formula never moves your list unless you press “Use this order” or the ✦ on a row.{" "}
                <Link href="/admin/rankings/board/classic" className="underline">Classic board</Link>
              </p>
            </aside>
          </div>
        </div>
      </main>
    </>
  )
}
