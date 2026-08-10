"use client"

import { useState, useEffect } from "react"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { AthletesHeroBanner } from "@/components/athletes-hero-banner"
import { SearchAndFilter } from "@/components/search-and-filter"
import { AthletesWelcomeMessage } from "@/components/athletes-welcome-message"
import { Suspense } from "react"
import { normalizeAthleteList } from "@/lib/professional-athlete"
import { CANONICAL_DIVISIONS_FULL, matchesDivisionFilter } from "@/lib/division-display"

interface Athlete {
  id: string
  name: string
  firstName?: string
  lastName?: string
  highschool?: string
  highSchool?: string
  college?: string
  division?: string
  weightclass?: string
  weightClass?: string
  graduationyear?: number
  graduationYear?: number
  commitmentdate?: string
  commitmentDate?: string
  photourl?: string
  photoUrl?: string
  commitmentPhotoUrl?: string
  achievements?: string[]
  bio?: string
  gender?: string
  weight?: number
  highSchoolLogoUrl?: string
  wrestlingClub?: string
  wrestlingclub?: string
  club?: string
  wrestlingClubLogoUrl?: string
  ncUnitedTeam?: string
  collegeLogoUrl?: string
  careerRecord?: string
  rankings?: any
  location?: string
  socialMedia?: any
  contactEmail?: string
  featured?: boolean
  instagram?: string
}

function AthletesPublicPageContent() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [filteredAthletes, setFilteredAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [selectedGender, setSelectedGender] = useState<string>("all")
  const [selectedDivision, setSelectedDivision] = useState<string>("all")

  // Fetch athletes on component mount - NO AUTH REQUIRED
  useEffect(() => {
    fetchAthletes()
  }, [])

  const fetchAthletes = async () => {
    try {
      setLoading(true)
      setError(null)

      // The API defaults to 100 per page, which silently cut the list off at 100 of 159
      // commitments with no pager and no indication anything was missing. 500 is the
      // route's own ceiling and covers every commitment on file.
      const response = await fetch("/api/athletes?limit=500")

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch athletes")
      }

      // Filter out athletes without colleges and map the data
      const raw = Array.isArray(result.athletes) ? result.athletes : Array.isArray(result) ? result : []
      const normalized = normalizeAthleteList(raw).filter((a) => (a.college ?? "").toString().trim() !== "")
      setAthletes(normalized)
      setFilteredAthletes(normalized)
    } catch (err) {
      console.error("Error fetching athletes:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  // Filter athletes based on search and filter criteria
  useEffect(() => {
    if (!athletes.length) return

    let filtered = athletes

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (athlete) =>
          athlete.name?.toLowerCase().includes(search) ||
          athlete.college?.toLowerCase().includes(search) ||
          athlete.highschool?.toLowerCase().includes(search) ||
          athlete.wrestlingClub?.toLowerCase().includes(search),
      )
    }

    // Year filter
    if (selectedYear !== "all") {
      filtered = filtered.filter((athlete) => String(athlete.graduationyear) === selectedYear)
    }

    // Gender filter
    if (selectedGender !== "all") {
      filtered = filtered.filter((athlete) => athlete.gender === selectedGender)
    }

    // Division filter (normalized so D1/NCAA Division I etc. all match)
    if (selectedDivision !== "all") {
      filtered = filtered.filter((athlete) => matchesDivisionFilter(athlete.division, selectedDivision))
    }

    setFilteredAthletes(filtered)
  }, [athletes, searchTerm, selectedYear, selectedGender, selectedDivision])

  const availableYears = [...new Set(athletes.map((a) => String(a.graduationyear)).filter(Boolean))].sort()
  const availableDivisions = [...CANONICAL_DIVISIONS_FULL]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nc-gold mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading athletes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">Error loading athletes: {error}</p>
          <button onClick={fetchAthletes} className="bg-nc-gold text-black px-4 py-2 rounded hover:bg-yellow-400">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AthletesHeroBanner />

      <div className="container mx-auto px-4 py-8">
        <AthletesWelcomeMessage />

        <SearchAndFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          selectedGender={selectedGender}
          onGenderChange={setSelectedGender}
          selectedDivision={selectedDivision}
          onDivisionChange={setSelectedDivision}
          years={availableYears.map(Number).filter((n) => !isNaN(n))}
          divisions={availableDivisions}
          totalResults={filteredAthletes.length}
        />

        <div className="mb-6">
          <p className="text-gray-600">
            Showing {filteredAthletes.length} of {athletes.length} athletes
          </p>
        </div>

        {filteredAthletes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No athletes found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredAthletes.map((athlete) => (
              <ProfessionalCommitmentCard key={athlete.id} athlete={athlete} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AthletesPublicPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-nc-blue via-slate-900 to-nc-red">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nc-gold mx-auto mb-4"></div>
              <p className="text-white text-lg">Loading athletes...</p>
            </div>
          </div>
        }
      >
        <AthletesPublicPageContent />
      </Suspense>
    </div>
  )
}
