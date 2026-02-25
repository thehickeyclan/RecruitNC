"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Upload, FileImage, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import Link from "next/link"

const WEIGHT_CLASSES = ["106", "113", "120", "126", "132", "138", "144", "150", "157", "165", "175", "190", "215", "285"]
const CLASSIFICATIONS = ["1A/2A", "1A", "2A", "3A", "4A", "5A", "6A", "7A", "8A"]

/** Parse filename like "1A_106.png" or "1A_2A_120.jpg" -> { classification, weight_class } */
function parseBracketFilename(name: string): { classification: string; weight_class: string } | null {
  const base = name.replace(/\.[^.]+$/, "").trim()
  const parts = base.split("_")
  if (parts.length < 2) return null
  const weight = parts[parts.length - 1]
  if (!WEIGHT_CLASSES.includes(weight)) return null
  const classification = parts.slice(0, -1).join("/")
  return { classification, weight_class: weight }
}

export default function NCHSAABracketsPage() {
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
      toast({ title: "Missing fields", description: "Select year, division, weight, and a file.", variant: "destructive" })
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
    if (!bulkFiles.length || !bulkYear) {
      toast({ title: "Missing data", description: "Select year and at least one file.", variant: "destructive" })
      return
    }
    setBulkLoading(true)
    setBulkResults([])
    const results: { file: string; ok: boolean; message: string }[] = []
    for (const f of bulkFiles) {
      const parsed = parseBracketFilename(f.name)
      if (!parsed) {
        results.push({ file: f.name, ok: false, message: "Name must be like 1A_106.png or 1A_2A_120.png" })
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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#13294B]">NCHSAA Bracket Uploads</h1>
        <p className="text-slate-600 mt-1">
          Upload bracket screenshots (e.g. from Track Wrestling) for the states page. Stored in Vercel Blob and linked by year/division/weight — scales to many years and files.
        </p>
      </div>

      <Card className="mb-6 border-amber-200 bg-amber-50/50">
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

      <Card className="mb-6">
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
            <Button type="submit" disabled={singleLoading} className="bg-[#13294B] hover:bg-[#1a3a5c]">
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
            Upload many files at once. Name each file like <strong>1A_106.png</strong> or <strong>1A_2A_120.png</strong> (division_weight.png). Same year for all.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBulkUpload} className="space-y-4">
            <div>
              <Label>Year (for all files)</Label>
              <Input type="number" min={2020} max={2030} value={bulkYear} onChange={(e) => setBulkYear(e.target.value)} className="max-w-[120px]" />
            </div>
            <div>
              <Label>Files (named e.g. 1A_106.png, 2A_120.png)</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setBulkFiles(Array.from(e.target.files ?? []))}
              />
            </div>
            <Button type="submit" disabled={bulkLoading} className="bg-[#13294B] hover:bg-[#1a3a5c]">
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

      <p className="mt-6 text-sm text-slate-500">
        Brackets appear on the <Link href="/nchsaa/2026" className="text-[#13294B] underline">2026 NCHSAA states page</Link> when users select a division and weight and click “View Bracket”.
      </p>
    </div>
  )
}
