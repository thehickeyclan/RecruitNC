import { Suspense } from "react"
import { AthletesHeroBanner } from "@/components/athletes-hero-banner"
import { StableAthletesList } from "@/components/stable-athletes-list"

export default function StableAthletesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <AthletesHeroBanner />

      <div className="my-8">
        <h2 className="text-2xl font-bold mb-6">Browse Athletes</h2>

        <Suspense fallback={<StableLoadingState />}>
          <StableAthletesList />
        </Suspense>
      </div>
    </div>
  )
}

function StableLoadingState() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="rounded-lg border bg-card text-card-foreground shadow-sm h-[450px]">
          <div className="bg-gray-200 h-64 w-full rounded-t-lg"></div>
          <div className="p-4 space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  )
}
