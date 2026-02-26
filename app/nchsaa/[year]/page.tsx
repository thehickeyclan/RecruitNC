import { notFound } from "next/navigation"
import { NCHSAAYearResultsClient } from "./year-results-client"

/**
 * Server component: validates year and renders shell so direct URL always returns visible HTML.
 * Client component handles data fetch and full UI.
 */
export default async function NCHSAAYearPage({
  params,
}: {
  params: Promise<{ year?: string }>
}) {
  const resolved = await params
  const yearParam = typeof resolved?.year === "string" ? resolved.year : ""
  const year = yearParam ? parseInt(yearParam, 10) : NaN
  const validYear = !Number.isNaN(year) && year >= 1990 && year <= 2030
  if (!validYear && yearParam !== "") {
    notFound()
  }
  const displayYear = validYear ? year : 2025

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#003366]">{displayYear} NCHSAA Results</h1>
        <p className="text-slate-600 mb-6">North Carolina State Wrestling Championships</p>
        <NCHSAAYearResultsClient displayYear={displayYear} yearParam={yearParam} />
      </div>
    </div>
  )
}
