"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Upload, ArrowLeft, AlertTriangle, CheckCircle2 } from "lucide-react"
import type { BlueWiqSubscriptionRow } from "@/app/api/admin/blue/wiq-subscriptions/route"
import type { WiqImportPreview } from "@/lib/blue-wiq-import"
import { BlueAdminAuthBanner, isBlueAuthError } from "@/components/blue-admin-auth-banner"

type Filter = "billable" | "active" | "paused" | "cancelled" | "missing" | "all"

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
  } catch {
    return "—"
  }
}

function statusBadge(status: string) {
  if (status === "active")
    return <Badge className="bg-emerald-500/25 text-emerald-300 border-0">Paid</Badge>
  if (status === "past_due")
    return <Badge className="bg-amber-500/25 text-amber-200 border-0">Overdue</Badge>
  if (status === "grace")
    return <Badge className="bg-sky-500/25 text-sky-200 border-0">Grace</Badge>
  if (status === "paused")
    return <Badge className="bg-violet-500/25 text-violet-200 border-0">Paused</Badge>
  return <Badge variant="outline" className="border-white/25 text-white/50">Canceled</Badge>
}

export default function AdminBlueWiqPage() {
  const [subs, setSubs] = useState<BlueWiqSubscriptionRow[]>([])
  const [stats, setStats] = useState<{
    billable: number
    active: number
    pastDue: number
    cancelled: number
    paused: number
    unmatched: number
    missingFromReport: number
    estimatedMrr: number
    standardMrr: number
  } | null>(null)
  const [tableReady, setTableReady] = useState(true)
  const [filter, setFilter] = useState<Filter>("billable")
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [csvText, setCsvText] = useState("")
  const [fileName, setFileName] = useState("")
  const [pausedCsvText, setPausedCsvText] = useState("")
  const [pausedFileName, setPausedFileName] = useState("")
  const [activeRenewingText, setActiveRenewingText] = useState("")
  const [activeRenewingFileName, setActiveRenewingFileName] = useState("")
  const [preview, setPreview] = useState<WiqImportPreview | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)

  const [linkAthleteId, setLinkAthleteId] = useState<Record<string, string>>({})

  const reload = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const r = await fetch(`/api/admin/blue/wiq-subscriptions?filter=${filter}`, { credentials: "include" })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || `Failed (${r.status})`)
      setTableReady(d.tableReady !== false)
      setSubs(d.subscriptions ?? [])
      setStats(d.stats ?? null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load")
      setSubs([])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    reload()
  }, [reload])

  const onFile = (file: File | null) => {
    if (!file) return
    setFileName(file.name)
    setImportMessage(null)
    setPreview(null)
    const reader = new FileReader()
    reader.onload = () => {
      setCsvText(String(reader.result ?? ""))
    }
    reader.readAsText(file)
  }

  const onPausedFile = (file: File | null) => {
    if (!file) return
    setPausedFileName(file.name)
    setImportMessage(null)
    setPreview(null)
    const reader = new FileReader()
    reader.onload = () => setPausedCsvText(String(reader.result ?? ""))
    reader.readAsText(file)
  }

  const onActiveRenewingFile = (file: File | null) => {
    if (!file) return
    setActiveRenewingFileName(file.name)
    setImportMessage(null)
    setPreview(null)
    const reader = new FileReader()
    reader.onload = () => setActiveRenewingText(String(reader.result ?? ""))
    reader.readAsText(file)
  }

  const importBody = () => ({
    csvText,
    pausedCsvText: pausedCsvText || undefined,
    activeRenewingText: activeRenewingText || undefined,
    fileLabel: fileName || "WIQ export",
  })

  const runPreview = async () => {
    if (!csvText.trim()) return
    setImportLoading(true)
    setImportMessage(null)
    try {
      const r = await fetch("/api/admin/blue/wiq-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...importBody(), mode: "preview" }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || "Preview failed")
      setPreview(d.preview)
    } catch (e) {
      setImportMessage(e instanceof Error ? e.message : "Preview failed")
    } finally {
      setImportLoading(false)
    }
  }

  const runApply = async () => {
    if (!csvText.trim()) return
    setImportLoading(true)
    setImportMessage(null)
    try {
      const r = await fetch("/api/admin/blue/wiq-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...importBody(), mode: "apply" }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || "Import failed")
      setPreview(null)
      setCsvText("")
      setFileName("")
      setPausedCsvText("")
      setPausedFileName("")
      setActiveRenewingText("")
      setActiveRenewingFileName("")
      setImportMessage(
        `Imported ${d.upserted} Blue rows (${d.matched} matched to athletes).${d.pausedApplied ? ` ${d.pausedApplied} marked paused.` : ""}${d.flaggedMissing ? ` ${d.flaggedMissing} flagged missing from report.` : ""}`,
      )
      await reload()
    } catch (e) {
      setImportMessage(e instanceof Error ? e.message : "Import failed")
    } finally {
      setImportLoading(false)
    }
  }

  const linkAthlete = async (wiqRowId: string) => {
    const athleteId = linkAthleteId[wiqRowId]?.trim()
    if (!athleteId) return
    const r = await fetch(`/api/admin/blue/wiq-subscriptions/${encodeURIComponent(wiqRowId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ athleteId }),
    })
    const d = await r.json()
    if (r.ok) {
      setLinkAthleteId((prev) => {
        const next = { ...prev }
        delete next[wiqRowId]
        return next
      })
      await reload()
    } else {
      setImportMessage(d.error || "Link failed")
    }
  }

  return (
    <div className="min-h-screen admin-dark-page bg-[#0A1628] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#03154C]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 md:px-6">
          <a
            href="/admin/blue"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white/80 hover:bg-white/10"
            aria-label="Back to command center"
          >
            <ArrowLeft className="h-4 w-4" />
          </a>
          <div>
            <h1 className="text-base font-semibold md:text-lg">WrestlingIQ (WIQ)</h1>
            <p className="text-xs text-white/50">External billing — import monthly reports, no Stripe migration</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 md:px-6">
        {loadError && isBlueAuthError(loadError) && <BlueAdminAuthBanner returnTo="/admin/blue/wiq" />}

        {!tableReady && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
            Run the SQL in <code className="text-amber-200">docs/sql/blue-wiq-subscriptions.sql.txt</code> in Supabase
            before importing.
          </div>
        )}

        {stats && (
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-[#D3B574]/20 px-3 py-1 font-medium text-[#D3B574]">
              WIQ billable {stats.billable}
            </span>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-300">Paid {stats.active}</span>
            {stats.paused > 0 && (
              <span className="rounded-full bg-violet-500/25 px-3 py-1 text-violet-200">Paused {stats.paused}</span>
            )}
            {stats.pastDue > 0 && (
              <span className="rounded-full bg-amber-500/25 px-3 py-1 text-amber-200">Overdue {stats.pastDue}</span>
            )}
            <span className="rounded-full bg-white/10 px-3 py-1 text-white/70">
              Est. MRR ${stats.standardMrr.toFixed(0)}/mo @ $50
            </span>
            {Math.abs(stats.standardMrr - stats.estimatedMrr) > 1 && (
              <span className="rounded-full bg-white/10 px-3 py-1 text-white/50 text-xs">
                Export cash ${stats.estimatedMrr.toFixed(0)}/mo
              </span>
            )}
            {stats.unmatched > 0 && (
              <span className="rounded-full bg-amber-500/20 px-3 py-1 text-amber-200">Unmatched {stats.unmatched}</span>
            )}
            {stats.missingFromReport > 0 && (
              <span className="rounded-full bg-red-500/25 px-3 py-1 text-red-200">
                Missing from report {stats.missingFromReport}
              </span>
            )}
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-[#03154C]/50 p-4 md:p-5">
          <h2 className="text-sm font-semibold text-white mb-1">Import WIQ reports</h2>
          <p className="text-xs text-white/50 mb-4">
            Upload the <strong className="text-white/70">Membership Summary</strong> CSV (Paid, Canceled, Overdue).
            Paused members still show as <strong className="text-white/70">Paid</strong> on that report — upload
            WrestlingIQ&apos;s <strong className="text-white/70">Paused Subscription Report</strong> to mark those as
            paused. Optional: Active Renewing list for June cohort reconciliation (does not change status). Only Paid
            + Overdue count as billable; paused does not.
          </p>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3 items-start flex-wrap">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-white/20 px-4 py-3 text-sm text-white/80 hover:bg-white/5">
                <Upload className="h-4 w-4 text-[#D3B574]" />
                {fileName || "Membership Summary CSV"}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-emerald-400/30 px-4 py-3 text-sm text-white/80 hover:bg-white/5">
                <Upload className="h-4 w-4 text-emerald-300" />
                {activeRenewingFileName || "Active Renewing list (CSV/TSV)"}
                <input
                  type="file"
                  accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
                  className="hidden"
                  onChange={(e) => onActiveRenewingFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-violet-400/30 px-4 py-3 text-sm text-white/80 hover:bg-white/5">
                <Upload className="h-4 w-4 text-violet-300" />
                {pausedFileName || "Paused report (optional)"}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => onPausedFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-start">
            <Button
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              disabled={!csvText || importLoading}
              onClick={runPreview}
            >
              {importLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Preview
            </Button>
            <Button
              className="bg-[#D3B574] text-[#03154C] hover:bg-[#c4a665]"
              disabled={!preview || importLoading || !tableReady}
              onClick={runApply}
            >
              Apply import
            </Button>
          </div>

          {importMessage && (
            <p
              className={[
                "mt-3 text-sm flex items-center gap-2",
                importMessage.startsWith("Imported") ? "text-emerald-300" : "text-red-300",
              ].join(" ")}
            >
              {importMessage.startsWith("Imported") ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              )}
              {importMessage}
            </p>
          )}

          {preview && (
            <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3 text-sm space-y-2">
              <p className="text-white/80">
                <strong>{preview.blueRows}</strong> Blue rows ({preview.activeCount} paid, {preview.pausedCount} paused,{" "}
                {preview.pastDueCount} overdue, {preview.cancelledCount} canceled in file)
                {preview.skippedNonBlue > 0 && ` · ${preview.skippedNonBlue} non-Blue rows skipped`}
              </p>
              {preview.pausedApplied != null && preview.pausedApplied > 0 && (
                <p className="text-violet-200">
                  {preview.pausedApplied} paid row(s) reclassified as paused from the Paused report.
                </p>
              )}
              {preview.activeRenewingListCount != null && preview.activeRenewingListCount > 0 && (
                <p className="text-emerald-200">
                  Active renewing allowlist: {preview.activeRenewingListCount} wrestler(s).
                  {preview.activeRenewingMatched != null && preview.activeRenewingMatched > 0
                    ? ` ${preview.activeRenewingMatched} paid row(s) matched that list.`
                    : null}{" "}
                  {preview.activeCount} paid row(s) will remain active from Membership Summary.
                </p>
              )}
              {pausedCsvText && preview.pausedCount === 0 && !preview.pausedApplied && (
                <p className="text-amber-200/90 text-xs">
                  Paused report uploaded but no matches — check wrestler names match the Membership Summary.
                </p>
              )}
              {preview.wouldFlagMissing.length > 0 && (
                <p className="text-amber-200">
                  {preview.wouldFlagMissing.length} previously billable WIQ sub(s) not in this file — will flag as
                  missing.
                </p>
              )}
              {preview.duplicateWrestlerNames.length > 0 && (
                <p className="text-amber-200/90 text-xs">
                  Duplicate wrestler names in file: {preview.duplicateWrestlerNames.slice(0, 6).join(", ")}
                  {preview.duplicateWrestlerNames.length > 6 ? "…" : ""}
                </p>
              )}
              <p className="text-white/50 text-xs">
                Unmatched billable:{" "}
                {preview.rows.filter((r) => r.status !== "cancelled" && !r.athleteId).length} — link athletes after
                import if needed.
              </p>
            </div>
          )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#03154C]/40">
          <div className="flex flex-wrap gap-2 border-b border-white/10 px-4 py-3">
            {(
              [
                ["billable", "Billable"],
                ["active", "Paid only"],
                ["paused", "Paused"],
                ["missing", "Missing"],
                ["cancelled", "Canceled"],
                ["all", "All"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={[
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  filter === key ? "bg-[#D3B574] text-[#03154C]" : "bg-white/10 text-white/75 hover:bg-white/15",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#D3B574]" />
            </div>
          ) : subs.length === 0 ? (
            <p className="py-12 text-center text-sm text-white/50">
              {tableReady ? "No rows for this filter. Import a WIQ CSV to get started." : "Create tables in Supabase first."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/50">Wrestler</TableHead>
                    <TableHead className="text-white/50">Billed to</TableHead>
                    <TableHead className="text-white/50">Status</TableHead>
                    <TableHead className="text-white/50">Next due</TableHead>
                    <TableHead className="text-white/50">Amount</TableHead>
                    <TableHead className="text-white/50">RecruitNC athlete</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subs.map((sub) => (
                    <TableRow key={sub.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="align-top">
                        <span className="font-medium text-white">{sub.wrestler_name}</span>
                        <Badge className="ml-2 bg-indigo-500/30 text-indigo-200 border-0 text-[10px]">WIQ</Badge>
                        {sub.missing_from_last_import && (
                          <span className="mt-1 block text-xs text-red-300">Not on last import</span>
                        )}
                        {sub.discount_code && (
                          <span className="mt-0.5 block text-xs text-white/40">{sub.discount_code}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-white/75 align-top">{sub.billed_to ?? "—"}</TableCell>
                      <TableCell className="align-top">{statusBadge(sub.status)}</TableCell>
                      <TableCell className="text-sm text-white/75 align-top">
                        {sub.status === "grace" ? fmtDate(sub.active_until) : fmtDate(sub.next_due_at)}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums align-top">{sub.amount_display ?? "—"}</TableCell>
                      <TableCell className="align-top text-sm">
                        {sub.athlete_id ? (
                          <a
                            href={`/admin/athletes/edit?id=${encodeURIComponent(sub.athlete_id)}`}
                            className="text-[#D3B574] hover:underline"
                          >
                            {sub.athlete_name ?? "Athlete"}
                          </a>
                        ) : sub.status !== "cancelled" ? (
                          <div className="flex gap-1.5">
                            <Input
                              placeholder="Athlete UUID"
                              className="h-8 max-w-[140px] bg-black/30 border-white/15 text-xs"
                              value={linkAthleteId[sub.id] ?? ""}
                              onChange={(e) =>
                                setLinkAthleteId((p) => ({ ...p, [sub.id]: e.target.value }))
                              }
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 border-white/20 text-xs"
                              onClick={() => linkAthlete(sub.id)}
                            >
                              Link
                            </Button>
                          </div>
                        ) : (
                          <span className="text-white/40">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
