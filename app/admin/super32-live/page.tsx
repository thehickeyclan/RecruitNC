"use client"

/**
 * Super 32 admin command center (Matt, 23 Oct 2026): everything on one screen, on brand.
 * Status strip, uploads, publish, scoreboard, this round's Huge/Big wins, the alert queue,
 * custom alerts (with a test to your own phone), sent history and the review lists.
 */
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import type { FeedItem, SnapshotData } from "@/lib/super32-live/snapshot"
import { commandCenterFont } from "@/app/super32/live/font"

type Alert = { id: string; kind: string; title: string; body: string; status: string; created_at: string; sent_at: string | null; sent_count: number | null }
type Upload = { id: string; kind: string; file_name: string | null; seeds_final: boolean; created_at: string }
type State = {
  snapshot: { id: string; data: SnapshotData; published: boolean; created_at: string } | null
  publishedId: string | null
  uploads: Upload[]
  alerts: Alert[]
  pushEnabled: boolean
  audience: number | null
  myDevices: number
  capMinutes: number
}
type G = "all" | "boys" | "girls"

const H = "font-[family-name:var(--font-cc)] uppercase tracking-wide"
const time = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—")
const ago = (iso: string | null | undefined) => {
  if (!iso) return "never"
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)}h ${m % 60}m ago`
}
const KIND: Record<string, string> = { recap: "Round alert", custom: "Custom", test: "Test", huge: "Huge win", aa: "All-American", finals: "Finals", champion: "Champion" }

function Card({ title, right, children, className = "" }: { title: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-[#1f3360] bg-[#0f1f3f] ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-[#1f3360] px-4 py-3">
        <h2 className={`${H} flex items-center gap-2 text-lg text-white`}><span className="h-4 w-1 rounded bg-[#d4af55]" />{title}</h2>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function Stat({ label, value, sub, tone = "white" }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "white" | "gold" | "red" | "green" }) {
  const color = { white: "text-white", gold: "text-[#d4af55]", red: "text-[#ff5a4f]", green: "text-emerald-400" }[tone]
  return (
    <div className="rounded-lg border border-[#1f3360] bg-[#0b1730] px-3 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8195bd]">{label}</div>
      <div className={`${H} mt-1 text-2xl leading-tight ${color}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-[#9fb0cf]">{sub}</div>}
    </div>
  )
}

function Btn({ children, onClick, disabled, tone = "gold" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; tone?: "gold" | "ghost" | "red" }) {
  const cls = {
    gold: "bg-[#d4af55] text-[#0b1730] hover:bg-[#e3c470]",
    ghost: "border border-[#2c4170] text-[#c9d4ea] hover:bg-[#13244a]",
    red: "bg-[#e5372c] text-white hover:bg-[#f0473c]",
  }[tone]
  return <button onClick={onClick} disabled={disabled} className={`rounded-md px-3.5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${cls}`}>{children}</button>
}

/** What the alert looks like on a lock screen. */
function PhonePreview({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-white/95 p-3 text-[#0b1730] shadow-lg">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0b1730] text-[9px] font-black text-white">NC</div>
        <span className="text-[11px] font-semibold uppercase text-[#4a5677]">NC United</span>
        <span className="ml-auto text-[11px] text-[#4a5677]">now</span>
      </div>
      <div className="mt-1.5 text-sm font-bold leading-snug">{title || "Alert title"}</div>
      <div className="line-clamp-4 text-sm leading-snug text-[#3a4566]">{body || "Alert message"}</div>
    </div>
  )
}

function WinList({ items, isNew }: { items: FeedItem[]; isNew: (f: FeedItem) => boolean }) {
  if (!items.length) return <p className="text-sm text-[#8195bd]">None yet.</p>
  return (
    <ul className="divide-y divide-[#1f3360]">
      {items.map((f) => (
        <li key={f.key} className="flex items-start gap-3 py-2 text-sm">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-white">{f.name}</span>
              <span className="text-xs text-[#8195bd]">{f.gender === "girls" ? "G" : ""}{f.weight}</span>
              {f.upset && <span className="rounded-sm bg-[#7c5cff] px-1 text-[10px] font-bold text-white">UPSET</span>}
              {isNew(f) && <span className="rounded-sm bg-emerald-500/20 px-1 text-[10px] font-bold text-emerald-300">NEW THIS UPLOAD</span>}
            </div>
            <div className="truncate text-xs text-[#c9d4ea]">def. {f.opponent} ({f.opponentTeam}), {f.reasons[0]}</div>
          </div>
          <div className="shrink-0 text-right text-xs text-[#8195bd]">{[f.winType, f.result].filter(Boolean).join(" ")}<br />{f.round}</div>
        </li>
      ))}
    </ul>
  )
}

export default function Super32LiveAdmin() {
  const [s, setS] = useState<State | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [final, setFinal] = useState(false)
  const [g, setG] = useState<G>("all")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [, tick] = useState(0)

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/super32-live", { cache: "no-store" })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) setMsg({ text: j.error ?? "Could not load", ok: false })
    else setS(j)
  }, [])
  useEffect(() => {
    void load()
    const a = setInterval(load, 30_000)
    const b = setInterval(() => tick((n) => n + 1), 15_000)
    return () => { clearInterval(a); clearInterval(b) }
  }, [load])

  const post = async (payload: Record<string, unknown>, label: string): Promise<boolean> => {
    setBusy(label); setMsg(null)
    const r = await fetch("/api/admin/super32-live", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    const j = await r.json().catch(() => ({}))
    setBusy(null)
    if (!r.ok) setMsg({ text: j.error ?? "Failed", ok: false })
    else {
      const a = payload.action
      setMsg({
        ok: true,
        text: a === "upload" || a === "rebuild" ? `Results processed. ${j.alertsQueued ?? 0} new alert${j.alertsQueued === 1 ? "" : "s"} waiting. Check below, then Publish.`
          : a === "send" || a === "custom" ? `Sent to ${j.sent} phones${j.failed ? ` (${j.failed} failed)` : ""}.`
          : a === "test" ? `Test sent to your phone${j.sent === 1 ? "" : "s"} (${j.sent}).`
          : a === "publish" ? (j.syncError ? `Published. Profiles not updated: ${j.syncError}` : j.synced ? `Published. Profiles updated: ${j.synced.results} NC records.` : "Published.")
          : "Done.",
      })
    }
    await load()
    return r.ok
  }

  const upload = async (kind: "flo" | "seeds", file: File | undefined) => {
    if (!file) return
    const content = await file.text()
    await post({ action: "upload", kind, fileName: file.name, content, seedsFinal: kind === "seeds" ? final : false }, kind)
  }

  const d = s?.snapshot?.data
  const lastFlo = s?.uploads.find((u) => u.kind === "flo")
  const lastSeeds = s?.uploads.find((u) => u.kind === "seeds")
  const sent = useMemo(() => (s?.alerts ?? []).filter((a) => a.status === "sent").sort((a, b) => (b.sent_at ?? "").localeCompare(a.sent_at ?? "")), [s])
  const lastStatewide = sent.find((a) => a.kind !== "test")
  const pending = (s?.alerts ?? []).filter((a) => a.status === "pending")
  const held = (s?.alerts ?? []).filter((a) => a.status === "held")
  const cooldownMs = lastStatewide?.sent_at ? new Date(lastStatewide.sent_at).getTime() + (s?.capMinutes ?? 20) * 60_000 - Date.now() : 0
  const cooldown = cooldownMs > 0 ? `${Math.ceil(cooldownMs / 60000)} min` : "now"
  const unpublished = !!s?.snapshot && s.snapshot.id !== s.publishedId
  const sb = d?.scoreboards[g]
  const feed = (d?.feed ?? []).filter((f) => g === "all" || f.gender === g)
  const isNew = (f: FeedItem) => !!d && f.seenAt === d.generatedAt
  const round = d?.recaps[0]?.label

  const sendAlert = (a: Alert) => {
    if (!confirm(`Send to ${s?.audience ?? "every"} NC United phones?\n\n${a.title}\n${a.body}`)) return
    void post({ action: "send", alertId: a.id }, "send")
  }
  const sendCustom = async () => {
    if (!confirm(`Send to ${s?.audience ?? "every"} NC United phones?\n\n${title}\n${body}`)) return
    if (await post({ action: "custom", title, body }, "custom")) { setTitle(""); setBody("") }
  }

  return (
    <div className={`${commandCenterFont.variable} min-h-screen bg-[#0a1630] text-white`}>
      <header className="border-b border-[#1f3360] bg-[radial-gradient(ellipse_at_70%_0%,#1d3a78_0%,#0a1630_60%)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-3 px-4 py-5">
          <div>
            <div className={`${H} text-sm text-[#e5372c]`}>Admin</div>
            <h1 className={`${H} text-4xl leading-none md:text-5xl`}>Super 32 HQ</h1>
          </div>
          <div className="flex items-center gap-2">
            <Btn tone="ghost" onClick={() => void load()}>Refresh</Btn>
            <Link href="/super32/live" target="_blank" className="rounded-md border border-[#d4af55]/60 px-3.5 py-2 text-sm font-semibold text-[#d4af55]">Open live page ↗</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5">
        {msg && <div className={`rounded-lg border px-4 py-3 text-sm ${msg.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-[#e5372c]/50 bg-[#e5372c]/10 text-red-200"}`}>{msg.text}</div>}
        {busy && <div className="rounded-lg border border-[#2c4170] bg-[#13244a] px-4 py-3 text-sm text-[#c9d4ea]">Working on {busy}…</div>}

        {/* Status strip */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Stat label="Last results upload" value={ago(lastFlo?.created_at)} sub={lastFlo ? `${time(lastFlo.created_at)}${round ? ` · ${round}` : ""}` : "No Flo export yet"} />
          <Stat label="Seeds" value={lastSeeds ? (lastSeeds.seeds_final ? "Final" : "Preliminary") : "None"} tone={lastSeeds?.seeds_final ? "green" : "gold"} sub={lastSeeds ? `${time(lastSeeds.created_at)} · tiers ${lastSeeds.seeds_final ? "on" : "wait for final"}` : "Upload seeds"} />
          <Stat label="Live page" value={unpublished ? "Unpublished" : s?.publishedId ? "Up to date" : "Not live"} tone={unpublished ? "gold" : s?.publishedId ? "green" : "red"} sub={unpublished ? "Newer results waiting · Publish" : d ? `Built ${time(s?.snapshot?.created_at)}` : ""} />
          <Stat label="Push alerts" value={s?.pushEnabled ? "On" : "Off"} tone={s?.pushEnabled ? "green" : "red"} sub={`${s?.audience ?? "?"} phones · ${s?.myDevices ?? 0} yours`} />
          <Stat label="Last alert sent" value={ago(lastStatewide?.sent_at)} sub={`Next allowed: ${cooldown}`} />
          <Stat label="Alerts waiting" value={pending.length} tone={pending.length ? "gold" : "white"} sub={held.length ? `${held.length} held` : "Queue below"} />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <Card title="1 · Upload">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block cursor-pointer rounded-lg border-2 border-dashed border-[#2c4170] p-4 text-center hover:border-[#d4af55]/60">
                <div className={`${H} text-lg text-white`}>Flo export</div>
                <div className="mt-1 text-xs text-[#9fb0cf]">CSV, the whole export after every round. Re-uploading never double-counts.</div>
                <input type="file" accept=".csv,text/csv" className="hidden" disabled={!!busy} onChange={(e) => { void upload("flo", e.target.files?.[0]); e.target.value = "" }} />
                <div className="mt-3 inline-block rounded-md bg-[#d4af55] px-3 py-1.5 text-sm font-semibold text-[#0b1730]">Choose file</div>
              </label>
              <label className="block cursor-pointer rounded-lg border-2 border-dashed border-[#2c4170] p-4 text-center hover:border-[#d4af55]/60">
                <div className={`${H} text-lg text-white`}>Seeds</div>
                <div className="mt-1 text-xs text-[#9fb0cf]">CSV: gender, weight, seed, name, state.</div>
                <input type="file" accept=".csv,text/csv" className="hidden" disabled={!!busy} onChange={(e) => { void upload("seeds", e.target.files?.[0]); e.target.value = "" }} />
                <div className="mt-3 inline-block rounded-md border border-[#d4af55]/60 px-3 py-1.5 text-sm font-semibold text-[#d4af55]">Choose file</div>
              </label>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-[#c9d4ea]">
              <input type="checkbox" checked={final} onChange={(e) => setFinal(e.target.checked)} />
              These are the <b className="text-white">final</b> seeds (after weigh-ins). Only final seeds tier wins and queue alerts.
            </label>
          </Card>

          <Card title="2 · Publish" right={<Btn tone="ghost" disabled={!!busy} onClick={() => void post({ action: "rebuild" }, "rebuild")}>Rebuild</Btn>}>
            {!d ? <p className="text-sm text-[#8195bd]">Upload seeds or a Flo export to build the page.</p> : (
              <div className="space-y-3">
                <p className="text-sm text-[#c9d4ea]">
                  {unpublished ? "New results are ready. Publishing updates the live page, profiles and coach reports." : "The live page shows the latest results."}
                </p>
                <Btn disabled={!!busy || !unpublished} onClick={() => void post({ action: "publish", snapshotId: s!.snapshot!.id }, "publish")}>
                  {unpublished ? "Publish to the live page" : "Published"}
                </Btn>
                <div className="text-xs text-[#8195bd]">Seeds {d.seedsFinal ? "final" : "preliminary"} · {d.entrants.length} NC wrestlers · built {time(s?.snapshot?.created_at)}</div>
              </div>
            )}
          </Card>
        </div>

        {d && sb && (
          <Card title="NC scoreboard" right={
            <div className="flex gap-1">{(["all", "boys", "girls"] as const).map((k) => (
              <button key={k} onClick={() => setG(k)} className={`rounded px-2.5 py-1 text-xs font-semibold ${g === k ? "bg-[#d4af55] text-[#0b1730]" : "bg-[#13244a] text-[#c9d4ea]"}`}>{k === "all" ? "All" : k === "boys" ? "Men" : "Women"}</button>
            ))}</div>
          }>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              <Stat label="Record" value={`${sb.wins}-${sb.losses}`} />
              <Stat label="Still alive" value={sb.stillAlive} sub={`${sb.aliveChamp} champ · ${sb.aliveConsi} consi`} />
              <Stat label="Huge wins" value={sb.huge} tone="red" />
              <Stat label="Big wins" value={sb.big} tone="gold" />
              <Stat label="Seeded wins" value={sb.seededWins} />
              <Stat label="All-Americans" value={sb.allAmericans} />
              <Stat label="Finalists" value={sb.finalists} />
              <Stat label="Winning records" value={sb.winningRecords} />
            </div>
          </Card>
        )}

        {d && (
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title={`Huge wins (${feed.filter((f) => f.tier === "huge").length})`}><WinList items={feed.filter((f) => f.tier === "huge")} isNew={isNew} /></Card>
            <Card title={`Big wins (${feed.filter((f) => f.tier === "big").length})`}><div className="max-h-[420px] overflow-y-auto"><WinList items={feed.filter((f) => f.tier === "big")} isNew={isNew} /></div></Card>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <Card title={`3 · Alerts waiting (${pending.length})`} right={!s?.pushEnabled ? <span className="text-xs font-semibold text-[#ff5a4f]">Push is off</span> : <span className="text-xs text-[#8195bd]">Next allowed: {cooldown}</span>}>
            {pending.length === 0 ? <p className="text-sm text-[#8195bd]">Nothing waiting. Each upload queues one round alert here.</p> : (
              <div className="space-y-4">
                {pending.map((a) => (
                  <div key={a.id} className="grid gap-3 rounded-lg border border-[#1f3360] bg-[#0b1730] p-3 sm:grid-cols-[1fr_auto]">
                    <div>
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#d4af55]">{KIND[a.kind] ?? a.kind} · queued {time(a.created_at)}</div>
                      <PhonePreview title={a.title} body={a.body} />
                    </div>
                    <div className="flex gap-2 sm:flex-col">
                      <Btn disabled={!!busy || !s?.pushEnabled} onClick={() => sendAlert(a)}>Send</Btn>
                      <Btn tone="ghost" disabled={!!busy} onClick={() => void post({ action: "dismiss", alertId: a.id }, "dismiss")}>Dismiss</Btn>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {held.length > 0 && (
              <details className="mt-4 rounded-lg border border-[#1f3360] p-3 text-sm">
                <summary className="cursor-pointer text-[#c9d4ea]">{held.length} held (names a wrestler not linked to a profile)</summary>
                {held.map((a) => (
                  <div key={a.id} className="mt-2 flex items-center justify-between gap-3 text-[#9fb0cf]">
                    <span>{a.body}</span>
                    <Btn tone="ghost" onClick={() => void post({ action: "restore", alertId: a.id }, "restore")}>Move to queue</Btn>
                  </div>
                ))}
              </details>
            )}
          </Card>

          <Card title="Custom alert">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-[#9fb0cf]"><span>Title</span><span className={title.length > 60 ? "text-[#ff5a4f]" : ""}>{title.length}/60</span></div>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Super 32 · Quarterfinals underway" className="mt-1 w-full rounded-md border border-[#1f3360] bg-[#0b1730] px-3 py-2 text-sm text-white placeholder:text-[#6f83ab]" />
              </div>
              <div>
                <div className="flex justify-between text-xs text-[#9fb0cf]"><span>Message</span><span className={body.length > 178 ? "text-[#ff5a4f]" : ""}>{body.length}/178</span></div>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Short and factual. Shows about 4 lines on a lock screen." className="mt-1 w-full rounded-md border border-[#1f3360] bg-[#0b1730] px-3 py-2 text-sm text-white placeholder:text-[#6f83ab]" />
              </div>
              <PhonePreview title={title} body={body} />
              <div className="flex flex-wrap gap-2">
                <Btn tone="ghost" disabled={!!busy || !title.trim() || !body.trim()} onClick={() => void post({ action: "test", title, body }, "test")}>Send test to my phone</Btn>
                <Btn disabled={!!busy || !title.trim() || !body.trim() || !s?.pushEnabled} onClick={() => void sendCustom()}>Send to everyone</Btn>
              </div>
              <p className="text-xs text-[#8195bd]">Taps open Super 32 HQ. Everyone = {s?.audience ?? "?"} phones with Results alerts on. The test goes to your phone only and works even with push off.</p>
            </div>
          </Card>
        </div>

        <Card title={`Sent (${sent.length})`}>
          {sent.length === 0 ? <p className="text-sm text-[#8195bd]">No alerts sent yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-[#8195bd]"><tr><th className="py-2 pr-3">Time</th><th className="pr-3">Type</th><th className="pr-3">Alert</th><th className="text-right">Phones</th></tr></thead>
                <tbody className="divide-y divide-[#1f3360]">
                  {sent.map((a) => (
                    <tr key={a.id} className="align-top">
                      <td className="whitespace-nowrap py-2 pr-3 text-[#c9d4ea]">{time(a.sent_at)}</td>
                      <td className="whitespace-nowrap pr-3"><span className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${a.kind === "test" ? "bg-[#1b2d57] text-[#9fb0cf]" : "bg-[#d4af55] text-[#0b1730]"}`}>{KIND[a.kind] ?? a.kind}</span></td>
                      <td className="py-2 pr-3"><div className="font-semibold text-white">{a.title}</div><div className="text-[#9fb0cf]">{a.body}</div></td>
                      <td className="text-right text-white">{a.sent_count ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {d && (d.unresolved.length > 0 || d.unmatched.length > 0 || d.brackets.length > 0) && (
          <Card title="Review">
            <div className="space-y-3 text-sm">
              {d.unresolved.length > 0 && (
                <div className="rounded-lg border border-[#d4af55]/40 bg-[#d4af55]/10 p-3">
                  <div className="font-semibold text-[#d4af55]">Check these weights</div>
                  <ul className="mt-1 list-disc pl-5 text-[#c9d4ea]">{d.unresolved.map((u) => <li key={u}>{u}</li>)}</ul>
                </div>
              )}
              {d.unmatched.length > 0 && (
                <details className="rounded-lg border border-[#1f3360] p-3">
                  <summary className="cursor-pointer text-[#c9d4ea]">{d.unmatched.length} NC wrestlers not linked to a profile (no photo, and never named in alerts)</summary>
                  <ul className="mt-2 list-disc pl-5 text-[#9fb0cf]">{d.unmatched.map((u) => <li key={u}>{u}</li>)}</ul>
                </details>
              )}
              {d.brackets.length > 0 && (
                <details className="rounded-lg border border-[#1f3360] p-3">
                  <summary className="cursor-pointer text-[#c9d4ea]">Brackets picked ({d.brackets.length})</summary>
                  <p className="mt-2 text-[#9fb0cf]">{d.brackets.map((b) => `${b.gender === "girls" ? "G" : "B"}${b.weight}: ${b.entrants}${b.how === "seeds" ? ` (${b.seedsMatched} seeds)` : " (largest)"}`).join(" · ")}</p>
                </details>
              )}
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}
