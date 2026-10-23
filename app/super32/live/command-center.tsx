"use client"

/**
 * Super 32 Command Center. One component: phone shows five tabs, desktop shows the four zones.
 * Every live number comes from the published 2026 snapshot; before results it reads 0 or
 * "Not started", and 2025 appears only labelled as 2025.
 */
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import type { PublicSnapshot } from "@/app/api/super32-live/route"
import type { FeedItem, SnapshotEntrant, SnapshotRecap } from "@/lib/super32-live/snapshot"
import type { Scoreboard } from "@/lib/super32-live/engine"

const APP_STORE_URL = "https://apps.apple.com/app/id6803202791"
type G = "all" | "boys" | "girls"
type Tab = "home" | "watch" | "wrestlers" | "recap" | "alerts"

/**
 * 2025 finals from the 2025 Flo export, same engine and same NC rule as 2026: Jaclyn Bouzakis
 * (NOT_NC) is left out, as she is this year. Boys 91, girls 40.
 */
const Y2025: Record<G, { record: string; winning: number; aa: number }> = {
  all: { record: "103-264", winning: 11, aa: 4 },
  boys: { record: "76-182", winning: 7, aa: 1 },
  girls: { record: "27-82", winning: 4, aa: 3 },
}
const GOALS = { boysAA: 2, winning: 14 }

const STATUS: Record<SnapshotEntrant["status"], string> = {
  not_started: "Not started", alive: "Alive", alive_consis: "Alive in consis", eliminated: "Eliminated", placed: "Placed",
}
const ord = (n: number) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`)
const statusText = (e: SnapshotEntrant) => (e.status === "placed" && e.placement ? `Placed ${ord(e.placement)}` : STATUS[e.status])
const initials = (n: string) => n.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()

function Avatar({ e, size = 44 }: { e: { name: string; photo: string | null }; size?: number }) {
  return e.photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={e.photo} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <div className="flex shrink-0 items-center justify-center rounded-full bg-[#1b2d57] font-semibold text-[#d4af55]" style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials(e.name)}</div>
  )
}

function TierTag({ tier, upset }: { tier: "huge" | "big" | "win" | null; upset?: boolean }) {
  return (
    <span className="inline-flex gap-1">
      {tier === "huge" && <span className="rounded bg-[#ff5a4f] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Huge win</span>}
      {tier === "big" && <span className="rounded bg-[#d4af55] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0b1730]">Big win</span>}
      {upset && <span className="rounded bg-[#7c5cff] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Upset</span>}
    </span>
  )
}

function Panel({ title, right, children, className = "" }: { title: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-[#22355f] bg-[#10203f] p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-sans text-base font-bold uppercase tracking-wider text-white">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-[#2c4170] px-4 py-6 text-center text-sm text-[#8195bd]">{children}</div>
}

function ScoreboardHero({ sb, g, started }: { sb: Scoreboard; g: G; started: boolean }) {
  const pct = sb.wins + sb.losses ? Math.round((100 * sb.wins) / (sb.wins + sb.losses)) : 0
  const tiles: Array<[string, number | string, string?]> = [
    ["Still alive", sb.stillAlive, sb.aliveConsi ? `${sb.aliveChamp} champ · ${sb.aliveConsi} consi` : undefined],
    ["Huge wins", sb.huge],
    ["Big wins", sb.big],
    ["All-Americans", sb.allAmericans, `2025: ${Y2025[g].aa}`],
    ["Winning records", sb.winningRecords, `2025: ${Y2025[g].winning}`],
    ["Seeded wins", sb.seededWins, "2025: not tracked"],
  ]
  return (
    <div className="grid gap-3 lg:grid-cols-[1.1fr_2fr]">
      <div className="rounded-2xl border border-[#22355f] bg-gradient-to-br from-[#13294b] to-[#0d1d3d] p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9fb0cf]">North Carolina{g !== "all" ? ` · ${g === "boys" ? "Men" : "Women"}` : ""}</div>
        <div className="mt-1 font-sans text-6xl font-extrabold leading-none tracking-tight text-white">{sb.wins}-{sb.losses}</div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          {started ? <span className="text-[#c9d4ea]">{pct}% · {sb.wrestlers} NC wrestlers</span> : <span className="rounded-md bg-[#d4af55]/15 px-2 py-0.5 font-semibold text-[#d4af55]">Not started</span>}
        </div>
        <div className="mt-3 text-xs text-[#8195bd]">2025 final: {Y2025[g].record}</div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {tiles.map(([label, n, sub]) => (
          <div key={label} className="rounded-2xl border border-[#22355f] bg-[#10203f] px-2 py-3 text-center">
            <div className={`font-sans text-3xl font-extrabold tabular-nums ${label === "Huge wins" ? "text-[#ff5a4f]" : label === "Big wins" ? "text-[#d4af55]" : "text-white"}`}>{n}</div>
            <div className="text-[11px] font-medium text-[#9fb0cf]">{label}</div>
            {sub && <div className="mt-0.5 text-[10px] text-[#6f83ab]">{sub}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

function FeedList({ items, limit }: { items: FeedItem[]; limit?: number }) {
  if (!items.length) return <Empty>Huge and Big wins appear here as North Carolina wrestles.</Empty>
  return (
    <ul className="divide-y divide-[#1d2f58]">
      {items.slice(0, limit).map((f) => (
        <li key={f.key} className="flex items-center gap-3 py-2.5">
          <Avatar e={f} size={40} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-white">{f.name}</span><span className="text-xs text-[#8195bd]">{f.weight}{f.school ? ` · ${f.school}` : ""}</span><TierTag tier={f.tier} upset={f.upset} /></div>
            <div className="text-sm text-[#c9d4ea]">def. {f.opponent} ({f.opponentTeam}){f.reasons[0] ? `, ${f.reasons[0]}` : ""}</div>
            <div className="text-xs text-[#8195bd]">{[f.winType, f.result, f.round].filter(Boolean).join(" · ")}</div>
          </div>
        </li>
      ))}
    </ul>
  )
}

function RecapCard({ r }: { r: SnapshotRecap }) {
  const rows: Array<[string, string | null]> = [
    ["Top performance", r.topPerformance ? `${r.topPerformance.name} (${r.topPerformance.weight}) ${r.topPerformance.line}` : null],
    ["Biggest upset", r.biggestUpset ? `${r.biggestUpset.name} (${r.biggestUpset.weight}) ${r.biggestUpset.line}` : null],
    ["Longest streak", r.longestStreak ? `${r.longestStreak.name} (${r.longestStreak.weight}), ${r.longestStreak.streak} straight wins` : null],
    ["Notable eliminations", r.notableEliminations.length ? r.notableEliminations.map((e) => `${e.name} (${e.weight}${e.seed ? `, #${e.seed} seed` : ""})`).join(", ") : null],
  ]
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        {([["NC record", `${r.wins}-${r.losses}`], ["Seeded wins", r.seededWins], ["Still alive", r.stillAlive]] as const).map(([k, v]) => (
          <div key={k} className="rounded-xl bg-[#0b1730] py-2"><div className="font-sans text-2xl font-bold text-white">{v}</div><div className="text-[11px] text-[#9fb0cf]">{k}</div></div>
        ))}
      </div>
      <p className="text-sm text-[#c9d4ea]">{r.sentence}</p>
      <dl className="space-y-1.5 text-sm">
        {rows.filter(([, v]) => v).map(([k, v]) => (<div key={k}><dt className="text-[11px] font-semibold uppercase tracking-wider text-[#d4af55]">{k}</dt><dd className="text-[#c9d4ea]">{v}</dd></div>))}
      </dl>
    </div>
  )
}

function WatchCard({ e, onOpen }: { e: SnapshotEntrant; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="w-44 shrink-0 rounded-2xl border border-[#22355f] bg-[#10203f] p-3 text-left hover:border-[#d4af55]/60">
      <div className="flex items-center gap-2"><Avatar e={e} size={40} />{e.seed !== null && <span className="rounded-md bg-[#d4af55] px-1.5 text-xs font-bold text-[#0b1730]">#{e.seed}</span>}</div>
      <div className="mt-2 truncate font-semibold text-white">{e.name}</div>
      <div className="truncate text-xs text-[#8195bd]">{e.gender === "girls" ? "Girls " : ""}{e.weight}{e.school ? ` · ${e.school}` : ""}</div>
      <div className="mt-2 flex flex-wrap gap-1">{e.chips.slice(0, 3).map((c) => <span key={c} className="rounded bg-[#1b2d57] px-1.5 py-0.5 text-[10px] text-[#c9d4ea]">{c}</span>)}</div>
      <div className="mt-2 text-xs"><span className="text-[#9fb0cf]">{e.status === "not_started" ? "Not started" : `${e.wins}-${e.losses} · ${statusText(e)}`}</span>{e.hotStreak && <span className="ml-1">🔥</span>}</div>
    </button>
  )
}

function WrestlerSheet({ e, onClose }: { e: SnapshotEntrant; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-[#22355f] bg-[#0d1d3d] p-5 sm:rounded-3xl" onClick={(x) => x.stopPropagation()}>
        <div className="flex items-center gap-3">
          <Avatar e={e} size={56} />
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold text-white">{e.name}</div>
            <div className="text-sm text-[#8195bd]">{e.gender === "girls" ? "Girls " : ""}{e.weight}{e.school ? ` · ${e.school}` : ""}{e.classYear ? ` · ${e.classYear}` : ""}{e.seed !== null ? ` · #${e.seed} seed` : ""}</div>
          </div>
          <button onClick={onClose} className="text-sm text-[#9fb0cf]">Close</button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-[#10203f] py-2"><div className="text-2xl font-bold text-white">{e.wins}-{e.losses}</div><div className="text-[11px] text-[#9fb0cf]">Record</div></div>
          <div className="rounded-xl bg-[#10203f] py-2"><div className="text-2xl font-bold text-white">{e.bouts.filter((b) => b.win && (b.tier === "huge" || b.tier === "big")).length}</div><div className="text-[11px] text-[#9fb0cf]">Huge/Big wins</div></div>
          <div className="rounded-xl bg-[#10203f] py-2"><div className="text-base font-bold leading-8 text-[#d4af55]">{statusText(e)}</div><div className="text-[11px] text-[#9fb0cf]">Status</div></div>
        </div>
        {e.chips.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{e.chips.map((c) => <span key={c} className="rounded-md bg-[#1b2d57] px-2 py-1 text-xs text-[#c9d4ea]">{c}</span>)}</div>}
        <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-[#9fb0cf]">Matches</h3>
        {e.bouts.filter((b) => b.opponent).length === 0 ? <Empty>No matches yet.</Empty> : (
          <ul className="mt-2 divide-y divide-[#1d2f58]">
            {e.bouts.filter((b) => b.opponent).map((b) => (
              <li key={b.key} className="flex items-start gap-3 py-2">
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold ${b.win ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>{b.win ? "W" : "L"}</span>
                <div className="min-w-0 flex-1 text-sm">
                  <div className="text-white">{b.win ? "def." : "lost to"} {b.opponent} ({b.opponentTeam}) <TierTag tier={b.win ? b.tier : null} upset={b.win && b.upset} /></div>
                  <div className="text-xs text-[#8195bd]">{[b.round, b.winType, b.result].filter(Boolean).join(" · ")}{b.win && b.reasons.length ? ` · ${b.reasons.join(", ")}` : ""}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {e.athleteId && <Link href={`/athletes/${e.athleteId}`} className="mt-5 block rounded-xl bg-[#d4af55] py-2.5 text-center font-semibold text-[#0b1730]">Full profile</Link>}
      </div>
    </div>
  )
}

function AppBar() {
  return (
    <a href={APP_STORE_URL} className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-[#d4af55] to-[#e8c977] px-4 py-3 text-[#0b1730]">
      <div><div className="font-sans text-lg font-bold uppercase leading-tight">Get every big NC win on your iPhone</div><div className="text-sm font-medium">Free NC United app · turn on Results alerts</div></div>
      <span className="shrink-0 rounded-lg bg-[#0b1730] px-3 py-2 text-sm font-semibold text-white">App Store</span>
    </a>
  )
}

export function CommandCenter({ initial }: { initial?: PublicSnapshot } = {}) {
  const [snap, setSnap] = useState<PublicSnapshot | null | undefined>(initial)
  const [g, setG] = useState<G>("all")
  const [tab, setTab] = useState<Tab>("home")
  const [open, setOpen] = useState<SnapshotEntrant | null>(null)
  const [q, setQ] = useState("")
  const [weight, setWeight] = useState("")
  const [status, setStatus] = useState("")

  useEffect(() => {
    try { const p = new URLSearchParams(location.search).get("g"); if (p === "m") setG("boys"); if (p === "w") setG("girls") } catch { /* ignore */ }
    if (initial) return
    let alive = true
    const load = () => fetch("/api/super32-live", { cache: "no-store" }).then((r) => r.json()).then((j) => alive && setSnap(j.snapshot ?? null)).catch(() => alive && setSnap((s) => s ?? null))
    void load()
    const id = setInterval(load, 60_000)
    return () => { alive = false; clearInterval(id) }
  }, [initial])

  const pickG = (next: G) => {
    setG(next)
    try { const u = new URL(location.href); if (next === "all") u.searchParams.delete("g"); else u.searchParams.set("g", next === "boys" ? "m" : "w"); history.replaceState(null, "", u) } catch { /* ignore */ }
  }

  const entrants = useMemo(() => (snap?.entrants ?? []).filter((e) => g === "all" || e.gender === g), [snap, g])
  const sb = snap ? snap.scoreboards[g] : null
  const feed = useMemo(() => (snap?.feed ?? []).filter((f) => g === "all" || f.gender === g), [snap, g])
  const recaps = useMemo(() => (snap?.recaps ?? []).filter((r) => r.gender === g), [snap, g])
  const watch = useMemo(() => entrants.filter((e) => e.watch !== null || e.aaClinched || e.bouts.some((b) => b.win && b.tier === "huge"))
    .sort((a, b) => (a.watch ?? 9) - (b.watch ?? 9) || (a.seed ?? 99) - (b.seed ?? 99)), [entrants])
  const weights = useMemo(() => [...new Set(entrants.map((e) => e.weight))].sort((a, b) => Number(a) - Number(b)), [entrants])
  const list = useMemo(() => {
    const order: Record<string, number> = { alive: 0, not_started: 0, alive_consis: 1, placed: 2, eliminated: 3 }
    return entrants
      .filter((e) => (!q || `${e.name} ${e.school ?? ""}`.toLowerCase().includes(q.toLowerCase())) && (!weight || e.weight === weight) && (!status || (status === "seeded" ? e.seed !== null : status === "winning" ? e.wins > e.losses : e.status === status || (status === "alive" && e.status === "alive_consis"))))
      .sort((a, b) => order[a.status]! - order[b.status]! || (a.seed ?? 99) - (b.seed ?? 99) || b.wins - a.wins || Number(a.weight) - Number(b.weight))
  }, [entrants, q, weight, status])

  const started = !!snap?.hasResults
  const boysAA = snap?.scoreboards.boys.allAmericans ?? 0
  const winning = snap?.scoreboards.all.winningRecords ?? 0

  const toggle = (
    <div className="grid grid-cols-3 gap-1.5">
      {(["all", "boys", "girls"] as const).map((k) => (
        <button key={k} onClick={() => pickG(k)} className={`rounded-xl py-2 text-sm font-semibold ${g === k ? "bg-[#d4af55] text-[#0b1730]" : "bg-[#14244a] text-[#c9d4ea]"}`}>
          {k === "all" ? "All NC" : k === "boys" ? "Men" : "Women"}{snap ? ` (${snap.scoreboards[k].wrestlers})` : ""}
        </button>
      ))}
    </div>
  )

  const goals = (
    <Panel title="NC goals" right={<span className="text-xs text-[#8195bd]">2026 vs goal</span>}>
      <div className="space-y-3 text-sm">
        {([["Boys All-Americans", boysAA, GOALS.boysAA], ["Winning records", winning, GOALS.winning]] as const).map(([k, v, goal]) => (
          <div key={k}>
            <div className="flex justify-between text-[#c9d4ea]"><span>{k}</span><span className="font-semibold text-white">{v} / {goal}</span></div>
            <div className="mt-1 h-2 rounded-full bg-[#0b1730]"><div className="h-2 rounded-full bg-[#d4af55]" style={{ width: `${Math.min(100, (100 * v) / goal)}%` }} /></div>
          </div>
        ))}
      </div>
    </Panel>
  )

  const huge = feed.filter((f) => f.tier === "huge")
  const feedPanel = (
    <Panel title="Big wins" right={<span className="text-xs text-[#8195bd]">Huge · Big · Upsets</span>}>
      {huge.length > 0 && <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#ff5a4f]">Huge wins</div>}
      <FeedList items={[...huge, ...feed.filter((f) => f.tier !== "huge")]} limit={tab === "alerts" ? undefined : 8} />
    </Panel>
  )
  const recapPanel = (
    <Panel title="Round recap" right={recaps[0] ? <span className="text-xs text-[#8195bd]">After {recaps[0].label}</span> : null}>
      {recaps[0] ? <RecapCard r={recaps[0]} /> : <Empty>The first recap posts after the opening round.</Empty>}
    </Panel>
  )
  const watchPanel = (
    <Panel title="NC wrestlers to watch" right={<span className="text-xs text-[#8195bd]">{watch.length}</span>}>
      {watch.length ? <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">{watch.map((e) => <WatchCard key={`${e.gender}${e.weight}${e.name}`} e={e} onOpen={() => setOpen(e)} />)}</div> : <Empty>Wrestlers to watch appear once seeds and entries are in.</Empty>}
    </Panel>
  )
  const listPanel = (
    <Panel title={`All North Carolina wrestlers (${entrants.length})`}>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input value={q} onChange={(x) => setQ(x.target.value)} placeholder="Search wrestler or school" className="col-span-2 rounded-lg border border-[#22355f] bg-[#0b1730] px-3 py-2 text-sm text-white placeholder:text-[#6f83ab]" />
        <select value={weight} onChange={(x) => setWeight(x.target.value)} className="rounded-lg border border-[#22355f] bg-[#0b1730] px-2 py-2 text-sm text-white"><option value="">All weights</option>{weights.map((w) => <option key={w} value={w}>{w}</option>)}</select>
        <select value={status} onChange={(x) => setStatus(x.target.value)} className="rounded-lg border border-[#22355f] bg-[#0b1730] px-2 py-2 text-sm text-white">
          <option value="">Any status</option><option value="alive">Still alive</option><option value="placed">Placed</option><option value="eliminated">Eliminated</option><option value="seeded">Seeded</option><option value="winning">Winning record</option>
        </select>
      </div>
      {list.length === 0 ? <Empty>{entrants.length ? "No wrestlers match." : "NC entrants appear once the first results are in."}</Empty> : (
        <ul className="divide-y divide-[#1d2f58]">
          {list.map((e) => {
            const hb = e.bouts.filter((b) => b.win && (b.tier === "huge" || b.tier === "big"))
            const best = e.bouts.find((b) => b.win && b.tier === "huge") ?? hb[0]
            return (
              <li key={`${e.gender}${e.weight}${e.name}`}>
                <button onClick={() => setOpen(e)} className="flex w-full items-center gap-3 py-2.5 text-left">
                  <span className="w-9 shrink-0 text-xs text-[#8195bd]">{e.gender === "girls" ? "G" : ""}{e.weight}</span>
                  <Avatar e={e} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-white">{e.name}{e.seed !== null && <span className="ml-1.5 text-xs font-bold text-[#d4af55]">#{e.seed}</span>}{e.hotStreak && <span className="ml-1">🔥</span>}</div>
                    <div className="truncate text-xs text-[#8195bd]">{e.school ?? ""}{best ? `${e.school ? " · " : ""}${best.tier === "huge" ? "Huge" : "Big"}: def. ${best.opponent}` : e.chips[0] ? `${e.school ? " · " : ""}${e.chips[0]}` : ""}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-semibold text-white">{e.wins}-{e.losses}</div>
                    <div className={`text-[11px] ${e.status === "eliminated" ? "text-[#6f83ab]" : e.status === "placed" ? "text-[#d4af55]" : "text-emerald-400"}`}>{statusText(e)}</div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )

  if (snap === undefined) return <div className="min-h-screen bg-[#0b1730]" />

  return (
    <div className="min-h-screen bg-[#0b1730] pb-24 text-white lg:pb-10">
      <header className="sticky top-0 z-40 border-b border-[#1d2f58] bg-[#0b1730]/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#d4af55]">NC United · Super 32</div>
              <h1 className="font-sans text-2xl font-bold uppercase leading-tight">Command Center</h1>
            </div>
            <div className="text-right text-[11px] text-[#8195bd]">{snap?.publishedAt ? <>{snap.recaps[0] ? `Updated after ${snap.recaps[0].label}` : "Updated"}<br />{new Date(snap.publishedAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}</> : "Sat & Sun · Oct 24–25"}</div>
          </div>
          <div className="mt-3">{toggle}</div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-4">
        {!snap || !sb ? (
          <>
            <Empty>The Command Center opens when Super 32 brackets are set. Results post after every round.</Empty>
            <AppBar />
          </>
        ) : (
          <>
            {/* Phone: one tab at a time. Desktop: every zone. */}
            <div className={tab === "home" ? "space-y-4" : "hidden space-y-4 lg:block"}>
              <ScoreboardHero sb={sb} g={g} started={started} />
            </div>
            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <div className={tab === "home" || tab === "alerts" ? "space-y-4" : "hidden space-y-4 lg:block"}>{feedPanel}</div>
              <div className="space-y-4">
                <div className={tab === "home" || tab === "recap" ? "" : "hidden lg:block"}>{recapPanel}</div>
                <div className={tab === "home" ? "" : "hidden lg:block"}>{goals}</div>
              </div>
            </div>
            <div className={tab === "home" || tab === "watch" ? "" : "hidden lg:block"}>{watchPanel}</div>
            {tab === "recap" && recaps.length > 1 && (
              <div className="space-y-4 lg:hidden">{recaps.slice(1).map((r) => <Panel key={r.at + r.gender} title={`${r.label} recap`} right={<span className="text-xs text-[#8195bd]">{new Date(r.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>}><RecapCard r={r} /></Panel>)}</div>
            )}
            <div className={tab === "wrestlers" ? "" : "hidden lg:block"}>{listPanel}</div>
            <AppBar />
          </>
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#1d2f58] bg-[#0b1730]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {([["home", "Home"], ["watch", "Watch"], ["wrestlers", "Wrestlers"], ["recap", "Recap"], ["alerts", "Big wins"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => { setTab(k); window.scrollTo({ top: 0 }) }} className={`py-3 text-xs font-semibold ${tab === k ? "text-[#d4af55]" : "text-[#8195bd]"}`}>{label}</button>
          ))}
        </div>
      </nav>

      {open && <WrestlerSheet e={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
