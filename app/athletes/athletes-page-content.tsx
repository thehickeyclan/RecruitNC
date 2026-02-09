"use client"

import { useState, useEffect, useMemo } from "react"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { AthletesHeroBanner } from "@/components/athletes-hero-banner"
import { SearchAndFilter } from "@/components/search-and-filter"
import { AthletesWelcomeMessage } from "@/components/athletes-welcome-message"
import { CANONICAL_DIVISIONS_FULL, matchesDivisionFilter } from "@/lib/division-display"

interface Athlete {
  id: string
  name: string
  graduationyear?: number | string
  highschool?: string
  highSchool?: string
  club?: string
  wrestlingClub?: string
  wrestlingclub?: string
  college?: string
  division?: string
  weightclass?: string
  weightClass?: string
  city?: string
  photoUrl?: string
  photourl?: string
  photo_url?: string
  image_url?: string
  achievements?: string[]
  commitmentdate?: string
  team?: string
  ncUnitedTeam?: string
  ncunitedteam?: string
  instagram?: string
  instagramHandle?: string
  instagram_handle?: string
  location?: string
  careerRecord?: string
  gender?: string
}

export function AthletesPageContent() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [selectedGender, setSelectedGender] = useState<string>("all")
  const [selectedDivision, setSelectedDivision] = useState<string>("all")

  useEffect(() => {
    const fetchAthletes = async () => {
      try {
        const response = await fetch("/api/athletes")
        const data = await response.json()

        if (data.success && data.athletes) {
          setAthletes(data.athletes)
        }
      } catch (error) {
        console.error("Error fetching athletes:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAthletes()
  }, [])

  const filteredAthletes = useMemo(() => {
    return athletes.filter((athlete) => {
      const matchesSearch =
        athlete.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        athlete.college?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        athlete.highschool?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        athlete.highSchool?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesYear = selectedYear === "all" || String(athlete.graduationyear) === selectedYear

      const matchesGender = selectedGender === "all" || athlete.gender === selectedGender

      const matchesDivision = matchesDivisionFilter(athlete.division, selectedDivision)

      return matchesSearch && matchesYear && matchesGender && matchesDivision
    })
  }, [athletes, searchTerm, selectedYear, selectedGender, selectedDivision])

  const availableYears = useMemo(() => {
    const years = [...new Set(athletes.map((a) => String(a.graduationyear)).filter(Boolean))]
    return years.sort()
  }, [athletes])

  const availableDivisions = useMemo(() => [...CANONICAL_DIVISIONS_FULL], [])

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
          years={availableYears.map(Number).filter(Boolean)}
          divisions={availableDivisions}
          totalResults={filteredAthletes.length}
        />

        {filteredAthletes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No athletes found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
            {filteredAthletes.map((athlete) => (
              <ProfessionalCommitmentCard key={athlete.id} athlete={athlete} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
