"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Copy, Loader2, Printer } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type AthleteRow = {
  id: string
  name: string
  highschool: string
  division: string | null
  weight: number | string | null
  college: string | null
  college_logo_url: string | null
  cell: string
  academic_gpa: number | null
  nhsca_2023_record: string | null
  nhsca_2023_placement: number | string | null
  nhsca_2024_record: string | null
  nhsca_2024_placement: number | string | null
  nhsca_2025_record: string | null
  nhsca_2025_placement: number | string | null
  super_32_2024_record: string | null
  super_32_2024_placement: number | string | null
  super_32_2025_record: string | null
  super_32_2025_placement: number | string | null
  nchsaa_results?: Array<{ year: number; place: number; classification?: string; weight_class?: string }>
  nhsca_results?: Array<{ year: number; placement: string; record?: string }>
}

function formatPlaceSuffix(p: number | string | null | undefined): string {
  if (p == null) return ""
  const n = typeof p === "number" ? p : parseInt(String(p), 10)
  if (isNaN(n)) return ""
  if (n === 1) return "st"
  if (n === 2) return "nd"
  if (n === 3) return "rd"
  return "th"
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
    const header = ["#", "Name", "School", "Div", "Weight", "Status", "Cell", "State", "NHSCA", "Super 32", "GPA"]
    const rows = athletes.map((a, i) => {
      const state = a.nchsaa_results?.slice(0, 2).map((r) => `${r.place}${formatPlaceSuffix(r.place)} • ${r.classification || ""} ${r.weight_class || ""} '${String(r.year).slice(-2)}`).join(" | ") || "—"
      const nhsca = [
        (a.nhsca_2025_placement || a.nhsca_2025_record) && `'25: ${a.nhsca_2025_placement ? a.nhsca_2025_placement + formatPlaceSuffix(a.nhsca_2025_placement) : ""} ${a.nhsca_2025_record ? `Record: ${a.nhsca_2025_record}` : ""}`,
        (a.nhsca_2024_placement || a.nhsca_2024_record) && `'24: ${a.nhsca_2024_placement ? a.nhsca_2024_placement + formatPlaceSuffix(a.nhsca_2024_placement) : ""} ${a.nhsca_2024_record ? `Record: ${a.nhsca_2024_record}` : ""}`,
        ...(a.nhsca_results || []).slice(0, 2).map((r) => `'${String(r.year).slice(-2)}: ${r.placement} ${r.record ? `Record: ${r.record}` : ""}`),
      ].filter(Boolean).join(" | ") || "—"
      const super32 = [
        (a.super_32_2025_placement || a.super_32_2025_record) && `'25: ${a.super_32_2025_placement ? a.super_32_2025_placement + formatPlaceSuffix(a.super_32_2025_placement) : ""} ${a.super_32_2025_record ? `Record: ${a.super_32_2025_record}` : ""}`,
        (a.super_32_2024_placement || a.super_32_2024_record) && `'24: ${a.super_32_2024_placement ? a.super_32_2024_placement + formatPlaceSuffix(a.super_32_2024_placement) : ""} ${a.super_32_2024_record ? `Record: ${a.super_32_2024_record}` : ""}`,
      ].filter(Boolean).join(" | ") || "—"
      return [
        String(i + 1),
        a.name,
        a.highschool,
        a.division || "—",
        a.weight ? `${a.weight}` : "TBD",
        a.college ? `✓ ${a.college}` : "—",
        a.cell,
        state,
        nhsca,
        super32,
        a.academic_gpa != null ? String(a.academic_gpa) : "—",
      ]
    })
    const tabbed = [header.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n")
    navigator.clipboard.writeText(tabbed).then(() => {
      toast({ title: "Copied", description: "Table copied as tab-separated text. Paste into Excel or Slides." })
    })
  }, [athletes, toast])

  return (
    <div className="min-h-screen bg-white">
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

      <div className="mx-auto max-w-6xl px-6 py-8 print:py-4 overflow-x-auto">
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
            <table className="w-full border-collapse text-sm min-w-[900px]">
              <thead>
                <tr className="border border-gray-300 bg-[#13294B] text-white">
                  <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-10">#</th>
                  <th className="border border-gray-300 px-2 py-2 text-left font-semibold min-w-[120px]">Name</th>
                  <th className="border border-gray-300 px-2 py-2 text-left font-semibold">School</th>
                  <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-14">Div</th>
                  <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-16">Weight</th>
                  <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-14">Status</th>
                  <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-28">Cell</th>
                  <th className="border border-gray-300 px-2 py-2 text-left font-semibold min-w-[100px]">State</th>
                  <th className="border border-gray-300 px-2 py-2 text-left font-semibold min-w-[100px]">NHSCA</th>
                  <th className="border border-gray-300 px-2 py-2 text-left font-semibold min-w-[90px]">Super 32</th>
                  <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-12">GPA</th>
                </tr>
              </thead>
              <tbody>
                {athletes.map((row, idx) => (
                  <tr key={row.id} className="border border-gray-300 hover:bg-gray-50 print:hover:bg-transparent">
                    <td className="border border-gray-300 px-2 py-1.5 text-gray-600 font-medium">#{idx + 1}</td>
                    <td className="border border-gray-300 px-2 py-1.5 font-medium text-[#13294B]">{row.name}</td>
                    <td className="border border-gray-300 px-2 py-1.5">{row.highschool}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-gray-600">
                      {row.division || (row.nchsaa_results?.[0]?.classification) || "—"}
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5">{row.weight ? `${row.weight} lbs` : "TBD"}</td>
                    <td className="border border-gray-300 px-2 py-1.5">
                      {row.college && row.college_logo_url ? (
                        <Image
                          src={row.college_logo_url}
                          alt={`${row.college} logo`}
                          width={32}
                          height={32}
                          className="object-contain"
                          unoptimized={row.college_logo_url.startsWith("http")}
                        />
                      ) : row.college ? (
                        <span className="text-green-600 text-xs">✓ {row.college}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 font-mono text-xs">{row.cell}</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">
                      {row.nchsaa_results && row.nchsaa_results.length > 0 ? (
                        <div className="space-y-0.5">
                          {row.nchsaa_results.slice(0, 2).map((r, i) => {
                            const emoji = r.place === 1 ? "🥇" : r.place === 2 ? "🥈" : r.place === 3 ? "🥉" : "🏅"
                            return (
                              <div key={i} className="text-gray-700">
                                {emoji} {r.place}{formatPlaceSuffix(r.place)} • {r.classification || ""} {r.weight_class || ""} &apos;{String(r.year).slice(-2)}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">
                      {(row.nhsca_2025_placement || row.nhsca_2025_record || row.nhsca_2024_placement || row.nhsca_2024_record || row.nhsca_2023_placement || row.nhsca_2023_record || (row.nhsca_results && row.nhsca_results.length > 0)) ? (
                        <div className="space-y-0.5">
                          {(row.nhsca_2025_placement || row.nhsca_2025_record) && (
                            <div className="text-gray-700">
                              {row.nhsca_2025_placement && <>{(Number(row.nhsca_2025_placement) <= 8 ? "🥇" : "🏅")} {row.nhsca_2025_placement}{formatPlaceSuffix(row.nhsca_2025_placement)}</>}
                              {row.nhsca_2025_record && <>{row.nhsca_2025_placement ? " • " : ""}Record: {row.nhsca_2025_record}</>}
                              {" '25"}
                            </div>
                          )}
                          {(row.nhsca_2024_placement || row.nhsca_2024_record) && (
                            <div className="text-gray-700">
                              {row.nhsca_2024_placement && <>{(Number(row.nhsca_2024_placement) <= 8 ? "🥇" : "🏅")} {row.nhsca_2024_placement}{formatPlaceSuffix(row.nhsca_2024_placement)}</>}
                              {row.nhsca_2024_record && <>{row.nhsca_2024_placement ? " • " : ""}Record: {row.nhsca_2024_record}</>}
                              {" '24"}
                            </div>
                          )}
                          {(row.nhsca_2023_placement || row.nhsca_2023_record) && (
                            <div className="text-gray-700">
                              {row.nhsca_2023_placement && <>{(Number(row.nhsca_2023_placement) <= 8 ? "🥇" : "🏅")} {row.nhsca_2023_placement}{formatPlaceSuffix(row.nhsca_2023_placement)}</>}
                              {row.nhsca_2023_record && <>{row.nhsca_2023_placement ? " • " : ""}Record: {row.nhsca_2023_record}</>}
                              {" '23"}
                            </div>
                          )}
                          {!row.nhsca_2025_placement && !row.nhsca_2024_placement && !row.nhsca_2023_placement && row.nhsca_results && row.nhsca_results.length > 0 && (
                            row.nhsca_results.slice(0, 3).map((r, i) => (
                              <div key={i} className="text-gray-700">
                                {r.placement ? "🏅 " : ""}{r.placement}{r.record ? ` • Record: ${r.record}` : ""} &apos;{String(r.year).slice(-2)}
                              </div>
                            ))
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">
                      {(row.super_32_2025_placement || row.super_32_2025_record || row.super_32_2024_placement || row.super_32_2024_record) ? (
                        <div className="space-y-0.5">
                          {(row.super_32_2025_placement || row.super_32_2025_record) && (
                            <div className="text-gray-700">
                              {row.super_32_2025_placement && <>{(Number(row.super_32_2025_placement) <= 8 ? "🥇" : "🏅")} {row.super_32_2025_placement}{formatPlaceSuffix(row.super_32_2025_placement)}</>}
                              {row.super_32_2025_record && <>{row.super_32_2025_placement ? " • " : ""}Record: {row.super_32_2025_record}</>}
                              {" '25"}
                            </div>
                          )}
                          {(row.super_32_2024_placement || row.super_32_2024_record) && (
                            <div className="text-gray-700">
                              {row.super_32_2024_placement && <>{(Number(row.super_32_2024_placement) <= 8 ? "🥇" : "🏅")} {row.super_32_2024_placement}{formatPlaceSuffix(row.super_32_2024_placement)}</>}
                              {row.super_32_2024_record && <>{row.super_32_2024_placement ? " • " : ""}Record: {row.super_32_2024_record}</>}
                              {" '24"}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5">
                      {row.academic_gpa != null ? (
                        <span className="font-medium text-gray-700">{Number(row.academic_gpa).toFixed(1)}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
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
