"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Upload, FileImage, Loader2, CheckCircle2, AlertCircle, Trophy } from "lucide-react"
import Link from "next/link"
import { AdminHeader } from "@/components/admin-header"
import { HardLink } from "@/components/hard-link"

const WEIGHT_CLASSES = ["106", "113", "120", "126", "132", "138", "144", "150", "157", "165", "175", "190", "215", "285"]
const CLASSIFICATIONS = ["1A/2A", "1A", "2A", "3A", "4A", "5A", "6A", "7A", "8A"]

/** Parse filename like 1A2A-106.png, 3A-113, 1A-120 → { classification, weight_class }. */
function parseBracketFilename(name: string): { classification: string; weight_class: string } | null {
  const base = name.replace(/\.[^.]+$/, "").trim()
  const lastDash = base.lastIndexOf("-")
  if (lastDash <= 0) return null
  const weight = base.slice(lastDash + 1)
  if (!WEIGHT_CLASSES.includes(weight)) return null
  let classification = base.slice(0, lastDash).trim()
  if (classification === "1A2A") classification = "1A/2A"
  return { classification, weight_class: weight }
}

function BracketUploadTab() {
  const [year, setYear] = useState("2026")
  const [classification, setClassification] = useState("")
  const [weightClass, setWeightClass] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [bulkYear, setBulkYear] = useState("2026")
  const [bulkFiles, setBulkFiles] = useState<File[]>([])
  const [singleLoading, setSingleLoading] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResults, setBulkResults] = useState<{ file: string; ok: boolean; message: string }[]>([])
  const { toast } = useToast()

  const handleSingleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !year || !classification || !weightClass) {
      toast({
        title: "NCHSAA bracket image",
        description:
          "Need year, division, weight, and one PNG/JPG bracket screenshot. Roster CSV (nhsca_roster_rows) goes under NHSCA Participants → Roster CSV/TSV upload.",
        variant: "destructive",
      })
      return
    }
    setSingleLoading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("year", year)
      form.append("classification", classification)
      form.append("weight_class", weightClass)
      const res = await fetch("/api/admin/nchsaa/bracket-upload", { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")
      toast({ title: "Uploaded", description: `${classification} ${weightClass} lbs saved.` })
      setFile(null)
      setClassification("")
      setWeightClass("")
      const input = document.getElementById("single-file") as HTMLInputElement
      if (input) input.value = ""
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Upload failed", variant: "destructive" })
    } finally {
      setSingleLoading(false)
    }
  }

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bulkFiles.length || !String(bulkYear).trim()) {
      const need: string[] = []
      if (!String(bulkYear).trim()) need.push("year")
      if (!bulkFiles.length) need.push("at least one PNG/JPG image")
      toast({
        title: "NCHSAA bracket images only",
        description: `${need.join(" and ")} required. This bulk tool does not accept CSV — files must be named like 3A-113.png. For nhsca_roster_rows.csv use Roster CSV/TSV upload (NHSCA Participants).`,
        variant: "destructive",
      })
      return
    }
    setBulkLoading(true)
    setBulkResults([])
    const results: { file: string; ok: boolean; message: string }[] = []
    for (const f of bulkFiles) {
      const parsed = parseBracketFilename(f.name)
      if (!parsed) {
        results.push({ file: f.name, ok: false, message: "Could not parse division and weight from filename" })
        continue
      }
      try {
        const form = new FormData()
        form.append("file", f)
        form.append("year", bulkYear)
        form.append("classification", parsed.classification)
        form.append("weight_class", parsed.weight_class)
        const res = await fetch("/api/admin/nchsaa/bracket-upload", { method: "POST", body: form })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Upload failed")
        results.push({ file: f.name, ok: true, message: "OK" })
      } catch (err) {
        results.push({ file: f.name, ok: false, message: err instanceof Error ? err.message : "Failed" })
      }
    }
    setBulkResults(results)
    const okCount = results.filter((r) => r.ok).length
    toast({ title: "Bulk upload done", description: `${okCount}/${results.length} succeeded.` })
    setBulkLoading(false)
  }

  return (
    <div className="space-y-6">
      <Card className="border-emerald-700/40 bg-emerald-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-emerald-950">NHSCA roster CSV / spreadsheet?</CardTitle>
          <CardDescription className="text-emerald-900/90 text-sm leading-relaxed">
            This page is only for <strong>NCHSAA state bracket pictures</strong> (screenshots, PNG/JPG). If your file is{" "}
            <span className="font-mono text-xs bg-white/80 px-1 rounded">nhsca_roster_rows.csv</span> or similar, use the
            roster importer instead — same admin area, different tool.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <HardLink
            href="/admin/nhsca-placements/roster-upload"
            className="inline-flex items-center rounded-md bg-[#13294B] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a3a5c]"
          >
            Open NHSCA roster CSV/TSV upload
          </HardLink>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            One-time setup
          </CardTitle>
          <CardDescription>
            Create the table once in Supabase. In Supabase → SQL Editor, run the SQL returned by{" "}
            <a href="/api/run-script/create-nchsaa-bracket-images-table" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
              this link
            </a>{" "}
            (when logged in as admin), or add table <code className="rounded bg-white px-1">nchsaa_bracket_images</code> with columns: year, classification, weight_class, image_url, and UNIQUE(year, classification, weight_class).
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            Single upload
          </CardTitle>
          <CardDescription>Pick year, division, weight class, and one image file.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSingleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Year</Label>
                <Input type="number" min={2020} max={2030} value={year} onChange={(e) => setYear(e.target.value)} placeholder="2026" />
              </div>
              <div>
                <Label>Division</Label>
                <Select value={classification} onValueChange={setClassification}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {CLASSIFICATIONS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Weight class</Label>
                <Select value={weightClass} onValueChange={setWeightClass}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {WEIGHT_CLASSES.map((w) => (
                      <SelectItem key={w} value={w}>{w} lbs</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Bracket image (PNG/JPG)</Label>
              <Input
                id="single-file"
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button type="submit" disabled={singleLoading} className="bg-[#003366] hover:bg-[#004080]">
              {singleLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload one
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk upload
          </CardTitle>
          <CardDescription>
            Upload multiple <strong>bracket images</strong> only (PNG/JPG). Same year for all. Name files with division and
            weight, e.g. <span className="font-mono text-xs">1A2A-106.png</span>,{" "}
            <span className="font-mono text-xs">3A-113.png</span>.{" "}
            <span className="text-amber-900 font-medium">Not for roster CSV</span> — use the green box above.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBulkUpload} className="space-y-4">
            <div>
              <Label>Year (for all files)</Label>
              <Input type="number" min={2020} max={2030} value={bulkYear} onChange={(e) => setBulkYear(e.target.value)} className="max-w-[120px]" />
            </div>
            <div>
              <Label>Files</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setBulkFiles(Array.from(e.target.files ?? []))}
              />
            </div>
            <Button type="submit" disabled={bulkLoading} className="bg-[#003366] hover:bg-[#004080]">
              {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload {bulkFiles.length ? bulkFiles.length : "..."} files
            </Button>
          </form>
          {bulkResults.length > 0 && (
            <div className="mt-4 border rounded-md divide-y max-h-60 overflow-auto">
              {bulkResults.map((r, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 text-sm">
                  {r.ok ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" /> : <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />}
                  <span className="truncate">{r.file}</span>
                  <span className={r.ok ? "text-green-600" : "text-amber-700"}>{r.message}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-slate-500">
        Brackets appear on the <Link href="/nchsaa/2026" className="text-[#003366] underline">2026 NCHSAA states page</Link> when users select a division and weight and click “View Bracket”.
      </p>
    </div>
  )
}

export default function NCHSAAAdminPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#003366] to-[#004080] text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Trophy className="h-9 w-9 text-[#D3B574]" />
            <div>
              <h1 className="text-2xl font-bold">NCHSAA</h1>
              <p className="text-blue-200 text-sm">State brackets, results, and utilities</p>
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-6">
        <AdminHeader />
        <Tabs defaultValue="brackets" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="brackets">Bracket upload</TabsTrigger>
          </TabsList>
          <TabsContent value="brackets" className="mt-0 max-w-4xl">
            <BracketUploadTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
