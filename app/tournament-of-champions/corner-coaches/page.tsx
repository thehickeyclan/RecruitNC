import type { Metadata } from "next"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import { getPublicAnnouncedWeight } from "@/lib/toc/public-announced-field"
import { CornerCoachForm } from "@/components/toc/corner-coach-form"

/**
 * Where families name their wrestler's corner coaches.
 *
 * The roster comes from the announced field, so this page can only ever offer wrestlers whose
 * weight class is already public. Nothing is asked about the athlete beyond which one they are.
 */

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Corner coaches — Tournament of Champions",
  description: "Name the coaches who will corner your wrestler at the NC United Tournament of Champions.",
}

export default async function CornerCoachesPage() {
  const weights = await Promise.all(TOC_WEIGHT_CLASSES.map((w) => getPublicAnnouncedWeight(w)))
  const athletes = weights
    .filter((w): w is NonNullable<typeof w> => Boolean(w))
    .flatMap((w) =>
      w.athletes.map((a) => ({
        athleteId: a.athleteId,
        name: a.name,
        weightClass: w.weightClass,
        club: a.club ?? null,
      })),
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <main className="min-h-screen bg-[#0A1628] px-4 py-12 text-white sm:px-6">
      <div className="mx-auto w-full max-w-xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D3B574]">
          Tournament of Champions
        </p>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">Name your corner coaches</h1>
        <p className="mt-4 text-base leading-relaxed text-[#A8BBD1]">
          Each wrestler may designate up to two coaches. We credential them and email them
          directly — coaches buy the same ticket as everyone else, and collect a coaching lanyard
          at check-in for floor access and floor seating.
        </p>

        {athletes.length === 0 ? (
          <p className="mt-8 rounded-xl border border-[#1a3a5f] bg-[#0f1c2e] p-6 text-[#A8BBD1]">
            Weight classes are still being announced. Once your wrestler&apos;s weight is public you
            can name their coaches here.
          </p>
        ) : (
          <CornerCoachForm athletes={athletes} />
        )}
      </div>
    </main>
  )
}
