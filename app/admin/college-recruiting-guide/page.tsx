"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Copy, Loader2, Printer } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type AthleteRow = {
  id: string
  name: string
  weight: string
  college: string
  highschool: string
  cell: string
  gpa: string
  accomplishments: string
}

export default function CollegeRecruitingGuidePage() {
  const [year, setYear] = useState(2026)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [athletes, setAthletes] = useState<AthleteRow[]>([])
  const { toast } = useToast()

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/college-recruiting-guide?year=${year}`, {
        credentials: "include",
        cache: "no-store",
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || "Failed to load")
      setAthletes(data.athletes ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    loadData()
  }, [loadData])

  const copyTableForSlides = useCallback(() => {
    const header = ["#", "Name", "Wt", "College", "High School", "Cell", "GPA", "Accomplishments"]
    const rows = athletes.map((a, i) => [
      String(i + 1),
      a.name,
      a.weight,
      a.college,
      a.highschool,
      a.cell,
      a.gpa,
      a.accomplishments,
    ])
    const tabbed = [header.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n")
    navigator.clipboard.writeText(tabbed).then(() => {
      toast({ title: "Copied", description: "Table copied as tab-separated text. Paste into Excel or Slides." })
    })
  }, [athletes, toast])

  return (
    <div className="min-h-screen bg-white">
      {/* Admin controls - hidden when printing */}
      <div className="print:hidden border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <span className="text-sm text-gray-600">College Recruiting Guide</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm bg-white"
            >
              <option value={2026}>Class of 2026</option>
              <option value={2027}>Class of 2027</option>
              <option value={2028}>Class of 2028</option>
            </select>
            <Button onClick={copyTableForSlides} disabled={loading || athletes.length === 0} variant="outline" size="sm">
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
            <Button onClick={() => window.print()} disabled={loading || athletes.length === 0} variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
          </div>
        </div>
      </div>

      {/* Print-optimized content */}
      <div className="mx-auto max-w-6xl px-6 py-8 print:py-4">
        {error && <p className="mb-4 text-sm text-red-600 print:hidden">{error}</p>}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-[#13294B]" />
          </div>
        ) : athletes.length === 0 ? (
          <p className="py-16 text-center text-gray-500">No ranked prospects for Class of {year}.</p>
        ) : (
          <div id="recruiting-guide-print">
            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold text-[#13294B] tracking-tight">NC Wrestling Recruiting Guide</h1>
              <p className="mt-1 text-base text-gray-700">Class of {year}</p>
            </div>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border border-gray-300 bg-[#13294B] text-white">
                  <th className="border border-gray-300 px-3 py-2.5 text-left font-semibold">#</th>
                  <th className="border border-gray-300 px-3 py-2.5 text-left font-semibold">Name</th>
                  <th className="border border-gray-300 px-3 py-2.5 text-left font-semibold">Wt</th>
                  <th className="border border-gray-300 px-3 py-2.5 text-left font-semibold">College</th>
                  <th className="border border-gray-300 px-3 py-2.5 text-left font-semibold">High School</th>
                  <th className="border border-gray-300 px-3 py-2.5 text-left font-semibold">Cell</th>
                  <th className="border border-gray-300 px-3 py-2.5 text-left font-semibold">GPA</th>
                  <th className="border border-gray-300 px-3 py-2.5 text-left font-semibold">Accomplishments</th>
                </tr>
              </thead>
              <tbody>
                {athletes.map((row, idx) => (
                  <tr key={row.id} className="border border-gray-300 hover:bg-gray-50 print:hover:bg-transparent">
                    <td className="border border-gray-300 px-3 py-2 text-gray-600">{idx + 1}</td>
                    <td className="border border-gray-300 px-3 py-2 font-medium">{row.name}</td>
                    <td className="border border-gray-300 px-3 py-2">{row.weight}</td>
                    <td className="border border-gray-300 px-3 py-2">{row.college}</td>
                    <td className="border border-gray-300 px-3 py-2">{row.highschool}</td>
                    <td className="border border-gray-300 px-3 py-2 font-mono text-xs">{row.cell}</td>
                    <td className="border border-gray-300 px-3 py-2">{row.gpa}</td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-700">{row.accomplishments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
