import type { Metadata } from "next"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import { getPublicAnnouncedWeight } from "@/lib/toc/public-announced-field"
import { verifyAthleteToken } from "@/lib/toc/coach-link"
import { CornerCoachForm } from "@/components/toc/corner-coach-form"

/**
 * Where a family names their wrestler's corner coaches.
 *
 * Reached by a signed link sent to that family, and it holds no roster: an earlier version let
 * anyone search the announced field, which exposed nothing new but let a stranger designate
 * coaches for somebody else's child. Without a valid signature this page knows about no
 * wrestlers at all.
 */

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Corner coaches — Tournament of Champions",
  description: "Name the coaches who will corner your wrestler at the NC United Tournament of Champions.",
  robots: { index: false, follow: false },
}

async function resolveAthlete(athleteId: string) {
  for (const weightClass of TOC_WEIGHT_CLASSES) {
    const weight = await getPublicAnnouncedWeight(weightClass)
    const hit = weight?.athletes.find((a) => a.athleteId === athleteId)
    if (hit) return { athleteId, name: hit.name, weightClass, club: hit.club ?? null }
  }
  return null
}

export default async function CornerCoachesPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; t?: string }>
}) {
  const { a: athleteId = "", t: token = "" } = await searchParams

  // One wrestler, or none. Nothing here enumerates the field.
  const authorised = Boolean(athleteId) && verifyAthleteToken(athleteId, token)
  const athlete = authorised ? await resolveAthlete(athleteId) : null

  return (
    <main className="min-h-screen bg-[#0A1628] px-4 py-12 text-white sm:px-6">
      <div className="mx-auto w-full max-w-xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D3B574]">
          Tournament of Champions
        </p>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">Name your corner coaches</h1>

        {athlete ? (
          <>
            <p className="mt-4 text-base leading-relaxed text-[#A8BBD1]">
              Up to two coaches for{" "}
              <strong className="text-white">
                {athlete.name} · {athlete.weightClass} lbs
              </strong>
              . We credential them and email them directly — coaches buy the same ticket as
              everyone else, and collect a coaching lanyard at check-in for floor access and floor
              seating.
            </p>
            <CornerCoachForm athlete={athlete} />
          </>
        ) : (
          <div className="mt-8 rounded-xl border border-[#1a3a5f] bg-[#0f1c2e] p-6">
            <h2 className="text-lg font-bold">This link is not valid</h2>
            <p className="mt-2 leading-relaxed text-[#A8BBD1]">
              Corner coaches are named using the personal link we email to each wrestler&apos;s
              family. Check the most recent email from us, or reply to it and we will send a new
              one.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
