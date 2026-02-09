"use client"

import { useState, useEffect } from "react"
import { DivisionFilterDropdown } from "@/components/division-filter-dropdown"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthlete } from "@/lib/professional-athlete"
import type { Athlete } from "@/types/athlete"
import { matchesDivisionFilter } from "@/lib/division-display"

interface FilteredAthletesProps {
  initialAthletes: Athlete[]
}

const FilteredAthletes = ({ initialAthletes }: FilteredAthletesProps) => {
  const [athletes, setAthletes] = useState<Athlete[]>(initialAthletes)
  const [filteredAthletes, setFilteredAthletes] = useState<Athlete[]>(initialAthletes)
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Handle division filter selection
  const handleDivisionSelect = (division: string | null) => {
    setSelectedDivision(division)

    if (!division) {
      setFilteredAthletes(athletes)
      return
    }

    const filtered = athletes.filter((athlete) => matchesDivisionFilter(athlete.division, division))

    setFilteredAthletes(filtered)
  }

  // Debug function to log division values
  const logDivisionValues = () => {
    console.log("All unique division values in the database:")
    const uniqueDivisions = new Set<string>()

    athletes.forEach((athlete) => {
      if (athlete.division) {
        uniqueDivisions.add(athlete.division)
      }
    })

    console.log(Array.from(uniqueDivisions).sort())
  }

  useEffect(() => {
    // Log division values when component mounts
    logDivisionValues()
  }, [athletes])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <DivisionFilterDropdown onSelect={handleDivisionSelect} />

        <div className="text-sm text-muted-foreground">
          Showing {filteredAthletes.length} of {athletes.length} athletes
          {selectedDivision && ` in ${selectedDivision}`}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredAthletes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAthletes.map((athlete) => (
            <div key={athlete.id} className="h-[500px]">
              <ProfessionalCommitmentCard athlete={normalizeAthlete(athlete)} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-lg text-gray-500">No athletes found matching the selected criteria.</p>
          <button onClick={() => handleDivisionSelect(null)} className="mt-4 text-blue-500 hover:underline">
            Clear filters
          </button>
        </div>
      )}

      {/* Debug button - only visible in development */}
      {process.env.NODE_ENV === "development" && (
        <button
          onClick={logDivisionValues}
          className="fixed bottom-4 right-4 bg-black/70 text-white px-3 py-2 text-xs rounded-md"
        >
          Log Division Values
        </button>
      )}
    </div>
  )
}

export default FilteredAthletes
