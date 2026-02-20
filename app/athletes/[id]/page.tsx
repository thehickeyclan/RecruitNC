import { redirect } from "next/navigation"

interface AthletePageProps {
  params: Promise<{ id: string }>
}

export default async function AthletePage({ params }: AthletePageProps) {
  const { id } = await params
  redirect(`/unified-profile/${id}`)
}
