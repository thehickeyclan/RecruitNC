import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { generateMetadata as profileMetadata } from "@/app/view-profile/page"

interface AthletePageProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

/**
 * /athletes/{id} is the shareable profile link; the profile itself lives at /view-profile.
 *
 * The query is carried over. Dropping it threw away every email tag (?src=email-views) and with
 * it the "college programs have viewed this profile" landing that tag switches on - the parent
 * clicking the email arrived on a profile that never mentioned why they came.
 */
/** The redirect streams, so a link preview reads this page's tags: give it the profile's. */
export async function generateMetadata({ params }: AthletePageProps): Promise<Metadata> {
  const { id } = await params
  return profileMetadata({ searchParams: Promise.resolve({ id }) } as Parameters<typeof profileMetadata>[0])
}

export default async function AthletePage({ params, searchParams }: AthletePageProps) {
  const { id } = await params
  const carried = new URLSearchParams()
  for (const [k, v] of Object.entries((await searchParams) ?? {})) {
    if (k === "id") continue
    if (typeof v === "string") carried.set(k, v)
    else if (Array.isArray(v)) for (const item of v) carried.append(k, item)
  }
  const extra = carried.toString()
  redirect(`/view-profile?id=${encodeURIComponent(id)}${extra ? `&${extra}` : ""}`)
}
