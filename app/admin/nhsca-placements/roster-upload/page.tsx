"use client"

import { useMemo, useRef, useState, type DragEvent } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AdminHeader } from "@/components/admin-header"
import { HardLink } from "@/components/hard-link"
import { parseNhscaRosterTsv, type NhscaRosterTsvDeleteMode } from "@/lib/nhsca-roster-tsv-parse"
import { FileText, RefreshCw, Upload, ArrowLeft, Table } from "lucide-react"

export default function NhscaRosterUploadPage() {
  const [tsv, setTsv] = useState("")
  const [year, setYear] = useState(2026)
  const [state, setState] = useState("NC")
  const [source, setSource] = useState("")
  const [deleteMode, setDeleteMode] = useState<NhscaRosterTsvDeleteMode>("division")
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const effectiveSource = source.trim() || `admin_roster_tsv_${year}`

  const preview = useMemo(
    () => parseNhscaRosterTsv(tsv, year, state, effectiveSource),
    [tsv, year, state, effectiveSource],
  )

  const handleFile = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    const lower = file.name.toLowerCase()
    if (!lower.endsWith(".tsv") && !lower.endsWith(".txt")) {
      setMessage({ type: "error", text: "Choose a .tsv or .txt file (tab-separated roster export)" })
      return
    }
    try {
      const text = await file.text()
      setTsv(text)
      setMessage({
        type: "success",
        text: `Loaded ${file.name}. Review preview, then Import.`,
      })
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Could not read file",
      })
    }
    if (fileRef.current) fileRef.current.value = ""
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    void handleFile(e.dataTransfer.files)
  }

  const handleImport = async () => {
    if (!tsv.trim()) {
      setMessage({ type: "error", text: "Paste TSV or load a file first" })
      return
    }
    if (preview.rows.length === 0) {
      setMessage({
        type: "error",
        text: preview.warnings[0] || "Nothing valid to import — check header row and columns",
      })
      return
    }

    setImporting(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/nhsca-placements/roster-tsv-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tsv,
          year,
          state,
          source: source.trim() || undefined,
          deleteMode,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || data.details || "Import failed")
      }
      const extra = data.warnings?.length ? ` Warnings: ${data.warnings.slice(0, 3).join(" · ")}` : ""
      setMessage({
        type: "success",
        text: (data.message || `Imported ${data.imported} row(s)`) + extra,
      })
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Import failed",
      })
    } finally {
      setImporting(false)
    }
  }

  const sampleHeader =
    "id\tname\tweight_class\tgender\tclassification\tschool\twins\tlosses\tseed\tplacement\tbracket_status\t..."

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <HardLink
            href="/admin/nhsca-placements"
            className="inline-flex items-center gap-1 text-sm text-[#13294B] font-medium mb-3 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to NHSCA participants
          </HardLink>
          <h1 className="text-3xl font-bold text-[#13294B] mb-2">NHSCA roster TSV import</h1>
          <p className="text-gray-600">
            Paste or upload your tab-separated roster export (header row). Rows merge into{" "}
            <code className="bg-gray-100 px-1 rounded text-sm">nhsca_placements</code> — other tournament years are
            untouched. Replacing data is scoped by <strong>division</strong> (default) or by{" "}
            <strong>source tag</strong>.
          </p>
        </div>

        <Card className="mb-6 border-[#13294B]/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Table className="h-5 w-5" />
              Options
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Year</label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10) || 2026)}
                className="max-w-xs"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">State</label>
              <Input value={state} onChange={(e) => setState(e.target.value.toUpperCase() || "NC")} className="max-w-xs" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Source tag (optional)</label>
              <Input
                placeholder={`default: admin_roster_tsv_${year}`}
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="font-mono text-sm max-w-xl"
              />
              <p className="text-xs text-gray-600 mt-1">
                Stored on each row. Used with &quot;Delete by source&quot; to re-import one paste without touching JSON
                bulk imports for the same year.
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Replace existing rows</label>
              <select
                value={deleteMode}
                onChange={(e) => setDeleteMode(e.target.value as NhscaRosterTsvDeleteMode)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white max-w-xl w-full"
              >
                <option value="division">
                  By division (same as JSON bulk import) — only divisions present in this file, for this year/state
                </option>
                <option value="source">
                  By source tag only — delete all rows with this source for this year/state, then insert
                </option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Roster TSV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileRef}
              type="file"
              accept=".tsv,.txt,text/tab-separated-values"
              className="hidden"
              onChange={(e) => void handleFile(e.target.files)}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <FileText className="h-4 w-4 mr-1" />
                Choose .tsv file
              </Button>
            </div>
            <p className="text-xs text-gray-600">
              Required header columns: <code className="bg-gray-100 px-1 rounded">name</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">weight_class</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">classification</code> (division). Optional:{" "}
              <code className="bg-gray-100 px-1 rounded">id</code> (UUID → nhsca_roster_id), wins/losses, seed, bracket
              fields. Placement must be official finish <strong>1–8</strong> or empty.
            </p>
            <p className="text-xs text-gray-500 font-mono break-all">{sampleHeader}</p>
            <div
              onDragEnter={(e) => {
                e.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                if (e.currentTarget === e.target) setDragActive(false)
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className={`rounded-md border-2 border-dashed transition-colors ${
                dragActive ? "border-[#13294B] bg-blue-50/50" : "border-gray-200"
              }`}
            >
              <textarea
                value={tsv}
                onChange={(e) => setTsv(e.target.value)}
                placeholder="Paste tab-separated roster (include header row)…"
                className="w-full min-h-[200px] p-3 border-0 rounded-md font-mono text-xs bg-transparent focus:outline-none focus:ring-0"
              />
            </div>
            {dragActive && <p className="text-xs text-[#13294B]">Drop .tsv file here</p>}

            {message && (
              <div
                className={`p-3 rounded text-sm ${
                  message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => void handleImport()}
                disabled={importing || preview.rows.length === 0}
                className="bg-[#13294B] hover:bg-[#1a3a5c]"
              >
                {importing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Importing…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import into nhsca_placements
                  </>
                )}
              </Button>
              <span className="text-sm text-gray-600">
                Preview: <strong>{preview.rows.length}</strong> row(s), divisions:{" "}
                {preview.divisions.length ? preview.divisions.join(", ") : "—"}
                {preview.skippedEmptyName > 0 ? ` · skipped ${preview.skippedEmptyName} empty name(s)` : ""}
              </span>
            </div>

            {preview.warnings.length > 0 && (
              <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded p-3 max-h-32 overflow-y-auto">
                {preview.warnings.slice(0, 20).map((w, i) => (
                  <div key={i}>{w}</div>
                ))}
                {preview.warnings.length > 20 && <div>…and {preview.warnings.length - 20} more</div>}
              </div>
            )}
          </CardContent>
        </Card>

        {preview.rows.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview (first 15 rows)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b text-left text-gray-600">
                    <th className="py-2 pr-2">Name</th>
                    <th className="py-2 pr-2">Division</th>
                    <th className="py-2 pr-2">Wt</th>
                    <th className="py-2 pr-2">Pl</th>
                    <th className="py-2 pr-2">Record</th>
                    <th className="py-2 pr-2">School</th>
                    <th className="py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 15).map((r, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-1.5 pr-2 font-medium">{r.athlete_name}</td>
                      <td className="py-1.5 pr-2">{r.division}</td>
                      <td className="py-1.5 pr-2">{r.weight_class}</td>
                      <td className="py-1.5 pr-2">{r.placement ?? "—"}</td>
                      <td className="py-1.5 pr-2">{r.record}</td>
                      <td className="py-1.5 pr-2 text-gray-700">{r.high_school ?? "—"}</td>
                      <td className="py-1.5 text-gray-500 truncate max-w-[140px]" title={effectiveSource}>
                        {effectiveSource}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
