import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { generateMetadata as profileMetadata } from "@/app/view-profile/page"
import { createAdminClient } from "@/lib/supabase/admin"
import { athleteIdForShortSlug } from "@/lib/profile-short-link-server"

interface ShortLinkPageProps {
  params: Promise<{ slug: string }>
}

/**
 * /w/xavier-bernthal-2029 - the short profile link families put in an Instagram bio
 * (lib/profile-short-link.ts). It sends the reader to the profile itself.
 */
/** The redirect streams, so a link preview reads this page's tags: give it the profile's. */
export async function generateMetadata({ params }: ShortLinkPageProps): Promise<Metadata> {
  const id = await athleteIdForShortSlug(createAdminClient(), (await params).slug)
  if (!id) return {}
  return profileMetadata({ searchParams: Promise.resolve({ id }) } as Parameters<typeof profileMetadata>[0])
}

export default async function ShortLinkPage({ params }: ShortLinkPageProps) {
  const id = await athleteIdForShortSlug(createAdminClient(), (await params).slug)
  if (!id) notFound()
  redirect(`/view-profile?id=${encodeURIComponent(id)}`)
}
