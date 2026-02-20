import { redirect } from "next/navigation"

/**
 * Single public profile - unified-profile is the one working profile used by 2026/2027/2028.
 * Redirect /prospects/[id] to /unified-profile/[id] so there's one code path for all kids.
 */
interface ProspectPageProps {
  params: Promise<{ id: string }>
}

export default async function ProspectPage({ params }: ProspectPageProps) {
  const { id } = await params
  redirect(`/unified-profile/${id}`)
}
