"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { AdminHeader } from "@/components/admin-header"
import { HardLink } from "@/components/hard-link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Check, Loader2, RefreshCw, Upload, X } from "lucide-react"
import {
  DATASET_DUAL_TEAM,
  DATASET_PLACERS,
  type DatasetKey,
} from "@/lib/public-imports/types"

type Batch = {
  id: string
  dataset_key: string
  source_label: string | null
  source_url: string | null
  year: number | null
  status: string
  summary: { total?: number; new?: number; match?: number; changed?: number } | null
  created_at: string
}

type ImportRow = {
  id: string
  natural_key: string
  diff_status: string
  proposed: Record<string, unknown>
  existing: Record<string, unknown> | null
  status: string
  promote_error: string | null
}

export default function AdminImportsPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  const [batches, setBatches] = useState<Batch[]>([])
  const [setupRequired, setSetupRequired] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dataset, setDataset] = useState<DatasetKey>(DATASET_PLACERS)
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [fetchUrl, setFetchUrl] = useState(
    "https://www.nchsaa.org/2025-individual-wrestling-championships/",
  )
  const [paste, setPaste] = useState("")
  const [staging, setStaging] = useState(false)
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [activeBatch, setActiveBatch] = useState<Batch | null>(null)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [acting, setActing] = useState(false)

  const loadBatches = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/imports?limit=30", {
        cache: "no-store",
        credentials: "include",
      })
      const data = await res.json().catch(() => ({}))
      if (data.setupRequired) setSetupRequired(true)
      if (!res.ok && !data.setupRequired) throw new Error(data.error || "Failed to load")
      setBatches(data.batches ?? [])
      setSetupRequired(Boolean(data.setupRequired))
    } catch (e) {
      toast({
        title: "Load failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const loadBatch = useCallback(
    async (id: string) => {
      setActiveBatchId(id)
      try {
        const res = await fetch(`/api/admin/imports/${id}?status=actionable`, {
          cache: "no-store",
          credentials: "include",
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || "Failed to load batch")
        setActiveBatch(data.batch)
        setRows(data.rows ?? [])
        const sel: Record<string, boolean> = {}
        for (const r of data.rows ?? []) {
          if (r.diff_status === "new" || r.diff_status === "changed") sel[r.id] = true
        }
        setSelected(sel)
      } catch (e) {
        toast({
          title: "Batch load failed",
          description: e instanceof Error ? e.message : "Error",
          variant: "destructive",
        })
      }
    },
    [toast],
  )

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      window.location.href = `/auth/signin?redirectTo=${encodeURIComponent("/admin/imports")}`
      return
    }
    if (!isAdmin) {
      window.location.href = "/"
      return
    }
    void loadBatches()
  }, [user, isAdmin, authLoading, loadBatches])

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([id]) => id),
    [selected],
  )

  async function stagePaste() {
    setStaging(true)
    try {
      let json: unknown = undefined
      let text: string | undefined
      const trimmed = paste.trim()
      if (!trimmed) throw new Error("Paste JSON or page text first")
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        json = JSON.parse(trimmed)
      } else {
        text = trimmed
        if (dataset === DATASET_DUAL_TEAM) {
          throw new Error("Dual team staging needs JSON (year×division records or verified schools export)")
        }
      }
      const res = await fetch("/api/admin/imports/stage", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset,
          year: year ? Number(year) : null,
          source_label: "Admin paste",
          json,
          text,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Stage failed")
      toast({
        title: "Staged",
        description: `New ${data.summary?.new ?? 0} · Changed ${data.summary?.changed ?? 0} · Match ${data.summary?.match ?? 0}`,
      })
      setPaste("")
      await loadBatches()
      if (data.batch?.id) await loadBatch(data.batch.id)
    } catch (e) {
      toast({
        title: "Stage failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setStaging(false)
    }
  }

  async function stageFetch() {
    setStaging(true)
    try {
      const res = await fetch("/api/admin/imports/fetch", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: fetchUrl,
          year: year ? Number(year) : null,
          source_label: `NCHSAA ${year}`,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Fetch failed")
      toast({
        title: "Fetched & staged",
        description: `New ${data.summary?.new ?? 0} · Changed ${data.summary?.changed ?? 0} · Match ${data.summary?.match ?? 0}`,
      })
      await loadBatches()
      if (data.batch?.id) await loadBatch(data.batch.id)
    } catch (e) {
      toast({
        title: "Fetch failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setStaging(false)
    }
  }

  async function act(action: "approve" | "reject") {
    if (!activeBatchId) return
    if (!selectedIds.length) {
      toast({ title: "Select rows first", variant: "destructive" })
      return
    }
    setActing(true)
    try {
      const res = await fetch(`/api/admin/imports/${activeBatchId}/approve`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, row_ids: selectedIds }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Action failed")
      toast({
        title: action === "approve" ? "Promoted" : "Rejected",
        description: `Approved ${data.approved ?? 0} · Rejected ${data.rejected ?? 0}${
          data.failed?.length ? ` · Failed ${data.failed.length}` : ""
        }`,
      })
      await loadBatches()
      await loadBatch(activeBatchId)
    } catch (e) {
      toast({
        title: "Action failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setActing(false)
    }
  }

  function rowLabel(r: ImportRow) {
    const p = r.proposed
    if (p.wrestler_name) {
      return `${p.year} ${p.classification} ${p.weight_class} #${p.place} — ${p.wrestler_name} (${p.school})`
    }
    return `${p.year} ${p.division} — ${p.champion_school}`
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <HardLink
              href="/admin"
              className="inline-flex items-center gap-1 text-sm text-[#003366] underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Admin
            </HardLink>
            <h1 className="mt-2 text-2xl font-bold text-[#13294B]">Public source imports</h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Stage official NCHSAA results, review diffs, then approve into RecruitNC. Nothing
              publishes until you verify.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadBatches()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>

        {setupRequired ? (
          <Card className="border-amber-300 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-amber-950">Setup required</CardTitle>
              <CardDescription className="text-amber-900">
                Run <code className="text-xs">scripts/public-source-imports-setup.sql</code> in the
                Supabase SQL Editor, then refresh.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stage a batch</CardTitle>
              <CardDescription>
                Placers: paste Guaranteed Places text / JSON, or fetch an nchsaa.org page. Duals:
                paste year×division JSON (or verified school leaderboard).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={dataset === DATASET_PLACERS ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDataset(DATASET_PLACERS)}
                >
                  Individual placers
                </Button>
                <Button
                  type="button"
                  variant={dataset === DATASET_DUAL_TEAM ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDataset(DATASET_DUAL_TEAM)}
                >
                  Dual team champs
                </Button>
              </div>
              <div className="space-y-1">
                <Label htmlFor="year">Year</Label>
                <Input id="year" value={year} onChange={(e) => setYear(e.target.value)} />
              </div>
              {dataset === DATASET_PLACERS ? (
                <div className="space-y-2">
                  <Label htmlFor="url">NCHSAA page URL</Label>
                  <Input id="url" value={fetchUrl} onChange={(e) => setFetchUrl(e.target.value)} />
                  <Button type="button" onClick={() => void stageFetch()} disabled={staging}>
                    {staging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    <span className="ml-2">Fetch &amp; stage placers</span>
                  </Button>
                </div>
              ) : null}
              <div className="space-y-1">
                <Label htmlFor="paste">Or paste JSON / page text</Label>
                <Textarea
                  id="paste"
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  rows={8}
                  placeholder={
                    dataset === DATASET_DUAL_TEAM
                      ? `{ "records": [ { "year": 2025, "division": "4A", "champion_school": "..." } ] }`
                      : `{ "year": 2025, "classifications": [ ... ] }  — or Guaranteed Places text`
                  }
                  className="font-mono text-xs"
                />
              </div>
              <Button type="button" onClick={() => void stagePaste()} disabled={staging}>
                {staging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span className="ml-2">Stage paste</span>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent batches</CardTitle>
              <CardDescription>Open a batch to review new/changed rows.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : batches.length === 0 ? (
                <p className="text-sm text-slate-500">No batches yet.</p>
              ) : (
                batches.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => void loadBatch(b.id)}
                    className={`w-full text-left rounded-md border px-3 py-2 text-sm hover:bg-slate-100 ${
                      activeBatchId === b.id ? "border-[#003366] bg-slate-100" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[#13294B]">
                        {b.dataset_key.replace(/_/g, " ")}
                        {b.year != null ? ` · ${b.year}` : ""}
                      </span>
                      <Badge variant="outline">{b.status}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      New {b.summary?.new ?? 0} · Changed {b.summary?.changed ?? 0} · Match{" "}
                      {b.summary?.match ?? 0}
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {activeBatch ? (
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Review · {activeBatch.dataset_key}</CardTitle>
                <CardDescription>
                  {activeBatch.source_label || "Staged batch"}
                  {activeBatch.source_url ? (
                    <>
                      {" "}
                      ·{" "}
                      <a
                        href={activeBatch.source_url}
                        className="underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        source
                      </a>
                    </>
                  ) : null}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void act("approve")}
                  disabled={acting || !selectedIds.length}
                >
                  {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  <span className="ml-2">Approve selected ({selectedIds.length})</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void act("reject")}
                  disabled={acting || !selectedIds.length}
                >
                  <X className="h-4 w-4" />
                  <span className="ml-2">Reject selected</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {rows.length === 0 ? (
                <p className="text-sm text-slate-500">No actionable rows (all matched or already reviewed).</p>
              ) : (
                rows.map((r) => (
                  <label
                    key={r.id}
                    className="flex gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={Boolean(selected[r.id])}
                      onChange={(e) =>
                        setSelected((prev) => ({ ...prev, [r.id]: e.target.checked }))
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={r.diff_status === "new" ? "default" : "secondary"}
                          className="capitalize"
                        >
                          {r.diff_status}
                        </Badge>
                        <span className="font-medium text-[#13294B]">{rowLabel(r)}</span>
                      </span>
                      {r.existing && r.diff_status === "changed" ? (
                        <span className="mt-1 block text-xs text-slate-500">
                          Was:{" "}
                          {r.existing.wrestler_name
                            ? `${r.existing.wrestler_name} (${r.existing.school})`
                            : String(r.existing.champion_school ?? "")}
                        </span>
                      ) : null}
                      {r.promote_error ? (
                        <span className="mt-1 block text-xs text-red-600">{r.promote_error}</span>
                      ) : null}
                    </span>
                  </label>
                ))
              )}
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  )
}
