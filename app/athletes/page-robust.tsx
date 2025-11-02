"use client"

import { useState } from "react"
import { AthletesGridRobust } from "@/components/athletes-grid-robust"
import { SearchAndFilter } from "@/components/search-and-filter"
import { AthletesWelcomeMessage } from "@/components/athletes-welcome-message"
import { AthletesFeaturesGuide } from "@/components/athlete-features-guide"

export default function AthletesPageRobust() {
  const [filters, setFilters] = useState({
    year: "",
    gender: "",
    division: "",
    search: "",
  })

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <AthletesWelcomeMessage />

        {/* Features Guide */}
        <AthletesFeaturesGuide />

        {/* Search and Filters */}
        <div className="mb-8">
          <SearchAndFilter onFilterChange={handleFilterChange} />
        </div>

        {/* Athletes Grid */}
        <AthletesGridRobust filters={filters} />
      </div>
    </div>
  )
}
