import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { Trophy, MapPin, Calendar, ArrowLeft } from "lucide-react"
import { HardLink } from "@/components/hard-link"
import { FargoYearNav } from "@/components/fargo/fargo-year-nav"
import { FargoTeamStatsGrid } from "@/components/fargo/fargo-team-stats"
import { FargoWrestlersTable } from "@/components/fargo/fargo-highlights"
import {
  FARGO_ARCHIVE_YEARS,
  FARGO_CURRENT_YEAR,
  FARGO_EVENT_NAME,
  getFargoTeamSummary,
  isFargoArchiveYear,
  type FargoArchiveYear,
} from "@/lib/fargo-archive"
import { fetchFargoResultsForYear, groupFargoByDivision } from "@/lib/fargo-archive-fetch"

type PageProps = { params: Promise<{ year: string }> }

export function generateStaticParams() {
  return FARGO_ARCHIVE_YEARS.filter((y) => y !== FARGO_CURRENT_YEAR).map((year) => ({
    year: String(year),
  }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year: yearParam } = await params
  const year = parseInt(yearParam, 10)
  if (!isFargoArchiveYear(year) || year === FARGO_CURRENT_YEAR) {
    return { title: "Fargo Nationals | NC United" }
  }
  return {
    title: `Fargo Nationals ${year} | NC United`,
    description: `North Carolina results from the ${year} US Marine Corps National Championships (Fargo).`,
  }
}

const YEAR_BLURBS: Partial<Record<FargoArchiveYear, string>> = {
  2025: "Largest 16U contingent of the window (29 wrestlers) — a volume year with 36% win rate and zero freestyle All-Americans.",
  2024: "18 wrestlers in 16U; team win rate climbed to 45%. Individual bracket exports cover per-wrestler records.",
  2023: "First year in this archive window — 13 wrestlers in 16U, building the foundation for later growth.",
}

export default async function FargoYearPage({ params }: PageProps) {
  const { year: yearParam } = await params
  const year = parseInt(yearParam, 10)
  if (!isFargoArchiveYear(year)) notFound()
  if (year === FARGO_CURRENT_YEAR) redirect("/fargo")

  const wrestlers = await fetchFargoResultsForYear(year)
  const { sixteenU, junior } = groupFargoByDivision(wrestlers)
  const blurb = YEAR_BLURBS[year]

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="rounded-xl bg-[#002147] p-6 md:p-10 mb-8 text-center text-white">
          <HardLink
            href="/fargo"
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {FARGO_CURRENT_YEAR} results
          </HardLink>
          <div className="flex items-center justify-center gap-2 text-[#CBAF5D] mb-3">
            <Trophy className="h-6 w-6" />
            <span className="text-sm font-semibold uppercase tracking-widest">NC United · Fargo Archive</span>
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
          <FargoYearNav activeYear={year} />
        </div>

        {blurb ? <p className="text-muted-foreground mb-6 max-w-3xl">{blurb}</p> : null}

        <section className="mb-10">
          <FargoTeamStatsGrid
            sixteenU={getFargoTeamSummary(year, "16U")}
            junior={getFargoTeamSummary(year, "Junior")}
          />
        </section>

        <section className="space-y-8">
          <FargoWrestlersTable
            title={`${year} — 16U Boys (${sixteenU.length} wrestlers)`}
            rows={sixteenU}
            emptyMessage={
              year <= 2024
                ? "Team stats are available above. Import scripts/data/fargo/ bracket CSVs to load individual wrestler rows for this year."
                : undefined
            }
          />
          <FargoWrestlersTable
            title={`${year} — Junior Boys (${junior.length} wrestlers)`}
            rows={junior}
            emptyMessage={
              year <= 2024
                ? "Team stats are available above. Import scripts/data/fargo/ bracket CSVs to load individual wrestler rows for this year."
                : undefined
            }
          />
        </section>
      </div>
    </div>
  )
}
