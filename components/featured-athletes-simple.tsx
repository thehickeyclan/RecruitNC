"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FlipVerticalIcon as Flip, ChevronLeft, ChevronRight, LayoutGrid, Rows } from "lucide-react"
import { useMobile } from "@/hooks/use-mobile"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthlete } from "@/lib/professional-athlete"

// Hardcoded athlete data
const athletes = [
  {
    id: "liam-hickey",
    name: "Liam Hickey",
    highSchool: "Cardinal Gibbons",
    graduationYear: 2025,
    college: "NC State",
    division: "NCAA D1",
    photoUrl: "/wrestler-silhouette.png", // Fallback image that should always work
    achievements: ["State Champion", "All-American"],
    weightClass: "157",
  },
  {
    id: "colt-campbell",
    name: "Colt Campbell",
    highSchool: "Cary High School",
    graduationYear: 2025,
    college: "Appalachian State",
    division: "NCAA D1",
    photoUrl: "/wrestler-silhouette.png", // Fallback image that should always work
    achievements: ["State Runner-Up", "Regional Champion"],
    weightClass: "165",
  },
  {
    id: "bentley-sly",
    name: "Bentley Sly",
    highSchool: "Hough High School",
    graduationYear: 2026,
    college: "Appalachian State",
    division: "NCAA D1",
    photoUrl: "/wrestler-silhouette.png", // Fallback image that should always work
    achievements: ["State Qualifier", "Conference Champion"],
    weightClass: "174",
  },
  {
    id: "lorenzo-alston",
    name: "Lorenzo Alston",
    highSchool: "Jack Britt High School",
    graduationYear: 2025,
    college: "Campbell University",
    division: "NCAA D1",
    photoUrl: "/wrestler-silhouette.png", // Fallback image that should always work
    achievements: ["State Placer", "Regional Champion"],
    weightClass: "184",
  },
]

export function FeaturedAthletesSimple() {
  const [viewMode, setViewMode] = useState<"carousel" | "grid">("carousel")
  const isMobile = useMobile()

  // Carousel view
  const CarouselView = () => {
    const cardWidth = isMobile ? "85%" : "350px"

    return (
      <div className="relative">
        {/* Left scroll button */}
        <button
          onClick={() => {
            const container = document.getElementById("carousel-container")
            if (container) {
              container.scrollBy({ left: -350, behavior: "smooth" })
            }
          }}
          className="absolute -ml-4 left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/80 p-2 text-gray-700 shadow-md hover:bg-white"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        {/* Carousel */}
        <div
          id="carousel-container"
          className="flex gap-6 overflow-x-auto pb-4 px-4 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <style jsx global>{`
            #carousel-container::-webkit-scrollbar {
              display: none;
            }
          `}</style>

          {athletes.map((athlete) => (
            <div key={athlete.id} className="snap-start shrink-0" style={{ width: cardWidth }}>
              <ProfessionalCommitmentCard athlete={normalizeAthlete(athlete)} />
            </div>
          ))}
        </div>

        {/* Right scroll button */}
        <button
          onClick={() => {
            const container = document.getElementById("carousel-container")
            if (container) {
              container.scrollBy({ left: 350, behavior: "smooth" })
            }
          }}
          className="absolute -mr-4 right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/80 p-2 text-gray-700 shadow-md hover:bg-white"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    )
  }

  // Grid view
  const GridView = () => {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {athletes.map((athlete) => (
          <ProfessionalCommitmentCard key={athlete.id} athlete={normalizeAthlete(athlete)} />
        ))}
      </div>
    )
  }

  return (
    <section className="mb-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Featured Commitments</h2>
        <div className="flex rounded-md border border-gray-200 bg-white">
          <Button
            variant={viewMode === "carousel" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("carousel")}
            className="rounded-r-none"
            aria-label="Carousel view"
          >
            <Rows className="h-4 w-4 mr-2" />
            Carousel
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="rounded-l-none"
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Grid
          </Button>
        </div>
      </div>

      {/* Interactive Cards Message */}
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-[#c8102e] bg-[#c8102e] p-4 shadow-sm">
        <Flip className="h-5 w-5 flex-shrink-0 text-white" />
        <p className="text-sm text-white">
          <span className="font-semibold">Pro Tip:</span> Cards are interactive! Click the flip icon
          <span className="mx-1 inline-block rounded-full bg-white p-1 text-[#c8102e]">
            <Flip className="h-3 w-3" />
          </span>
          in the bottom right corner to see more details about each athlete.
        </p>
      </div>

      {viewMode === "carousel" ? <CarouselView /> : <GridView />}

      <div className="mt-6 flex justify-center">
        <Link href="/auth/signin" target="_top" rel="noopener">
          <Button>Sign In to View All Commitments</Button>
        </Link>
      </div>
    </section>
  )
}
