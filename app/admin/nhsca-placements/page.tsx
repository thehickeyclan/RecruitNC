"use client"

import { useState, useEffect } from "react"
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
import { Upload, Search, RefreshCw, Link2, CheckCircle, AlertCircle, Download, FileText } from "lucide-react"

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

export default function NHSCAPlacementsPage() {
  const [placements, setPlacements] = useState<NHSCAPlacement[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [matching, setMatching] = useState(false)
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

  const [linkPlacement, setLinkPlacement] = useState<NHSCAPlacement | null>(null)
  const [linkSearch, setLinkSearch] = useState("")
  const [linkResults, setLinkResults] = useState<AthleteSearchHit[]>([])
  const [linkSearching, setLinkSearching] = useState(false)
  const [linkingId, setLinkingId] = useState<string | null>(null)
  /** When true, search only athletes with graduationyear === placement year (NHSCA row year). */
  const [linkLimitGradYear, setLinkLimitGradYear] = useState(true)

  /** Match/Merge year: explicit filter, else same as import year (avoid defaulting to wrong year when filter empty). */
  const matchMergeYear = yearFilter ?? importYear

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
        } else {
          setLinkResults([])
        }
      } finally {
        setLinkSearching(false)
      }
    }, 350)
    return () => clearTimeout(id)
  }, [linkSearch, linkPlacement, linkLimitGradYear])

  const openLinkDialog = (p: NHSCAPlacement) => {
    setLinkPlacement(p)
    setLinkLimitGradYear(true)
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

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      setImportMessage({ type: "error", text: "Please paste JSON data" })
      return
    }

    try {
      setImporting(true)
      setImportMessage(null)

      let placementsData
      try {
        placementsData = JSON.parse(jsonInput)
      } catch (e) {
        setImportMessage({ type: "error", text: "Invalid JSON format" })
        return
      }

      if (!Array.isArray(placementsData)) {
        setImportMessage({ type: "error", text: "JSON must be an array of participants (placers and non-placers)" })
        return
      }

      const response = await fetch("/api/admin/nhsca-placements/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          year: importYear,
          placements: placementsData,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        // Use the detailed message from API if available, otherwise create one
        const message = result.message || `Successfully imported ${result.imported} participants${result.placers ? ` (${result.placers} placers, ${result.nonPlacers || result.imported - result.placers} non-placers)` : ''}`
        setImportMessage({ type: "success", text: message })
        setJsonInput("")
        fetchPlacements()
      } else {
        setImportMessage({ type: "error", text: result.error || "Import failed" })
      }
    } catch (error: any) {
      setImportMessage({ type: "error", text: error.message || "Import failed" })
    } finally {
      setImporting(false)
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

    if (!confirm(`Are you sure you want to delete ALL ${yearFilter} NHSCA data? This cannot be undone.`)) {
      return
    }

    try {
      setDeleting(true)
      const response = await fetch(`/api/admin/nhsca-placements/delete-year?year=${yearFilter}`, {
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

  const filteredPlacements = placements.filter((p) => {
    if (searchTerm && !p.athlete_name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    if (yearFilter && p.year !== yearFilter) {
      return false
    }
    if (statusFilter !== "all" && p.match_status !== statusFilter) {
      return false
    }
    return true
  })

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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#13294B] mb-2">NHSCA Participants Management</h1>
          <p className="text-gray-600">Import, match, and merge NHSCA tournament data (placers and non-placers)</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
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

        {/* Import Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import JSON Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Year</label>
                <Input
                  type="number"
                  value={importYear}
                  onChange={(e) => setImportYear(parseInt(e.target.value) || 2025)}
                  className="max-w-xs"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">JSON Data (Array of participants - placers and non-placers)</label>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder='[{"athlete_name": "John Doe", "placement": null, "record": "2-2", "weight_class": "157", "division": "Senior", ...}, ...]'
                  className="w-full h-32 p-3 border rounded font-mono text-sm"
                />
              </div>
              {importMessage && (
                <div
                  className={`p-3 rounded ${
                    importMessage.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {importMessage.text}
                </div>
              )}
              <Button onClick={handleImport} disabled={importing} className="bg-[#13294B] hover:bg-[#1a3a5c]">
                {importing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Data
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <p className="text-sm text-gray-600 mb-2">
          Auto-Match and Merge use <strong>year filter</strong> if set, otherwise <strong>import year</strong> ({importYear}). Current:{" "}
          <strong>{matchMergeYear}</strong>
        </p>
        <div className="flex gap-4 mb-6">
          <Button onClick={handleDeleteYear} disabled={deleting || !yearFilter} variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
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
          <Button onClick={handleMatch} disabled={matching} variant="outline">
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
          <Button onClick={handleMerge} disabled={merging} variant="outline">
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
          <Button onClick={fetchPlacements} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
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
                  title="Filter table; also sets year for Match/Merge when filled"
                  value={yearFilter || ""}
                  onChange={(e) => setYearFilter(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-32"
                />
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded"
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

        {/* Placements Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Participants ({filteredPlacements.length} of {placements.length})
            </CardTitle>
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
                        <td className="p-2">{getStatusBadge(p.match_status)}</td>
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
              {!linkSearching &&
                linkSearch.trim().length >= 2 &&
                linkResults.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No athletes found. Try another spelling or turn off the class-year filter.
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

