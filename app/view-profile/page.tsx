import { Suspense } from "react"
import type { Metadata } from "next"
import { loadPublicAthleteProfile } from "@/lib/load-public-athlete-profile"
import { ViewProfileClient } from "./view-profile-client"

export const revalidate = 60

type ViewProfilePageProps = {
  searchParams: Promise<{ id?: string }>
}

/**
 * Profiles are reachable by link but never crawled.
 *
 * These are minors. Public-by-link is what makes a profile usable when an athlete sends it to
 * a college coach; being in Google is a different thing entirely — it would make a 15-year-old's
 * name, school, and photo permanently searchable. noindex keeps the first and refuses the second.
 *
 * The OG tags still work: link unfurls in a text or DM are rendered by the messaging app
 * fetching the page directly, which noindex doesn't affect.
 */
export async function generateMetadata({ searchParams }: ViewProfilePageProps): Promise<Metadata> {
  const noIndex = { index: false, follow: false, nocache: true } as const
  const params = await searchParams
  const id = params.id?.trim() ?? ""
  if (!id) return { title: "Athlete profile | RecruitNC", robots: noIndex }

  const result = await loadPublicAthleteProfile(id)
  if (!result.ok) return { title: "Athlete profile | RecruitNC", robots: noIndex }

  const a = result.athlete as Record<string, unknown>
  const name = typeof a.name === "string" && a.name.trim() ? a.name.trim() : "Athlete"
  const school = typeof a.highschool === "string" ? a.highschool.trim() : ""
  const weight = a.weightclass != null ? String(a.weightclass).trim() : ""
  const gradYear = a.graduationyear != null ? String(a.graduationyear) : ""
  const photo = [a.photourl, a.photo_url, a.image_url].find(
    (v): v is string => typeof v === "string" && v.startsWith("http"),
  )

  // "Cardinal Gibbons · 132 lbs · Class of 2027" — skip whatever's missing.
  const description =
    [school, weight && `${weight} lbs`, gradYear && `Class of ${gradYear}`].filter(Boolean).join(" · ") ||
    "NC wrestling recruiting profile"

  return {
    title: `${name} | RecruitNC`,
    description,
    robots: noIndex,
    openGraph: {
      title: name,
      description,
      type: "profile",
      images: photo ? [{ url: photo }] : undefined,
    },
    twitter: {
      card: photo ? "summary_large_image" : "summary",
      title: name,
      description,
      images: photo ? [photo] : undefined,
    },
  }
}

async function ViewProfilePageInner({ searchParams }: ViewProfilePageProps) {
  const params = await searchParams
  const id = params.id?.trim() ?? ""

  if (!id) {
    return <ViewProfileClient id="" initialAthlete={null} initialError="Missing id. Use ?id= athlete-uuid" />
  }

  const result = await loadPublicAthleteProfile(id)

  return (
    <ViewProfileClient
      id={id}
      initialAthlete={result.ok ? result.athlete : null}
      initialError={result.ok ? null : result.error}
    />
  )
}

export default function ViewProfilePage(props: ViewProfilePageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0A1628] flex items-center justify-center p-6">
          <div className="text-[#D3B574] font-medium animate-pulse">Loading profile…</div>
        </main>
      }
    >
      <ViewProfilePageInner {...props} />
    </Suspense>
  )
}
