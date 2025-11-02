import { redirect } from "next/navigation"

interface AthletePageProps {
  params: {
    id: string
  }
}

export default async function AthletePage({ params }: AthletePageProps) {
  redirect(`/unified-profile/${params.id}`)
}
