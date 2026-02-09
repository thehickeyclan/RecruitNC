"use client"

import { useState, useEffect, useMemo } from "react"
import { ProfessionalCommitmentCard } from "./professional-commitment-card"
import { AlertCircle, RefreshCw } from "lucide-react"
import { matchesDivisionFilter } from "@/lib/division-display"

// Professional athlete data with correct divisions
const PROFESSIONAL_ATHLETES = [
  {
    id: "1",
    name: "Liam Hickey",
    graduationyear: 2025,
    highschool: "Cardinal Gibbons HS",
    club: "Triangle Wrestling Club",
    college: "NC State",
    division: "NCAA Division I",
    weightclass: "157",
    city: "Raleigh",
    gender: "male",
    photoUrl: "/wrestler-liam-hickey.png",
    achievements: ["State Champion", "All-American", "National Qualifier", "Conference Champion"],
    commitmentdate: "2024-03-10",
  },
  {
    id: "2",
    name: "Colt Campbell",
    graduationyear: 2025,
    highschool: "Cary High School",
    club: "NC United Wrestling",
    college: "Appalachian State",
    division: "NCAA Division I",
    weightclass: "165",
    city: "Cary",
    gender: "male",
    photoUrl: "/wrestler-Colt-Campbell.png",
    achievements: ["State Runner-Up", "Regional Champion", "Conference Champion", "All-Conference"],
    commitmentdate: "2024-01-15",
  },
  {
    id: "3",
    name: "Lorenzo Alston",
    graduationyear: 2026,
    highschool: "Jack Britt High School",
    club: "Cape Fear Wrestling",
    college: "Campbell University",
    division: "NCAA Division I",
    weightclass: "184",
    city: "Fayetteville",
    gender: "male",
    photoUrl: "/wrestler-lorenzo-alston.png",
    achievements: ["State Placer", "Regional Champion", "All-Conference", "Team Captain"],
    commitmentdate: "2024-02-20",
  },
  {
    id: "4",
    name: "Bentley Sly",
    graduationyear: 2026,
    highschool: "Hough High School",
    club: "Elite Wrestling Club",
    college: "UNC Chapel Hill",
    division: "NCAA Division I",
    weightclass: "174",
    city: "Cornelius",
    gender: "male",
    photoUrl: "/wrestler-silhouette.png",
    achievements: ["Conference Champion", "State Qualifier", "Regional Placer", "Honor Roll"],
    commitmentdate: "2024-04-05",
  },
]

// Function to check if college name contains any of the keywords
function getCorrectDivision(collegeName: string): string | null {
  const name = collegeName.toLowerCase().trim()

  // Division I schools
  if (name.includes("gardner webb") || name.includes("gardner-webb")) {
    return "NCAA Division I"
  }

  // Division III schools
  if (name.includes("marymount") || name.includes("arcadia") || name.includes("mount union")) {
    return "NCAA Division III"
  }

  // Division II schools
  if (name.includes("ferrum") || name.includes("west liberty")) {
    return "NCAA Division II"
  }

  return null
}

interface ProfessionalAthletesGridProps {
  yearFilter?: string
  divisionFilter?: string[]
  genderFilter?: string[]
}

export function ProfessionalAthletesGrid({
  yearFilter = "All Years",
  divisionFilter = [],
  genderFilter = [],
}: ProfessionalAthletesGridProps) {
  const [athletes, setAthletes] = useState(PROFESSIONAL_ATHLETES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [divisionCorrections, setDivisionCorrections] = useState<Record<string, string>>({})

  // Fetch athletes only once
  useEffect(() => {
    const fetchAthletes = async () => {
      try {
        setLoading(true)

        const response = await fetch("/api/athletes", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        })

        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data) && data.length > 0) {
            // Track corrections for display
            const corrections: Record<string, string> = {}

            // Apply division corrections to the real data
            const correctedData = data.map((athlete: any) => {
              const collegeName = athlete.college || ""
              const correctedDivision = getCorrectDivision(collegeName)

              if (correctedDivision && athlete.division !== correctedDivision) {
                corrections[`${athlete.name} (${collegeName})`] = `${athlete.division} → ${correctedDivision}`
                return {
                  ...athlete,
                  division: correctedDivision,
                }
              }

              return athlete
            })

            setDivisionCorrections(corrections)
            setAthletes(correctedData)
            setError(null)
          } else {
            setError("Using professional sample data")
          }
        } else {
          throw new Error(`API error: ${response.status}`)
        }
      } catch (err) {
        setError("Using professional sample data")
      } finally {
        setLoading(false)
      }
    }

    fetchAthletes()
  }, []) // Only run once

  // Apply filters using useMemo to prevent unnecessary recalculations
  const filteredAthletes = useMemo(() => {
    let filtered = [...athletes]

    // Apply year filter
    if (yearFilter && yearFilter !== "All Years" && yearFilter !== "all") {
      filtered = filtered.filter((athlete) => {
        const athleteYear = String(athlete.graduationyear || athlete.graduationYear || "")
        return athleteYear === yearFilter
      })
    }

    if (divisionFilter && divisionFilter.length > 0) {
      filtered = filtered.filter((athlete) =>
        divisionFilter.some((filterVal) => matchesDivisionFilter(athlete.division, filterVal))
      )
    }

    // Apply gender filter
    if (genderFilter && genderFilter.length > 0) {
      filtered = filtered.filter((athlete) => {
        const athleteGender = String(athlete.gender || "").toLowerCase()
        return genderFilter.includes(athleteGender)
      })
    }

    return filtered
  }, [athletes, yearFilter, divisionFilter, genderFilter])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-2">Loading professional commitment cards...</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[400px] rounded-xl border bg-card shadow-sm animate-pulse">
              <div className="h-full bg-gradient-to-t from-gray-300 to-gray-200 rounded-xl"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            <h3 className="ml-2 text-lg font-medium text-blue-800">Professional Sample Data</h3>
          </div>
          <p className="mt-2 text-sm text-blue-700">
            Showing professional commitment cards with correct division classifications.
          </p>
        </div>
      )}

      {/* Debug info */}
      <div className="p-2 bg-gray-100 rounded mb-4 text-xs">
        <p>
          Active filters: {yearFilter !== "All Years" ? `Year: ${yearFilter}` : "No year filter"} |
          {divisionFilter.length > 0 ? `Divisions: ${divisionFilter.join(", ")}` : "No division filter"} |
          {genderFilter.length > 0 ? `Genders: ${genderFilter.join(", ")}` : "No gender filter"}
        </p>
        <p>
          Showing {filteredAthletes.length} of {athletes.length} athletes
        </p>
        <p className="text-blue-600">
          🔧 Division corrections: Gardner Webb → D1, Marymount/Arcadia/Mount Union → D3, Ferrum/West Liberty → D2
        </p>
        {Object.keys(divisionCorrections).length > 0 && (
          <div className="mt-1 p-1 bg-blue-50 rounded text-blue-800">
            <p className="font-semibold">Applied corrections:</p>
            <ul className="list-disc pl-4">
              {Object.entries(divisionCorrections)
                .slice(0, 5)
                .map(([name, correction], i) => (
                  <li key={i}>
                    {name}: {correction}
                  </li>
                ))}
              {Object.keys(divisionCorrections).length > 5 && (
                <li>...and {Object.keys(divisionCorrections).length - 5} more</li>
              )}
            </ul>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredAthletes.map((athlete) => (
          <div key={athlete.id} className="flex justify-center">
            <ProfessionalCommitmentCard athlete={athlete} />
          </div>
        ))}
      </div>

      {filteredAthletes.length === 0 && !loading && (
        <div className="text-center py-10">
          <h3 className="text-xl font-semibold mb-2">No athletes found</h3>
          <p className="text-gray-600">Try adjusting your filters to see more results.</p>
        </div>
      )}
    </div>
  )
}
