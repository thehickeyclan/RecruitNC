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
  DATASET_CLASSIFICATIONS,
  DATASET_DUAL_TEAM,
  DATASET_FARGO,
  DATASET_FARGO_BOUTS,
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
  const [connectorYears, setConnectorYears] = useState<number[]>([])
  const [dualConnectorYears, setDualConnectorYears] = useState<number[]>([])
  const [classConnectorYears, setClassConnectorYears] = useState<number[]>([])
  const [fargoConnectorYears, setFargoConnectorYears] = useState<number[]>([])
  const [fargoFullYears, setFargoFullYears] = useState<number[]>([])
  const [runningConnector, setRunningConnector] = useState(false)
  const [runningDualConnector, setRunningDualConnector] = useState(false)
  const [runningClassConnector, setRunningClassConnector] = useState(false)
  const [runningFargoConnector, setRunningFargoConnector] = useState(false)
  const [runningFargoFull, setRunningFargoFull] = useState(false)

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
    void fetch("/api/admin/imports/connectors/nchsaa-individual-states", {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.years)) setConnectorYears(d.years)
      })
      .catch(() => {})
    void fetch("/api/admin/imports/connectors/nchsaa-dual-team", {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.years)) setDualConnectorYears(d.years)
      })
      .catch(() => {})
    void fetch("/api/admin/imports/connectors/nchsaa-classifications", {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.years)) setClassConnectorYears(d.years)
      })
      .catch(() => {})
    void fetch("/api/admin/imports/connectors/fargo-nationals", {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.years)) setFargoConnectorYears(d.years)
      })
      .catch(() => {})
    void fetch("/api/admin/imports/connectors/fargo-full", {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.years)) setFargoFullYears(d.years)
      })
      .catch(() => {})
  }, [user, isAdmin, authLoading, loadBatches])

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([id]) => id),
    [selected],
  )

  async function runIndividualStatesConnector() {
    setRunningConnector(true)
    try {
      const res = await fetch("/api/admin/imports/connectors/nchsaa-individual-states", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: Number(year) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Connector failed")
      toast({
        title: `Individual States ${data.year} staged`,
        description: `${data.champions ?? 0} champions · ${data.rowCount ?? 0} rows · New ${data.summary?.new ?? 0} · Changed ${data.summary?.changed ?? 0}`,
      })
      await loadBatches()
      if (data.batch?.id) await loadBatch(data.batch.id)
    } catch (e) {
      toast({
        title: "Connector failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setRunningConnector(false)
    }
  }

  async function runDualTeamConnector() {
    setRunningDualConnector(true)
    try {
      const res = await fetch("/api/admin/imports/connectors/nchsaa-dual-team", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: Number(year) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Connector failed")
      toast({
        title: `Dual Team ${data.year} staged`,
        description: `${data.champions ?? 0} divisions · ${data.rowCount ?? 0} rows · New ${data.summary?.new ?? 0} · Changed ${data.summary?.changed ?? 0}`,
      })
      await loadBatches()
      if (data.batch?.id) await loadBatch(data.batch.id)
    } catch (e) {
      toast({
        title: "Duals connector failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setRunningDualConnector(false)
    }
  }

  async function runClassificationsConnector() {
    setRunningClassConnector(true)
    try {
      const res = await fetch("/api/admin/imports/connectors/nchsaa-classifications", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: Number(year) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Connector failed")
      toast({
        title: `Classifications ${data.year} staged`,
        description: `${data.schools ?? 0} schools · New ${data.summary?.new ?? 0} · Changed ${data.summary?.changed ?? 0} · Match ${data.summary?.match ?? 0}`,
      })
      await loadBatches()
      if (data.batch?.id) await loadBatch(data.batch.id)
    } catch (e) {
      toast({
        title: "Classifications connector failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setRunningClassConnector(false)
    }
  }

  async function runFargoNationalsConnector() {
    setRunningFargoConnector(true)
    try {
      const res = await fetch("/api/admin/imports/connectors/fargo-nationals", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: Number(year) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Connector failed")
      toast({
        title: `Fargo ${data.year} staged`,
        description: `${data.athletes ?? 0} athletes · FS ${data.freestyle ?? 0} · GR ${data.greco ?? 0} · AA ${data.allAmericans ?? 0} · New ${data.summary?.new ?? 0} · Changed ${data.summary?.changed ?? 0}`,
      })
      await loadBatches()
      if (data.batch?.id) await loadBatch(data.batch.id)
    } catch (e) {
      toast({
        title: "Fargo connector failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setRunningFargoConnector(false)
    }
  }

  async function runFargoFullConnector() {
    setRunningFargoFull(true)
    try {
      const res = await fetch("/api/admin/imports/connectors/fargo-full", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: Number(year) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Full Fargo connector failed")
      toast({
        title: `Fargo full ${data.year} staged`,
        description: data.report_summary || `${data.slots_loaded ?? 0} slots loaded`,
      })
      await loadBatches()
      const id = data.seasons_batch?.id || data.bouts_batch?.id
      if (id) await loadBatch(id)
    } catch (e) {
      toast({
        title: "Full Fargo connector failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setRunningFargoFull(false)
    }
  }

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
    if (p.opponent_name != null || p.win != null) {
      return `${p.year} ${p.style ?? ""} ${p.age_division ?? ""} ${p.weight_class} — ${p.athlete_name} ${p.win ? "W" : "L"} vs ${p.opponent_name ?? "—"} (${p.result_type ?? ""})`
    }
    if (p.athlete_name) {
      return `${p.year} ${p.style ?? ""} ${p.age_division ?? p.division} ${p.weight_class} — ${p.athlete_name} (${p.wins ?? 0}-${p.losses ?? 0}${p.is_all_american ? ", AA" : ""})`
    }
    if (p.wrestler_name) {
      return `${p.year} ${p.classification} ${p.weight_class} #${p.place} — ${p.wrestler_name} (${p.school})`
    }
    if (p.school_name) {
      return `${p.effective_year ?? p.year} ${p.classification} — ${p.school_name}${
        p.conference ? ` (${p.conference})` : ""
      }`
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
              Stage official wrestling results (NCHSAA + Fargo), review diffs, then approve into
              RecruitNC. Nothing publishes until you verify.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadBatches()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>

        <Card className="border-slate-200 bg-slate-100/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#13294B]">Annual reminders (connectors)</CardTitle>
            <CardDescription>
              Checklist so each season isn’t a scramble. Full notes:{" "}
              <HardLink href="/admin/data-dawg/analytics" className="underline">
                Data Dawg
              </HardLink>{" "}
              · see docs{" "}
              <code className="text-xs">PUBLIC-SOURCE-IMPORTS.md</code> /{" "}
              <code className="text-xs">NHSCA-YEARLY-AA-AUTOMATION.md</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
              <li>
                <span className="font-medium">February — Individual States:</span> When NCHSAA posts
                results, add that year’s URL(s) to{" "}
                <code className="text-xs">lib/public-imports/connectors/nchsaa-individual-states.ts</code>
                , deploy, then run <strong>Fetch &amp; stage Individual States</strong> below → approve.
              </li>
              <li>
                <span className="font-medium">After Duals:</span> Add that year’s URL to{" "}
                <code className="text-xs">lib/public-imports/connectors/nchsaa-dual-team.ts</code>
                , deploy, then run <strong>Fetch &amp; stage Dual Team</strong> below → approve.
                School “most titles” is derived — don’t paste aggregates as the only source of truth.
              </li>
              <li>
                <span className="font-medium">After NHSCA nationals:</span> Ship AA roster with{" "}
                <code className="text-xs">high_school</code>, register the year in{" "}
                <code className="text-xs">lib/nhsca-canonical-aa.ts</code>, then Admin → NHSCA Placements
                → <strong>Sync AA schools from yearly files</strong> (or import with schools required).
              </li>
              <li>
                <span className="font-medium">Summer — classifications:</span> When NCHSAA posts
                realignment / refreshes{" "}
                <code className="text-xs">nchsaa.org/schools/</code>, register the season year in{" "}
                <code className="text-xs">lib/public-imports/connectors/nchsaa-classifications.ts</code>
                , deploy, run <strong>Fetch &amp; stage Classifications</strong> → approve. First-time
                DB: also run{" "}
                <code className="text-xs">scripts/school-classification-years-setup.sql</code>.
              </li>
              <li>
                <span className="font-medium">After Fargo (July):</span> Update / add CSVs under{" "}
                <code className="text-xs">scripts/data/fargo/</code>, register the year in{" "}
                <code className="text-xs">lib/public-imports/connectors/fargo-nationals.ts</code>
                , run <strong>Stage Fargo Nationals</strong> → approve. First-time DB:{" "}
                <code className="text-xs">scripts/fargo-results-harden-setup.sql</code>. FS and GR are
                separate careers — never merge. Flo is never SoR. Roadmap:{" "}
                <code className="text-xs">docs/FARGO-NATIONALS-CONNECTOR.md</code>.
              </li>
              <li>
                <span className="font-medium">Never:</span> auto-publish scrapes, or scrape NCHSAA on
                every profile/state page load — always stage → review → promote.
              </li>
            </ol>
          </CardContent>
        </Card>

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

        <Card className="border-[#003366]/30 bg-white">
          <CardHeader>
            <CardTitle className="text-lg text-[#13294B]">
              Priority 1 · NCHSAA Individual States connector
            </CardTitle>
            <CardDescription>
              Fetches registered NCHSAA championship pages for the year, parses champions (and placers
              when published), stages a review batch. Nothing publishes until you approve. Registered
              years: {connectorYears.length ? connectorYears.join(", ") : "—"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="connector-year">Year</Label>
              <Input
                id="connector-year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-28"
              />
            </div>
            <Button
              type="button"
              onClick={() => void runIndividualStatesConnector()}
              disabled={
                runningConnector ||
                runningDualConnector ||
                runningClassConnector ||
                runningFargoConnector ||
                setupRequired
              }
            >
              {runningConnector ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span className="ml-2">Fetch &amp; stage Individual States</span>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-[#003366]/30 bg-white">
          <CardHeader>
            <CardTitle className="text-lg text-[#13294B]">
              NCHSAA Dual Team Championships connector
            </CardTitle>
            <CardDescription>
              Fetches the registered dual-team results page for the year, parses year×division
              champions (and runner-up/scores when published), stages a review batch. Registered
              years: {dualConnectorYears.length ? dualConnectorYears.join(", ") : "—"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="dual-connector-year">Year</Label>
              <Input
                id="dual-connector-year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-28"
              />
            </div>
            <Button
              type="button"
              onClick={() => void runDualTeamConnector()}
              disabled={
                runningDualConnector ||
                runningConnector ||
                runningClassConnector ||
                runningFargoConnector ||
                setupRequired
              }
            >
              {runningDualConnector ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span className="ml-2">Fetch &amp; stage Dual Team</span>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-[#003366]/30 bg-white">
          <CardHeader>
            <CardTitle className="text-lg text-[#13294B]">
              NCHSAA School Classifications connector
            </CardTitle>
            <CardDescription>
              Fetches the registered NCHSAA schools directory, parses school → classification
              (and region/conference), stages ~450 membership rows for review. Promotes into
              year history + current snapshot. Registered years:{" "}
              {classConnectorYears.length ? classConnectorYears.join(", ") : "—"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="class-connector-year">Year</Label>
              <Input
                id="class-connector-year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-28"
              />
            </div>
            <Button
              type="button"
              onClick={() => void runClassificationsConnector()}
              disabled={
                runningClassConnector ||
                runningConnector ||
                runningDualConnector ||
                runningFargoConnector ||
                setupRequired
              }
            >
              {runningClassConnector ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span className="ml-2">Fetch &amp; stage Classifications</span>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-amber-400/50 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="text-lg text-[#13294B]">
              Fargo Nationals — full connector (USA Bracketing + Track)
            </CardTitle>
            <CardDescription>
              Canonical bout + season SoR. Loads registered exports from{" "}
              <code className="text-xs">scripts/data/fargo/exports/</code> via USA Bracketing and
              Trackwrestling adapters, materializes FS/GR careers separately, stages seasons +
              bouts with a validation report. Flo never SoR. Setup SQL:{" "}
              <code className="text-xs">fargo-results-harden-setup.sql</code> +{" "}
              <code className="text-xs">fargo-bouts-full-setup.sql</code>. Event years:{" "}
              {fargoFullYears.length ? fargoFullYears.join(", ") : "—"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="fargo-full-year">Year</Label>
              <Input
                id="fargo-full-year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-28"
              />
            </div>
            <Button
              type="button"
              onClick={() => void runFargoFullConnector()}
              disabled={
                runningFargoFull ||
                runningFargoConnector ||
                runningConnector ||
                runningDualConnector ||
                runningClassConnector ||
                setupRequired
              }
            >
              {runningFargoFull ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span className="ml-2">Run full Fargo connector</span>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-[#003366]/30 bg-white">
          <CardHeader>
            <CardTitle className="text-lg text-[#13294B]">
              Fargo Nationals — CSV season connector
            </CardTitle>
            <CardDescription>
              Legacy/NC season CSV snapshots (Freestyle &amp; Greco as separate careers). Prefer the
              full connector when bout exports exist. CSV years:{" "}
              {fargoConnectorYears.length ? fargoConnectorYears.join(", ") : "—"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="fargo-connector-year">Year</Label>
              <Input
                id="fargo-connector-year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-28"
              />
            </div>
            <Button
              type="button"
              onClick={() => void runFargoNationalsConnector()}
              disabled={
                runningFargoConnector ||
                runningFargoFull ||
                runningConnector ||
                runningDualConnector ||
                runningClassConnector ||
                setupRequired
              }
            >
              {runningFargoConnector ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span className="ml-2">Stage Fargo CSV seasons</span>
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stage a batch</CardTitle>
              <CardDescription>
                Placers / duals / classifications / Fargo: connectors above, or paste JSON / CSV /
                page HTML.
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
                <Button
                  type="button"
                  variant={dataset === DATASET_CLASSIFICATIONS ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDataset(DATASET_CLASSIFICATIONS)}
                >
                  School classifications
                </Button>
                <Button
                  type="button"
                  variant={dataset === DATASET_FARGO ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDataset(DATASET_FARGO)}
                >
                  Fargo seasons
                </Button>
                <Button
                  type="button"
                  variant={dataset === DATASET_FARGO_BOUTS ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDataset(DATASET_FARGO_BOUTS)}
                >
                  Fargo bouts
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
                      : dataset === DATASET_CLASSIFICATIONS
                        ? `{ "records": [ { "effective_year": 2026, "school_name": "...", "classification": "7A" } ] }`
                        : dataset === DATASET_FARGO
                          ? `{ "records": [ { "year": 2026, "athlete_name": "...", "division": "Junior Boys Freestyle", "weight_class": "150", "wins": 5, "losses": 1 } ] }  — or Fargo CSV`
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
                          variant={
                            r.diff_status === "new"
                              ? "default"
                              : r.diff_status === "conflict"
                                ? "destructive"
                                : "secondary"
                          }
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
                            : r.existing.school_name
                              ? `${r.existing.classification ?? "?"} — ${r.existing.school_name}${
                                  r.existing.conference
                                    ? ` (${r.existing.conference})`
                                    : ""
                                }`
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
