"use client"

/**
 * Super 32 Command Center, laid out as a sports front page (Matt's mock, 23 Oct 2026):
 * header, statewide scoreboard, Top Stories + Latest Headlines, Round Recap + Biggest Wins,
 * My Wrestlers (starred) + All NC Wrestlers, app band. One long page on a phone, two columns on desktop.
 *
 * Every number comes from the published 2026 snapshot; before results it reads 0 or "Not started",
 * and 2025 appears only labelled as 2025. Stories are templates filled from results (stories.ts).
 */
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import type { PublicSnapshot } from "@/app/api/super32-live/route"
import type { FeedItem, SnapshotEntrant, SnapshotRecap } from "@/lib/super32-live/snapshot"
import { buildStories, type Story } from "@/lib/super32-live/stories"
import { roundOrder, roundProgress } from "@/lib/super32-live/rounds"

const APP_STORE_URL = "https://apps.apple.com/app/id6803202791"
/** Official brackets live on Flo; linked, never copied, so they are always current. */
const FLO_BRACKETS_URL = "https://www.flowrestling.org/nextgen/events/15966539/brackets"
const FLO_LIVE_URL = "https://www.flowrestling.org/live/251027"
const ARTICLE = {
  href: "/news/super32-2026-what-good-looks-like",
  title: "What Will It Take? Defining Success for North Carolina at Super 32",
  image: "/images/news/super32-2026-preview/what-will-it-take-banner.jpg",
}
type G = "all" | "boys" | "girls"

/** A designed banner per division replaces the header when that tab is on. Add "all"/"boys" when they exist. */
const BANNERS: Partial<Record<G, { src: string; alt: string }>> = {
  all: { src: "/images/super32/super32-hq-2026-mason.jpg", alt: "North Carolina Super 32 HQ, October 24-25, 2026" },
  boys: { src: "/images/super32/hq-2026-boys-mason.jpg", alt: "North Carolina Super 32 HQ 2026: Boys" },
  girls: { src: "/images/super32/hq-2026-girls.jpg", alt: "North Carolina Super 32 HQ 2026: Girls" },
}

/** 2025 finals from the 2025 Flo export, same engine and NC rule as 2026 (Bouzakis out). */
const Y2025: Record<G, { record: string; winning: number; aa: number; pct: number }> = {
  all: { record: "103-264", winning: 11, aa: 4, pct: 103 / 367 },
  boys: { record: "76-182", winning: 7, aa: 1, pct: 76 / 258 },
  girls: { record: "27-82", winning: 4, aa: 3, pct: 27 / 109 },
}

/** Win rate against last year's final: green up, red down, by percentage points. */
function VsLastYear({ wins, losses, g }: { wins: number; losses: number; g: G }) {
  const last = Math.round(Y2025[g].pct * 100)
  if (!wins && !losses) return <span className="text-white">—</span>
  const now = Math.round((100 * wins) / (wins + losses))
  const d = now - last
  return (
    <span className="whitespace-nowrap">
      <span className="text-white">{now}%</span>{" "}
      <span className={d > 0 ? "text-emerald-400" : d < 0 ? "text-[#ff5a4f]" : "text-[#9fb0cf]"}>{d > 0 ? `▲${d}` : d < 0 ? `▼${-d}` : "="}</span>
    </span>
  )
}

const ord = (n: number) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`)
const statusText = (e: SnapshotEntrant) =>
  e.status === "placed" && e.placement ? `${ord(e.placement)} Place` : e.status === "not_started" ? "Not started" : e.status === "alive" ? "Alive" : e.status === "alive_consis" ? "Alive · consis" : "Eliminated"
const statusColor = (e: SnapshotEntrant) =>
  e.status === "placed" ? "text-[#d4af55]" : e.status === "eliminated" ? "text-[#6f83ab]" : e.status === "not_started" ? "text-[#9fb0cf]" : "text-emerald-400"
const initials = (n: string) => n.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()
const H = "font-[family-name:var(--font-cc)] uppercase tracking-wide"

function Photo({ e, className, big }: { e: { name: string; photo: string | null } | null; className: string; big?: boolean }) {
  if (e?.photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={e.photo} alt="" className={`object-cover object-[50%_18%] ${className}`} />
  }
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br from-[#1b2d57] to-[#13294b] ${className}`}>
      <span className={`${H} text-[#d4af55]/80 ${big ? "text-7xl" : "text-sm"}`}>{e ? initials(e.name) : "NC"}</span>
    </div>
  )
}

const TAG: Record<string, string> = {
  "Huge win": "bg-[#e5372c] text-white", "Big win": "bg-[#d4af55] text-[#0b1730]", Significant: "bg-emerald-500 text-[#0b1730]", Upset: "bg-[#7c5cff] text-white",
  "All-American": "bg-[#d4af55] text-[#0b1730]", Champion: "bg-[#d4af55] text-[#0b1730]", "Latest update": "bg-[#3b5ba5] text-white", "Championship bracket": "bg-[#3b5ba5] text-white",
  "Hot streak": "bg-[#e5372c]/80 text-white", "Consolation run": "bg-[#3b5ba5] text-white", Seeded: "bg-[#1b2d57] text-[#d4af55]",
  Preview: "bg-[#3b5ba5] text-white",
}
function Tag({ kind }: { kind: string }) {
  return <span className={`inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TAG[kind] ?? (/seeded wins$/.test(kind) ? "bg-[#e5372c] text-white" : "bg-[#1b2d57] text-white")}`}>{kind}</span>
}

function Section({ id, title, right, children }: { id?: string; title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="min-w-0 scroll-mt-28 rounded-xl border border-[#1f3360] bg-[#0f1f3f]">
      <div className="flex items-center justify-between gap-3 border-b border-[#1f3360] px-4 py-3">
        <h2 className={`${H} flex items-center gap-2 text-xl text-white`}><span className="h-5 w-1 rounded bg-[#d4af55]" />{title}</h2>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-[#2c4170] px-4 py-6 text-center text-sm text-[#8195bd]">{children}</div>
}

function LeadStory({ stories, onOpen }: { stories: Story[]; onOpen: (e: SnapshotEntrant) => void }) {
  const [i, setI] = useState(0)
  const n = Math.min(stories.length, 5)
  const s = stories[Math.min(i, n - 1)]
  if (!s) return <Empty>Top stories post after the opening round.</Empty>
  return (
    <div className="overflow-hidden rounded-lg bg-[#0b1730]">
      <div className="grid md:min-h-[320px] md:grid-cols-[1.1fr_1fr]">
        <div className={`relative h-56 md:order-2 md:h-auto ${s.entrant?.photo ? "" : "hidden md:block"}`}>
          <Photo e={s.entrant} big className="absolute inset-0 h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1730] via-transparent to-transparent md:bg-gradient-to-r md:from-[#0b1730] md:via-transparent" />
        </div>
        <div className="flex flex-col justify-end gap-3 p-5 md:order-1 md:p-6">
          <div><Tag kind={s.label} /></div>
          <h3 className={`${H} text-4xl leading-[0.95] text-white md:text-5xl`}>{s.headline}</h3>
          <p className="max-w-md text-sm text-[#c9d4ea] md:text-base">{s.dek}</p>
          <div className="text-xs text-[#8195bd]">{s.meta}</div>
          {s.entrant && (
            <button onClick={() => onOpen(s.entrant!)} className="mt-1 w-fit rounded-md border border-[#d4af55]/60 px-4 py-2 text-sm font-semibold text-white hover:bg-[#d4af55]/10">
              View full story →
            </button>
          )}
        </div>
      </div>
      {n > 1 && (
        <div className="flex items-center justify-between border-t border-[#1f3360] px-4 py-2">
          <div className="flex gap-1.5">{stories.slice(0, n).map((x, k) => <button key={x.id} aria-label={`Story ${k + 1}`} onClick={() => setI(k)} className={`h-2 w-2 rounded-full ${k === i ? "bg-white" : "bg-white/30"}`} />)}</div>
          <div className="flex gap-2">
            <button aria-label="Previous story" onClick={() => setI((i + n - 1) % n)} className="h-8 w-8 rounded-full bg-white/10 text-white">‹</button>
            <button aria-label="Next story" onClick={() => setI((i + 1) % n)} className="h-8 w-8 rounded-full bg-white/10 text-white">›</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Headline({ s, onOpen }: { s: Story; onOpen: (e: SnapshotEntrant) => void }) {
  return (
    <button onClick={() => s.entrant && onOpen(s.entrant)} className="flex w-full items-center gap-3 py-2.5 text-left">
      <Photo e={s.entrant} className="h-16 w-20 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1">
        <Tag kind={s.label} />
        <div className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-white">{s.headline}</div>
        <div className="truncate text-xs text-[#8195bd]">{s.meta}</div>
      </div>
      <span className="text-[#6f83ab]">›</span>
    </button>
  )
}

/**
 * The last hour, added up from every update in it. Results now arrive every few minutes, so a
 * single update (or a round name) says nothing; an hour of them does.
 */
function LastHour({ recaps, feed }: { recaps: SnapshotRecap[]; feed: FeedItem[] }) {
  const latest = recaps[0]
  if (!latest) return null
  const since = new Date(new Date(latest.at).getTime() - 60 * 60_000).toISOString()
  const inHour = recaps.filter((r) => r.at > since)
  const sum = (k: "wins" | "losses" | "seededWins" | "huge" | "big") => inHour.reduce((n, r) => n + r[k], 0)
  const wins = sum("wins"), losses = sum("losses")
  const sig = feed.filter((f) => f.tier === "significant" && f.seenAt > since).length
  const pct = wins + losses ? Math.round((100 * wins) / (wins + losses)) : 0
  const out = inHour.flatMap((r) => r.notableEliminations)
  const top = inHour.map((r) => r.topPerformance).find(Boolean)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-[1.5fr_repeat(5,1fr)]">
        {([["Record", `${wins}-${losses}`], ["Win rate", `${pct}%`], ["Huge wins", sum("huge")], ["Big wins", sum("big")], ["Significant", sig], ["Still alive", latest.stillAlive]] as const).map(([k, v]) => (
          <div key={k} className="rounded-lg border border-[#1f3360] bg-[#0b1730] px-2 py-3 text-center">
            <div className={`${H} whitespace-nowrap text-2xl md:text-3xl ${k === "Huge wins" ? "text-[#e5372c]" : k === "Big wins" ? "text-[#d4af55]" : k === "Significant" ? "text-emerald-400" : "text-white"}`}>{v}</div>
            <div className="text-[11px] text-[#9fb0cf]">{k}</div>
          </div>
        ))}
      </div>
      <p className="text-sm leading-relaxed text-[#c9d4ea]">North Carolina went {wins}-{losses} in the last hour, with {sum("seededWins")} seeded {sum("seededWins") === 1 ? "win" : "wins"} and {sig} significant {sig === 1 ? "win" : "wins"}. {latest.stillAlive} NC {latest.stillAlive === 1 ? "wrestler remains" : "wrestlers remain"} alive.</p>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        {top && <div><dt className="text-[11px] font-semibold uppercase tracking-wider text-[#d4af55]">Top performance</dt><dd className="text-[#c9d4ea]">{top.name} ({top.weight}) {top.line}</dd></div>}
        {out.length > 0 && <div><dt className="text-[11px] font-semibold uppercase tracking-wider text-[#d4af55]">Seeded wrestlers eliminated</dt><dd className="text-[#c9d4ea]">{out.map((e) => `${e.name}${e.seed ? ` (#${e.seed})` : ""}`).join(", ")}</dd></div>}
      </dl>
    </div>
  )
}

/**
 * Every NC bout, newest first, each with the wrestler's record and standing right after it, so
 * "who just lost" and "who is still rolling" read at a glance.
 */
type ResultRow = { e: SnapshotEntrant; b: SnapshotEntrant["bouts"][number]; w: number; l: number; standing: string; out: boolean; at: string; order: number }
function resultRows(entrants: SnapshotEntrant[]): ResultRow[] {
  const rows: ResultRow[] = []
  for (const e of entrants) {
    const bouts = e.bouts.filter((b) => !/^bye$/i.test(b.winType) && b.opponent).slice().sort((a, b) => roundOrder(a.round) - roundOrder(b.round))
    let w = 0, l = 0
    bouts.forEach((b, i) => {
      if (b.win) w += 1; else l += 1
      const last = i === bouts.length - 1
      const standing = last && e.placement ? `placed ${e.placement === 1 ? "1st" : e.placement === 2 ? "2nd" : e.placement === 3 ? "3rd" : `${e.placement}th`}`
        : l >= 2 ? `out at ${w}-${l}` : l === 1 ? `now ${w}-${l} · alive in consolations` : `now ${w}-0 · unbeaten`
      rows.push({ e, b, w, l, standing, out: l >= 2 && !(last && e.placement), at: b.seenAt ?? "", order: roundOrder(b.round) })
    })
  }
  return rows.sort((a, b) => b.at.localeCompare(a.at) || b.order - a.order || Number(a.e.weight) - Number(b.e.weight))
}

function LatestResults({ entrants, onOpen }: { entrants: SnapshotEntrant[]; onOpen: (e: SnapshotEntrant) => void }) {
  const [f, setF] = useState<"all" | "wins" | "losses" | "out">("all")
  const [all, setAll] = useState(false)
  const rows = useMemo(() => resultRows(entrants), [entrants])
  const shown = rows.filter((r) => f === "all" || (f === "wins" ? r.b.win : f === "losses" ? !r.b.win : r.out))
  const chip = (k: typeof f, label: string) => (
    <button onClick={() => { setF(k); setAll(false) }} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${f === k ? "bg-[#d4af55] text-[#0b1730]" : "border border-[#2c4170] text-[#c9d4ea]"}`}>{label}</button>
  )
  return (
    <Section id="s32-results" title="Latest Results" right={all ? <button onClick={() => collapseTo("s32-results", () => setAll(false))} className="text-xs font-semibold text-[#d4af55]">Show less</button> : <span className="text-xs text-[#8195bd]">{rows.length} NC bouts</span>}>
      <div className="mb-2 flex flex-wrap gap-1.5">{chip("all", "All")}{chip("wins", "Wins")}{chip("losses", "Losses")}{chip("out", "Eliminated")}</div>
      {shown.length === 0 ? <Empty>No results here yet.</Empty> : (
        <div className="divide-y divide-[#1f3360]">
          {shown.slice(0, all ? undefined : 5).map((r) => (
            <button key={`${r.b.key}|${r.e.name}`} onClick={() => onOpen(r.e)} className="flex w-full items-start gap-3 py-2 text-left">
              <span className={`${H} mt-0.5 w-5 shrink-0 text-center text-base ${r.b.win ? "text-emerald-400" : "text-[#e5372c]"}`}>{r.b.win ? "W" : "L"}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 text-sm">
                  <span className="font-semibold text-white">{r.e.name}</span>
                  <span className="text-xs text-[#8195bd]">{r.e.gender === "girls" ? "G" : ""}{r.e.weight}</span>
                  {r.b.win && r.b.tier && r.b.tier !== "win" && <Tag kind={r.b.tier === "huge" ? "Huge win" : r.b.tier === "big" ? "Big win" : "Significant"} />}
                </div>
                <div className="truncate text-xs text-[#c9d4ea]">{r.b.win ? "def." : "lost to"} {r.b.opponentSeed ? `#${r.b.opponentSeed} ` : ""}{r.b.opponent} ({r.b.opponentTeam}){r.b.reasons.find((x) => !/seed$/.test(x)) ? ` · ${r.b.reasons.find((x) => !/seed$/.test(x))}` : ""}</div>
                <div className={`text-[11px] ${r.out ? "text-[#e5372c]" : r.l === 0 ? "text-emerald-400" : "text-[#9fb0cf]"}`}>{r.standing}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xs font-semibold text-white">{[r.b.winType, r.b.result].filter(Boolean).join(" ")}</div>
                <div className="text-[11px] text-[#8195bd]">{r.b.round}</div>
              </div>
            </button>
          ))}
          {shown.length > 5 && <button onClick={() => (all ? collapseTo("s32-results", () => setAll(false)) : setAll(true))} className="w-full pt-2.5 text-center text-xs font-semibold text-[#d4af55]">{all ? "Show less" : `Show all ${shown.length} results`}</button>}
        </div>
      )}
    </Section>
  )
}

/** Claim the profile free, then Insider ($9.99) for grade reports, the state rank and which colleges looked. */
function ProfileAd() {
  return (
    <section className="overflow-hidden rounded-xl border border-[#d4af55]/50 bg-gradient-to-r from-[#13294b] to-[#0f1f3f]">
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#d4af55]">Every result today lands on their profile</div>
          <div className={`${H} mt-1 text-2xl leading-tight text-white md:text-3xl`}>Claim your wrestler&apos;s profile. It&apos;s free.</div>
          <div className="mt-1 text-sm text-[#c9d4ea]">Then sign up for <span className="font-semibold text-white">Insider</span> and get full access to tournament grade reports, rankings and <span className="font-semibold text-white">college profile views</span>. $9.99 a month.</div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Link href="/athletes" className="rounded-lg bg-white px-4 py-2.5 text-center text-sm font-semibold text-[#0b1730]">Find &amp; claim a profile</Link>
          <Link href="/rankings" className="rounded-lg bg-[#d4af55] px-4 py-2.5 text-center text-sm font-semibold text-[#0b1730]">Sign up for Insider →</Link>
        </div>
      </div>
    </section>
  )
}

/**
 * The scrolling results bar, as last year's dashboard had it: every NC result, latest rounds
 * first, with the Huge/Big tag. Results arrive after each round, so the label says so.
 */
function ResultsTicker({ entrants }: { entrants: SnapshotEntrant[] }) {
  const items = entrants
    .flatMap((e) => e.bouts.filter((b) => b.opponent && !/^bye$/i.test(b.winType)).map((b) => ({ e, b })))
    .sort((x, y) => roundProgress(y.b.round) - roundProgress(x.b.round))
    .slice(0, 60)
  if (!items.length) return null
  const loop = [...items, ...items]
  const seconds = Math.max(55, items.length * 8)
  return (
    <div className="relative overflow-hidden border-b-2 border-[#D3B574] bg-[#0D1A4D]">
      <div className={`${H} absolute inset-y-0 left-0 z-10 flex items-center bg-[#B31B1B] px-3 text-xs text-white md:px-5 md:text-sm`}>Results</div>
      <div className="s32-ticker ml-[76px] flex overflow-hidden py-2 md:ml-[104px] md:py-2.5">
        <div className="s32-ticker-track flex" style={{ animationDuration: `${seconds}s` }}>
          {loop.map(({ e, b }, i) => (
            <div key={`${b.key}-${i}`} className="inline-flex items-center gap-2 whitespace-nowrap px-4 text-xs md:px-6 md:text-sm">
              <span className="font-bold text-white">{e.name}</span>
              <span className="text-[#8195bd]">{e.gender === "girls" ? "G" : ""}{e.weight}</span>
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold text-white ${b.win ? "bg-emerald-600" : "bg-red-600"}`}>{b.win ? "W" : "L"}</span>
              <span className="text-white/90">{[b.winType, b.result].filter(Boolean).join(" ")}</span>
              <span className="text-white/70">{b.win ? "over" : "to"} {b.opponent} ({b.opponentTeam})</span>
              {b.win && b.tier === "huge" && <span className="rounded-sm bg-[#e5372c] px-1 text-[10px] font-bold text-white">HUGE</span>}
              {b.win && b.tier === "big" && <span className="rounded-sm bg-[#d4af55] px-1 text-[10px] font-bold text-[#0b1730]">BIG</span>}
              <span className="text-[#6f83ab]">· {b.round}</span>
            </div>
          ))}
        </div>
      </div>
      <style jsx>{`
        .s32-ticker-track { animation-name: s32-scroll; animation-timing-function: linear; animation-iteration-count: infinite; }
        .s32-ticker:hover .s32-ticker-track, .s32-ticker:active .s32-ticker-track { animation-play-state: paused; }
        @keyframes s32-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: reduce) { .s32-ticker-track { animation: none; } }
      `}</style>
    </div>
  )
}

function WinRow({ f, onOpen }: { f: FeedItem; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="flex w-full items-center gap-3 py-2.5 text-left">
      <Photo e={f} className="h-11 w-11 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5"><Tag kind={f.tier === "huge" ? "Huge win" : f.tier === "big" ? "Big win" : "Significant"} />{f.upset && <Tag kind="Upset" />}<span className="font-semibold text-white">{f.name}</span></div>
        <div className="truncate text-xs text-[#8195bd]">{f.gender === "girls" ? "Girls " : ""}{f.weight} lbs{f.school ? ` · ${f.school}` : ""}</div>
        <div className="truncate text-xs text-[#c9d4ea]">def. {f.opponent} ({f.opponentTeam}), {f.reasons[0]}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className={`${H} text-base text-emerald-400`}>{[f.winType, f.result].filter(Boolean).join(" ")}</div>
        <div className="text-[11px] text-[#8195bd]">{f.round}</div>
      </div>
    </button>
  )
}

/** The wrestler's best win: Huge before Big, then the stronger seed; else the win over the opponent with the best résumé. */
function BestWin({ e }: { e: SnapshotEntrant }) {
  const strength = (r: string[]) => Number(r[0]?.match(/#(\d+)/)?.[1] ?? 99)
  const tierRank = (t: string | null) => (t === "huge" ? 0 : t === "big" ? 1 : t === "significant" ? 2 : 3)
  const best = e.bouts
    .filter((b) => b.win && b.reasons.length)
    .sort((a, b) => tierRank(a.tier) - tierRank(b.tier) || strength(a.reasons) - strength(b.reasons))[0]
  if (!best) return null
  const tag = best.tier === "huge" ? "HUGE" : best.tier === "big" ? "BIG" : best.tier === "significant" ? "SIGNIFICANT" : "BEST WIN"
  return (
    <div className="mt-0.5 truncate text-[11px]">
      <span className={`font-bold ${best.tier === "huge" ? "text-[#e5372c]" : best.tier === "big" ? "text-[#d4af55]" : "text-emerald-400"}`}>{tag}:</span>{" "}
      <span className="text-[#c9d4ea]">def. {best.opponent} ({best.opponentTeam}), {best.reasons[0]}</span>
    </div>
  )
}

/**
 * Stars on Super 32 HQ are their own weekend list (Matt, 24 Oct): nothing to do with following
 * athletes in the app. Saved on this device, every NC wrestler can be starred, linked or not.
 */
const LOCAL_STARS = "s32-hq-stars-2026"
/** Collapses a list and brings its section back into view, so nobody scrolls back up by hand. */
function collapseTo(id: string, collapse: () => void) {
  collapse()
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }))
}

/** Counts this page open once, checks in every 45 seconds; returns total views of Super 32 HQ. */
function useWatching(enabled: boolean) {
  const [n, setN] = useState<number | null>(null)
  useEffect(() => {
    if (!enabled) return
    let sid = ""
    try { sid = sessionStorage.getItem("s32-sid") ?? "" } catch { /* private mode */ }
    if (!sid) {
      sid = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^a-z0-9-]/gi, "")
      try { sessionStorage.setItem("s32-sid", sid) } catch { /* private mode */ }
    }
    let alive = true
    let open = true
    const ping = () => {
      if (document.visibilityState === "hidden") return
      fetch("/api/super32-live/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sid, open }) })
        .then((r) => r.json()).then((j) => alive && typeof j.views === "number" && setN(j.views)).catch(() => {})
      open = false
    }
    ping()
    const id = setInterval(ping, 45_000)
    document.addEventListener("visibilitychange", ping)
    return () => { alive = false; clearInterval(id); document.removeEventListener("visibilitychange", ping) }
  }, [enabled])
  return n
}

/** "6 min ago", refreshed every 30 seconds. */
function useAgo(iso: string | null | undefined) {
  const [, tick] = useState(0)
  useEffect(() => { const id = setInterval(() => tick((x) => x + 1), 30_000); return () => clearInterval(id) }, [])
  if (!iso) return null
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)}h ${m % 60}m ago`
}

function useStars() {
  const [ids, setIds] = useState<Set<string>>(new Set())
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const sync = (body: { add?: string[]; remove?: string[] }) => {
    fetch("/api/super32-live/stars", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {})
  }
  useEffect(() => {
    let local: string[] = []
    try { local = JSON.parse(localStorage.getItem(LOCAL_STARS) ?? "[]") } catch { /* private mode */ }
    setIds(new Set(local))
    // Signed in: the account's list, with this device's stars merged in, so desktop and app match.
    fetch("/api/super32-live/stars", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401) { setSignedIn(false); return }
        const j = (await r.json()) as { keys?: string[] }
        const server = new Set(j.keys ?? [])
        const missing = local.filter((k) => !server.has(k))
        if (missing.length) sync({ add: missing })
        const all = new Set([...server, ...local])
        setSignedIn(true)
        setIds(all)
        try { localStorage.setItem(LOCAL_STARS, JSON.stringify([...all])) } catch { /* private mode */ }
      })
      .catch(() => setSignedIn(false))
  }, [])
  const toggle = (key: string) => {
    setIds((cur) => {
      const next = new Set(cur)
      const on = !next.has(key)
      if (on) next.add(key); else next.delete(key)
      try { localStorage.setItem(LOCAL_STARS, JSON.stringify([...next])) } catch { /* private mode */ }
      if (signedIn) sync(on ? { add: [key] } : { remove: [key] })
      return next
    })
  }
  /** Adds keys without toggling (for carrying over older stars). */
  const addMany = (keys: string[]) => {
    if (!keys.length) return
    setIds((cur) => {
      const next = new Set([...cur, ...keys])
      try { localStorage.setItem(LOCAL_STARS, JSON.stringify([...next])) } catch { /* private mode */ }
      if (signedIn) sync({ add: keys })
      return next
    })
  }
  return { ids, toggle, addMany, signedIn }
}

/** A star's key: the wrestler's bracket line (division, weight, name), the same on every upload. */
function starKey(e: { gender: string; weight: string; name: string }): string {
  return `${e.gender}|${e.weight}|${e.name.toLowerCase()}`
}

function Star({ on, onToggle, className = "" }: { on: boolean; onToggle: () => void; className?: string }) {
  return (
    <span role="button" tabIndex={0} aria-label={on ? "Remove from My Wrestlers" : "Add to My Wrestlers"} aria-pressed={on}
      onClick={(x) => { x.stopPropagation(); onToggle() }}
      onKeyDown={(x) => { if (x.key === "Enter" || x.key === " ") { x.preventDefault(); x.stopPropagation(); onToggle() } }}
      className={`inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-lg leading-none ${on ? "bg-[#d4af55] text-[#0b1730]" : "bg-black/40 text-white/80 hover:text-[#d4af55]"} ${className}`}>
      {on ? "★" : "☆"}
    </span>
  )
}

function WatchCard({ e, onOpen, starred, onStar }: { e: SnapshotEntrant; onOpen: () => void; starred?: boolean; onStar?: () => void }) {
  const badge = e.chips.find((c) => !/seed$/.test(c)) ?? e.chips[0]
  return (
    <button onClick={onOpen} className="w-40 shrink-0 overflow-hidden rounded-lg border border-[#1f3360] bg-[#0b1730] text-left hover:border-[#d4af55]/60 md:w-auto">
      <div className="relative">
        <Photo e={e} big className="aspect-[4/5] w-full" />
        {e.seed !== null && <span className={`${H} absolute left-2 top-2 rounded bg-[#d4af55] px-1.5 text-sm text-[#0b1730]`}>#{e.seed}</span>}
        {onStar && <Star on={!!starred} onToggle={onStar} className="absolute right-2 top-2" />}
      </div>
      <div className="space-y-1.5 p-2.5">
        <div className="truncate font-semibold text-white">{e.name}</div>
        <div className="truncate text-xs text-[#8195bd]">{[e.weight ? `${e.gender === "girls" ? "Girls " : ""}${e.weight} lbs` : e.gender === "girls" ? "Girls" : e.classYear ? `Class of ${e.classYear}` : "", e.school].filter(Boolean).join(" · ")}</div>
        {badge && <div><span className="inline-block rounded-sm bg-[#e5372c]/90 px-1.5 py-0.5 text-[10px] font-bold leading-tight text-white">{badge}</span></div>}
        <div className="text-xs"><span className="text-white">{e.wins}-{e.losses}</span> · <span className={statusColor(e)}>{statusText(e)}</span>{e.hotStreak && " 🔥"}</div>
      </div>
    </button>
  )
}

function WrestlerSheet({ e, onClose, starred, onStar }: { e: SnapshotEntrant; onClose: () => void; starred?: boolean; onStar?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[#1f3360] bg-[#0d1d3d] p-5 sm:rounded-2xl" onClick={(x) => x.stopPropagation()}>
        <div className="flex items-center gap-3">
          <Photo e={e} className="h-14 w-14 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <div className={`${H} text-2xl text-white`}>{e.name}</div>
            <div className="text-sm text-[#8195bd]">{e.gender === "girls" ? "Girls " : ""}{e.weight} lbs{e.school ? ` · ${e.school}` : ""}{e.classYear ? ` · ${e.classYear}` : ""}{e.seed !== null ? ` · #${e.seed} seed` : ""}</div>
          </div>
          {onStar && <Star on={!!starred} onToggle={onStar} />}
          <button onClick={onClose} className="text-sm text-[#9fb0cf]">Close</button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-[#0f1f3f] py-2"><div className={`${H} text-3xl text-white`}>{e.wins}-{e.losses}</div><div className="text-[11px] text-[#9fb0cf]">Record</div></div>
          <div className="rounded-lg bg-[#0f1f3f] py-2"><div className={`${H} text-3xl text-white`}>{e.bouts.filter((b) => b.win && b.opponentSeed != null).length}-{e.bouts.filter((b) => !b.win && b.opponentSeed != null).length}</div><div className="text-[11px] text-[#9fb0cf]">Vs seeded</div></div>
          <div className="rounded-lg bg-[#0f1f3f] py-2"><div className={`text-base font-bold leading-9 ${statusColor(e)}`}>{statusText(e)}</div><div className="text-[11px] text-[#9fb0cf]">Status</div></div>
        </div>
        {e.chips.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{e.chips.map((c) => <span key={c} className="rounded bg-[#1b2d57] px-2 py-1 text-xs text-[#c9d4ea]">{c}</span>)}</div>}
        <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-[#9fb0cf]">Matches</h3>
        {e.bouts.filter((b) => b.opponent).length === 0 ? <Empty>No matches yet.</Empty> : (
          <ul className="mt-2 divide-y divide-[#1f3360]">
            {e.bouts.filter((b) => b.opponent).map((b) => (
              <li key={b.key} className="flex items-start gap-3 py-2">
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold ${b.win ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>{b.win ? "W" : "L"}</span>
                <div className="min-w-0 flex-1 text-sm">
                  <div className="flex flex-wrap items-center gap-1.5 text-white">{b.win ? "def." : "lost to"} {b.opponent} ({b.opponentTeam}) {b.win && b.tier && b.tier !== "win" && <Tag kind={b.tier === "huge" ? "Huge win" : b.tier === "big" ? "Big win" : "Significant"} />}{b.win && b.upset && <Tag kind="Upset" />}</div>
                  <div className="text-xs text-[#8195bd]">{[b.round, b.winType, b.result].filter(Boolean).join(" · ")}{b.reasons.length ? ` · ${b.reasons.slice(0, 3).join(", ")}` : ""}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {e.athleteId && <Link href={`/athletes/${e.athleteId}`} className="block rounded-lg bg-[#d4af55] py-2.5 text-center font-semibold text-[#0b1730]">Full profile</Link>}
          {e.athleteId && <p className="text-center text-xs text-[#9fb0cf]">Is this your wrestler? <Link href={`/athletes/${e.athleteId}`} className="font-semibold text-white underline">Claim the profile free</Link>, then <Link href="/rankings" className="font-semibold text-[#d4af55] underline">Rankings</Link> shows their state rank and which colleges viewed it.</p>}
          <a href={FLO_BRACKETS_URL} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-[#d4af55]/60 py-2.5 text-center font-semibold text-[#d4af55]">{e.weight ? `${e.gender === "girls" ? "Girls " : ""}${e.weight} bracket on Flo ↗` : "Brackets on Flo ↗"}</a>
        </div>
      </div>
    </div>
  )
}

export function CommandCenter({ initial, rehearsalLabel }: { initial?: PublicSnapshot; rehearsalLabel?: string } = {}) {
  const [snap, setSnap] = useState<PublicSnapshot | null | undefined>(initial)
  const [g, setG] = useState<G>("all")
  const [open, setOpen] = useState<SnapshotEntrant | null>(null)
  const [q, setQ] = useState("")
  const [weight, setWeight] = useState("")
  const [status, setStatus] = useState("")
  const [allWins, setAllWins] = useState(false)
  const [winTab, setWinTab] = useState<"top" | "significant">("top")
  const [allList, setAllList] = useState(false)
  // 2026 is the live event; 2025 is last year's, kept for comparison.
  const [year, setYear] = useState<"2025" | "2026">("2026")
  const stars = useStars()
  const watching = useWatching(!initial && year === "2026")

  useEffect(() => {
    try {
      const q = new URLSearchParams(location.search)
      const p = q.get("g"); if (p === "m") setG("boys"); if (p === "w") setG("girls")
      if (q.get("y") === "2025") setYear("2025")
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (initial) return
    let alive = true
    setSnap(undefined)
    const load = () => fetch(`/api/super32-live?year=${year}`, { cache: "no-store" }).then((r) => r.json()).then((j) => alive && setSnap(j.snapshot ?? null)).catch(() => alive && setSnap((s) => s ?? null))
    void load()
    // Last year's view never changes; only the live year polls.
    const id = year === "2026" ? setInterval(load, 60_000) : undefined
    return () => { alive = false; if (id) clearInterval(id) }
  }, [initial, year])

  const pickYear = (next: "2025" | "2026") => {
    setYear(next)
    try { const u = new URL(location.href); if (next === "2026") u.searchParams.delete("y"); else u.searchParams.set("y", next); history.replaceState(null, "", u) } catch { /* ignore */ }
  }

  const pickG = (next: G) => {
    setG(next)
    try { const u = new URL(location.href); if (next === "all") u.searchParams.delete("g"); else u.searchParams.set("g", next === "boys" ? "m" : "w"); history.replaceState(null, "", u) } catch { /* ignore */ }
  }

  const entrants = useMemo(() => (snap?.entrants ?? []).filter((e) => g === "all" || e.gender === g), [snap, g])
  const recaps = useMemo(() => (snap?.recaps ?? []).filter((r) => r.gender === g), [snap, g])
  const stories = useMemo(() => buildStories(entrants, recaps, !!snap?.hasResults), [entrants, recaps, snap])
  const feed = useMemo(() => (snap?.feed ?? []).filter((f) => g === "all" || f.gender === g).sort((a, b) => ({ huge: 0, big: 1, significant: 2 } as Record<string, number>)[a.tier]! - ({ huge: 0, big: 1, significant: 2 } as Record<string, number>)[b.tier]!), [snap, g])
  // My Wrestlers replaces our Wrestlers to Watch (Matt, 23 Oct): the families pick, by starring.
  const mine = useMemo(() => entrants.filter((e) => stars.ids.has(starKey(e))), [entrants, stars.ids])
  // One-time carry-over of stars saved under the earlier key (profile ids, or "x:" bracket keys).
  useEffect(() => {
    if (!snap?.entrants?.length) return
    let old: string[] = []
    try { old = JSON.parse(localStorage.getItem("s32-stars") ?? "[]") } catch { return }
    if (!old.length) return
    const keys = snap.entrants.filter((e) => (e.athleteId && old.includes(e.athleteId)) || old.includes(`x:${starKey(e)}`)).map(starKey)
    stars.addMany(keys)
    try { localStorage.removeItem("s32-stars") } catch { /* private mode */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap])
  const weights = useMemo(() => [...new Set(entrants.map((e) => e.weight))].sort((a, b) => Number(a) - Number(b)), [entrants])
  const list = useMemo(() => {
    // Placed, then everyone still alive by record (best first, unbeaten or not), then not yet wrestled, then out.
    const order: Record<string, number> = { placed: 0, alive: 1, alive_consis: 1, not_started: 2, eliminated: 3 }
    return entrants
      .filter((e) => (!q || `${e.name} ${e.school ?? ""}`.toLowerCase().includes(q.toLowerCase())) && (!weight || e.weight === weight) &&
        (!status || (status === "seeded" ? e.seed !== null : status === "winning" ? e.wins > e.losses : status === "alive" ? e.status === "alive" || e.status === "alive_consis" || e.status === "not_started" : e.status === status)))
      .sort((a, b) => order[a.status]! - order[b.status]! || (a.placement ?? 9) - (b.placement ?? 9) || (b.wins - b.losses) - (a.wins - a.losses) || b.wins - a.wins || Number(a.weight) - Number(b.weight))
  }, [entrants, q, weight, status])

  const updatedAgo = useAgo(snap?.publishedAt)
  if (snap === undefined) return <div className="min-h-screen bg-[#0a1630]" />
  // 2025 had no seed list: records, finishes and All-Americans only, no tiers (Matt, 23 Oct).
  const past = year === "2025" && !initial
  const sb = snap?.scoreboards[g]
  const started = !!snap?.hasResults
  const pct = sb && sb.wins + sb.losses ? Math.round((100 * sb.wins) / (sb.wins + sb.losses)) : 0
  const filtered = !!(q || weight || status)

  return (
    <div className="min-h-screen bg-[#0a1630] text-white">
      {BANNERS[g] && year === "2026" ? (
        <header className="border-b border-[#1f3360] bg-[#0a1630]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BANNERS[g]!.src} alt={BANNERS[g]!.alt} className="mx-auto block aspect-[2000/733] w-full max-w-7xl object-cover" />
        </header>
      ) : (
      <header className="border-b border-[#1f3360] bg-[radial-gradient(ellipse_at_70%_0%,#1d3a78_0%,#0a1630_60%)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-4 pb-5 pt-6 md:pt-10">
          <div>
            <div className={`${H} text-lg text-[#e5372c] md:text-2xl`}>North Carolina · {year}</div>
            <h1 className={`${H} text-5xl leading-none text-white md:text-7xl`}>Super 32 HQ</h1>
            <div className={`${H} mt-2 text-sm text-[#c9d4ea] md:text-base`}>North Carolina wrestling. All of it.</div>
          </div>
          <div className="text-xs uppercase tracking-wider text-[#c9d4ea] md:text-right">
            <div className="text-sm font-semibold text-white">{year === "2025" ? "October 18, 2025" : "October 24–25, 2026"}</div>
            <div>Greensboro Coliseum · Greensboro, NC</div>
          </div>
        </div>
      </header>
      )}

      {/* Sticky: one compact row on a phone, divisions plus a small year switch. */}
      <div className="sticky top-0 z-30 border-b border-[#1f3360] bg-[#0a1630]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2 md:px-4 md:py-2.5">
          <div className="grid flex-1 grid-cols-3 gap-1.5">
            {(["all", "boys", "girls"] as const).map((k) => (
              <button key={k} onClick={() => pickG(k)} className={`whitespace-nowrap rounded-md px-1 py-2 text-[13px] font-semibold md:text-sm ${g === k ? "bg-[#d4af55] text-[#0b1730]" : "bg-[#13244a] text-[#c9d4ea]"}`}>
                {k === "all" ? "All NC" : k === "boys" ? "Men" : "Women"}{snap ? <span className="opacity-70"> {snap.scoreboards[k].wrestlers}</span> : null}
              </button>
            ))}
          </div>
          {!initial && (
            <div className="flex shrink-0 overflow-hidden rounded-md border border-[#2c4170]">
              {(["2026", "2025"] as const).map((y) => (
                <button key={y} onClick={() => pickYear(y)} className={`${H} px-2.5 py-1.5 text-sm md:px-3.5 md:text-base ${year === y ? "bg-[#d4af55] text-[#0b1730]" : "bg-[#13244a] text-[#9fb0cf]"}`}>{y}</button>
              ))}
            </div>
          )}
        </div>
        {year === "2026" && started && (
          <nav className="mx-auto flex max-w-7xl gap-1.5 overflow-x-auto whitespace-nowrap px-3 pb-2 text-xs md:px-4">
            {([["s32-results", "Latest results"], ["s32-wins", "Biggest wins"], ["s32-mine", "My wrestlers"], ["s32-all", "All NC wrestlers"]] as const).map(([id, label]) => (
              <a key={id} href={`#${id}`} onClick={(ev) => { ev.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }) }} className="shrink-0 rounded-full border border-[#2c4170] px-2.5 py-1 font-semibold text-[#c9d4ea]">{label}</a>
            ))}
          </nav>
        )}
      </div>

      {/* Info strip: one line that scrolls sideways on a phone instead of wrapping. */}
      <div className="border-b border-[#1f3360] bg-[#0a1630]">
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto whitespace-nowrap px-3 py-2 text-xs md:px-4">
          {rehearsalLabel && <span className="font-semibold text-[#d4af55]">{rehearsalLabel}</span>}
          {year === "2026" && (
            <a href={FLO_LIVE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-2.5 py-1 font-bold text-[#0b1730]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/flo-logo.png" alt="" className="h-4 w-4 rounded-sm" />
              Watch live on Flo
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#e5372c]" />
            </a>
          )}
          {year === "2026" && !initial && watching !== null && (
            <span className="inline-flex shrink-0 items-center gap-2 rounded-md border border-emerald-500/40 bg-[#0b1730] px-2.5 py-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9fb0cf]">Views</span>
              <span className={`${H} text-base leading-none text-white`}>{watching.toLocaleString()}</span>
            </span>
          )}
          <span className="shrink-0 rounded-full bg-[#13244a] px-2.5 py-1 font-medium text-[#c9d4ea]">
            {year === "2025" && !initial ? "2025 final results" : snap?.publishedAt ? <>Updated {new Date(snap.publishedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}{updatedAgo ? <span className="text-[#8195bd]"> · {updatedAgo}</span> : null}</> : "Results post as matches finish"}
          </span>
          {year === "2026" && <a href={FLO_BRACKETS_URL} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-full border border-[#d4af55]/50 px-2.5 py-1 font-semibold text-[#d4af55]">Brackets on Flo ↗</a>}
        </div>
      </div>

      {year === "2026" && started && <ResultsTicker entrants={entrants} />}

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5">
        {!snap || !sb ? (
          <Empty>Super 32 HQ opens when the brackets are set. Results post after every round.</Empty>
        ) : (
          <>
            <Section title="NC State Scoreboard">
              <div className={`grid grid-cols-3 gap-2 ${past ? "lg:grid-cols-[1.6fr_repeat(4,1fr)]" : "lg:grid-cols-[1.6fr_repeat(7,1fr)]"}`}>
                {(past ? ([
                  ["Overall record", `${sb.wins}-${sb.losses}`, `${pct}% win rate`, "text-white"],
                  ["NC wrestlers", sb.wrestlers, "", "text-white"],
                  ["All-Americans", sb.allAmericans, "", "text-[#d4af55]"],
                  ["Winning records", sb.winningRecords, "", "text-white"],
                  ["Finalists", sb.finalists, "", "text-white"],
                ] as const) : ([
                  ["Overall record", `${sb.wins}-${sb.losses}`, started ? `${pct}% win rate` : "Not started", "text-white"],
                  ["Still alive", sb.stillAlive, sb.aliveConsi ? `${sb.aliveChamp} champ · ${sb.aliveConsi} consi` : started ? "" : `${sb.wrestlers} entered`, "text-white"],
                  ["Huge wins", sb.huge, "", "text-[#e5372c]"],
                  ["Big wins", sb.big, "", "text-[#d4af55]"],
                  ["All-Americans", sb.allAmericans, year === "2026" ? `2025: ${Y2025[g].aa}` : "", "text-white"],
                  ["Winning records", sb.winningRecords, year === "2026" ? `2025: ${Y2025[g].winning}` : "", "text-white"],
                  ["Vs seeded", `${sb.seededWins}-${sb.seededLosses ?? 0}`, "wins-losses", "text-white"],
                  ["Win % vs 2025", <VsLastYear key="vs" wins={sb.wins} losses={sb.losses} g={g} />, `2025: ${Math.round(Y2025[g].pct * 100)}% (${Y2025[g].record})`, "text-white"],
                ] as const)).map(([label, v, sub, color]) => (
                  <div key={label} className={`rounded-lg border border-[#1f3360] bg-[#0b1730] px-2 py-2.5 text-center md:px-3 md:py-3 ${label === "Overall record" ? "col-span-3 lg:col-span-1" : ""} ${label === "Win % vs 2025" ? "hidden lg:block" : ""}`}>
                    <div className={`${H} whitespace-nowrap leading-none ${label === "Overall record" ? "text-4xl" : "text-2xl"} md:text-4xl ${color}`}>{v}</div>
                    <div className="mt-1 text-[11px] leading-tight text-[#c9d4ea] md:text-xs">{label}</div>
                    {sub && <div className="text-[10px] leading-tight text-[#6f83ab]">{sub}</div>}
                    {label === "Overall record" && !past && <div className="mt-1 text-xs lg:hidden"><VsLastYear wins={sb.wins} losses={sb.losses} g={g} /> <span className="text-[#6f83ab]">vs 2025 ({Math.round(Y2025[g].pct * 100)}%)</span></div>}
                  </div>
                ))}
              </div>
            </Section>

            {!past && started && <LatestResults entrants={entrants} onOpen={setOpen} />}

            {year === "2026" && <ProfileAd />}

            <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
              <Section title={past ? "2025 All-Americans" : started ? "Top Stories" : "Super 32 Preview"}>
                <LeadStory stories={past ? stories.filter((x) => x.kind === "champion" || x.kind === "all_american") : stories} onOpen={setOpen} />
              </Section>
              <Section title="Latest Headlines">
                <div className="divide-y divide-[#1f3360]">
                  <Link href={ARTICLE.href} className="flex items-center gap-3 py-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ARTICLE.image} alt="" className="h-16 w-20 shrink-0 rounded-md bg-[#0b1730] object-cover" />
                    <div className="min-w-0 flex-1"><Tag kind="Preview" /><div className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-white">{ARTICLE.title}</div><div className="text-xs text-[#8195bd]">NC United · 5 min read</div></div>
                    <span className="text-[#6f83ab]">›</span>
                  </Link>
                  {(past ? stories.filter((x) => x.kind === "champion" || x.kind === "all_american") : stories).slice(1, 5).map((s) => <Headline key={s.id} s={s} onOpen={setOpen} />)}
                </div>
              </Section>
            </div>

            {!past && <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
              <Section title="Last Hour" right={recaps[0] ? <span className="text-xs text-[#8195bd]">To {new Date(recaps[0].at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span> : null}>
                {recaps[0] ? <LastHour recaps={recaps} feed={feed} /> : <Empty>Results add up here as matches finish.</Empty>}
              </Section>
              {(() => {
                const topWins = feed.filter((f) => f.tier === "huge" || f.tier === "big")
                const sigWins = feed.filter((f) => f.tier === "significant")
                const list = winTab === "top" ? topWins : sigWins
                const tab = (k: "top" | "significant", label: string, n: number) => (
                  <button onClick={() => { setWinTab(k); setAllWins(false) }} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${winTab === k ? "bg-[#d4af55] text-[#0b1730]" : "border border-[#2c4170] text-[#c9d4ea]"}`}>{label} {n}</button>
                )
                return (
                  <Section id="s32-wins" title="Biggest Wins" right={<div className="flex items-center gap-1.5">{allWins && <button onClick={() => collapseTo("s32-wins", () => setAllWins(false))} className="mr-1 text-xs font-semibold text-[#d4af55]">Less</button>}{tab("top", "Huge & Big", topWins.length)}{tab("significant", "Significant", sigWins.length)}</div>}>
                    {list.length ? (
                      <div className="divide-y divide-[#1f3360]">
                        {list.slice(0, allWins ? undefined : 5).map((f) => <WinRow key={f.key} f={f} onOpen={() => { const e = entrants.find((x) => x.name === f.name && x.weight === f.weight && x.gender === f.gender); if (e) setOpen(e) }} />)}
                        {list.length > 5 && <button onClick={() => (allWins ? collapseTo("s32-wins", () => setAllWins(false)) : setAllWins(true))} className="w-full pt-2.5 text-center text-xs text-[#d4af55]">{allWins ? "Show less" : `View all ${list.length}`}</button>}
                      </div>
                    ) : <Empty>{winTab === "top" ? "Wins over seeded wrestlers appear here." : "Wins over unseeded state champions, state finalists, NHSCA and Super 32 All-Americans and nationally ranked wrestlers appear here."}</Empty>}
                    <p className="mt-3 border-t border-[#1f3360] pt-2.5 text-[11px] leading-snug text-[#6f83ab]">
                      <span className="font-semibold text-[#e5372c]">Huge</span>: beat a #1–12 seed. <span className="font-semibold text-[#d4af55]">Big</span>: beat a #13–32 seed. <span className="font-semibold text-emerald-400">Significant</span>: beat an unseeded wrestler who is nationally ranked (top 30), a Super 32, NHSCA or Fargo All-American, or a 2025–26 state champion or runner-up.
                    </p>
                  </Section>
                )
              })()}
            </div>}

            <div className={`grid gap-5 ${past ? "" : "lg:grid-cols-[1.6fr_1fr]"}`}>
              {!past && <Section id="s32-mine" title={`My Wrestlers${mine.length ? ` (${mine.length})` : ""}`}>
                {mine.length ? (
                  <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:px-0 xl:grid-cols-4">
                    {mine.map((e) => <WatchCard key={`m${e.gender}${e.weight}${e.name}`} e={e} onOpen={() => setOpen(e)} starred onStar={() => stars.toggle(starKey(e))} />)}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-[#2c4170] px-5 py-8 text-center">
                    <div className="text-4xl text-[#d4af55]">☆</div>
                    <div className={`${H} mt-2 text-2xl text-white`}>Build your Super 32 list</div>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-[#c9d4ea]">Tap the <span className="text-[#d4af55]">☆</span> next to any NC wrestler in the list to follow them here, with their record and results all weekend.</p>
                    <p className="mx-auto mt-2 max-w-sm text-xs text-[#8195bd]">{stars.signedIn ? "Saved to your NC United account, so it is the same on your phone, computer and in the app." : "Saved on this device. Sign in to see your list everywhere, including the app."}</p>
                  </div>
                )}
              </Section>}
              <Section id="s32-all" title={past ? `2025 Results · ${entrants.length} NC wrestlers` : `All NC Wrestlers (${entrants.length})`} right={allList && !filtered ? <button onClick={() => collapseTo("s32-all", () => setAllList(false))} className="text-xs font-semibold text-[#d4af55]">Show less</button> : undefined}>
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <input value={q} onChange={(x) => setQ(x.target.value)} placeholder="Search wrestler or school" className="col-span-2 rounded-md border border-[#1f3360] bg-[#0b1730] px-3 py-2 text-sm text-white placeholder:text-[#6f83ab]" />
                  <select value={weight} onChange={(x) => setWeight(x.target.value)} className="rounded-md border border-[#1f3360] bg-[#0b1730] px-2 py-2 text-sm text-white"><option value="">All weights</option>{weights.map((w) => <option key={w} value={w}>{w}</option>)}</select>
                  <select value={status} onChange={(x) => setStatus(x.target.value)} className="rounded-md border border-[#1f3360] bg-[#0b1730] px-2 py-2 text-sm text-white">
                    <option value="">Any status</option><option value="alive">Still alive</option><option value="placed">Placed</option><option value="eliminated">Eliminated</option><option value="seeded">Seeded</option><option value="winning">Winning record</option>
                  </select>
                </div>
                {list.length === 0 ? <Empty>{entrants.length ? "No wrestlers match." : "NC entrants appear after the first results."}</Empty> : (
                  <>
                    <ul className="divide-y divide-[#1f3360]">
                      {list.slice(0, allList || filtered ? undefined : 12).map((e) => (
                        <li key={`${e.gender}${e.weight}${e.name}`}>
                          <button onClick={() => setOpen(e)} className="flex w-full items-center gap-3 py-2 text-left">
                            <span className="w-9 shrink-0 text-xs text-[#8195bd]">{e.gender === "girls" ? "G" : ""}{e.weight}</span>
                            <Photo e={e} className="h-8 w-8 shrink-0 rounded-full" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-white">{e.name}{e.seed !== null && <span className="ml-1.5 text-xs font-bold text-[#d4af55]">#{e.seed}</span>}{e.hotStreak && " 🔥"}</div>
                              <div className="truncate text-xs text-[#8195bd]">{e.school ?? ""}</div>
                              <BestWin e={e} />
                            </div>
                            {!past && <Star on={stars.ids.has(starKey(e))} onToggle={() => stars.toggle(starKey(e))} />}
                            <div className="shrink-0 text-right">
                              <div className="text-sm font-semibold text-white">{e.wins}-{e.losses}</div>
                              <div className={`text-[11px] ${statusColor(e)}`}>{statusText(e)}</div>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                    {list.length > 12 && !filtered && <button onClick={() => (allList ? collapseTo("s32-all", () => setAllList(false)) : setAllList(true))} className="mt-2 w-full rounded-md border border-[#1f3360] py-2 text-sm text-[#d4af55]">{allList ? "Show less" : `View all ${list.length}`}</button>}
                  </>
                )}
              </Section>
            </div>
          </>
        )}

        <a href={APP_STORE_URL} className="flex flex-col items-start gap-4 rounded-xl border border-[#d4af55]/40 bg-gradient-to-r from-[#0f1f3f] to-[#13294b] p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className={`${H} text-lg text-white`}>Follow every NC wrestler.</div>
            <div className={`${H} text-3xl leading-tight text-[#d4af55] md:text-4xl`}>Get alerts for the biggest wins.</div>
            <div className="text-sm text-[#c9d4ea]">Download the free NC United iPhone app and turn on Results alerts.</div>
          </div>
          <span className="flex items-center gap-4">
            <span className="rounded-lg bg-white px-5 py-3 font-semibold text-[#0b1730]">Download on the App Store</span>
            {/* On a computer the button is no use; the QR moves them to their phone. */}
            <span className="hidden flex-col items-center gap-1 md:flex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/super32/app-download-qr.png" alt="Scan to get the NC United app" className="h-24 w-24 rounded-md bg-white p-1" />
              <span className="text-[10px] text-[#9fb0cf]">Scan with your phone</span>
            </span>
          </span>
        </a>
      </main>

      {open && <WrestlerSheet e={open} onClose={() => setOpen(null)} starred={stars.ids.has(starKey(open))} onStar={past ? undefined : () => stars.toggle(starKey(open))} />}
    </div>
  )
}
