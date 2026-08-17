import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { HardLink } from "@/components/hard-link"
import { TocPublicAthleteCard } from "@/components/toc/field/toc-public-athlete-card"
import { TocVarsityHeading, tocContainerClass, tocSectionClass } from "@/components/toc/toc-theme"
import { parseAthleteWeightClass } from "@/lib/toc/invitations"
import { getPublicAnnouncedWeight } from "@/lib/toc/public-announced-field"

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
    description: `The ${weight} lb field for the NC United Tournament of Champions: ${field.athletes.length} invited wrestlers, listed alphabetically. The field is not seeded.`,
    openGraph: {
      title: `${weight} lbs — Tournament of Champions 2026`,
      description: `${field.athletes.length} invited wrestlers at ${weight} lbs.`,
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

  return (
    <div className="min-h-screen bg-[#061224]">
      <section className={tocSectionClass()}>
        <div className={tocContainerClass("max-w-5xl")}>
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#CC0000]">
            NC United · The Field
          </p>
          <TocVarsityHeading as="h1" className="mt-3 text-center text-white">
            {weight} lbs
          </TocVarsityHeading>

          <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-relaxed text-white/60">
            {field.athletes.length} invited wrestler{field.athletes.length === 1 ? "" : "s"} ·{" "}
            <strong className="text-white/75">listed alphabetically · not seeded</strong>
          </p>

          {field.athletes.length === 0 ? (
            <p className="mt-10 rounded-sm border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/55">
              This field is being finalized.
            </p>
          ) : (
            <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
              {field.athletes.map((athlete) => (
                <TocPublicAthleteCard key={athlete.athleteId} athlete={athlete} />
              ))}
            </ul>
          )}

          <p className="mt-10 text-center text-sm text-white/45">
            <HardLink
              href="/tournament-of-champions/field"
              className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline"
            >
              All weight classes
            </HardLink>
          </p>
        </div>
      </section>
    </div>
  )
}
