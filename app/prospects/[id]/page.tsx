import { redirect } from "next/navigation"

/**
 * Redirect /prospects/[id] to view-profile so profile loads reliably (no server hang).
 */
interface ProspectPageProps {
  params: Promise<{ id: string }>
}

export default async function ProspectPage({ params }: ProspectPageProps) {
  const { id } = await params
  redirect(`/view-profile?id=${encodeURIComponent(id)}`)
}
