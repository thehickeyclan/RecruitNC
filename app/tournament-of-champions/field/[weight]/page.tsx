import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { HardLink } from "@/components/hard-link"
import { TocPublicAthleteCard } from "@/components/toc/field/toc-public-athlete-card"
import { TocPublicFieldGrid } from "@/components/toc/field/toc-public-field-grid"
import { TocVarsityHeading, tocContainerClass, tocDisplayClass, tocSectionClass } from "@/components/toc/toc-theme"
import { parseAthleteWeightClass } from "@/lib/toc/invitations"
import { getPublicAnnouncedWeight, listPublicWeightTiles } from "@/lib/toc/public-announced-field"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ weight: string }> }

/**
 * Metadata runs the same announced check as the page. Without it, an unreleased weight would leak its
 * existence through the page title and OG tags even while the body 404s.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const weight = parseAthleteWeightClass((await params).weight)
  if (weight == null) return { title: "The Field | Tournament of Champions 2026" }

  const field = await getPublicAnnouncedWeight(weight)
  if (!field) {
    return { title: "Not found | Tournament of Champions 2026", robots: { index: false, follow: false } }
  }

  return {
    title: `${weight} lbs — The Field | Tournament of Champions 2026`,
    description: `The ${weight} lb field for the NC United Tournament of Champions: ${field.athletes.length} athletes in the weight class, listed alphabetically. The field is not seeded.`,
    openGraph: {
      title: `${weight} lbs — Tournament of Champions 2026`,
      description: `${field.athletes.length} athletes in the ${weight} lb weight class.`,
    },
  }
}

export default async function TocPublicFieldWeightRoute({ params }: Props) {
  const weight = parseAthleteWeightClass((await params).weight)
  if (weight == null) notFound()

  /**
   * The gate. A weight that has not been released — including one already locked internally — is a 404,
   * indistinguishable from a weight that does not exist. Guessing URLs must reveal nothing about the
   * release schedule.
   */
  const field = await getPublicAnnouncedWeight(weight)
  if (!field) notFound()

  const tiles = await listPublicWeightTiles()

  const { rollup } = field
  const rollupStats = [
    { label: rollup.stateTitles === 1 ? "State title" : "State titles", value: rollup.stateTitles },
    { label: rollup.stateChampions === 1 ? "State champion" : "State champions", value: rollup.stateChampions },
    { label: rollup.statePlacers === 1 ? "State placer" : "State placers", value: rollup.statePlacers },
    { label: rollup.allAmericans === 1 ? "All-American" : "All-Americans", value: rollup.allAmericans },
  ].filter((s) => s.value > 0)

  return (
    <div className="min-h-screen bg-[#061224]">
      <section className={tocSectionClass()}>
        <div className={tocContainerClass("max-w-5xl")}>
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#CC0000]">
            Tournament of Champions · {weight} lbs
          </p>
          <TocVarsityHeading as="h1" className="mt-3 text-center text-white">
            {weight} lbs
          </TocVarsityHeading>

          <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-relaxed text-white/60">
            {field.athletes.length} athlete{field.athletes.length === 1 ? "" : "s"} in the weight class ·{" "}
            <strong className="text-white/75">listed alphabetically · not seeded</strong>
          </p>

          {/* What this bracket is made of, at a glance — the public read of the admin credential rollup. */}
          {rollupStats.length > 0 ? (
            <div className="mt-6 flex flex-wrap justify-center gap-2 sm:gap-3">
              {rollupStats.map((stat) => (
                <div
                  key={stat.label}
                  className="min-w-[104px] rounded-sm border border-white/10 bg-white/[0.04] px-3 py-2 text-center"
                >
                  <p className={`text-2xl leading-none text-white ${tocDisplayClass()}`}>{stat.value}</p>
                  <p className="mt-1 text-[9px] font-bold uppercase leading-tight tracking-[0.14em] text-white/45">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {/* Weight strip up top, compact, so browsing other weights is the first thing available. */}
          <div className="mt-8">
            <TocPublicFieldGrid tiles={tiles} currentWeight={weight} compact />
          </div>

          {field.athletes.length === 0 ? (
            <p className="mt-10 rounded-sm border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/55">
              This field is being finalized.
            </p>
          ) : (
            <>
            {/* The dots on each card mean nothing without this. */}
            <p className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-white/45">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Coach credentialed
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                Approved — credential not yet purchased
              </span>
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
              {field.athletes.map((athlete) => (
                <TocPublicAthleteCard key={athlete.athleteId} athlete={athlete} />
              ))}
            </ul>
            </>
          )}

          <p className="mt-10 text-center text-sm text-white/45">
            <HardLink
              href="/tournament-of-champions"
              className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline"
            >
              Back to Tournament of Champions
            </HardLink>
          </p>
        </div>
      </section>
    </div>
  )
}
