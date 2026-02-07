"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthlete } from "@/lib/professional-athlete"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { FileUp as Flip, ChevronLeft, ChevronRight } from "lucide-react"
import type { Athlete } from "@/types/athlete"
import { useMobile } from "@/hooks/use-mobile"

// Hardcoded featured athlete data as a fallback
const fallbackAthletes: Athlete[] = [
  {
    id: "liam-hickey",
    name: "Liam Hickey",
    highSchool: "Cardinal Gibbons",
    graduationYear: 2025,
    college: "NC State",
    division: "D1",
    photoUrl: "/wrestler-liam-hickey.png",
    achievements: ["State Champion", "All-American"],
    weightClass: "157",
  },
  {
    id: "colt-campbell",
    name: "Colt Campbell",
    highSchool: "Cary High School",
    graduationYear: 2025,
    college: "Appalachian State",
    division: "D1",
    photoUrl: "/wrestler-Colt-Campbell.png",
    achievements: ["State Runner-Up", "Regional Champion"],
    weightClass: "165",
  },
  {
    id: "bentley-sly",
    name: "Bentley Sly",
    highSchool: "Hough High School",
    graduationYear: 2026,
    college: "Appalachian State",
    division: "D1",
    photoUrl: "/placeholder.svg?key=kjvvc",
    achievements: ["State Qualifier", "Conference Champion"],
    weightClass: "174",
  },
  {
    id: "lorenzo-alston",
    name: "Lorenzo Alston",
    highSchool: "Jack Britt High School",
    graduationYear: 2025,
    college: "Campbell University",
    division: "D1",
    photoUrl: "/wrestler-lorenzo-alston.png",
    achievements: ["State Placer", "Regional Champion"],
    weightClass: "184",
  },
]

export function FeaturedAthletesCarousel() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const isMobile = useMobile()

  useEffect(() => {
    async function fetchFeaturedAthletes() {
      try {
        setLoading(true)
        setError(null)

        // Fetch featured athletes from API
        const response = await fetch("/api/featured-athletes")

        if (!response.ok) {
          throw new Error(`Failed to fetch featured athletes: ${response.status}`)
        }

        const data = await response.json()

        if (data && Array.isArray(data) && data.length > 0) {
          setAthletes(data)
        } else {
          console.log("No athletes returned from API, using fallback data")
          setAthletes(fallbackAthletes)
        }
      } catch (err) {
        console.error("Error fetching featured athletes:", err)
        setError("Failed to load featured athletes")
        // Use fallback data on error
        setAthletes(fallbackAthletes)
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedAthletes()
  }, [])

  const checkScrollButtons = useCallback(() => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10) // 10px buffer for rounding errors
    }
  }, [])

  useEffect(() => {
    checkScrollButtons()
    window.addEventListener("resize", checkScrollButtons)
    return () => window.removeEventListener("resize", checkScrollButtons)
  }, [athletes, isMobile, checkScrollButtons]) // Added isMobile and checkScrollButtons to dependencies

  const scroll = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = direction === "left" ? -400 : 400
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" })

      // Update button states after scrolling
      setTimeout(checkScrollButtons, 300)
    }
  }

  const cardWidth = isMobile ? "85%" : "350px"
  const cardHeight = "500px"

  if (loading) {
    return (
      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-bold">Featured Commitments</h2>
        <div className="flex overflow-x-auto gap-6 pb-4 px-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="shrink-0" style={{ width: cardWidth }}>
              <Card className="h-[500px] animate-pulse bg-gray-100">
                <CardContent className="flex h-full items-center justify-center p-0">
                  <div className="text-gray-400">Loading...</div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (error && athletes.length === 0) {
    return (
      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-bold">Featured Commitments</h2>
        <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <h3 className="mb-2 text-xl font-semibold">Error Loading Athletes</h3>
            <p className="mb-4 text-gray-600">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="mb-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Featured Commitments</h2>
        <Link href="/auth/signin" target="_top" rel="noopener">
          <Button variant="outline" size="sm">
            Sign In to View All
          </Button>
        </Link>
      </div>

      {athletes.length > 0 ? (
        <>
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

          {/* Carousel container */}
          <div className="relative">
            {/* Left scroll button */}
            {canScrollLeft && (
              <button
                onClick={() => scroll("left")}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white text-gray-700 rounded-full p-2 shadow-md -ml-4"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* Carousel */}
            <div
              ref={carouselRef}
              className="flex overflow-x-auto gap-6 pb-4 scrollbar-hide px-4 snap-x snap-mandatory"
              onScroll={checkScrollButtons}
            >
              {athletes.map((athlete) => (
                <div key={athlete.id} className="snap-start shrink-0" style={{ width: cardWidth }}>
                  <ProfessionalCommitmentCard
                    athlete={normalizeAthlete(athlete)}
                    height={cardHeight}
                    withBorder={true}
                  />
                </div>
              ))}
            </div>

            {/* Right scroll button */}
            {canScrollRight && (
              <button
                onClick={() => scroll("right")}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white text-gray-700 rounded-full p-2 shadow-md -mr-4"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          <div className="mt-6 flex justify-center">
            <Link href="/auth/signin" target="_top" rel="noopener">
              <Button>Sign In to View All Commitments</Button>
            </Link>
          </div>
        </>
      ) : (
        <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <h3 className="mb-2 text-xl font-semibold">Authentication Required</h3>
            <p className="mb-4 text-gray-600">
              Sign in or create an account to view detailed information about NC wrestling commitments.
            </p>
            <div className="flex gap-4">
              <Link href="/auth/signin" target="_top" rel="noopener">
                <Button>Sign In</Button>
              </Link>
              <Link href="/auth/signup" target="_top" rel="noopener">
                <Button variant="outline">Sign Up</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
