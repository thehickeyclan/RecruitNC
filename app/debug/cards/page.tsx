"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { FixedProductionFlipCard } from "@/components/fixed-production-flip-card"
import { AthletesHeroBanner } from "@/components/athletes-hero-banner"
import { SearchAndFilter } from "@/components/search-and-filter"
import { AthletesWelcomeMessage } from "@/components/athletes-welcome-message"

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

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [filteredAthletes, setFilteredAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [selectedGender, setSelectedGender] = useState<string>("all")
  const [selectedDivision, setSelectedDivision] = useState<string>("all")

  useEffect(() => {
    async function fetchAthletes() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("athletes")
          .select("*")
          .not("college", "is", null)
          .not("college", "eq", "")
          .order("name")

        if (error) {
          throw error
        }

        // Map the raw data to our Athlete type
        const mappedAthletes = (data || []).map((athlete) => ({
          id: athlete.id,
          name: athlete.name || "",
          firstName: athlete.firstName || "",
          lastName: athlete.lastName || "",
          highschool: athlete.highschool || "",
          highSchool: athlete.highschool || "",
          college: athlete.college || "",
          division: athlete.division || "",
          weightclass: athlete.weightclass || "",
          weightClass: athlete.weightclass || "",
          graduationyear: athlete.graduationyear || new Date().getFullYear(),
          graduationYear: athlete.graduationyear || new Date().getFullYear(),
          commitmentdate: athlete.commitmentdate || new Date().toISOString().split("T")[0],
          commitmentDate: athlete.commitmentdate || new Date().toISOString().split("T")[0],
          photourl: athlete.photourl || "/diverse-wrestlers.png",
          photoUrl: athlete.photourl || "/diverse-wrestlers.png",
          commitmentPhotoUrl: athlete.commitmentPhotoUrl || "",
          achievements: Array.isArray(athlete.achievements) ? athlete.achievements : [],
          bio: athlete.bio || undefined,
          gender: athlete.gender || "",
          weight: athlete.weight || null,
          highSchoolLogoUrl: athlete.highSchoolLogoUrl || "",
          wrestlingClub: athlete.wrestlingClub || athlete.wrestlingclub || athlete.club || "",
          wrestlingclub: athlete.wrestlingclub || athlete.club || "",
          club: athlete.club || "",
          wrestlingClubLogoUrl: athlete.wrestlingClubLogoUrl || "",
          ncUnitedTeam: athlete.ncUnitedTeam || "none",
          collegeLogoUrl: athlete.collegeLogoUrl || "",
          careerRecord: athlete.careerRecord || "",
          rankings: athlete.rankings || {},
          location: athlete.location || "",
          socialMedia: athlete.socialMedia || {},
          contactEmail: athlete.contactEmail || "",
          featured: athlete.featured || false,
          instagram: athlete.instagram || athlete.socialMedia?.instagram || "",
        }))

        setAthletes(mappedAthletes)
        setFilteredAthletes(mappedAthletes)
      } catch (err) {
        console.error("Error fetching athletes:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchAthletes()
  }, [])

  // Filter athletes based on search and filter criteria
  useEffect(() => {
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

    // Division filter
    if (selectedDivision !== "all") {
      filtered = filtered.filter((athlete) => athlete.division === selectedDivision)
    }

    setFilteredAthletes(filtered)
  }, [athletes, searchTerm, selectedYear, selectedGender, selectedDivision])

  // Get available filter options
  const availableYears = [...new Set(athletes.map((a) => String(a.graduationyear)).filter(Boolean))].sort()
  const availableDivisions = [...new Set(athletes.map((a) => a.division).filter(Boolean))].sort()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AthletesHeroBanner />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading athletes...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AthletesHeroBanner />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">Error: {error}</div>
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
          availableYears={availableYears}
          availableDivisions={availableDivisions}
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
              <div key={athlete.id} className="flex flex-col">
                <FixedProductionFlipCard athlete={athlete} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
