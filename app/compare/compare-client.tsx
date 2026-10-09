"use client"

/**
 * Two wrestlers, side by side, for a coach deciding between them.
 *
 * The page opens by selling the tool - most people who land here have not used it, and a bare
 * search box does not say what it can do. Everything the pitch claims is something the tool below
 * actually does, and the numbers in it are counted, not rounded up.
 *
 * Head-to-head first — whether they have wrestled and who won is the most direct answer there
 * is. Then the rows, each with its edge decided on the server and the reason printed under it.
 * The coach chooses which rows count: strength of opponents, state placement and academics are on
 * by default, and the national tournaments either wrestler entered can be switched on one by one.
 * The tally counts only what is switched on, so the coach is weighing their own priorities.
 *
 * No overall winner. "Better for our program" depends on the program.
 *
 * Dark navy, on the RecruitNC palette (tailwind `rnc`): ink page, surface panels, raised cards,
 * gold for the edge.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  AlertTriangle,
  ChevronDown,
  Lightbulb,
  ArrowLeftRight,
  ArrowRight,
  Globe,
  GraduationCap,
  Loader2,
  Lock,
  Scale,
  Search,
  Share2,
  SlidersHorizontal,
  Swords,
  Target,
  TrendingUp,
  Users,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import type { ComparisonBout, CommonOpponent, HeadToHead } from "@/lib/athlete-comparison"
import type { ComparisonRow, ComparisonSections, RowEdge, RowGroup } from "@/lib/athlete-comparison-rows"
import { ComparisonSectionsView } from "./comparison-sections"
import { SimilarComparisons } from "@/components/profile/similar-comparisons"
import { recommend } from "@/lib/comparison-recommendation"
import {
  PerfectRecruitInvite,
  PerfectRecruitPanel,
  PerfectRecruitWizard,
  StatusIcon,
  type ProgramFitPayload,
} from "./program-fit-panel"
import { EMPTY_CRITERIA, evaluateProgramFit, summarizeFit, type FitCheck, type FitStatus } from "@/lib/program-fit"

type Athlete = {
  id: string
  name: string
  highschool: string | null
  graduationyear: number | null
  weightclass: string | null
}

type SideHeader = {
  id: string
  name: string
  photoUrl: string | null
  school: string | null
  graduationYear: number | null
  weight: string | null
}

type ComparisonResponse = {
  left: SideHeader
  right: SideHeader
  headToHead: HeadToHead | null
  commonOpponents: CommonOpponent[]
  commonOpponentEdge: { left: number; right: number; even: number }
  verdict: string
  rows: ComparisonRow[]
  personal: boolean
  /** Verified coaches and admins only; null for everyone else. */
  programFit: ProgramFitPayload | null
  /** Best wins, national tournaments, freestyle and Greco - side by side. */
  sections?: ComparisonSections
}

/** A refusal the coach can do something about, kept apart from a plain error. */
type AccessProblem = { status: 401 | 403; message: string }

const GROUP_ORDER: RowGroup[] = ["competition", "tournaments", "rankings", "academics", "profile"]

const ROW_GROUP_LABEL: Record<RowGroup, string> = {
  competition: "Competition",
  tournaments: "Tournaments",
  rankings: "Rankings",
  academics: "Academics",
  profile: "Profile",
}

const GOLD = "text-[#D3B574]"

/* ------------------------------------------------------------------ the pitch */

const CAPABILITIES = [
  {
    icon: Swords,
    title: "Head to head, settled",
    body: "Every time they have met, who won and how. The edge goes to the most recent meeting in the last 12 months — the same rule that seeds the Tournament of Champions.",
  },
  {
    icon: Users,
    title: "Common opponents",
    body: "Never wrestled each other? We line up everyone they have both faced and show the results that separate them. It's a comparison you can't get from two résumés.",
  },
  {
    icon: TrendingUp,
    title: "Strength of opponents",
    body: "Wins over nationally ranked, state-ranked and Tournament of Champions wrestlers, counted and named, so a 40-win season against nobody reads as what it is.",
  },
  {
    icon: Globe,
    title: "National footprint",
    body: "NHSCA, Super 32, Fargo, Journeymen, the national duals and more, plus best finish and record at each. You'll see at a glance who travels and who stays home.",
  },
  {
    icon: GraduationCap,
    title: "Academics",
    body: "GPA, test scores and intended major, side by side, for verified college coaches.",
  },
  {
    icon: SlidersHorizontal,
    title: "Your program, your priorities",
    body: "Switch rows on and off and the tally follows. Every edge says why it went that way. There is no black-box score.",
  },
]

const STEPS = [
  { title: "Pick two wrestlers", body: "Search any North Carolina high schooler by name or school." },
  { title: "Choose what matters", body: "Strength of opponents and academics are on by default. Add the national events you care about." },
  { title: "Read the edges", body: "Each row shows who has the edge and why. Share the link with your staff." },
]

/** An illustration of the result, with no real names in it. */
function ExampleCard() {
  const rows: Array<{ label: string; a: string; b: string; edge: "a" | "b" | null }> = [
    { label: "Head to head", a: "Won last meeting", b: "", edge: "a" },
    { label: "Strength of opponents", a: "6 ranked wins", b: "11 ranked wins", edge: "b" },
    { label: "NC state placement", a: "Champion", b: "3rd", edge: "a" },
    { label: "NHSCA Nationals", a: "5th", b: "Did not place", edge: "a" },
    { label: "GPA", a: "3.6", b: "3.9", edge: "b" },
  ]
  return (
    <div className="relative rounded-2xl border border-white/10 bg-[#0f1c2e]/90 p-5 shadow-2xl shadow-black/40 backdrop-blur">
      <span className="absolute -top-3 right-4 rounded-full bg-[#D3B574] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#0A1628]">
        Example
      </span>
      <div className="flex items-center justify-between text-sm font-black text-white">
        <span>Wrestler A</span>
        <span className="text-xs font-semibold text-white/40">vs</span>
        <span>Wrestler B</span>
      </div>
      <div className="mt-1 flex items-end justify-between">
        <span className={`text-3xl font-black ${GOLD}`}>3</span>
        <span className="pb-1 text-[10px] font-bold uppercase tracking-widest text-white/40">edges</span>
        <span className="text-3xl font-black text-white">2</span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {rows.map((r) => (
          <li key={r.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-xs">
            <span className={`truncate ${r.edge === "a" ? `font-bold ${GOLD}` : "text-white/60"}`}>{r.a}</span>
            <span className="text-center text-[10px] font-bold uppercase tracking-wide text-white/50">{r.label}</span>
            <span className={`truncate text-right ${r.edge === "b" ? `font-bold ${GOLD}` : "text-white/60"}`}>{r.b}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Pitch({
  athleteCount,
  boutsOnFile,
  signedIn,
  onStart,
  returnTo,
}: {
  athleteCount: number
  boutsOnFile: number | null
  signedIn: boolean
  onStart: () => void
  /** This exact comparison, so signing in lands back on it rather than an empty page. */
  returnTo: string
}) {
  const stats = [
    { value: athleteCount.toLocaleString(), label: "NC wrestlers ready to compare" },
    ...(boutsOnFile ? [{ value: boutsOnFile.toLocaleString(), label: "bouts on file" }] : []),
    { value: "12 months", label: "head-to-head window, latest meeting decides" },
  ]
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          <Image src="/hero-banner-nchsaa-2026-arena.png" alt="" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A1628]/95 via-[#0A1628]/88 to-[#0A1628]/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] via-transparent to-transparent" />
        </div>
        <div className="container relative mx-auto grid gap-10 px-4 py-12 md:py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className={`mb-4 inline-flex items-center gap-2 rounded-full border border-[#D3B574]/30 bg-[#D3B574]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest ${GOLD}`}>
              <Scale className="h-3.5 w-3.5" /> Recruiting intelligence
            </p>
            <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">
              Two wrestlers.
              <br />
              <span className={GOLD}>Every match that matters.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">
              Who&apos;s better for your program? Put any two North Carolina wrestlers side by side: head to head,
              common opponents, strength of schedule, national results and academics, with every edge explained.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {signedIn ? (
                <button
                  type="button"
                  onClick={onStart}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#D3B574] px-6 py-3 font-bold text-[#0A1628] transition hover:bg-[#c4a665]"
                >
                  Start comparing <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <>
                  <Link
                    href={`/auth/signin?returnTo=${encodeURIComponent(returnTo)}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#D3B574] px-6 py-3 font-bold text-[#0A1628] transition hover:bg-[#c4a665]"
                  >
                    Sign in to compare <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/auth/signup?type=college-coach&returnTo=${encodeURIComponent(returnTo)}`}
                    className="inline-flex items-center rounded-lg border border-white/20 px-6 py-3 font-bold text-white transition hover:border-[#D3B574] hover:text-[#D3B574]"
                  >
                    College coach? Get free access
                  </Link>
                </>
              )}
            </div>
          </div>
          <ExampleCard />
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#0f1c2e]">
        <div className={`container mx-auto grid gap-6 px-4 py-6 text-center ${stats.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {stats.map((s) => (
            <div key={s.label}>
              <p className={`text-3xl font-black ${GOLD}`}>{s.value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/50">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-14">
        <h2 className="text-center text-2xl font-black text-white md:text-3xl">What two résumés can&apos;t tell you</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-white/60">
          Built from bout-level results across state, national and duals events. We hold the matches, not just the medals.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-white/10 bg-[#0f1c2e] p-6 transition hover:border-[#D3B574]/40">
              <div className="mb-4 inline-flex rounded-lg bg-[#D3B574]/10 p-2.5">
                <Icon className={`h-5 w-5 ${GOLD}`} />
              </div>
              <h3 className="font-bold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/60">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#D3B574]/40 text-sm font-black text-[#D3B574]">
                {i + 1}
              </span>
              <div>
                <p className="font-bold text-white">{step.title}</p>
                <p className="mt-0.5 text-sm text-white/60">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

/* ------------------------------------------------------------------ the tool */

function Picker({
  label,
  athletes,
  value,
  exclude,
  onChange,
}: {
  label: string
  athletes: Athlete[]
  value: string
  exclude: string
  onChange: (id: string) => void
}) {
  const [query, setQuery] = useState("")
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return athletes
      .filter((a) => a.id !== exclude && `${a.name} ${a.highschool ?? ""}`.toLowerCase().includes(q))
      .slice(0, 8)
  }, [athletes, query, exclude])
  const chosen = athletes.find((a) => a.id === value)

  return (
    <div className="min-w-0 flex-1">
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-white/40">{label}</label>
      {chosen ? (
        <div className="flex h-14 items-center justify-between gap-2 rounded-lg border border-[#D3B574]/40 bg-[#13294B] px-4">
          <div className="min-w-0">
            <p className="truncate font-bold text-white">{chosen.name}</p>
            <p className="truncate text-xs text-white/50">
              {[chosen.highschool, chosen.graduationyear ? `Class of ${chosen.graduationyear}` : null, chosen.weightclass ? `${chosen.weightclass} lbs` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <button type="button" className="shrink-0 text-xs font-bold text-white/50 hover:text-[#D3B574]" onClick={() => { onChange(""); setQuery("") }}>
            Change
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a wrestler or school"
            className="h-14 w-full rounded-lg border border-white/10 bg-[#0A1628] pl-10 pr-3 text-sm text-white placeholder:text-white/30 focus:border-[#D3B574]/60 focus:outline-none"
          />
          {matches.length > 0 ? (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-white/10 bg-[#13294B] shadow-2xl shadow-black/50">
              {matches.map((athlete) => (
                <li key={athlete.id}>
                  <button
                    type="button"
                    className="block w-full px-4 py-2.5 text-left text-sm hover:bg-white/5"
                    onClick={() => { onChange(athlete.id); setQuery("") }}
                  >
                    <span className="font-semibold text-white">{athlete.name}</span>
                    <span className="ml-2 text-xs text-white/50">
                      {[athlete.highschool, athlete.graduationyear, athlete.weightclass ? `${athlete.weightclass}` : null].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  )
}

function Avatar({ side }: { side: SideHeader }) {
  const initials = side.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("")
  return side.photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={side.photoUrl} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-[#D3B574]/50" />
  ) : (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#13294B] text-xl font-black text-white ring-2 ring-[#D3B574]/50">
      {initials}
    </div>
  )
}

function meetingLine(m: ComparisonBout, left: string, right: string): string {
  const winner = m.won ? left : right
  return `${winner} won${m.method ? ` by ${m.method}` : ""}${m.score ? ` ${m.score}` : ""}`
}

const PANEL = "rounded-xl border border-white/10 bg-[#0f1c2e]"
const PANEL_TITLE = "text-[11px] font-black uppercase tracking-widest text-white/40"

function HeadToHeadCard({ data }: { data: ComparisonResponse }) {
  const h = data.headToHead
  const { left, right } = data
  return (
    <section className={`${PANEL} border-[#D3B574]/30 p-5 sm:p-6`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={`${PANEL_TITLE} flex items-center gap-2`}>
          <Swords className={`h-3.5 w-3.5 ${GOLD}`} /> Head to head
        </h2>
        {h ? (
          <p className="text-3xl font-black tabular-nums text-white">
            {h.leftWins}<span className="mx-1.5 text-white/20">–</span>{h.rightWins}
          </p>
        ) : null}
      </div>
      {h ? (
        <>
          <p className="mt-2 text-base font-semibold text-white">{h.summary}</p>
          <ul className="mt-4 space-y-1.5">
            {h.meetings.map((m, i) => (
              <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-lg bg-white/[0.04] px-3 py-2 text-sm">
                <span>
                  <span className={`font-bold ${m.won ? GOLD : "text-sky-300"}`}>{meetingLine(m, left.name, right.name)}</span>
                  {m.event ? <span className="text-white/60"> — {m.event}</span> : null}
                </span>
                <span className="text-xs text-white/40">{m.date ?? "date not recorded"}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-white/40">
            The edge goes to whoever won the most recent meeting in the last 12 months, the same rule TOC seeding uses.
          </p>
        </>
      ) : (
        <p className="mt-2 text-base text-white/70">
          No meetings in our data. This covers NC state, NHSCA, Super 32, Fargo, Journeymen, the duals, the TOC and
          imported season results. A dual or local tournament we have not imported would not show here.
        </p>
      )}
    </section>
  )
}

function EdgeMark({ edge, side }: { edge: RowEdge; side: "left" | "right" }) {
  if (edge !== side) return null
  return (
    <span className="mx-1.5 inline-flex h-5 items-center rounded-full bg-[#D3B574] px-1.5 align-middle text-[10px] font-black uppercase tracking-wide text-[#0A1628]">
      Edge
    </span>
  )
}

/** A row's mark against the perfect recruit, per side, when a need covers that row. */
type RowMarks = { left: FitStatus; right: FitStatus }

/** Which comparison rows each perfect-recruit need speaks to. */
const NEED_ROWS: Record<FitCheck["key"], string[]> = {
  weight: ["weight"],
  class: ["class"],
  gpa: ["gpa"],
  tests: ["sat", "act"],
  major: ["interest"],
  national: ["footprint"],
  state: ["state"],
  ranked: ["state-rank", "national-rank"],
}

function Mark({ status }: { status: FitStatus | undefined }) {
  if (!status) return null
  return (
    <span className="mx-1 inline-flex align-middle" title="Against your perfect recruit">
      <StatusIcon status={status} className="h-3.5 w-3.5" />
    </span>
  )
}

function Row({ row, open, onToggle, marks }: { row: ComparisonRow; open: boolean; onToggle: () => void; marks?: RowMarks }) {
  const expandable = Boolean(row.left.lines?.length || row.right.lines?.length)
  const cellClass = (side: "left" | "right") =>
    `min-w-0 px-3 py-3.5 text-sm ${row.edge === side ? "bg-[#D3B574]/10 font-bold text-white" : "text-white/70"}`
  return (
    <>
      <tr
        className={`border-t border-white/5 ${expandable ? "cursor-pointer hover:bg-white/[0.03]" : ""}`}
        onClick={expandable ? onToggle : undefined}
      >
        <td className={`${cellClass("left")} text-right`}>
          <Mark status={marks?.left} />
          {row.left.value}
          <EdgeMark edge={row.edge} side="left" />
        </td>
        <td className="w-[34%] px-2 py-3.5 text-center align-middle">
          <p className="text-[11px] font-black uppercase tracking-wide text-white">
            {row.edge === "left" ? <span className={GOLD}>◀ </span> : null}
            {row.label}
            {row.edge === "right" ? <span className={GOLD}> ▶</span> : null}
          </p>
          {row.basis ? <p className="mt-0.5 text-[11px] leading-snug text-white/40">{row.basis}</p> : null}
          {expandable ? <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[#D3B574]/70">{open ? "Hide detail" : "Show detail"}</p> : null}
        </td>
        <td className={cellClass("right")}>
          <EdgeMark edge={row.edge} side="right" />
          {row.right.value}
          <Mark status={marks?.right} />
        </td>
      </tr>
      {open && expandable ? (
        <tr className="bg-black/20">
          <td className="px-3 pb-3 pt-1 text-right align-top text-xs text-white/60">
            <ul className="space-y-1">{(row.left.lines ?? []).map((l, i) => <li key={i}>{l}</li>)}</ul>
            {!row.left.lines?.length ? <span className="text-white/30">Nothing more on file</span> : null}
          </td>
          <td />
          <td className="px-3 pb-3 pt-1 align-top text-xs text-white/60">
            <ul className="space-y-1">{(row.right.lines ?? []).map((l, i) => <li key={i}>{l}</li>)}</ul>
            {!row.right.lines?.length ? <span className="text-white/30">Nothing more on file</span> : null}
          </td>
        </tr>
      ) : null}
    </>
  )
}

function CommonOpponents({ data }: { data: ComparisonResponse }) {
  const [open, setOpen] = useState(false)
  const list = data.commonOpponents
  const e = data.commonOpponentEdge
  const decisive = list.filter((o) => o.decisive)
  const shown = open ? list : decisive.slice(0, 5)
  const resultClass = (r: string) => (r === "W" ? "text-emerald-400" : r === "L" ? "text-red-400" : "text-white/50")
  return (
    <section className={`${PANEL} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={`${PANEL_TITLE} flex items-center gap-2`}>
          <Users className={`h-3.5 w-3.5 ${GOLD}`} /> Common opponents ({list.length})
        </h2>
        {list.length ? (
          <p className="text-sm text-white/70">
            Separating results: <span className="font-bold text-white">{data.left.name} {e.left}</span> ·{" "}
            <span className="font-bold text-white">{data.right.name} {e.right}</span>
          </p>
        ) : null}
      </div>
      {list.length === 0 ? (
        <p className="mt-2 text-sm text-white/60">No opponent in common in our data.</p>
      ) : (
        <>
          {shown.length ? (
            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wide text-white/40">
                <tr>
                  <th className="py-1 pr-2">Opponent</th>
                  <th className="px-2 py-1 text-center">{data.left.name.split(" ").slice(-1)[0]}</th>
                  <th className="px-2 py-1 text-center">{data.right.name.split(" ").slice(-1)[0]}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((o) => (
                  <tr key={o.key} className={`border-t border-white/5 ${o.decisive ? "bg-[#D3B574]/[0.07]" : ""}`}>
                    <td className="py-2 pr-2 font-medium text-white">{o.opponent}</td>
                    <td className={`px-2 py-2 text-center font-black ${resultClass(o.leftResult)}`}>{o.leftResult}</td>
                    <td className={`px-2 py-2 text-center font-black ${resultClass(o.rightResult)}`}>{o.rightResult}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-2 text-sm text-white/60">They handled every shared opponent the same way.</p>
          )}
          {list.length > shown.length || open ? (
            <button type="button" onClick={() => setOpen((v) => !v)} className="mt-3 text-xs font-bold text-[#D3B574] hover:text-[#c4a665]">
              {open ? "Show only the separating results" : `Show all ${list.length}`}
            </button>
          ) : null}
          <p className="mt-1 text-xs text-white/40">Highlighted: one of them beat this opponent and the other lost.</p>
        </>
      )}
    </section>
  )
}

function AccessPanel({ problem, returnTo }: { problem: AccessProblem; returnTo: string }) {
  const signedOut = problem.status === 401
  return (
    <div className={`${PANEL} mt-8 border-[#D3B574]/30 p-6 text-center sm:p-8`}>
      <div className="mx-auto mb-4 inline-flex rounded-full bg-[#D3B574]/10 p-3">
        <Lock className={`h-6 w-6 ${GOLD}`} />
      </div>
      <h3 className="text-xl font-black text-white">{signedOut ? "Sign in to see the comparison" : "The comparison is for college coaches"}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm text-white/60">
        Free for verified college coaching staff. Sign up with your school email and you&apos;re in.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {signedOut ? (
          <Link href={`/auth/signin?returnTo=${encodeURIComponent(returnTo)}`} className="rounded-lg bg-[#D3B574] px-5 py-2.5 text-sm font-bold text-[#0A1628] hover:bg-[#c4a665]">
            Sign in
          </Link>
        ) : null}
        <Link href={`/auth/signup?type=college-coach&returnTo=${encodeURIComponent(returnTo)}`} className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-bold text-white hover:border-[#D3B574] hover:text-[#D3B574]">
          College coach sign-up
        </Link>
      </div>
    </div>
  )
}

export default function CompareClient({
  athletes,
  initialLeft = "",
  initialRight = "",
  initialRows = "",
  boutsOnFile = null,
  initialSource = "",
}: {
  athletes: Athlete[]
  /** Arriving from a wrestler's profile pre-selects them, so the coach only picks the other. */
  initialLeft?: string
  initialRight?: string
  /** Row keys switched on, from a shared link. Empty means the defaults. */
  initialRows?: string
  /** Counted on the server for the pitch; null hides the figure rather than guessing one. */
  boutsOnFile?: number | null
  /** Which way in the coach came ("profile", "my-recruits", "profile-similar"), for the usage log. */
  initialSource?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const toolRef = useRef<HTMLElement>(null)
  const [leftId, setLeftId] = useState(initialLeft)
  // The entry point counts once; a pick made on this page is the page's own.
  const [source, setSource] = useState(initialSource || "compare")
  const [rightId, setRightId] = useState(initialRight)
  const [data, setData] = useState<ComparisonResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [access, setAccess] = useState<AccessProblem | null>(null)
  const [loading, setLoading] = useState(false)
  const [slow, setSlow] = useState(false)
  const [enabled, setEnabled] = useState<Set<string> | null>(
    initialRows ? new Set(initialRows.split(",").filter(Boolean)) : null,
  )
  const [openRows, setOpenRows] = useState<Set<string>>(new Set())

  const scrollToTool = useCallback(() => {
    toolRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  // A shared link or a profile's "Compare" button skips the pitch and lands on the tool.
  useEffect(() => {
    if (initialLeft || initialRight) toolRef.current?.scrollIntoView({ block: "start" })
  }, [initialLeft, initialRight])

  // The link always describes what is on screen, so a coach can send it to a colleague.
  const syncUrl = useCallback(
    (l: string, r: string, rows: Set<string> | null) => {
      const params = new URLSearchParams()
      if (l) params.set("left", l)
      if (r) params.set("right", r)
      if (rows) params.set("rows", [...rows].join(","))
      router.replace(`${pathname}${params.toString() ? `?${params}` : ""}`, { scroll: false })
    },
    [router, pathname],
  )

  useEffect(() => {
    if (!leftId || !rightId) {
      setData(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setSlow(false)
    setAccess(null)
    const slowTimer = setTimeout(() => setSlow(true), 4000)
    setError(null)
    fetch(`/api/compare?left=${encodeURIComponent(leftId)}&right=${encodeURIComponent(rightId)}&src=${encodeURIComponent(source)}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (res.status === 401 || res.status === 403) {
          if (!cancelled) { setData(null); setAccess({ status: res.status, message: body.error ?? "" }) }
          return
        }
        if (!res.ok) throw new Error(body.error ?? "Could not compare those two.")
        if (!cancelled) setData(body.comparison as ComparisonResponse)
      })
      .catch((e) => { if (!cancelled) { setData(null); setError(e instanceof Error ? e.message : "Could not compare those two.") } })
      .finally(() => { clearTimeout(slowTimer); if (!cancelled) setLoading(false) })
    return () => { cancelled = true; clearTimeout(slowTimer) }
  }, [leftId, rightId, source])

  const pickLeft = (id: string) => { setSource("picker"); setLeftId(id); syncUrl(id, rightId, enabled) }
  const pickRight = (id: string) => { setSource("picker"); setRightId(id); syncUrl(leftId, id, enabled) }
  const swap = () => {
    setLeftId(rightId)
    setRightId(leftId)
    syncUrl(rightId, leftId, enabled)
  }

  /*
   * Which rows show: the coach's own choice on this page, else the categories the program saved in
   * its perfect recruit (plus the profile facts and weight, which never carry an edge), else the
   * tool's defaults.
   */
  const savedPriorities = data?.programFit?.saved?.criteria.priorities ?? []
  const isOn = useCallback(
    (row: ComparisonRow) => {
      if (enabled) return enabled.has(row.key)
      if (savedPriorities.length) return savedPriorities.includes(row.key) || row.group === "profile" || row.key === "weight" || row.key === "activity"
      return row.defaultOn
    },
    [enabled, savedPriorities],
  )
  const toggle = (row: ComparisonRow) => {
    if (!data) return
    const next = new Set(data.rows.filter(isOn).map((r) => r.key))
    if (next.has(row.key)) next.delete(row.key)
    else next.add(row.key)
    setEnabled(next)
    syncUrl(leftId, rightId, next)
  }
  const resetRows = () => { setEnabled(null); syncUrl(leftId, rightId, null) }
  const allRows = () => {
    if (!data) return
    const next = new Set(data.rows.map((r) => r.key))
    setEnabled(next)
    syncUrl(leftId, rightId, next)
  }
  const copyLink = () => {
    void navigator.clipboard?.writeText(window.location.href).catch(() => undefined)
  }

  const visible = data ? data.rows.filter(isOn) : []
  // Where sign-in and sign-up come back to: this comparison, with its wrestlers, rows and source.
  const returnTo = (() => {
    const params = new URLSearchParams()
    if (leftId) params.set("left", leftId)
    if (rightId) params.set("right", rightId)
    if (enabled) params.set("rows", [...enabled].join(","))
    if (initialSource) params.set("src", initialSource)
    return `/compare${params.toString() ? `?${params}` : ""}`
  })()
  const classYearOptions = useMemo(
    () => [...new Set(athletes.map((a) => a.graduationyear).filter((y): y is number => y != null))].sort((a, b) => a - b),
    [athletes],
  )

  /** Categories each wrestler holds, counting only rows switched on, plus the mat evidence. */
  const tally = useMemo(() => {
    if (!data) return null
    const out = { left: [] as string[], right: [] as string[] }
    if (data.headToHead?.edge) out[data.headToHead.edge].push("Head to head")
    const ce = data.commonOpponentEdge
    if (ce.left !== ce.right) out[ce.left > ce.right ? "left" : "right"].push("Common opponents")
    for (const row of visible) if (row.edge) out[row.edge].push(row.label)
    return out
  }, [data, visible])

  // The comparison read against the program's perfect recruit, when it has one.
  const [wizardOpen, setWizardOpen] = useState(false)
  // The category switches stay out of the way until a coach wants them.
  const [prioritiesOpen, setPrioritiesOpen] = useState(false)
  const fitCriteria = data?.programFit?.saved?.criteria ?? null
  const fitChecks = useMemo(() => {
    if (!data?.programFit || !fitCriteria) return null
    return { left: evaluateProgramFit(data.programFit.left, fitCriteria), right: evaluateProgramFit(data.programFit.right, fitCriteria) }
  }, [data, fitCriteria])
  const fitSummary = useMemo(() => {
    if (!data || !fitChecks || !tally) return null
    const edgeLeader = tally.left.length > tally.right.length ? "left" : tally.right.length > tally.left.length ? "right" : null
    return summarizeFit({ leftName: data.left.name, rightName: data.right.name, left: fitChecks.left, right: fitChecks.right, edgeLeader })
  }, [data, fitChecks, tally])
  /** The bottom line, decided in lib/comparison-recommendation.ts from what is on screen. */
  const recommendation = useMemo(() => {
    if (!data || !tally) return null
    return recommend({
      leftName: data.left.name,
      rightName: data.right.name,
      edges: tally,
      headToHead: data.headToHead
        ? { edge: data.headToHead.edge, lastEvent: data.headToHead.lastMeeting?.event ?? null, lastDate: data.headToHead.lastMeeting?.date ?? null }
        : null,
      fit: fitChecks,
      bestWins: data.sections ? { edge: data.sections.bestWins.edge, summary: data.sections.bestWins.summary } : null,
      national: data.sections ? { leftPlacings: data.sections.national.left.placings, rightPlacings: data.sections.national.right.placings } : null,
    })
  }, [data, tally, fitChecks])

  const rowMarks = useMemo(() => {
    const out = new Map<string, RowMarks>()
    if (!fitChecks) return out
    fitChecks.left.forEach((lc, i) => {
      const rc = fitChecks.right[i]
      if (!rc) return
      for (const key of NEED_ROWS[lc.key]) out.set(key, { left: lc.status, right: rc.status })
    })
    return out
  }, [fitChecks])

  return (
    <main className="min-h-screen bg-[#0A1628] text-white">
      <Pitch athleteCount={athletes.length} boutsOnFile={boutsOnFile} signedIn={Boolean(user)} onStart={scrollToTool} returnTo={returnTo} />

      <section ref={toolRef} id="compare" className="container mx-auto scroll-mt-20 px-4 pb-20">
        <div className={`${PANEL} p-5 sm:p-6`}>
          <h2 className="text-xl font-black text-white">Compare wrestlers</h2>
          <p className="mt-1 text-sm text-white/50">North Carolina wrestlers for now. Other states open as we check their results.</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <Picker label="Wrestler" athletes={athletes} value={leftId} exclude={rightId} onChange={pickLeft} />
            <button
              type="button"
              onClick={swap}
              disabled={!leftId && !rightId}
              title="Swap sides"
              aria-label="Swap sides"
              className="flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full border border-white/10 bg-[#13294B] text-white/70 sm:h-14 sm:w-14 sm:self-end sm:rounded-lg transition hover:border-[#D3B574]/60 hover:text-[#D3B574] disabled:opacity-30"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </button>
            <Picker label="Compared with" athletes={athletes} value={rightId} exclude={leftId} onChange={pickRight} />
          </div>
          {/* One wrestler picked: the likeliest second one is a tap away. */}
          {leftId && !rightId && user ? (
            <SimilarComparisons
              athleteId={leftId}
              source="compare-similar"
              label="Suggested: same class and weight"
              tone="navy"
              className="mt-4"
            />
          ) : null}
        </div>

        {loading ? (
          <div className={`${PANEL} mt-6 flex items-start gap-3 p-5`}>
            <Loader2 className={`mt-0.5 h-5 w-5 shrink-0 animate-spin ${GOLD}`} />
            <div>
              <p className="text-sm font-bold text-white">Comparing…</p>
              {slow ? (
                <p className="mt-1 text-xs text-white/50">
                  Checking every opponent against state placers and national rankings. The first comparison in a while can take up to a minute; the next ones are quick.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
        {access && !loading ? <AccessPanel problem={access} returnTo={returnTo} /> : null}
        {error && !loading ? (
          <p className="mt-6 rounded-lg border border-[#BC0B03]/40 bg-[#BC0B03]/10 p-4 text-sm text-red-200">{error}</p>
        ) : null}

        {data && !loading ? (
          <div className="mt-6 space-y-6">
            {data.programFit && !data.programFit.saved ? <PerfectRecruitInvite onStart={() => setWizardOpen(true)} /> : null}

            {/* The bottom line first; every sentence in it traces to a section below. */}
            {recommendation ? (
              <section className="rounded-xl border-2 border-[#D3B574]/60 bg-gradient-to-br from-[#13294B] to-[#0f1c2e] p-5 sm:p-6">
                <h2 className={`${PANEL_TITLE} flex items-center gap-2`}>
                  <Lightbulb className={`h-3.5 w-3.5 ${GOLD}`} /> Our read
                </h2>
                <p className={`mt-2 text-2xl font-black ${recommendation.pick ? GOLD : "text-white"}`}>{recommendation.headline}</p>
                <ul className="mt-2 space-y-1">
                  {recommendation.reasons.map((r) => (
                    <li key={r} className="flex gap-2 text-sm text-white/85">
                      <span className={GOLD}>•</span> {r}
                    </li>
                  ))}
                </ul>
                {recommendation.counterpoint ? <p className="mt-2 text-sm text-white/55">{recommendation.counterpoint}</p> : null}
                <p className="mt-3 text-[11px] text-white/35">
                  Built from the results we hold and the categories you count. A starting point for your evaluation, not a
                  substitute for it.
                </p>
              </section>
            ) : null}

            {/* Read against the program's perfect recruit first: who fits, and any must-have missed. */}
            {fitSummary && fitSummary.lines.length ? (
              <section className="rounded-xl border border-[#D3B574]/40 bg-[#D3B574]/[0.06] p-5 sm:p-6">
                <h2 className={`${PANEL_TITLE} flex items-center gap-2`}>
                  <Target className={`h-3.5 w-3.5 ${GOLD}`} /> For your program
                </h2>
                <div className="mt-2 space-y-1">
                  {fitSummary.lines.map((line) => (
                    <p key={line} className="text-base font-semibold text-white">{line}</p>
                  ))}
                </div>
                {fitSummary.cautions.length ? (
                  <div className="mt-3 space-y-1.5">
                    {fitSummary.cautions.map((c) => (
                      <p key={c} className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm font-semibold text-amber-100">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /> {c}
                      </p>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            {/* Who's who, and the edges they hold on what this coach has switched on. */}
            <section className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#13294B] to-[#0f1c2e] p-5 sm:p-6">
              <div className="grid grid-cols-2 gap-4">
                {(["left", "right"] as const).map((key) => {
                  const side = data[key]
                  const edges = tally?.[key] ?? []
                  const other = tally?.[key === "left" ? "right" : "left"] ?? []
                  const leads = edges.length > other.length
                  return (
                    <div key={key} className={`flex min-w-0 flex-col gap-4 ${key === "right" ? "items-end text-right" : ""}`}>
                      <div className={`flex min-w-0 items-center gap-3 ${key === "right" ? "flex-row-reverse" : ""}`}>
                        <Avatar side={side} />
                        <div className="min-w-0">
                          <a href={`/athletes/${side.id}`} className="block truncate text-lg font-black text-white hover:text-[#D3B574]">{side.name}</a>
                          <p className="truncate text-xs text-white/50">
                            {[side.school, side.graduationYear, side.weight ? `${side.weight} lbs` : null].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className={`text-5xl font-black tabular-nums ${leads ? GOLD : "text-white"}`}>{edges.length}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{edges.length === 1 ? "edge" : "edges"}</p>
                        <p className="mt-1.5 text-xs text-white/70">{edges.length ? edges.join(" · ") : "None on the rows shown"}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="mt-4 border-t border-white/10 pt-3 text-center text-xs text-white/50">
                An edge is a category one wrestler leads: one per row, among the rows you&apos;ve switched on, plus head
                to head and common opponents. Ties and missing data give neither an edge. It&apos;s a count, not a score.
              </p>
            </section>

            {data.programFit ? (
              <PerfectRecruitPanel
                fit={data.programFit}
                leftName={data.left.name}
                rightName={data.right.name}
                onEdit={() => setWizardOpen(true)}
              />
            ) : null}

            <HeadToHeadCard data={data} />

            {data.sections ? (
              <ComparisonSectionsView sections={data.sections} leftName={data.left.name} rightName={data.right.name} />
            ) : null}

            {/* What counts. */}
            <section className={`${PANEL} p-5 sm:p-6`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setPrioritiesOpen((v) => !v)}
                  aria-expanded={prioritiesOpen}
                  className={`${PANEL_TITLE} flex items-center gap-2 hover:text-white/70`}
                >
                  <SlidersHorizontal className={`h-3.5 w-3.5 ${GOLD}`} /> What matters to your program
                  <span className="normal-case tracking-normal text-white/50">
                    · {visible.filter((r) => r.group !== "profile").length} categories counted
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 transition ${prioritiesOpen ? "rotate-180" : ""}`} />
                </button>
                <div className="flex gap-4 text-xs font-bold">
                  <button type="button" onClick={resetRows} className="text-white/50 hover:text-[#D3B574]">{savedPriorities.length ? "Your priorities" : "Defaults"}</button>
                  <button type="button" onClick={allRows} className="text-white/50 hover:text-[#D3B574]">Everything</button>
                  <button type="button" onClick={copyLink} className="inline-flex items-center gap-1 text-white/50 hover:text-[#D3B574]">
                    <Share2 className="h-3 w-3" /> Copy link
                  </button>
                </div>
              </div>
              {prioritiesOpen ? (
              <div className="mt-4 space-y-2.5">
                {GROUP_ORDER.map((group) => {
                  const rows = data.rows.filter((r) => r.group === group)
                  if (!rows.length) return null
                  return (
                    <div key={group} className="flex flex-wrap items-center gap-1.5">
                      <span className="w-24 shrink-0 text-[10px] font-black uppercase tracking-widest text-white/30">{ROW_GROUP_LABEL[group]}</span>
                      {rows.map((row) => {
                        const on = isOn(row)
                        return (
                          <button
                            key={row.key}
                            type="button"
                            onClick={() => toggle(row)}
                            aria-pressed={on}
                            className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                              on
                                ? "border-[#D3B574] bg-[#D3B574] text-[#0A1628]"
                                : "border-white/15 bg-transparent text-white/60 hover:border-[#D3B574]/60 hover:text-white"
                            }`}
                          >
                            {row.label}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
              ) : null}
              {!data.personal ? (
                <p className="mt-4 text-xs text-white/40">GPA, test scores and star ratings show for verified college coaches only.</p>
              ) : null}
            </section>

            {/* The rows themselves. */}
            {visible.length ? (
              <section className={`${PANEL} overflow-hidden`}>
                <table className="w-full table-fixed">
                  <thead className="bg-[#13294B] text-[11px] font-black uppercase tracking-wide text-white/70">
                    <tr>
                      <th className="truncate px-3 py-3 text-right">{data.left.name}</th>
                      <th className="w-[34%] px-2 py-3" />
                      <th className="truncate px-3 py-3 text-left">{data.right.name}</th>
                    </tr>
                  </thead>
                  {GROUP_ORDER.map((group) => {
                    const rows = visible.filter((r) => r.group === group)
                    if (!rows.length) return null
                    return (
                      <tbody key={group}>
                        <tr className="border-t border-white/10 bg-black/20">
                          <td colSpan={3} className="px-3 py-1.5 text-center text-[10px] font-black uppercase tracking-[0.2em] text-[#D3B574]/80">
                            {ROW_GROUP_LABEL[group]}
                          </td>
                        </tr>
                        {rows.map((row) => (
                          <Row
                            key={row.key}
                            row={row}
                            marks={rowMarks.get(row.key)}
                            open={openRows.has(row.key)}
                            onToggle={() =>
                              setOpenRows((prev) => {
                                const next = new Set(prev)
                                if (next.has(row.key)) next.delete(row.key)
                                else next.add(row.key)
                                return next
                              })
                            }
                          />
                        ))}
                      </tbody>
                    )
                  })}
                </table>
              </section>
            ) : (
              <p className="text-sm text-white/50">Switch on a row above to compare.</p>
            )}

            <CommonOpponents data={data} />
          </div>
        ) : null}
      </section>

      {wizardOpen && data?.programFit ? (
        <PerfectRecruitWizard
          initial={data.programFit.saved?.criteria ?? EMPTY_CRITERIA}
          classYearOptions={classYearOptions}
          onClose={() => setWizardOpen(false)}
          onSaved={(saved) => {
            setWizardOpen(false)
            // The saved categories become the rows; a choice made on this page gives way to them.
            setEnabled(null)
            syncUrl(leftId, rightId, null)
            setData((prev) => (prev && prev.programFit ? { ...prev, programFit: { ...prev.programFit, saved } } : prev))
          }}
        />
      ) : null}
    </main>
  )
}
