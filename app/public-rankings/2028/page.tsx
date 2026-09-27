import type { Metadata } from "next"
import { ClassRankingPage } from "@/components/rankings/class-ranking-page"

// Per-viewer now: the board is gated inside ClassRankingPage, so this cannot be cached as one
// static document for everybody.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Class of 2028 Rankings | RecruitNC",
  description:
    "North Carolina's top Class of 2028 wrestling prospects, ranked on results with the evidence behind every place.",
}

export default function Rankings2028Page() {
  return <ClassRankingPage year={2028} />
}
