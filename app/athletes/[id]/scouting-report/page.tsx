import type { Metadata } from "next"
import { ScoutingReportClient } from "./scouting-report-client"

export const metadata: Metadata = {
  title: "Scouting report | RecruitNC",
  // A recruiting document about a minor should never be indexed.
  robots: { index: false, follow: false },
}

export default async function ScoutingReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ScoutingReportClient athleteId={id} />
}
