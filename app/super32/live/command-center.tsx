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
import { roundProgress } from "@/lib/super32-live/rounds"

const APP_STORE_URL = "https://apps.apple.com/app/id6803202791"
const ARTICLE = {
  href: "/news/super32-2026-what-good-looks-like",
  title: "What Will It Take? Defining Success for North Carolina at Super 32",
  image: "/images/news/super32-2026-preview/what-will-it-take-banner.jpg",
}
type G = "all" | "boys" | "girls"

/** A designed banner per division replaces the header when that tab is on. Add "all"/"boys" when they exist. */
const BANNERS: Partial<Record<G, { src: string; alt: string }>> = {
  all: { src: "/images/super32/super32-hq-news.jpg", alt: "North Carolina Super 32 HQ, October 24-25, 2026" },
  boys: { src: "/images/super32/hq-2026-boys.jpg", alt: "North Carolina Super 32 HQ 2026: Boys" },
  girls: { src: "/images/super32/hq-2026-girls.jpg", alt: "North Carolina Super 32 HQ 2026: Girls" },
}

/** 2025 finals from the 2025 Flo export, same engine and NC rule as 2026 (Bouzakis out). */
const Y2025: Record<G, { record: string; winning: number; aa: number }> = {
  all: { record: "103-264", winning: 11, aa: 4 },
  boys: { record: "76-182", winning: 7, aa: 1 },
  girls: { record: "27-82", winning: 4, aa: 3 },
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
  "Huge win": "bg-[#e5372c] text-white", "Big win": "bg-[#d4af55] text-[#0b1730]", Upset: "bg-[#7c5cff] text-white",
  "All-American": "bg-[#d4af55] text-[#0b1730]", Champion: "bg-[#d4af55] text-[#0b1730]", "Round recap": "bg-[#3b5ba5] text-white",
  "Hot streak": "bg-[#e5372c]/80 text-white", "Consolation run": "bg-[#3b5ba5] text-white", Seeded: "bg-[#1b2d57] text-[#d4af55]",
  Preview: "bg-[#3b5ba5] text-white",
}
function Tag({ kind }: { kind: string }) {
  return <span className={`inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TAG[kind] ?? "bg-[#1b2d57] text-white"}`}>{kind}</span>
}

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#1f3360] bg-[#0f1f3f]">
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
        <div className="relative h-56 md:order-2 md:h-auto">
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

function RecapBlock({ r }: { r: SnapshotRecap }) {
  const pct = r.wins + r.losses ? Math.round((100 * r.wins) / (r.wins + r.losses)) : 0
  const lines: Array<[string, string | null]> = [
    ["Top performance", r.topPerformance ? `${r.topPerformance.name} (${r.topPerformance.weight}) ${r.topPerformance.line}` : null],
    ["Biggest upset", r.biggestUpset ? `${r.biggestUpset.name} (${r.biggestUpset.weight}) ${r.biggestUpset.line}` : null],
    ["Longest streak", r.longestStreak ? `${r.longestStreak.name} (${r.longestStreak.weight}), ${r.longestStreak.streak} straight` : null],
    ["Eliminated", r.notableEliminations.length ? r.notableEliminations.map((e) => `${e.name}${e.seed ? ` (#${e.seed})` : ""}`).join(", ") : null],
  ]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-[1.5fr_repeat(5,1fr)]">
        {([["Round record", `${r.wins}-${r.losses}`], ["Win rate", `${pct}%`], ["Seeded wins", r.seededWins], ["Huge wins", r.huge], ["Big wins", r.big], ["Still alive", r.stillAlive]] as const).map(([k, v]) => (
          <div key={k} className="rounded-lg border border-[#1f3360] bg-[#0b1730] px-2 py-3 text-center">
            <div className={`${H} whitespace-nowrap text-2xl md:text-3xl ${k === "Huge wins" ? "text-[#e5372c]" : k === "Big wins" ? "text-[#d4af55]" : "text-white"}`}>{v}</div>
            <div className="text-[11px] text-[#9fb0cf]">{k}</div>
          </div>
        ))}
      </div>
      <p className="text-sm leading-relaxed text-[#c9d4ea]">{r.sentence}</p>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        {lines.filter(([, v]) => v).map(([k, v]) => (<div key={k}><dt className="text-[11px] font-semibold uppercase tracking-wider text-[#d4af55]">{k}</dt><dd className="text-[#c9d4ea]">{v}</dd></div>))}
      </dl>
    </div>
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
  const seconds = Math.max(40, items.length * 6)
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
        <div className="flex flex-wrap items-center gap-1.5"><Tag kind={f.tier === "huge" ? "Huge win" : "Big win"} />{f.upset && <Tag kind="Upset" />}<span className="font-semibold text-white">{f.name}</span></div>
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

/** The wrestler's best win and the credential that made it one: Huge before Big, then the stronger rank or seed. */
function BestWin({ e }: { e: SnapshotEntrant }) {
  const strength = (r: string[]) => Number(r[0]?.match(/#(\d+)/)?.[1] ?? 99)
  const best = e.bouts
    .filter((b) => b.win && (b.tier === "huge" || b.tier === "big") && b.reasons.length)
    .sort((a, b) => (a.tier === b.tier ? strength(a.reasons) - strength(b.reasons) : a.tier === "huge" ? -1 : 1))[0]
  if (!best) return null
  return (
    <div className="mt-0.5 truncate text-[11px]">
      <span className={`font-bold ${best.tier === "huge" ? "text-[#e5372c]" : "text-[#d4af55]"}`}>{best.tier === "huge" ? "HUGE" : "BIG"}:</span>{" "}
      <span className="text-[#c9d4ea]">def. {best.opponent} ({best.opponentTeam}), {best.reasons[0]}</span>
    </div>
  )
}

/**
 * Stars on Super 32 HQ are their own weekend list (Matt, 24 Oct): nothing to do with following
 * athletes in the app. Saved on this device, every NC wrestler can be starred, linked or not.
 */
const LOCAL_STARS = "s32-hq-stars-2026"
/** Checks in every 45 seconds; returns how many pages have Super 32 HQ open. */
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
    const ping = () => {
      if (document.visibilityState === "hidden") return
      fetch("/api/super32-live/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sid }) })
        .then((r) => r.json()).then((j) => alive && typeof j.watching === "number" && setN(j.watching)).catch(() => {})
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
  useEffect(() => {
    try { setIds(new Set(JSON.parse(localStorage.getItem(LOCAL_STARS) ?? "[]"))) } catch { /* private mode */ }
  }, [])
  const toggle = (key: string) => {
    setIds((cur) => {
      const next = new Set(cur)
      if (next.has(key)) next.delete(key); else next.add(key)
      try { localStorage.setItem(LOCAL_STARS, JSON.stringify([...next])) } catch { /* private mode */ }
      return next
    })
  }
  return { ids, toggle }
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
                  <div className="flex flex-wrap items-center gap-1.5 text-white">{b.win ? "def." : "lost to"} {b.opponent} ({b.opponentTeam}) {b.win && b.tier && b.tier !== "win" && <Tag kind={b.tier === "huge" ? "Huge win" : "Big win"} />}{b.win && b.upset && <Tag kind="Upset" />}</div>
                  <div className="text-xs text-[#8195bd]">{[b.round, b.winType, b.result].filter(Boolean).join(" · ")}{b.reasons.length ? ` · ${b.reasons.slice(0, 3).join(", ")}` : ""}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {e.athleteId && <Link href={`/athletes/${e.athleteId}`} className="mt-5 block rounded-lg bg-[#d4af55] py-2.5 text-center font-semibold text-[#0b1730]">Full profile</Link>}
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
  const feed = useMemo(() => (snap?.feed ?? []).filter((f) => g === "all" || f.gender === g).sort((a, b) => (a.tier === b.tier ? 0 : a.tier === "huge" ? -1 : 1)), [snap, g])
  // My Wrestlers replaces our Wrestlers to Watch (Matt, 23 Oct): the families pick, by starring.
  const mine = useMemo(() => entrants.filter((e) => stars.ids.has(starKey(e))), [entrants, stars.ids])
  const weights = useMemo(() => [...new Set(entrants.map((e) => e.weight))].sort((a, b) => Number(a) - Number(b)), [entrants])
  const list = useMemo(() => {
    const order: Record<string, number> = { placed: 0, alive: 1, not_started: 1, alive_consis: 2, eliminated: 3 }
    return entrants
      .filter((e) => (!q || `${e.name} ${e.school ?? ""}`.toLowerCase().includes(q.toLowerCase())) && (!weight || e.weight === weight) &&
        (!status || (status === "seeded" ? e.seed !== null : status === "winning" ? e.wins > e.losses : status === "alive" ? e.status === "alive" || e.status === "alive_consis" || e.status === "not_started" : e.status === status)))
      .sort((a, b) => order[a.status]! - order[b.status]! || (a.placement ?? 9) - (b.placement ?? 9) || b.wins - a.wins || Number(a.weight) - Number(b.weight))
  }, [entrants, q, weight, status])

  const updatedAgo = useAgo(snap?.publishedAt)
  if (snap === undefined) return <div className="min-h-screen bg-[#0a1630]" />
  // 2025 had no seed list: records, finishes and All-Americans only, no tiers (Matt, 23 Oct).
  const past = year === "2025" && !initial
  const sb = snap?.scoreboards[g]
  const started = !!snap?.hasResults
  const pct = sb && sb.wins + sb.losses ? Math.round((100 * sb.wins) / (sb.wins + sb.losses)) : 0
  const placed = entrants.filter((e) => e.placement).length
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

      <div className="sticky top-0 z-30 border-b border-[#1f3360] bg-[#0a1630]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5">
          {!initial && (
            <div className="grid w-full grid-cols-2 gap-1.5 sm:w-auto sm:min-w-[200px]">
              {(["2025", "2026"] as const).map((y) => (
                <button key={y} onClick={() => pickYear(y)} className={`${H} rounded-md px-4 py-2 text-base ${year === y ? "bg-[#d4af55] text-[#0b1730]" : "bg-[#13244a] text-[#c9d4ea]"}`}>{y}</button>
              ))}
            </div>
          )}
          <div className="grid min-w-[260px] flex-1 grid-cols-3 gap-1.5">
            {(["all", "boys", "girls"] as const).map((k) => (
              <button key={k} onClick={() => pickG(k)} className={`rounded-md py-2 text-sm font-semibold ${g === k ? "bg-[#d4af55] text-[#0b1730]" : "bg-[#13244a] text-[#c9d4ea]"}`}>
                {k === "all" ? "All NC" : k === "boys" ? "Men" : "Women"}{snap ? ` (${snap.scoreboards[k].wrestlers})` : ""}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs md:justify-end">
            {rehearsalLabel && <span className="font-semibold text-[#d4af55]">{rehearsalLabel}</span>}
            {year === "2026" && !initial && watching !== null && watching >= 10 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 font-semibold text-emerald-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />{watching.toLocaleString()} watching now
              </span>
            )}
            <span className="rounded-full bg-[#13244a] px-2.5 py-1 font-medium text-[#c9d4ea]">
              {year === "2025" && !initial ? "2025 final results" : snap?.publishedAt ? <>Updated {new Date(snap.publishedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}{updatedAgo ? <span className="text-[#8195bd]"> · {updatedAgo}</span> : null}</> : "Results post as matches finish"}
            </span>
          </div>
        </div>
      </div>

      {year === "2026" && started && <ResultsTicker entrants={entrants} />}

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5">
        {!snap || !sb ? (
          <Empty>Super 32 HQ opens when the brackets are set. Results post after every round.</Empty>
        ) : (
          <>
            <Section title="NC State Scoreboard">
              <div className={`-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:px-0 ${past ? "lg:grid-cols-[1.6fr_repeat(4,1fr)]" : "lg:grid-cols-[1.6fr_repeat(7,1fr)]"}`}>
                {(past ? ([
                  ["Overall record", `${sb.wins}-${sb.losses}`, `${pct}% win rate`, "text-white"],
                  ["NC wrestlers", sb.wrestlers, "", "text-white"],
                  ["All-Americans", sb.allAmericans, "", "text-[#d4af55]"],
                  ["Winning records", sb.winningRecords, "", "text-white"],
                  ["NC placers", placed, "", "text-white"],
                ] as const) : ([
                  ["Overall record", `${sb.wins}-${sb.losses}`, started ? `${pct}% win rate` : "Not started", "text-white"],
                  ["Still alive", sb.stillAlive, sb.aliveConsi ? `${sb.aliveChamp} champ · ${sb.aliveConsi} consi` : started ? "" : `${sb.wrestlers} entered`, "text-white"],
                  ["Huge wins", sb.huge, "", "text-[#e5372c]"],
                  ["Big wins", sb.big, "", "text-[#d4af55]"],
                  ["All-Americans", sb.allAmericans, year === "2026" ? `2025: ${Y2025[g].aa}` : "", "text-white"],
                  ["Winning records", sb.winningRecords, year === "2026" ? `2025: ${Y2025[g].winning}` : "", "text-white"],
                  ["Vs seeded", `${sb.seededWins}-${sb.seededLosses ?? 0}`, "wins-losses", "text-white"],
                  ["NC placers", placed, year === "2026" ? `2025 record ${Y2025[g].record}` : "", "text-white"],
                ] as const)).map(([label, v, sub, color]) => (
                  <div key={label} className="min-w-[118px] shrink-0 rounded-lg border border-[#1f3360] bg-[#0b1730] px-3 py-3 text-center lg:min-w-0">
                    <div className={`${H} whitespace-nowrap text-3xl leading-none md:text-4xl ${color}`}>{v}</div>
                    <div className="mt-1.5 text-xs text-[#c9d4ea]">{label}</div>
                    {sub && <div className="text-[10px] text-[#6f83ab]">{sub}</div>}
                  </div>
                ))}
              </div>
            </Section>

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
              <Section title="Round Recap" right={recaps[0] ? <span className="text-xs text-[#8195bd]">After {recaps[0].label}</span> : null}>
                {recaps[0] ? <RecapBlock r={recaps[0]} /> : <Empty>The first recap posts after the opening round.</Empty>}
              </Section>
              <Section title="Biggest Wins" right={feed.length > 5 ? <button onClick={() => setAllWins(!allWins)} className="text-xs text-[#d4af55]">{allWins ? "Show less" : `View all ${feed.length}`}</button> : null}>
                {feed.length ? (
                  <div className="divide-y divide-[#1f3360]">
                    {feed.slice(0, allWins ? undefined : 5).map((f) => <WinRow key={f.key} f={f} onOpen={() => { const e = entrants.find((x) => x.name === f.name && x.weight === f.weight && x.gender === f.gender); if (e) setOpen(e) }} />)}
                  </div>
                ) : <Empty>Huge and Big wins appear here after each round.</Empty>}
              </Section>
            </div>}

            <div className={`grid gap-5 ${past ? "" : "lg:grid-cols-[1.6fr_1fr]"}`}>
              {!past && <Section title={`My Wrestlers${mine.length ? ` (${mine.length})` : ""}`}>
                {mine.length ? (
                  <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:px-0 xl:grid-cols-4">
                    {mine.map((e) => <WatchCard key={`m${e.gender}${e.weight}${e.name}`} e={e} onOpen={() => setOpen(e)} starred onStar={() => stars.toggle(starKey(e))} />)}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-[#2c4170] px-5 py-8 text-center">
                    <div className="text-4xl text-[#d4af55]">☆</div>
                    <div className={`${H} mt-2 text-2xl text-white`}>Build your Super 32 list</div>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-[#c9d4ea]">Tap the <span className="text-[#d4af55]">☆</span> next to any NC wrestler in the list to follow them here, with their record and results all weekend.</p>
                    <p className="mx-auto mt-2 max-w-sm text-xs text-[#8195bd]">Your list is saved on this phone or computer for the weekend.</p>
                  </div>
                )}
              </Section>}
              <Section title={past ? `2025 Results · ${entrants.length} NC wrestlers` : `All NC Wrestlers (${entrants.length})`}>
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
                    {list.length > 12 && !filtered && <button onClick={() => setAllList(!allList)} className="mt-2 w-full rounded-md border border-[#1f3360] py-2 text-sm text-[#d4af55]">{allList ? "Show less" : `View all ${list.length}`}</button>}
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
          <span className="rounded-lg bg-white px-5 py-3 font-semibold text-[#0b1730]">Download on the App Store</span>
        </a>
      </main>

      {open && <WrestlerSheet e={open} onClose={() => setOpen(null)} starred={stars.ids.has(starKey(open))} onStar={past ? undefined : () => stars.toggle(starKey(open))} />}
    </div>
  )
}
