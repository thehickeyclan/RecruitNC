import type { Metadata } from "next"
import { ClassRankingPage } from "@/components/rankings/class-ranking-page"
import { productName } from "@/lib/recruiting/product-name"

// Per-viewer: the board is gated inside ClassRankingPage, so this cannot be cached as one
// static document for everybody.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: `Class of 2029 Rankings | ${productName()}`,
  description:
    "North Carolina's top Class of 2029 wrestling prospects, ranked on results with the evidence behind every place.",
}

export default async function Rankings2029Page({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  return <ClassRankingPage year={2029} state={(await searchParams).state} />
}
