"use client"

import { useState, useMemo } from "react"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { AthletesHeroBanner } from "@/components/athletes-hero-banner"
import { AthletesWelcomeMessage } from "@/components/athletes-welcome-message"
import { Search, Filter, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

interface AthletesPageClientProps {
  athletes: Athlete[]
}

export function AthletesPageClient({ athletes }: AthletesPageClientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedYear, setSelectedYear] = useState("all")
  const [selectedGender, setSelectedGender] = useState("all")
  const [selectedDivision, setSelectedDivision] = useState("all")
  const [showFilters, setShowFilters] = useState(false)

  // Get available filter options
  const availableYears = useMemo(() => {
    return [...new Set(athletes.map((a) => String(a.graduationyear)).filter(Boolean))].sort()
  }, [athletes])

  const availableDivisions = useMemo(() => {
    return [...new Set(athletes.map((a) => a.division).filter(Boolean))].sort()
  }, [athletes])

  // Filter athletes based on search and filter criteria
  const filteredAthletes = useMemo(() => {
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

    return filtered
  }, [athletes, searchTerm, selectedYear, selectedGender, selectedDivision])

  const clearAllFilters = () => {
    setSearchTerm("")
    setSelectedYear("all")
    setSelectedGender("all")
    setSelectedDivision("all")
  }

  const hasActiveFilters =
    searchTerm ||
    (selectedYear && selectedYear !== "all") ||
    (selectedGender && selectedGender !== "all") ||
    (selectedDivision && selectedDivision !== "all")

  return (
    <div className="min-h-screen bg-gray-50">
      <AthletesHeroBanner />

      <div className="container mx-auto px-4 py-8">
        <AthletesWelcomeMessage />

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Real-time Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search athletes, colleges, high schools..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {filteredAthletes.length} athlete{filteredAthletes.length !== 1 ? "s" : ""} found
              </span>
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 ml-1">Active</span>
                )}
              </Button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Year Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Graduation Year</label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Gender Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <Select value={selectedGender} onValueChange={setSelectedGender}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Genders" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Genders</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Division Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Division</label>
                  <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Divisions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Divisions</SelectItem>
                      {availableDivisions.map((division) => (
                        <SelectItem key={division} value={division}>
                          {division}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" onClick={clearAllFilters} className="text-sm">
                    Clear all filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

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
