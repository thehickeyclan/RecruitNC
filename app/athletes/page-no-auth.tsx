"use client"

import { useState, useEffect } from "react"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { AthletesHeroBanner } from "@/components/athletes-hero-banner"
import { SearchAndFilter } from "@/components/search-and-filter"
import { AthletesWelcomeMessage } from "@/components/athletes-welcome-message"
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

export default function AthletesPageNoAuth() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [filteredAthletes, setFilteredAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [selectedGender, setSelectedGender] = useState<string>("all")
  const [selectedDivision, setSelectedDivision] = useState<string>("all")

  useEffect(() => {
    fetchAthletes()
  }, [])

  const fetchAthletes = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log("Fetching athletes without auth...")
      const response = await fetch("/api/athletes")
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      console.log("Athletes API result:", result)
      
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch athletes")
      }

      // Filter out athletes without colleges and map the data
      const athletesWithColleges = (result.athletes || [])
        .filter((athlete: any) => athlete.college && athlete.college.trim() !== "")
        .map((athlete: any) => ({
          id: athlete.id,
          name: athlete.name || "",
          firstName: athlete.firstName || athlete.first_name || "",
          lastName: athlete.lastName || athlete.last_name || "",
          highschool: athlete.highschool || athlete.high_school || "",
          highSchool: athlete.highschool || athlete.high_school || "",
          college: athlete.college || "",
          division: athlete.division || "",
          weightclass: athlete.weightclass || athlete.weight_class || "",
          weightClass: athlete.weightclass || athlete.weight_class || "",
          graduationyear: athlete.graduationyear || athlete.graduation_year || new Date().getFullYear(),
          graduationYear: athlete.graduationyear || athlete.graduation_year || new Date().getFullYear(),
          commitmentdate: athlete.commitmentdate || athlete.commitment_date || new Date().toISOString().split("T")[0],
          commitmentDate: athlete.commitmentdate || athlete.commitment_date || new Date().toISOString().split("T")[0],
          photourl: athlete.photourl || athlete.image_url || "/diverse-wrestlers.png",
          photoUrl: athlete.photourl || athlete.image_url || "/diverse-wrestlers.png",
          commitmentPhotoUrl: athlete.commitmentPhotoUrl || "",
          achievements: Array.isArray(athlete.achievements) ? athlete.achievements : [],
          bio: athlete.bio || undefined,
          gender: athlete.gender || "",
          weight: athlete.weight || null,
          highSchoolLogoUrl: athlete.highSchoolLogoUrl || "",
          wrestlingClub: athlete.wrestlingClub || athlete.wrestlingclub || athlete.wrestling_club || athlete.club || "",
          wrestlingclub: athlete.wrestlingclub || athlete.wrestling_club || athlete.club || "",
          club: athlete.club || athlete.wrestlingclub || athlete.wrestling_club || "",
          wrestlingClubLogoUrl: athlete.wrestlingClubLogoUrl || "",
          ncUnitedTeam: athlete.ncUnitedTeam || athlete.team || "none",
          collegeLogoUrl: athlete.collegeLogoUrl || "",
          careerRecord: athlete.careerRecord || "",
          rankings: athlete.rankings || {},
          location: athlete.location || "",
          socialMedia: athlete.socialMedia || {},
          contactEmail: athlete.contactEmail || "",
          featured: athlete.featured || false,
          instagram: athlete.instagram || athlete.socialMedia?.instagram || "",
        }))

      console.log(`Processed ${athletesWithColleges.length} athletes with colleges`)
      setAthletes(athletesWithColleges)
      setFilteredAthletes(athletesWithColleges)
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading athletes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Athletes</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchAthletes}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
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
