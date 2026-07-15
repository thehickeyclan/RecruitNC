"use client"

import { useState, useEffect, useRef, type DragEvent } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AdminHeader } from "@/components/admin-header"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { HardLink } from "@/components/hard-link"
import {
  Upload,
  Search,
  RefreshCw,
  Link2,
  CheckCircle,
  AlertCircle,
  FileText,
  School,
  PlayCircle,
  ChevronDown,
} from "lucide-react"

interface NHSCAPlacement {
  id: string
  year: number
  athlete_name: string
  high_school: string | null
  placement: number | null
  weight_class: string
  division: string
  record: string | null
  state: string
  athlete_id: string | null
  match_status: string
  match_confidence: number | null
  match_method: string | null
  imported_at: string
  matched_at: string | null
  merged_at: string | null
}

interface ImportStats {
  total: number
  placers: number
  nonPlacers: number
  matched: number
  unmatched: number
  merged: number
}

interface AthleteSearchHit {
  id: string
  name: string | null
  firstName: string | null
  lastName: string | null
  graduationyear: number | null
  highschool: string | null
}

/** Accepts either a raw array or `{ year, placements }` (e.g. scripts/data/seniors-2026-nhsca-import.json).
 * Also accepts page replica shape `{ year|meta.year, section1_all_americans: [...] }`.
 */
function parseNhscaImportPayload(parsed: unknown): { placements: unknown[]; yearFromFile?: number } {
  if (Array.isArray(parsed)) {
    return { placements: parsed }
  }
  if (parsed !== null && typeof parsed === "object") {
    const rec = parsed as {
      placements?: unknown
      year?: unknown
      meta?: { year?: unknown }
      section1_all_americans?: unknown
    }
    if (Array.isArray(rec.section1_all_americans)) {
      const y =
        typeof rec.year === "number" && Number.isFinite(rec.year)
          ? rec.year
          : typeof rec.meta?.year === "number" && Number.isFinite(rec.meta.year)
            ? rec.meta.year
            : undefined
      const placements = rec.section1_all_americans.map((row) => {
        const r = row as Record<string, unknown>
        return {
          athlete_name: r.athlete_name,
          high_school: r.high_school,
          placement: r.placement,
          weight_class: r.weight_class ?? r.weight,
          division: r.division,
          record:
            r.record ??
            (r.wins != null && r.losses != null ? `${r.wins}-${r.losses}` : undefined),
          state: r.state ?? "NC",
          year: r.year ?? y,
        }
      })
      return { placements, yearFromFile: y }
    }
    if (Array.isArray(rec.placements)) {
      const y = rec.year
      const yearFromFile = typeof y === "number" && Number.isFinite(y) ? y : undefined
      return { placements: rec.placements, yearFromFile }
    }
  }
  throw new Error(
    'Invalid JSON: use a participant array, { "year", "placements" }, or page replica { section1_all_americans }',
  )
}

export default function NHSCAPlacementsPage() {
  const [placements, setPlacements] = useState<NHSCAPlacement[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [matching, setMatching] = useState(false)
  const [resolvingNchsaa, setResolvingNchsaa] = useState(false)
  const [pipelineRunning, setPipelineRunning] = useState(false)
  const [merging, setMerging] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [stats, setStats] = useState<ImportStats>({
    total: 0,
    placers: 0,
    nonPlacers: 0,
    matched: 0,
    unmatched: 0,
    merged: 0,
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [yearFilter, setYearFilter] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [jsonInput, setJsonInput] = useState("")
  const [importYear, setImportYear] = useState(2026)
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [importDragActive, setImportDragActive] = useState(false)
  const jsonFileInputRef = useRef<HTMLInputElement>(null)

  const [linkPlacement, setLinkPlacement] = useState<NHSCAPlacement | null>(null)
  const [linkSearch, setLinkSearch] = useState("")
  const [linkResults, setLinkResults] = useState<AthleteSearchHit[]>([])
  const [linkSearching, setLinkSearching] = useState(false)
  const [linkingId, setLinkingId] = useState<string | null>(null)
  /** When true, search only athletes with graduationyear === placement year (NHSCA row year). */
  const [linkLimitGradYear, setLinkLimitGradYear] = useState(false)
  const [linkSearchError, setLinkSearchError] = useState<string | null>(null)
  /** Delete-by-year: optional Senior/Junior so one division can be cleared without removing the other (same idea as bulk-import). */
  const [deleteDivisionScope, setDeleteDivisionScope] = useState<"all" | "Senior" | "Junior">("all")
  const [jsonImportOpen, setJsonImportOpen] = useState(false)
  const [syncingSchools, setSyncingSchools] = useState(false)

  /** Match/Merge year: explicit filter, else same as import year (avoid defaulting to wrong year when filter empty). */
  const matchMergeYear = yearFilter ?? importYear

  const syncCanonicalSchools = async () => {
    setSyncingSchools(true)
    setImportMessage(null)
    try {
      const res = await fetch("/api/admin/nhsca-placements/sync-canonical-schools", {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Sync failed")
      setImportMessage({
        type: "success",
        text: `Synced AA schools from yearly files (years ${
          Array.isArray(data.years) ? data.years.join(", ") : ""
        }): placements ${data.updated_placements ?? 0}, legacy ${data.updated_legacy ?? 0}`,
      })
      await fetchPlacements()
    } catch (e) {
      setImportMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Sync failed",
      })
    } finally {
      setSyncingSchools(false)
    }
  }

  useEffect(() => {
    fetchPlacements()
  }, [])

  useEffect(() => {
    if (!linkPlacement) return
    const q = linkSearch.trim()
    if (q.length < 2) {
      setLinkResults([])
      return
    }
    const id = setTimeout(async () => {
      setLinkSearching(true)
      setLinkSearchError(null)
      try {
        const params = new URLSearchParams({ q })
        if (linkLimitGradYear && linkPlacement.year) {
          params.set("grad_year", String(linkPlacement.year))
        }
        const res = await fetch(`/api/admin/nhsca-placements/search-athletes?${params}`, {
          credentials: "include",
        })
        const data = await res.json()
        if (res.ok) {
          setLinkResults(data.athletes ?? [])
          setLinkSearchError(null)
        } else {
          setLinkResults([])
          setLinkSearchError(data.error || `Search failed (${res.status})`)
        }
      } catch {
        setLinkResults([])
        setLinkSearchError("Network error while searching")
      } finally {
        setLinkSearching(false)
      }
    }, 350)
    return () => clearTimeout(id)
  }, [linkSearch, linkPlacement, linkLimitGradYear])

  const openLinkDialog = (p: NHSCAPlacement) => {
    setLinkPlacement(p)
    setLinkLimitGradYear(false)
    setLinkSearchError(null)
    const parts = p.athlete_name.trim().split(/\s+/)
    const guess =
      parts.length >= 2
        ? parts[parts.length - 1].replace(/[^A-Za-z0-9'.-]/g, "").trim()
        : p.athlete_name.trim()
    setLinkSearch(guess || p.athlete_name.trim())
    setLinkResults([])
  }

  const handleManualLink = async (athleteId: string) => {
    if (!linkPlacement) return
    setLinkingId(athleteId)
    try {
      const res = await fetch("/api/admin/nhsca-placements/manual-match", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placementId: linkPlacement.id, athleteId }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || data.details || "Link failed")
      }
      setImportMessage({
        type: "success",
        text: data.message || "Placement linked to profile",
      })
      setLinkPlacement(null)
      fetchPlacements()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Link failed"
      setImportMessage({ type: "error", text: msg })
    } finally {
      setLinkingId(null)
    }
  }

  const fetchPlacements = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/nhsca-placements/list", {
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        setPlacements(data.placements || [])
        setStats(data.stats || stats)
      }
    } catch (error) {
      console.error("Error fetching placements:", error)
    } finally {
      setLoading(false)
    }
  }

  const postBulkImport = async (placements: unknown[], year: number) => {
    const response = await fetch("/api/admin/nhsca-placements/bulk-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ year, placements }),
    })
    const result = await response.json()
    if (!response.ok) {
      throw new Error(result.error || result.details || "Import failed")
    }
    return result
  }

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      setImportMessage({ type: "error", text: "Paste JSON or load a .json file" })
      return
    }

    try {
      setImporting(true)
      setImportMessage(null)

      let parsed: unknown
      try {
        parsed = JSON.parse(jsonInput)
      } catch {
        setImportMessage({ type: "error", text: "Invalid JSON format" })
        return
      }

      let placements: unknown[]
      let yearFromFile: number | undefined
      try {
        const r = parseNhscaImportPayload(parsed)
        placements = r.placements
        yearFromFile = r.yearFromFile
      } catch (e) {
        setImportMessage({
          type: "error",
          text: e instanceof Error ? e.message : "Invalid JSON shape",
        })
        return
      }

      const year = yearFromFile ?? importYear
      const result = await postBulkImport(placements, year)
      if (yearFromFile != null) {
        setImportYear(yearFromFile)
      }
      const message =
        result.message ||
        `Successfully imported ${result.imported} participants${result.placers != null ? ` (${result.placers} placers, ${result.nonPlacers ?? result.imported - result.placers} non-placers)` : ""}`
      setImportMessage({ type: "success", text: message })
      setJsonInput("")
      fetchPlacements()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Import failed"
      setImportMessage({ type: "error", text: msg })
    } finally {
      setImporting(false)
    }
  }

  const handleJsonFileChosen = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    const lower = file.name.toLowerCase()
    if (!lower.endsWith(".json") && file.type !== "application/json") {
      setImportMessage({ type: "error", text: "Choose a .json file" })
      return
    }
    try {
      const text = await file.text()
      setJsonInput(text)
      const parsed = JSON.parse(text)
      const { placements, yearFromFile } = parseNhscaImportPayload(parsed)
      if (yearFromFile != null) {
        setImportYear(yearFromFile)
      }
      setImportMessage({
        type: "success",
        text: `Loaded ${placements.length} participant(s) from ${file.name}. Review below, then click Import Data.`,
      })
    } catch (e) {
      setImportMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Could not read that file",
      })
    }
    if (jsonFileInputRef.current) {
      jsonFileInputRef.current.value = ""
    }
  }

  const handleImportFileDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setImportDragActive(false)
    void handleJsonFileChosen(e.dataTransfer.files)
  }

  const handleResolveNamesFromNchsaa = async () => {
    try {
      setResolvingNchsaa(true)
      setImportMessage(null)
      const response = await fetch("/api/admin/nhsca-placements/resolve-names-from-nchsaa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ year: matchMergeYear }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || "Could not expand names")
      }
      setImportMessage({
        type: "success",
        text: result.message || `Updated ${result.updated ?? 0} name(s) from NCHSAA state data`,
      })
      fetchPlacements()
    } catch (error: unknown) {
      setImportMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Expand names failed",
      })
    } finally {
      setResolvingNchsaa(false)
    }
  }

  const handleMatch = async () => {
    try {
      setMatching(true)
      const response = await fetch("/api/admin/nhsca-placements/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          year: matchMergeYear,
          method: "all",
        }),
      })

      if (response.ok) {
        const result = await response.json()
        const n = result.totalMatched ?? result.matched ?? 0
        setImportMessage({
          type: "success",
          text: result.message || `Matched ${n} placement(s)`,
        })
        fetchPlacements()
      } else {
        const result = await response.json()
        setImportMessage({ type: "error", text: result.error || "Matching failed" })
      }
    } catch (error: any) {
      setImportMessage({ type: "error", text: error.message || "Matching failed" })
    } finally {
      setMatching(false)
    }
  }

  const handleDeleteYear = async () => {
    if (!yearFilter) {
      setImportMessage({ type: "error", text: "Please set a year filter first" })
      return
    }

    const scopeLabel =
      deleteDivisionScope === "all" ? "all NC divisions (Senior + Junior)" : `${deleteDivisionScope} division only`
    if (!confirm(`Delete ${yearFilter} NHSCA for ${scopeLabel}? This cannot be undone.`)) {
      return
    }

    try {
      setDeleting(true)
      const qs = new URLSearchParams({ year: String(yearFilter) })
      if (deleteDivisionScope !== "all") qs.set("division", deleteDivisionScope)
      const response = await fetch(`/api/admin/nhsca-placements/delete-year?${qs.toString()}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        setImportMessage({ type: "success", text: `Deleted ${result.deleted} placements for ${yearFilter}` })
        fetchPlacements()
      } else {
        const result = await response.json()
        setImportMessage({ type: "error", text: result.error || "Delete failed" })
      }
    } catch (error: any) {
      setImportMessage({ type: "error", text: error.message || "Delete failed" })
    } finally {
      setDeleting(false)
    }
  }

  const handleMerge = async () => {
    try {
      setMerging(true)
      const response = await fetch("/api/admin/nhsca-placements/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          year: matchMergeYear,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        const m = result.merged ?? 0
        setImportMessage({
          type: "success",
          text: result.message || `Merged ${m} athlete profile(s) from NHSCA rows`,
        })
        fetchPlacements()
      } else {
        const result = await response.json()
        setImportMessage({ type: "error", text: result.error || "Merge failed" })
      }
    } catch (error: any) {
      setImportMessage({ type: "error", text: error.message || "Merge failed" })
    } finally {
      setMerging(false)
    }
  }

  /** One click: expand names from NCHSAA → auto-match → merge into profiles (same year as Match/Merge). */
  const handleRunFullPipeline = async () => {
    const year = matchMergeYear
    setPipelineRunning(true)
    setImportMessage(null)
    const summary: string[] = []
    try {
      const res1 = await fetch("/api/admin/nhsca-placements/resolve-names-from-nchsaa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ year }),
      })
      const j1 = await res1.json()
      if (!res1.ok && res1.status === 401) {
        throw new Error(j1.error || "Unauthorized — sign in as admin")
      }
      if (res1.ok) {
        summary.push(j1.message || `Names expanded: ${j1.updated ?? 0}`)
      } else {
        summary.push(`Name expand skipped: ${j1.error ?? res1.status}`)
      }

      const res2 = await fetch("/api/admin/nhsca-placements/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ year, method: "all" }),
      })
      const j2 = await res2.json()
      if (!res2.ok) {
        throw new Error(j2.error || "Auto-Match failed")
      }
      const n = j2.totalMatched ?? j2.matched ?? 0
      summary.push(j2.message || `Matched ${n} row(s)`)

      const res3 = await fetch("/api/admin/nhsca-placements/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ year }),
      })
      const j3 = await res3.json()
      if (!res3.ok) {
        throw new Error(j3.error || "Merge into profiles failed")
      }
      summary.push(j3.message || `Merged ${j3.merged ?? 0} profile(s)`)

      setImportMessage({ type: "success", text: summary.join(" → ") })
      fetchPlacements()
    } catch (error: unknown) {
      setImportMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Pipeline failed",
      })
      fetchPlacements()
    } finally {
      setPipelineRunning(false)
    }
  }

  const rowStatus = (p: NHSCAPlacement) => (p.merged_at ? "merged" : p.match_status)

  const filteredPlacements = placements.filter((p) => {
    if (searchTerm && !p.athlete_name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    if (yearFilter && p.year !== yearFilter) {
      return false
    }
    if (statusFilter !== "all" && rowStatus(p) !== statusFilter) {
      return false
    }
    return true
  })

  const actionBusy = importing || pipelineRunning

  const getStatusBadge = (status: string) => {
    const colors = {
      unmatched: "bg-gray-100 text-gray-800",
      auto_matched: "bg-blue-100 text-blue-800",
      manually_matched: "bg-purple-100 text-purple-800",
      merged: "bg-green-100 text-green-800",
    }
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[status as keyof typeof colors] || colors.unmatched}`}>
        {status.replace("_", " ")}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-[#13294B]">NHSCA participants</h1>
          <p className="text-sm text-gray-600 mt-1 max-w-3xl">
            New file?{" "}
            <HardLink href="/admin/nhsca-placements/roster-upload" className="text-[#13294B] underline font-medium">
              Roster CSV/TSV
            </HardLink>
            . Already loaded? Set <strong>Year</strong> below → <strong>Run full pipeline</strong> → filter{" "}
            <strong>Unmatched</strong> and use <strong>Find profile</strong> as needed.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Total</div>
              <div className="text-2xl font-bold text-[#13294B]">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Placers</div>
              <div className="text-2xl font-bold text-green-600">{stats.placers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Non-Placers</div>
              <div className="text-2xl font-bold text-blue-600">{stats.nonPlacers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Matched</div>
              <div className="text-2xl font-bold text-purple-600">{stats.matched}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Unmatched</div>
              <div className="text-2xl font-bold text-orange-600">{stats.unmatched}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Merged</div>
              <div className="text-2xl font-bold text-green-600">{stats.merged}</div>
            </CardContent>
          </Card>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Numbers refresh after <strong>Refresh</strong> or any action. &quot;Merged&quot; = row copied into athlete{" "}
          <code className="bg-gray-100 px-1 rounded">nhsca_results</code>.
        </p>

        {/* Filters — above pipeline so year is set first */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-[#13294B] mb-2">Year &amp; table filters</p>
            <p className="text-xs text-gray-600 mb-3">
              Pipeline uses the <strong>Year</strong> number here (or import year if this box is empty).
            </p>
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <Input
                  type="number"
                  placeholder={`Year (${importYear})`}
                  title="Filter table; also sets year for pipeline when filled"
                  value={yearFilter || ""}
                  onChange={(e) => setYearFilter(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-32"
                />
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded h-10"
                >
                  <option value="all">All Status</option>
                  <option value="unmatched">Unmatched</option>
                  <option value="auto_matched">Auto Matched</option>
                  <option value="manually_matched">Manually Matched</option>
                  <option value="merged">Merged</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card id="nhsca-match-merge" className="mb-4 border border-emerald-600/50 bg-emerald-50/50 scroll-mt-24">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-semibold text-[#13294B]">Run full pipeline</p>
              <p className="text-sm text-gray-600">
                NCHSAA name cleanup → auto-match → merge into profiles for <strong>{matchMergeYear}</strong>.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleRunFullPipeline}
              disabled={actionBusy || matching || merging || resolvingNchsaa || deleting}
              className="shrink-0 bg-emerald-700 hover:bg-emerald-800 text-white h-11 px-5"
            >
              {pipelineRunning ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <PlayCircle className="h-5 w-5 mr-2" />
                  Run full pipeline ({matchMergeYear})
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {importMessage && (
          <div
            className={`mb-4 p-3 rounded-md text-sm ${
              importMessage.type === "success" ? "bg-green-100 text-green-900" : "bg-red-100 text-red-900"
            }`}
          >
            {importMessage.text}
          </div>
        )}

        <Collapsible open={jsonImportOpen} onOpenChange={setJsonImportOpen} className="mb-4">
          <Card>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 p-4 text-left hover:bg-gray-50 rounded-t-lg border-b border-gray-100"
              >
                <span className="font-medium text-[#13294B]">Optional: JSON bulk import</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-gray-500 transition-transform ${jsonImportOpen ? "rotate-180" : ""}`}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4 space-y-4">
                <p className="text-xs text-gray-600">
                  Skip this if you used <HardLink href="/admin/nhsca-placements/roster-upload">roster CSV/TSV</HardLink>.
                  JSON rows use <code className="bg-gray-100 px-1 rounded">division</code> (e.g. Senior/Junior and
                  roster divisions per your file).
                </p>
                <div>
                  <label className="block text-sm font-medium mb-2">Import year (JSON)</label>
                  <Input
                    type="number"
                    value={importYear}
                    onChange={(e) => setImportYear(parseInt(e.target.value) || 2025)}
                    className="max-w-xs"
                  />
                </div>
                <input
                  ref={jsonFileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => void handleJsonFileChosen(e.target.files)}
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <label className="block text-sm font-medium">JSON</label>
                    <Button type="button" variant="outline" size="sm" onClick={() => jsonFileInputRef.current?.click()}>
                      <FileText className="h-4 w-4 mr-1" />
                      Choose file
                    </Button>
                  </div>
                  <div
                    onDragEnter={(e) => {
                      e.preventDefault()
                      setImportDragActive(true)
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault()
                      if (e.currentTarget === e.target) setImportDragActive(false)
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                    }}
                    onDrop={handleImportFileDrop}
                    className={`rounded-md border-2 border-dashed transition-colors ${
                      importDragActive ? "border-[#13294B] bg-blue-50/50" : "border-gray-200"
                    }`}
                  >
                    <textarea
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      placeholder='[{"athlete_name": "...", "division": "Senior", "year": 2026, ...}, ...]'
                      className="w-full h-32 p-3 border-0 rounded-md font-mono text-sm bg-transparent focus:outline-none focus:ring-0"
                    />
                  </div>
                  {importDragActive && <p className="text-xs text-[#13294B] mt-1">Drop .json here</p>}
                </div>
                <Button onClick={handleImport} disabled={importing || pipelineRunning} className="bg-[#13294B] hover:bg-[#1a3a5c]">
                  {importing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import JSON
                    </>
                  )}
                </Button>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Actions */}
        <div id="nhsca-step-by-step" className="mb-2 scroll-mt-24">
          <h2 className="text-sm font-semibold text-[#13294B]">Step-by-step (same as pipeline)</h2>
          <p className="text-xs text-gray-600">Year: {matchMergeYear}</p>
        </div>
        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-600">Delete scope (red button)</label>
            <select
              value={deleteDivisionScope}
              onChange={(e) => setDeleteDivisionScope(e.target.value as "all" | "Senior" | "Junior")}
              className="border border-gray-300 rounded-md px-2 py-2 text-sm bg-white"
            >
              <option value="all">All divisions (Senior + Junior)</option>
              <option value="Senior">Senior only</option>
              <option value="Junior">Junior only</option>
            </select>
          </div>
          <Button
            onClick={handleResolveNamesFromNchsaa}
            disabled={resolvingNchsaa || pipelineRunning}
            variant="outline"
            className="border-emerald-700 text-emerald-900 hover:bg-emerald-50"
          >
            {resolvingNchsaa ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Expanding…
              </>
            ) : (
              <>
                <School className="h-4 w-4 mr-2" />
                Expand names from NCHSAA
              </>
            )}
          </Button>
          <Button
            onClick={() => void syncCanonicalSchools()}
            disabled={syncingSchools || pipelineRunning}
            variant="outline"
            className="border-teal-700 text-teal-900 hover:bg-teal-50"
            title="Fill high_school on AA rows from registered yearly page/roster JSON"
          >
            {syncingSchools ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing schools…
              </>
            ) : (
              <>
                <School className="h-4 w-4 mr-2" />
                Sync AA schools from yearly files
              </>
            )}
          </Button>
          <Button onClick={handleDeleteYear} disabled={deleting || !yearFilter || pipelineRunning} variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
            {deleting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 mr-2" />
                Delete {yearFilter || "Year"} Data
              </>
            )}
          </Button>
          <Button onClick={handleMatch} disabled={matching || pipelineRunning} variant="outline">
            {matching ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Matching...
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-2" />
                Auto-Match to Athletes
              </>
            )}
          </Button>
          <Button onClick={handleMerge} disabled={merging || pipelineRunning} variant="outline">
            {merging ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Merging...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Merge into Profiles
              </>
            )}
          </Button>
          <Button onClick={fetchPlacements} variant="outline" disabled={pipelineRunning}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Placements Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              All participants ({filteredPlacements.length} of {placements.length})
            </CardTitle>
            <p className="text-sm font-normal text-gray-600 mt-1">
              <strong>Unmatched</strong> → <strong>Find profile</strong>.
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : filteredPlacements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No placements found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Year</th>
                      <th className="text-left p-2">Athlete</th>
                      <th className="text-left p-2">RecruitNC profile</th>
                      <th className="text-left p-2">School</th>
                      <th className="text-left p-2">Division</th>
                      <th className="text-left p-2">Weight</th>
                      <th className="text-left p-2">Placement</th>
                      <th className="text-left p-2">Record</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlacements.map((p) => (
                      <tr key={p.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">{p.year}</td>
                        <td className="p-2 font-medium">{p.athlete_name}</td>
                        <td className="p-2 align-top">
                          <div className="flex flex-col gap-1 min-w-[130px]">
                            {p.athlete_id ? (
                              <>
                                <a
                                  href={`/view-profile?id=${p.athlete_id}`}
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  View profile
                                </a>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs justify-start px-2"
                                  onClick={() => openLinkDialog(p)}
                                >
                                  Re-link…
                                </Button>
                              </>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => openLinkDialog(p)}
                              >
                                <Search className="h-3 w-3 mr-1" />
                                Find profile
                              </Button>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-gray-600">{p.high_school || "-"}</td>
                        <td className="p-2">{p.division}</td>
                        <td className="p-2">{p.weight_class}</td>
                        <td className="p-2">
                          {p.placement ? (
                            <span className="font-semibold text-green-600">
                              {p.placement === 1 ? "Champion" : p.placement === 2 ? "Finalist" : `${p.placement}th`}
                            </span>
                          ) : (
                            <span className="text-gray-400">Participated</span>
                          )}
                        </td>
                        <td className="p-2">{p.record || "-"}</td>
                        <td className="p-2">{getStatusBadge(rowStatus(p))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog
          open={!!linkPlacement}
          onOpenChange={(open) => {
            if (!open) setLinkPlacement(null)
          }}
        >
          <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Link NHSCA row to RecruitNC profile</DialogTitle>
              <DialogDescription>
                Search athletes and choose the profile that matches{" "}
                <span className="font-medium text-foreground">{linkPlacement?.athlete_name}</span>
                {linkPlacement?.high_school ? ` (${linkPlacement.high_school})` : ""}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Search by name…"
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
                autoFocus
              />
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={linkLimitGradYear}
                  onChange={(e) => setLinkLimitGradYear(e.target.checked)}
                />
                Limit to class of {linkPlacement?.year ?? "—"}
              </label>
              {linkSearching && <p className="text-sm text-muted-foreground">Searching…</p>}
              {linkSearchError && (
                <p className="text-sm text-red-600" role="alert">
                  {linkSearchError}
                </p>
              )}
              {!linkSearching &&
                !linkSearchError &&
                linkSearch.trim().length >= 2 &&
                linkResults.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No athletes found. Try another spelling, or enable &quot;Limit to class of…&quot; if you need to narrow
                    results.
                  </p>
                )}
              <ul className="border rounded-md divide-y max-h-[45vh] overflow-y-auto">
                {linkResults.map((a) => {
                  const display =
                    a.name?.trim() ||
                    [a.firstName, a.lastName].filter(Boolean).join(" ").trim() ||
                    "Unknown"
                  return (
                    <li
                      key={a.id}
                      className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    >
                      <div>
                        <div className="font-medium">{display}</div>
                        <div className="text-xs text-muted-foreground">
                          {a.highschool || "—"}
                          {a.graduationyear != null ? ` · Class of ${a.graduationyear}` : ""}
                        </div>
                        <a
                          href={`/view-profile?id=${a.id}`}
                          className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                        >
                          Open profile
                        </a>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={linkingId !== null}
                        onClick={() => handleManualLink(a.id)}
                      >
                        {linkingId === a.id ? "Linking…" : "Link this profile"}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

