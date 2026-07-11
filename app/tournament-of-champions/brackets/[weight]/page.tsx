import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { TocBracketWeightPage } from "@/components/toc/brackets/toc-bracket-weight-page"
import { parseAthleteWeightClass } from "@/lib/toc/invitations"
import { requireTocBracketViewer } from "@/lib/toc/require-toc-bracket-viewer"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ weight: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const weight = parseAthleteWeightClass((await params).weight)
  if (weight == null) return { title: "Bracket | Tournament of Champions" }
  return {
    title: `${weight} lbs Bracket | Tournament of Champions 2026`,
    description: `Official ${weight} lb draw — NC United Tournament of Champions.`,
    robots: { index: false, follow: false },
  }
}

export default async function TocBracketWeightRoute({ params }: Props) {
  const gate = await requireTocBracketViewer()
  if (!gate.ok) {
    if (gate.status === 401) {
      const weight = parseAthleteWeightClass((await params).weight)
      const returnTo =
        weight != null
          ? `/tournament-of-champions/brackets/${weight}`
          : "/tournament-of-champions/brackets"
      redirect(`/auth/signin?returnTo=${encodeURIComponent(returnTo)}`)
    }
    redirect("/tournament-of-champions")
  }

  const weight = parseAthleteWeightClass((await params).weight)
  if (weight == null) notFound()
  return <TocBracketWeightPage weightClass={weight} />
}
