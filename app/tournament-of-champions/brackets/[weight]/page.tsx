import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { TocBracketWeightPage } from "@/components/toc/brackets/toc-bracket-weight-page"
import { parseAthleteWeightClass } from "@/lib/toc/invitations"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ weight: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const weight = parseAthleteWeightClass((await params).weight)
  if (weight == null) return { title: "Bracket | Tournament of Champions" }
  return {
    title: `${weight} lbs Bracket | Tournament of Champions 2026`,
    description: `Official ${weight} lb draw — NC United Tournament of Champions.`,
  }
}

export default async function TocBracketWeightRoute({ params }: Props) {
  const weight = parseAthleteWeightClass((await params).weight)
  if (weight == null) notFound()
  return <TocBracketWeightPage weightClass={weight} />
}
