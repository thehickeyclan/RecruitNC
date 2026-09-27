import type { Metadata } from "next"
import { ClassRankingPage } from "@/components/rankings/class-ranking-page"

// Per-viewer: the board is gated inside ClassRankingPage, so this cannot be cached as one
// static document for everybody.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Class of 2029 Prospects to Watch | RecruitNC",
  description:
    "North Carolina's Class of 2029 wrestlers to watch, chosen on results with the evidence behind every name.",
}

export default function Rankings2029Page() {
  return <ClassRankingPage year={2029} />
}
