"use client"

/**
 * The profile's rows as the iPhone app draws them, for the website.
 *
 * A port of recruitnc-mobile's athlete screen (src/app/(tabs)/athlete/[id].tsx), not a look-alike:
 * the same endpoints (/api/mobile/v1/athlete/[id] and /api/athletes/[id]/significant-wins), the
 * same grouping and order, the same sizes and colours - so a coach who has used one has used the
 * other (Matt, 10 October 2026, after the website opened its rows onto the old full-width cards).
 * When the app's screen changes, change this with it.
 */
import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { BarChart3, ChevronDown, ChevronRight, ChevronUp, Lock, TrendingDown, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ data, as the app reads it */

export type AppBout = {
  round: string | null
  opponentName: string | null
  opponentClub: string | null
  win: boolean | null
  isBye: boolean | null
  winType: string | null
  score: string | null
  accolade?: string | null
}

export type AppTournamentRow = {
  id: string
  event: string
  team: string | null
  isDuals: boolean
  year: number
  weight: string | null
  placement: string | null
  record: string | null
  bouts: AppBout[]
  sortKey?: string
}

export type AppProfile = {
  banner?: { credentials: Array<{ label: string }> }
  stateRows?: AppTournamentRow[]
  tocRows?: AppTournamentRow[]
  folkstyle?: AppTournamentRow[]
  olympic?: AppTournamentRow[]
}

export type AppWin = {
  opponent: string
  opponentSchool: string | null
  event: string | null
  date: string | null
  result: string | null
  reason: string
  credential?: string | null
  scope?: "national" | "in-state"
  nationalRankLabel?: string | null
  stateLabel?: string | null
}

const accoladeOf = (w: AppWin) => w.credential ?? w.nationalRankLabel ?? w.stateLabel ?? null

/** "Beat Devon Weber (nationally ranked) · 7 total": the row's one line. */
export function significantWinsLine(wins: AppWin[]): string | null {
  if (!wins.length) return null
  const ranked = wins.find((w) => w.reason === "national-ranked" || w.nationalRankLabel)
  const lead = ranked ? `Beat ${ranked.opponent} (nationally ranked)` : `Beat ${wins[0]!.opponent}`
  return wins.length > 1 ? `${lead} · ${wins.length} total` : lead
}

/** The wrestler's tournaments and wins, loaded once for the rows that show them. */
export function useAppProfile(athleteId: string): {
  profile: AppProfile | null
  wins: AppWin[]
  losses: AppWin[]
  /** The tournaments have arrived. */
  loaded: boolean
  /** The wins and losses have arrived. They are the slower of the two, so each row waits on its own. */
  winsLoaded: boolean
} {
  const [profile, setProfile] = useState<AppProfile | null>(null)
  const [wins, setWins] = useState<AppWin[]>([])
  const [losses, setLosses] = useState<AppWin[]>([])
  const [loaded, setLoaded] = useState(false)
  const [winsLoaded, setWinsLoaded] = useState(false)
  useEffect(() => {
    let cancelled = false
    const json = (url: string) => fetch(url, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    void json(`/api/mobile/v1/athlete/${encodeURIComponent(athleteId)}`).then((p) => {
      if (cancelled) return
      // The endpoint answers { ok, version, athlete }.
      setProfile(((p as { athlete?: AppProfile } | null)?.athlete ?? (p as AppProfile | null)) ?? null)
      setLoaded(true)
    })
    void json(`/api/athletes/${encodeURIComponent(athleteId)}/significant-wins`).then((w) => {
      if (cancelled) return
      setWins(Array.isArray(w?.wins) ? w.wins : [])
      setLosses(Array.isArray(w?.losses) ? w.losses : [])
      setWinsLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [athleteId])
  return { profile, wins, losses, loaded, winsLoaded }
}

/* ------------------------------------------------------------------ the row */

const CARD = "overflow-hidden rounded-xl border border-[#1a3a5f] bg-[#0f1c2e]"
const HEAD = "flex min-h-[60px] w-full items-center gap-3 px-3 py-2 text-left"
const TITLE = "block text-[15px] font-extrabold leading-tight text-white"
const SUB = "mt-0.5 block text-xs leading-snug text-[#A8BBD1]"

/** One row: an icon, a title, a line of real data; opens in place, goes somewhere, or is locked. */
export function AppRow({
  icon: Icon,
  title,
  subtitle,
  href,
  locked = false,
  gold = false,
  defaultOpen = false,
  className,
  children,
}: {
  icon: LucideIcon
  title: string
  subtitle: ReactNode
  /** A row that goes to a page instead of opening. */
  href?: string
  locked?: boolean
  gold?: boolean
  defaultOpen?: boolean
  className?: string
  children?: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const expandable = Boolean(children) && !locked
  const inner = (
    <>
      <Icon className="h-5 w-5 shrink-0 text-[#D3B574]" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className={TITLE}>{title}</span>
        <span className={SUB}>{subtitle}</span>
      </span>
      {expandable ? (
        open ? <ChevronUp className="h-4 w-4 shrink-0 text-[#6B829D]" aria-hidden /> : <ChevronDown className="h-4 w-4 shrink-0 text-[#6B829D]" aria-hidden />
      ) : href ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-[#6B829D]" aria-hidden />
      ) : (
        <Lock className="h-4 w-4 shrink-0 text-[#6B829D]" aria-hidden />
      )}
    </>
  )
  return (
    <div className={cn(CARD, gold && "border-[#D3B574]/50", className)}>
      {href ? (
        <Link href={href} className={cn(HEAD, "hover:bg-white/[0.03]")}>
          {inner}
        </Link>
      ) : (
        <button type="button" className={cn(HEAD, expandable && "hover:bg-white/[0.03]")} aria-expanded={expandable ? open : undefined} onClick={() => expandable && setOpen((v) => !v)}>
          {inner}
        </button>
      )}
      {expandable && open ? <div className="border-t border-[#1a3a5f] p-3">{children}</div> : null}
    </div>
  )
}

function Toggle<T extends string>({ value, options, onChange }: { value: T; options: Array<[T, string]>; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex shrink-0 overflow-hidden rounded-lg border border-[#D3B574]/60">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={cn("min-h-[36px] px-2.5 text-xs font-extrabold", value === key ? "bg-[#D3B574] text-[#0A1628]" : "text-white")}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ tournament results */

const EVENT_ORDER: Array<[RegExp, string]> = [
  [/fargo/i, "Fargo"],
  [/women'?s nationals|spokane/i, "USAW Women's Nationals"],
  [/u\.?\s?s\.? open/i, "U.S. Open"],
  [/super ?32(?!.*early)/i, "Super 32"],
  [/nhsca(?!.*duals)/i, "NHSCA Nationals"],
  [/tournament of champions|\btoc\b/i, "Tournament of Champions"],
  [/nchsaa|state championships/i, "NCHSAA State"],
  [/women'?s national duals/i, "Women's National Duals"],
  [/southeast regional|rader/i, "Southeast Regionals"],
  [/journeymen/i, "Journeymen"],
  [/early entry/i, "Super 32 Early Entry"],
]

type EventGroup = { name: string; style: "freestyle" | "folkstyle"; rows: AppTournamentRow[] }

/**
 * In-state or national, the way a coach sorts a résumé (Matt, 10 October 2026): the state
 * tournament and the Tournament of Champions are North Carolina's; everything else travels.
 */
const IN_STATE_GROUPS = new Set(["NCHSAA State", "Tournament of Champions"])
const scopeOf = (g: EventGroup): "in-state" | "national" => (IN_STATE_GROUPS.has(g.name) || /nc freestyle|tar heel state|nc usa/i.test(g.name) ? "in-state" : "national")

function groupByEvent(rows: AppTournamentRow[], style: EventGroup["style"]): EventGroup[] {
  const groups = new Map<string, AppTournamentRow[]>()
  for (const row of rows) {
    const named = EVENT_ORDER.find(([re]) => re.test(row.event))?.[1] ?? (row.isDuals ? "Duals" : row.event.replace(/^\d{4}\s+/, ""))
    groups.set(named, [...(groups.get(named) ?? []), row])
  }
  const rank = (name: string) => {
    const i = EVENT_ORDER.findIndex(([, n]) => n === name)
    return i < 0 ? (name === "Duals" ? 99 : 50) : i
  }
  return [...groups.entries()]
    .map(([name, list]) => ({ name, style, rows: [...list].sort((a, b) => b.year - a.year) }))
    .sort((a, b) => rank(a.name) - rank(b.name))
}

const rowSummary = (row: AppTournamentRow) => [row.placement, row.record, row.weight ? `${row.weight} lbs` : null].filter(Boolean).join(" · ") || null
const divisionOf = (event: string) => {
  const parts = event.split(/\s+[-·]\s+/)
  return parts.length > 1 ? parts[parts.length - 1]!.trim() : ""
}

function BoutCard({ bout }: { bout: AppBout }) {
  const accolade = bout.accolade ?? null
  const gold = accolade ? /champion/i.test(accolade) : false
  return (
    <div className="space-y-1 rounded-lg border border-[#1a3a5f] bg-[#0f1c2e] p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-[11px] font-bold tracking-wide text-[#6B829D]">{bout.round ?? ""}</span>
        {bout.isBye ? (
          <span className="text-xs text-[#6B829D]">Bye</span>
        ) : (
          <span className="flex items-center gap-1.5">
            <span className={cn("rounded px-[5px] py-px text-[11px] font-black text-white", bout.win ? "bg-[#059669]" : "bg-[#B91C1C]")}>{bout.win ? "W" : "L"}</span>
            <span className="text-xs font-semibold tabular-nums text-[#A8BBD1]">{[bout.winType, bout.score].filter(Boolean).join(" ")}</span>
          </span>
        )}
      </div>
      {!bout.isBye ? (
        <p className="text-[13px] font-bold text-white">
          {bout.opponentName ?? "Opponent"}
          {bout.opponentClub ? <span className="ml-2 text-xs font-medium text-[#6B829D]">{bout.opponentClub}</span> : null}
        </p>
      ) : null}
      {accolade ? (
        <span
          className={cn(
            "mt-0.5 inline-block rounded-lg border px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide",
            gold ? "border-[#D3B574]/40 bg-[#D3B574]/15 text-[#D3B574]" : "border-[#1a3a5f] text-[#A8BBD1]",
          )}
        >
          {accolade}
        </span>
      ) : null}
    </div>
  )
}

function TournamentRow({ row, compact = false }: { row: AppTournamentRow; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const summary = rowSummary(row)
  const bouts = row.bouts ?? []
  return (
    <div className="border-b border-[#1a3a5f] last:border-b-0">
      <button
        type="button"
        className={cn("flex w-full items-center gap-3 p-3 text-left", bouts.length > 0 && "hover:bg-white/[0.03]")}
        aria-expanded={bouts.length > 0 ? open : undefined}
        onClick={() => bouts.length > 0 && setOpen((v) => !v)}
      >
        <span className="min-w-0 flex-1">
          {compact ? (
            // Under its event's heading a year says the rest: "2026 · Junior Girls Freestyle".
            <span className="block text-[13px] font-bold text-white">{[String(row.year), row.team, divisionOf(row.event)].filter(Boolean).join(" · ")}</span>
          ) : (
            <>
              <span className="block text-[13px] font-bold text-white">
                {row.event} <span className="font-semibold text-[#6B829D]">{row.year}</span>
              </span>
              {row.team ? <span className="mt-0.5 block text-[11px] font-bold tracking-wide text-[#6B829D]">{row.team}</span> : null}
            </>
          )}
          {summary ? <span className="mt-0.5 block text-[13px] font-semibold text-[#A8BBD1]">{summary}</span> : null}
        </span>
        {bouts.length > 0 ? (open ? <ChevronUp className="h-4 w-4 shrink-0 text-[#6B829D]" aria-hidden /> : <ChevronDown className="h-4 w-4 shrink-0 text-[#6B829D]" aria-hidden />) : null}
      </button>
      {open ? (
        <div className="space-y-2 bg-[#0A1628] p-2">
          {bouts.map((bout, index) => (
            <BoutCard key={`${row.id}-${index}`} bout={bout} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Tournament Results, collapsed until opened. Open, it sorts By event - the biggest events first,
 * girls' freestyle ahead of folkstyle - or By date, three at a time until "See all". Each year
 * still opens to its bouts.
 */
export function AppTournamentResults({
  profile,
  loaded,
  isGirl,
  fallbackLine,
  footer,
  className,
}: {
  profile: AppProfile | null
  loaded: boolean
  isGirl: boolean
  /** The row's line before the data arrives, from what the page already holds. */
  fallbackLine?: string | null
  /** Under the list: the "submit a result" actions the website has and the app does not. */
  footer?: ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [sort, setSort] = useState<"event" | "date">("event")
  const [showAll, setShowAll] = useState(false)
  const folk = [...(profile?.stateRows ?? []), ...(profile?.tocRows ?? []), ...(profile?.folkstyle ?? [])]
  // Girls' Greco is off their résumé (Matt, 8 Oct 2026).
  const olympic = (profile?.olympic ?? []).filter((r) => !(isGirl && /greco/i.test(`${r.event} ${r.team ?? ""}`)))
  const ordered = isGirl ? [...groupByEvent(olympic, "freestyle"), ...groupByEvent(folk, "folkstyle")] : [...groupByEvent(folk, "folkstyle"), ...groupByEvent(olympic, "freestyle")]
  // In-state first, then national; within each, the biggest events lead as before.
  const groups = [...ordered.filter((g) => scopeOf(g) === "in-state"), ...ordered.filter((g) => scopeOf(g) === "national")]
  const byDate = [...folk, ...olympic].sort((a, b) => String(b.sortKey ?? b.year).localeCompare(String(a.sortKey ?? a.year)))
  const total = byDate.length
  const subtitle =
    profile?.banner?.credentials.slice(0, 2).map((c) => c.label).join(" · ") ||
    (loaded ? (total ? `${total} ${total === 1 ? "event" : "events"} on file` : "None on file yet") : (fallbackLine ?? "Loading results…"))

  return (
    <div className={cn(CARD, "border-[#D3B574]/50", className)}>
      <div className="flex min-h-[60px] items-center gap-3 px-3 py-2">
        <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <Trophy className="h-5 w-5 shrink-0 text-[#D3B574]" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className={TITLE}>Tournament Results</span>
            <span className={SUB}>{subtitle}</span>
          </span>
          {open ? null : <ChevronDown className="h-4 w-4 shrink-0 text-[#6B829D]" aria-hidden />}
        </button>
        {open ? (
          <Toggle
            value={sort}
            options={[
              ["event", "Event"],
              ["date", "Date"],
            ]}
            onChange={setSort}
          />
        ) : null}
      </div>
      {open ? (
        <div className="border-t border-[#1a3a5f]">
          {!loaded ? (
            <p className="p-3 text-xs text-[#A8BBD1]">Loading results…</p>
          ) : total === 0 ? (
            <p className="p-3 text-xs text-[#A8BBD1]">No tournament results on file yet.</p>
          ) : sort === "event" ? (
            <>
              {(showAll ? groups : groups.slice(0, 8)).map((g, i, list) => (
                <div key={`${g.style}-${g.name}`}>
                  {i === 0 || scopeOf(list[i - 1]!) !== scopeOf(g) ? (
                    <p className="border-b border-[#1a3a5f] bg-[#0A1628]/60 px-3 py-2 text-[10px] font-extrabold tracking-[0.24em] text-[#D3B574]">
                      {scopeOf(g) === "in-state" ? "IN-STATE" : "NATIONAL"}
                    </p>
                  ) : null}
                  {isGirl && (i === 0 || list[i - 1]!.style !== g.style || scopeOf(list[i - 1]!) !== scopeOf(g)) ? (
                    <p className={cn("px-3 pt-3 text-[10px] font-extrabold tracking-[0.24em]", g.style === "freestyle" ? "text-[#A7F3D0]" : "text-[#93C5FD]")}>
                      {g.style === "freestyle" ? "FREESTYLE" : "FOLKSTYLE"}
                    </p>
                  ) : null}
                  <p className="px-3 pb-0.5 pt-3 text-[13px] font-black text-white">{g.name}</p>
                  {g.rows.map((row) => (
                    <TournamentRow key={row.id} row={row} compact />
                  ))}
                </div>
              ))}
              {groups.length > 8 ? <SeeAll open={showAll} label={`See all ${groups.length} tournaments`} onClick={() => setShowAll((v) => !v)} /> : null}
            </>
          ) : (
            <>
              {(showAll ? byDate : byDate.slice(0, 3)).map((row) => (
                <TournamentRow key={row.id} row={row} />
              ))}
              {total > 3 ? <SeeAll open={showAll} label={`See all ${total} events`} onClick={() => setShowAll((v) => !v)} /> : null}
            </>
          )}
          {footer ? <div className="flex flex-wrap items-center gap-2 border-t border-[#1a3a5f] p-3">{footer}</div> : null}
        </div>
      ) : null}
    </div>
  )
}

function SeeAll({ open, label, onClick }: { open: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="m-3 flex min-h-[44px] w-[calc(100%-1.5rem)] items-center justify-between rounded-lg border border-[#D3B574]/50 px-3 text-[13px] font-extrabold text-[#D3B574]">
      {open ? "Show fewer" : label}
      {open ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
    </button>
  )
}

/* ------------------------------------------------------------------ wins and losses */

/**
 * Significant wins or notable losses, In-state | National. National means an opponent from
 * another state; it opens on National when there is one, the stronger list.
 */
function BoutList({ bouts }: { bouts: AppWin[] }) {
  const national = bouts.filter((b) => b.scope === "national")
  const inState = bouts.filter((b) => b.scope !== "national")
  const [tab, setTab] = useState<"in-state" | "national">(national.length ? "national" : "in-state")
  const [showAll, setShowAll] = useState(false)
  const list = tab === "national" ? national : inState
  const shown = showAll ? list : list.slice(0, 6)
  return (
    <div className="space-y-2">
      <Toggle
        value={tab}
        options={[
          ["in-state", `In-state (${inState.length})`],
          ["national", `National (${national.length})`],
        ]}
        onChange={(k) => {
          setTab(k)
          setShowAll(false)
        }}
      />
      {shown.length ? (
        shown.map((w, i) => (
          <div key={`${w.opponent}-${w.date}-${i}`} className="space-y-0.5">
            <p className="text-sm font-extrabold text-white">
              {w.opponent}
              {w.opponentSchool ? <span className="ml-2 text-xs font-medium text-[#6B829D]">{w.opponentSchool}</span> : null}
            </p>
            {accoladeOf(w) ? <p className="text-xs font-bold text-[#D3B574]">{accoladeOf(w)}</p> : null}
            <p className="text-xs text-[#A8BBD1]">{[w.result, w.event].filter(Boolean).join(" · ")}</p>
          </div>
        ))
      ) : (
        <p className="text-xs text-[#A8BBD1]">{tab === "national" ? "None against out-of-state opponents on file." : "None against NC opponents on file."}</p>
      )}
      {list.length > 6 && !showAll ? (
        <button type="button" onClick={() => setShowAll(true)} className="text-[13px] font-extrabold text-[#D3B574]">
          See all {list.length}
        </button>
      ) : null}
    </div>
  )
}

export function AppSignificantWins({ wins, loaded, footer, className }: { wins: AppWin[]; loaded: boolean; footer?: ReactNode; className?: string }) {
  return (
    <AppRow
      icon={BarChart3}
      title="Significant Wins"
      subtitle={loaded ? (significantWinsLine(wins) ?? "None on file yet") : "Loading wins…"}
      className={className}
    >
      {wins.length || footer ? (
        <div className="space-y-3">
          {wins.length ? <BoutList bouts={wins} /> : <p className="text-xs text-[#A8BBD1]">No wins over ranked, All-American or state-placing opponents on file yet.</p>}
          {footer ? <div className="flex flex-wrap items-center gap-2 border-t border-[#1a3a5f] pt-3">{footer}</div> : null}
        </div>
      ) : null}
    </AppRow>
  )
}

export function AppNotableLosses({ losses, loaded, className }: { losses: AppWin[]; loaded: boolean; className?: string }) {
  return (
    <AppRow
      icon={TrendingDown}
      title="Notable Losses"
      subtitle={
        !loaded
          ? "Loading losses…"
          : losses.length
            ? `${losses.length} to ranked, All-American or state-placing opponents`
            : "None to ranked or state-placing opponents on file"
      }
      className={className}
    >
      {losses.length ? <BoutList bouts={losses} /> : null}
    </AppRow>
  )
}
