"use client"
import { useState, useMemo } from "react"
import { CommitmentCardRobust } from "./commitment-card-robust"
import { SearchAndFilter } from "./search-and-filter"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface Athlete {
  id: string
  name?: string
  first_name?: string
  last_name?: string
  graduation_year?: number
  weight_class?: string
  college?: string
  high_school?: string
  club?: string
  division?: string
  gender?: string
  achievements?: string | string[]
  image_url?: string
  likes_count?: number
  is_liked?: boolean
  match_record?: {
    wins?: number
    losses?: number
    total_matches?: number
  }
}

interface AthletesGridRobustProps {
  athletes: Athlete[]
  filteredAthletes: Athlete[]
  className?: string
}

const ITEMS_PER_PAGE = 12

export function AthletesGridRobust({ athletes, filteredAthletes, className = "" }: AthletesGridRobustProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedYear, setSelectedYear] = useState("All Years")
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([])
  const [selectedGenders, setSelectedGenders] = useState<string[]>([])

  // Apply additional client-side filtering
  const finalFilteredAthletes = useMemo(() => {
    return filteredAthletes.filter((athlete) => {
      // Search filter
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase()
        const name = athlete.name || `${athlete.first_name || ""} ${athlete.last_name || ""}`.trim()
        const matchesSearch =
          name.toLowerCase().includes(searchLower) ||
          athlete.high_school?.toLowerCase().includes(searchLower) ||
          athlete.college?.toLowerCase().includes(searchLower) ||
          athlete.club?.toLowerCase().includes(searchLower)

        if (!matchesSearch) return false
      }

      // Year filter
      if (selectedYear !== "All Years") {
        if (athlete.graduation_year?.toString() !== selectedYear) return false
      }

      if (selectedDivisions.length > 0) {
        const matches = selectedDivisions.some((filterVal) =>
          matchesDivisionFilter(athlete.division, filterVal)
        )
        if (!matches) return false
      }

      // Gender filter
      if (selectedGenders.length > 0) {
        if (!selectedGenders.includes(athlete.gender || "")) return false
      }

      return true
    })
  }, [filteredAthletes, searchTerm, selectedYear, selectedDivisions, selectedGenders])

  // Pagination
  const totalPages = Math.ceil(finalFilteredAthletes.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentAthletes = finalFilteredAthletes.slice(startIndex, endIndex)

  // Reset to first page when filters change
  const handleFilterChange = () => {
    setCurrentPage(1)
  }

  const handleLike = async (athleteId: string) => {
    try {
      const response = await fetch("/api/likes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ athleteId }),
      })

      if (!response.ok) {
        throw new Error("Failed to like athlete")
      }

      // Optionally refresh the data or update local state
      console.log("Athlete liked successfully")
    } catch (error) {
      console.error("Error liking athlete:", error)
    }
  }

  // Get filter options from all athletes
  const availableYears = useMemo(() => {
    const years = Array.from(
      new Set(athletes.map((athlete) => athlete.graduation_year?.toString()).filter(Boolean)),
    ).sort()
    return ["All Years", ...years]
  }, [athletes])

  const availableDivisions = useMemo(() => [...CANONICAL_DIVISIONS_FULL], [])

  const availableGenders = useMemo(() => {
    return Array.from(new Set(athletes.map((athlete) => athlete.gender).filter(Boolean))).sort()
  }, [athletes])

  return (
    <div className={className}>
      {/* Search and Filter */}
      <SearchAndFilter
        searchTerm={searchTerm}
        onSearchChange={(term) => {
          setSearchTerm(term)
          handleFilterChange()
        }}
        selectedYear={selectedYear}
        onYearChange={(year) => {
          setSelectedYear(year)
          handleFilterChange()
        }}
        availableYears={availableYears}
        selectedDivisions={selectedDivisions}
        onDivisionChange={(divisions) => {
          setSelectedDivisions(divisions)
          handleFilterChange()
        }}
        availableDivisions={availableDivisions}
        selectedGenders={selectedGenders}
        onGenderChange={(genders) => {
          setSelectedGenders(genders)
          handleFilterChange()
        }}
        availableGenders={availableGenders}
        totalResults={finalFilteredAthletes.length}
      />

      {/* Results */}
      {finalFilteredAthletes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 6.306a7.962 7.962 0 00-6 0m6 0V5a2 2 0 00-2-2H9a2 2 0 00-2 2v1.306m8 0V7a1 1 0 11-2 0V6.306"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No athletes found</h3>
          <p className="text-gray-500">Try adjusting your search criteria or filters.</p>
        </div>
      ) : (
        <>
          {/* Athletes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {currentAthletes.map((athlete) => (
              <CommitmentCardRobust key={athlete.id} athlete={athlete} onLike={handleLike} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-10"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Results summary */}
          <div className="text-center text-sm text-gray-500 mt-4">
            Showing {startIndex + 1}-{Math.min(endIndex, finalFilteredAthletes.length)} of{" "}
            {finalFilteredAthletes.length} athletes
          </div>
        </>
      )}
    </div>
  )
}
