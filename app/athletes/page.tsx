import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import {
  fetchCommitmentAthletes,
  fetchCommitmentStats,
  type CommitmentAthleteFilters,
} from "@/lib/athletes-commitments-fetch"
import { AthletesCommitmentsClient } from "@/components/athletes-commitments-client"
import { AthletesPageSkeleton } from "@/components/athletes-page-skeleton"

export const revalidate = 120

const DEFAULT_FILTERS: CommitmentAthleteFilters = {
  year: "2026",
  gender: "all",
  division: "all",
}

export default async function AthletesPage() {
  let initialAthletes: Awaited<ReturnType<typeof fetchCommitmentAthletes>>["athletes"] = []
  let initialStats: Awaited<ReturnType<typeof fetchCommitmentStats>> = {
    total: 0,
    male: 0,
    female: 0,
    divisions: { D1: 0, D2: 0, D3: 0, NAIA: 0, NJCAA: 0 },
  }

  try {
    const supabase = await createClient()
    const [athletesResult, statsResult] = await Promise.all([
      fetchCommitmentAthletes(supabase, DEFAULT_FILTERS),
      fetchCommitmentStats(supabase, DEFAULT_FILTERS),
    ])
    initialAthletes = athletesResult.athletes
    initialStats = statsResult
  } catch (error) {
    console.error("[athletes/page] SSR prefetch failed:", error)
  }

  return (
    <Suspense fallback={<AthletesPageSkeleton />}>
      <AthletesCommitmentsClient
        initialAthletes={initialAthletes}
        initialStats={initialStats}
        initialFilters={DEFAULT_FILTERS}
      />
    </Suspense>
  )
}
