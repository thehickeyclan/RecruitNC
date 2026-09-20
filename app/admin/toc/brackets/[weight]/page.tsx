import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { TocBracketWeightPage } from "@/components/toc/brackets/toc-bracket-weight-page"
import { parseAthleteWeightClass } from "@/lib/toc/invitations"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Bracket seeding | Admin",
  robots: { index: false, follow: false },
}

export default async function AdminTocBracketWeightPage({ params }: { params: Promise<{ weight: string }> }) {
  const weight = parseAthleteWeightClass((await params).weight)
  if (weight == null) notFound()
  return <TocBracketWeightPage weightClass={weight} />
}
