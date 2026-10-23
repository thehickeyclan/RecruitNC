"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { SnapshotData } from "@/lib/super32-live/snapshot"

type Alert = { id: string; kind: string; title: string; body: string; status: string; created_at: string; sent_at: string | null; sent_count: number | null }
type Upload = { id: string; kind: string; file_name: string | null; seeds_final: boolean; created_at: string }
type State = {
  snapshot: { id: string; data: SnapshotData; published: boolean; created_at: string } | null
  publishedId: string | null
  uploads: Upload[]
  alerts: Alert[]
  pushEnabled: boolean
}

const t = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "")

export default function Super32LiveAdmin() {
  const [s, setS] = useState<State | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [final, setFinal] = useState(false)

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/super32-live", { cache: "no-store" })
    const j = await r.json()
    if (!r.ok) setMsg(j.error ?? "Could not load")
    else setS(j)
  }, [])
  useEffect(() => { void load() }, [load])

  const post = async (body: Record<string, unknown>, label: string) => {
    setBusy(label); setMsg(null)
    const r = await fetch("/api/admin/super32-live", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const j = await r.json().catch(() => ({}))
    setBusy(null)
    if (!r.ok) setMsg(j.error ?? "Failed")
    else setMsg(body.action === "upload" || body.action === "rebuild" ? `Snapshot built. ${j.alertsQueued ?? 0} new alerts queued.` : body.action === "send" ? `Sent to ${j.sent} devices.` : body.action === "publish" ? (j.syncError ? `Published. Profiles not updated: ${j.syncError}` : j.synced ? `Published. Profiles updated: ${j.synced.results} NC records, ${j.synced.bouts} bout rows.` : "Published.") : "Done.")
    await load()
  }

  const upload = async (kind: "flo" | "seeds", file: File | undefined) => {
    if (!file) return
    const content = await file.text()
    await post({ action: "upload", kind, fileName: file.name, content, seedsFinal: kind === "seeds" ? final : false }, kind)
  }

  const d = s?.snapshot?.data
  const pending = s?.alerts.filter((a) => a.status === "pending") ?? []
  const held = s?.alerts.filter((a) => a.status === "held") ?? []
  const done = s?.alerts.filter((a) => a.status === "sent" || a.status === "dismissed") ?? []

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Super 32 Command Center</h1>
          <Link href="/super32/live" className="text-sm underline" target="_blank">Open the live page</Link>
        </div>
        {msg && <div className="rounded-md border bg-muted px-4 py-2 text-sm">{msg}</div>}

        <Card>
          <CardHeader><CardTitle>1. Upload</CardTitle></CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <div className="font-medium">Seeds (CSV: gender, weight, seed, name, state)</div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={final} onChange={(e) => setFinal(e.target.checked)} />
                These are the FINAL seeds (after weigh-ins). Only final seeds tier wins and alert.
              </label>
              <input type="file" accept=".csv,text/csv" disabled={!!busy} onChange={(e) => upload("seeds", e.target.files?.[0])} />
            </div>
            <div className="space-y-2">
              <div className="font-medium">Flo export (CSV), after every round</div>
              <p className="text-sm text-muted-foreground">Upload the whole export each time. Re-uploading the same bouts never double-counts or re-alerts.</p>
              <input type="file" accept=".csv,text/csv" disabled={!!busy} onChange={(e) => upload("flo", e.target.files?.[0])} />
            </div>
            <div className="text-sm text-muted-foreground md:col-span-2">
              {busy ? `Working on ${busy}...` : `Latest: ${s?.uploads.slice(0, 3).map((u) => `${u.kind}${u.seeds_final ? " (final)" : ""} ${u.file_name ?? ""} at ${t(u.created_at)}`).join(" · ") || "nothing uploaded yet"}`}
              <Button variant="outline" size="sm" className="ml-3" disabled={!!busy} onClick={() => post({ action: "rebuild" }, "rebuild")}>Rebuild snapshot</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>2. Review, then publish</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            {!d ? <p>No snapshot yet.</p> : (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {([["NC record", `${d.scoreboards.all.wins}-${d.scoreboards.all.losses}`], ["Wrestlers", d.scoreboards.all.wrestlers], ["Huge · Big", `${d.scoreboards.all.huge} · ${d.scoreboards.all.big}`], ["Seeds", d.seedsFinal ? "FINAL" : "preliminary"]] as const).map(([k, v]) => (
                    <div key={k} className="rounded-md border p-3"><div className="text-muted-foreground">{k}</div><div className="text-lg font-semibold">{v}</div></div>
                  ))}
                </div>
                <div>
                  <div className="font-medium">Brackets picked ({d.brackets.length})</div>
                  <p className="text-muted-foreground">{d.brackets.map((b) => `${b.gender === "girls" ? "G" : "B"}${b.weight}: ${b.entrants}${b.how === "seeds" ? ` (${b.seedsMatched} seeds)` : " (largest)"}`).join(" · ") || "none"}</p>
                </div>
                {d.unresolved.length > 0 && (
                  <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
                    <div className="font-medium">Check these weights</div>
                    <ul className="list-disc pl-5">{d.unresolved.map((u) => <li key={u}>{u}</li>)}</ul>
                  </div>
                )}
                {d.unmatched.length > 0 && (
                  <details className="rounded-md border p-3">
                    <summary className="cursor-pointer font-medium">{d.unmatched.length} NC entrants not linked to a profile (their alerts are held)</summary>
                    <ul className="mt-2 list-disc pl-5">{d.unmatched.map((u) => <li key={u}>{u}</li>)}</ul>
                  </details>
                )}
                <div className="flex items-center gap-3">
                  <Button disabled={!!busy || s?.publishedId === s?.snapshot?.id} onClick={() => post({ action: "publish", snapshotId: s!.snapshot!.id }, "publish")}>
                    {s?.publishedId === s?.snapshot?.id ? "Published" : "Publish this snapshot"}
                  </Button>
                  <span className="text-muted-foreground">Built {t(s!.snapshot!.created_at)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>3. Alerts {s && !s.pushEnabled && <span className="ml-2 text-sm font-normal text-red-500">push is off (SUPER32_LIVE_PUSH)</span>}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">Nothing sends until you tap Send. One statewide alert per 20 minutes; fold the rest into the round recap.</p>
            {pending.length === 0 && <p>No alerts waiting.</p>}
            {pending.map((a) => (
              <div key={a.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs uppercase text-muted-foreground">{a.kind} · {t(a.created_at)}</div>
                  <div className="font-semibold">{a.title}</div>
                  <div>{a.body}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={!!busy} onClick={() => confirm(`Send to every NC United iPhone with results alerts on?\n\n${a.title}\n${a.body}`) && post({ action: "send", alertId: a.id }, "send")}>Send</Button>
                  <Button size="sm" variant="outline" disabled={!!busy} onClick={() => post({ action: "dismiss", alertId: a.id }, "dismiss")}>Dismiss</Button>
                </div>
              </div>
            ))}
            {held.length > 0 && (
              <details className="rounded-md border p-3">
                <summary className="cursor-pointer font-medium">{held.length} held (name not linked to a profile)</summary>
                {held.map((a) => (
                  <div key={a.id} className="mt-2 flex items-center justify-between gap-3">
                    <span>{a.body}</span>
                    <Button size="sm" variant="outline" onClick={() => post({ action: "restore", alertId: a.id }, "restore")}>Move to queue</Button>
                  </div>
                ))}
              </details>
            )}
            {done.length > 0 && (
              <details className="rounded-md border p-3">
                <summary className="cursor-pointer font-medium">{done.length} sent or dismissed</summary>
                {done.map((a) => <div key={a.id} className="mt-1 text-muted-foreground">{a.status === "sent" ? `Sent ${t(a.sent_at)} to ${a.sent_count ?? "?"}` : "Dismissed"} · {a.body}</div>)}
              </details>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
