import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { TocPublicBracket } from "@/components/toc/brackets/toc-public-bracket"
import { parseAthleteWeightClass } from "@/lib/toc/invitations"
import { TOC_2026_PHOTOS, TOC_2026_PODIUMS, TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"

/**
 * One weight's finished bracket, public.
 *
 * Lives under /results rather than /brackets because the pages under /brackets are the seeding
 * room: admin-gated, noindex, and able to change a draw. This is the record of what happened.
 */
export const dynamic = "force-dynamic"

type Props = { params: Promise<{ weight: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const weight = parseAthleteWeightClass((await params).weight)
  if (weight == null) return { title: "Bracket | Tournament of Champions 2026" }
  return {
    title: `${weight} lbs Bracket | Tournament of Champions 2026`,
    description: `Full ${weight} lb bracket and results from the 2026 NC United Tournament of Champions in Apex.`,
  }
}

export default async function TocResultsBracketPage({ params }: Props) {
  const weight = parseAthleteWeightClass((await params).weight)
  if (weight == null || !TOC_WEIGHT_CLASSES.includes(weight as never)) notFound()
  const podium = TOC_2026_PODIUMS[weight]

  return (
    <main className="min-h-screen bg-[#060f1f]">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <Link href="/tournament-of-champions/results" className="text-sm text-[#D3B574] hover:underline">
          ← All results
        </Link>
      </div>
      {/* The podium above the draw: the result first, then how it was arrived at. */}
      {podium ? (
        <figure className="mx-auto mt-6 max-w-6xl px-4 sm:px-6">
          <img
            src={podium.src}
            alt={`The ${weight} lb podium at the 2026 Tournament of Champions — the three placers on the mat, the champion holding the bracket`}
            width={1600}
            height={1066}
            className="w-full rounded-xl border border-white/10"
          />
          <figcaption className="mt-2 text-sm text-white/50">
            {weight} lbs — first, second and third. {TOC_2026_PHOTOS.credit}
          </figcaption>
        </figure>
      ) : null}

      <TocPublicBracket weightClass={weight} allWeights={[...TOC_WEIGHT_CLASSES]} />
    </main>
  )
}
