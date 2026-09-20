import { redirect } from "next/navigation"
import { parseAthleteWeightClass } from "@/lib/toc/invitations"

/** One weight's bracket: the finished one, not the seeding view. */
export default async function TocBracketWeightRedirect({ params }: { params: Promise<{ weight: string }> }) {
  const weight = parseAthleteWeightClass((await params).weight)
  redirect(weight == null ? "/tournament-of-champions/results" : `/tournament-of-champions/results/${weight}`)
}
