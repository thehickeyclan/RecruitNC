"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BookOpen, Copy, Loader2 } from "lucide-react"
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
  const [logos, setLogos] = useState<Record<string, string>>({})
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

  // Fetch college logos
  useEffect(() => {
    const colleges = [...new Set(athletes.map((a) => a.college).filter(Boolean))] as string[]
    colleges.forEach(async (college) => {
      if (college === "—") return
      try {
        const res = await fetch(`/api/logo-mappings/by-entity/college/${encodeURIComponent(college)}`)
        const json = await res.json()
        if (json.success && json.logo_url) {
          setLogos((prev) => ({ ...prev, [college]: json.logo_url }))
        }
      } catch {
        /* ignore */
      }
    })
  }, [athletes])

  const copyTableForSlides = useCallback(() => {
    const header = ["Name", "Weight", "College", "High School", "Cell", "GPA", "Accomplishments"]
    const rows = athletes.map((a) => [
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-[#13294B] flex items-center gap-2">
                <BookOpen className="h-7 w-7 text-[#C8102E]" />
                College Recruiting Guide
              </h1>
              <p className="text-sm text-gray-600">Printable guide for coaches — Class of 2026, 2027, 2028</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium bg-white"
            >
              <option value={2026}>Class of 2026</option>
              <option value={2027}>Class of 2027</option>
              <option value={2028}>Class of 2028</option>
            </select>
            <Button onClick={copyTableForSlides} disabled={loading || athletes.length === 0} variant="outline">
              <Copy className="h-4 w-4 mr-2" />
              Copy for slides
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Class of {year} — Committed Athletes</CardTitle>
            <CardDescription>
              {athletes.length} athlete{athletes.length !== 1 ? "s" : ""}. Copy table to paste into PowerPoint,
              Google Slides, or Excel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[#13294B]" />
              </div>
            ) : athletes.length === 0 ? (
              <p className="py-12 text-center text-gray-500">No committed athletes for Class of {year}.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm" id="recruiting-guide-table">
                  <thead>
                    <tr className="border-b-2 border-[#13294B] bg-[#13294B]/5">
                      <th className="text-left p-2 font-semibold">Name</th>
                      <th className="text-left p-2 font-semibold">Weight</th>
                      <th className="text-left p-2 font-semibold">College</th>
                      <th className="text-left p-2 font-semibold">High School</th>
                      <th className="text-left p-2 font-semibold">Cell #</th>
                      <th className="text-left p-2 font-semibold">GPA</th>
                      <th className="text-left p-2 font-semibold">Accomplishments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {athletes.map((row) => (
                      <tr key={row.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-2 font-medium">{row.name}</td>
                        <td className="p-2">{row.weight}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {logos[row.college] ? (
                              <img
                                src={logos[row.college]}
                                alt=""
                                width={28}
                                height={28}
                                className="object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none"
                                }}
                              />
                            ) : (
                              <span className="w-7 h-7 bg-gray-200 rounded flex-shrink-0" />
                            )}
                            <span>{row.college}</span>
                          </div>
                        </td>
                        <td className="p-2">{row.highschool}</td>
                        <td className="p-2 font-mono text-xs">{row.cell}</td>
                        <td className="p-2">{row.gpa}</td>
                        <td className="p-2 text-gray-700">{row.accomplishments}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
