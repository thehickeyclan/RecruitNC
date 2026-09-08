import type { Metadata } from "next"
import { ClassRankingPage } from "@/components/rankings/class-ranking-page"

// Cached in loadPublicClassRanking; the page itself re-renders hourly.
export const revalidate = 3600

export const metadata: Metadata = {
  title: "Class of 2028 Rankings | RecruitNC",
  description:
    "North Carolina's top Class of 2028 wrestling prospects, ranked on results with the evidence behind every place.",
}

export default function Rankings2028Page() {
  return <ClassRankingPage year={2028} />
}
