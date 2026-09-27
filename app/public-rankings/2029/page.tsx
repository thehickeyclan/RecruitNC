import type { Metadata } from "next"
import { ClassRankingPage } from "@/components/rankings/class-ranking-page"

// Per-viewer: the board is gated inside ClassRankingPage, so this cannot be cached as one
// static document for everybody.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Class of 2029 Rankings | RecruitNC",
  description:
    "North Carolina's top Class of 2029 wrestling prospects, ranked on results with the evidence behind every place.",
}

export default function Rankings2029Page() {
  return <ClassRankingPage year={2029} />
}
