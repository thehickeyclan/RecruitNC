"use client"

import { useState } from "react"
import type { Athlete } from "@/types/athlete"
import { FeaturedFlipCard } from "./featured-flip-card"

interface FeaturedAthleteSectionProps {
  athlete: Athlete
}

export function FeaturedAthleteSection({ athlete }: FeaturedAthleteSectionProps) {
  const [animationComplete, setAnimationComplete] = useState(false)

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-6 bg-blue-600"></div>
        <h2 className="text-2xl font-bold text-[#0a1e50]">Featured Athlete</h2>
      </div>

      <div className="max-w-sm mx-auto h-[400px]">
        <FeaturedFlipCard athlete={athlete} onAnimationComplete={() => setAnimationComplete(true)} />
      </div>

      {animationComplete && (
        <p className="text-center text-sm text-gray-600 mt-4">
          All athlete cards are interactive! Click on any card to see more details.
        </p>
      )}
    </section>
  )
}
