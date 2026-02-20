import { redirect } from "next/navigation"

/**
 * Redirect /admin/athletes/edit/[id] → /admin/athletes/edit?id= (same pattern as view-profile).
 * Static edit page with ?id= avoids dynamic segment so the document request always completes.
 */
interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditAthleteRedirectPage({ params }: PageProps) {
  const { id } = await params
  redirect(`/admin/athletes/edit?id=${encodeURIComponent(id)}`)
}
