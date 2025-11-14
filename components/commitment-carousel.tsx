"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthlete } from "@/lib/professional-athlete"
import type { Athlete } from "@/types/athlete"
import { useMobile } from "@/hooks/use-mobile"

interface CommitmentCarouselProps {
  athletes?: Athlete[] // Make athletes optional
  title?: string
  subtitle?: string
}

export function CommitmentCarousel({ athletes = [], title, subtitle }: CommitmentCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localAthletes, setLocalAthletes] = useState<Athlete[]>([])
  const isMobile = useMobile()

  // Fetch athletes if not provided as props
  useEffect(() => {
    if (athletes && athletes.length > 0) {
      setLocalAthletes(athletes)
      return
    }

    const fetchAthletes = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/athletes?limit=10")
        if (!response.ok) {
          throw new Error("Failed to fetch athletes")
        }
        const data = await response.json()
        setLocalAthletes(data)
      } catch (err) {
        console.error("Error fetching athletes:", err)
        setError("Failed to load athletes")
        setLocalAthletes([])
      } finally {
        setLoading(false)
      }
    }

    fetchAthletes()
  }, [athletes])

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
  }, [localAthletes, isMobile, checkScrollButtons]) // Added isMobile and checkScrollButtons to dependencies

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

  // Show loading state
  if (loading) {
    return (
      <div className="w-full py-8 text-center">
        <p>Loading commitments...</p>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full py-8 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  // Show empty state if no athletes
  if (localAthletes.length === 0) {
    return (
      <div className="w-full py-8 text-center">
        <p>No recent commitments found.</p>
      </div>
    )
  }

  return (
    <div className="relative w-full py-8">
      {/* Header with title and subtitle */}
      {(title || subtitle) && (
        <div className="mb-6 text-center">
          {title && <h2 className="text-3xl font-bold text-gray-900 mb-2">{title}</h2>}
          {subtitle && <p className="text-lg text-gray-600">{subtitle}</p>}
        </div>
      )}

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
          {localAthletes.map((athlete) => (
            <div key={athlete.id} className="snap-start shrink-0" style={{ width: cardWidth }}>
              <ProfessionalCommitmentCard athlete={normalizeAthlete(athlete)} height={cardHeight} withBorder={true} />
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
    </div>
  )
}
