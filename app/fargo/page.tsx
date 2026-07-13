import type { Metadata } from "next"
import { Trophy, MapPin, Calendar } from "lucide-react"
import { FargoHistoricalLinks, FargoYearNav } from "@/components/fargo/fargo-year-nav"
import { FargoTeamStatsGrid } from "@/components/fargo/fargo-team-stats"
import { FargoHighlightsSection, FargoWrestlersTable } from "@/components/fargo/fargo-highlights"
import {
  FARGO_2026_16U_AAS,
  FARGO_2026_16U_NEAR_MISS,
  FARGO_2026_JUNIOR_TOP,
  FARGO_CURRENT_YEAR,
  FARGO_EVENT_NAME,
  getFargoTeamSummary,
} from "@/lib/fargo-archive"
import { fetchFargoResultsForYear, groupFargoByDivision } from "@/lib/fargo-archive-fetch"

export const metadata: Metadata = {
  title: "Fargo Nationals 2026 | NC United",
  description:
    "North Carolina results from the 2026 US Marine Corps National Championships (Fargo) — 16U and Junior freestyle.",
}

export default async function FargoPage() {
  const year = FARGO_CURRENT_YEAR
  const wrestlers = await fetchFargoResultsForYear(year)
  const { sixteenU, junior } = groupFargoByDivision(wrestlers)

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="rounded-xl bg-[#002147] p-6 md:p-10 mb-8 text-center text-white">
          <div className="flex items-center justify-center gap-2 text-[#CBAF5D] mb-3">
            <Trophy className="h-6 w-6" />
            <span className="text-sm font-semibold uppercase tracking-widest">NC United · Fargo Nationals</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{year} Results</h1>
          <p className="text-white/80 text-sm md:text-base max-w-2xl mx-auto mb-4">{FARGO_EVENT_NAME}</p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-white/70 mb-6">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              Fargo, North Dakota
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              July {year}
            </span>
          </div>
          <FargoHistoricalLinks className="mb-6" />
          <FargoYearNav activeYear={year} />
        </div>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-[#002147] mb-2">2026 — A breakout year for NC 16U</h2>
          <p className="text-muted-foreground mb-6 max-w-3xl">
            Smallest 16U roster of the four-year window (15 wrestlers), yet the best team win rate (53%) and the first
            16U freestyle All-Americans in this stretch — three of them. The Junior side saw Bentley Sly&apos;s deepest
            run of the window at 6-2.
          </p>
          <FargoTeamStatsGrid
            sixteenU={getFargoTeamSummary(year, "16U")}
            junior={getFargoTeamSummary(year, "Junior")}
          />
        </section>

        <div className="grid gap-8 lg:grid-cols-2 mb-10">
          <FargoHighlightsSection title="16U All-Americans" items={FARGO_2026_16U_AAS} variant="aa" />
          <div className="space-y-8">
            <FargoHighlightsSection title="Junior top runs" items={FARGO_2026_JUNIOR_TOP} variant="top" />
            <FargoHighlightsSection title="Just missed the podium" items={FARGO_2026_16U_NEAR_MISS} variant="near" />
          </div>
        </div>

        <section className="space-y-8">
          <FargoWrestlersTable title={`${year} — 16U Boys (${sixteenU.length} wrestlers)`} rows={sixteenU} />
          <FargoWrestlersTable title={`${year} — Junior Boys (${junior.length} wrestlers)`} rows={junior} />
        </section>
      </div>
    </div>
  )
}
