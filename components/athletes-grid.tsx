"use client"

import { useState, useMemo } from "react"
import { ProfessionalCommitmentCard } from "./professional-commitment-card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { normalizeAthleteList } from "@/lib/professional-athlete"

interface Athlete {
  id: string
  name: string
  highschool?: string
  high_school?: string
  college?: string
  division?: string
  graduationyear?: number
  graduation_year?: number
  photourl?: string
  image_url?: string
  weightclass?: string
  weight_class?: string
  wrestlingclub?: string
  club?: string
  achievements?: string[]
  gender?: string
  commitmentdate?: string
  commitment_date?: string
  location?: string
  ncUnitedTeam?: string
  instagram?: string
  instagramHandle?: string
  instagram_handle?: string
}

interface AthletesGridProps {
  athletes: Athlete[] | null | undefined
  className?: string
}

const ITEMS_PER_PAGE = 12

export function AthletesGrid({ athletes, className = "" }: AthletesGridProps) {
  const [currentPage, setCurrentPage] = useState(1)

  // Ensure athletes is always an array
  const safeAthletes = useMemo(() => {
    if (!athletes || !Array.isArray(athletes)) {
      console.warn("AthletesGrid: athletes prop is not an array:", athletes)
      return []
    }
    return athletes
  }, [athletes])

  // Normalize athlete data for ProfessionalCommitmentCard
  const normalizedAthletes = useMemo(() => normalizeAthleteList(safeAthletes), [safeAthletes])

  // Pagination
  const totalPages = Math.ceil(normalizedAthletes.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentAthletes = normalizedAthletes.slice(startIndex, endIndex)

  if (normalizedAthletes.length === 0) {
    return (
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
    )
  }

  return (
    <div className={className}>
      {/* Athletes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {currentAthletes.map((athlete) => (
          <ProfessionalCommitmentCard key={athlete.id} athlete={athlete} />
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
        Showing {startIndex + 1}-{Math.min(endIndex, normalizedAthletes.length)} of {normalizedAthletes.length} athletes
      </div>
    </div>
  )
}
