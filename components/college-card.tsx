"use client"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EntityLogo } from "@/components/entity-logo"
import { DivisionLogo } from "@/components/division-logo"
import { Button } from "@/components/ui/button"
import { MedalIcon } from "@/components/medal-icon"
import Link from "next/link"
import { ChevronDown, ChevronUp, MapPin, Users, Award, Weight, Calendar } from 'lucide-react'
import { Skeleton } from "@/components/ui/skeleton"

interface Athlete {
  id: string
  name: string
  gender: string
  highschool: string
  college: string
  division: string
  weightclass: string
  commitmentdate: string
  image?: string
  photourl?: string
  headshot_url?: string
}

interface CollegeCardProps {
  college: {
    id: string
    name: string
    division: string
    athlete_count: number
    recent_commits?: Array<{
      name: string
      graduation_year: number
      commitment_date: string
    }>
  }
  index: number
  sortMethod: string
  onExpandCollege: (collegeName: string) => void
  expandedCollege: string | null
  collegeAthletes: Record<string, Athlete[]>
  loadingAthletes: Record<string, boolean>
}

export function CollegeCard({
  college,
  index,
  sortMethod,
  onExpandCollege,
  expandedCollege,
  collegeAthletes,
  loadingAthletes,
}: CollegeCardProps) {
  // Get division type for styling
  const divisionType = getDivisionType(college.division)

  // Determine card accent color based on division
  const cardAccentColor = getCardAccentColor(divisionType)

  return (
    <Card className={`overflow-hidden hover:shadow-md transition-shadow border-t-4 ${cardAccentColor}`}>
      {/* Medal for top 3 */}
      {index < 3 && sortMethod === "count" && <MedalIcon rank={index + 1} />}

      <CardHeader className="pb-2 relative">
        {/* Division logo in top right corner */}
        <div className="absolute top-4 right-4">
          <DivisionLogo division={college.division || "Unknown"} size="sm" />
        </div>

        <div className="flex items-center gap-4">
          <EntityLogo category="college" name={college.name} size="md" />
          <div>
            <CardTitle className="text-lg font-bold line-clamp-1">{college.name}</CardTitle>
            <div className="flex items-center text-sm text-gray-500">
              <MapPin className="h-3.5 w-3.5 mr-1" />
              <span>North Carolina</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        {/* Commit stats */}
        <div className={`flex items-center justify-between mb-3 ${getStatsBgColor(divisionType)} p-2 rounded-md`}>
          <div className="flex items-center">
            <Users className={`h-4 w-4 ${getStatsIconColor(divisionType)} mr-2`} />
            <span className="font-bold">{college.athlete_count || 0} Commits</span>
          </div>
        </div>

        {/* Recent commits */}
        {college.recent_commits && college.recent_commits.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center text-sm text-gray-700 mb-2">
              <Award className="h-3.5 w-3.5 mr-1.5" />
              <span className="font-medium">Recent Commits</span>
            </div>
            <div className="space-y-1">
              {college.recent_commits.slice(0, 3).map((commit, index) => (
                <div key={index} className="text-xs text-gray-600 flex justify-between">
                  <span className="truncate">{commit.name}</span>
                  <span>{commit.graduation_year}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <Button
          variant="outline"
          size="sm"
          className={`w-full flex items-center justify-center gap-2 ${getButtonHoverColor(divisionType)}`}
          onClick={() => onExpandCollege(college.name)}
        >
          {expandedCollege === college.name ? (
            <>
              <ChevronUp className="h-4 w-4" /> Hide Athletes
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" /> View Athletes
            </>
          )}
        </Button>
      </CardFooter>

      {/* Expanded section with athletes */}
      {expandedCollege === college.name && (
        <div className="px-4 pb-4 border-t border-gray-100 mt-2 pt-2">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Award className={`h-4 w-4 ${getAwardIconColor(divisionType)}`} />
            NC Athletes at {college.name}
          </h3>

          {loadingAthletes[college.name] ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : collegeAthletes[college.name]?.length ? (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {collegeAthletes[college.name].map((athlete) => (
                <Link
                  href={`/athletes/${athlete.id}`}
                  key={athlete.id}
                  className={`flex items-center gap-3 p-2 rounded-md hover:${getAthleteHoverBgColor(divisionType)} transition-colors`}
                >
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {/* Use headshot_url if available, fall back to photourl, then to placeholder */}
                    {athlete.headshot_url || athlete.photourl ? (
                      <img
                        src={athlete.headshot_url || athlete.photourl || "/placeholder.svg"}
                        alt={athlete.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{athlete.name}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <span className="truncate">{athlete.highschool}</span>
                      {athlete.weightclass && (
                        <>
                          <span>•</span>
                          <span>{athlete.weightclass}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {athlete.commitmentdate && (
                    <div className="text-xs text-gray-500 flex items-center whitespace-nowrap">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(athlete.commitmentdate).getFullYear()}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No athlete data available</p>
          )}
        </div>
      )}
    </Card>
  )
}

// Helper function to determine division type
function getDivisionType(division: string): "d1" | "d2" | "d3" | "naia" | "njcaa" | "unknown" {
  const normalizedDivision = division?.toLowerCase().trim() || ""

  if (normalizedDivision.includes("i") && !normalizedDivision.includes("ii") && !normalizedDivision.includes("iii")) {
    return "d1"
  } else if (normalizedDivision.includes("ii") && !normalizedDivision.includes("iii")) {
    return "d2"
  } else if (normalizedDivision.includes("iii")) {
    return "d3"
  } else if (
    normalizedDivision.includes("1") &&
    !normalizedDivision.includes("2") &&
    !normalizedDivision.includes("3")
  ) {
    return "d1"
  } else if (normalizedDivision.includes("2") && !normalizedDivision.includes("3")) {
    return "d2"
  } else if (normalizedDivision.includes("3")) {
    return "d3"
  } else if (normalizedDivision.includes("naia")) {
    return "naia"
  } else if (
    normalizedDivision.includes("juco") ||
    normalizedDivision.includes("junior college") ||
    normalizedDivision.includes("njcaa")
  ) {
    return "njcaa"
  }
  return "unknown"
}

// Helper functions for styling based on division
function getCardAccentColor(divisionType: string): string {
  switch (divisionType) {
    case "d1":
      return "border-blue-500"
    case "d2":
      return "border-red-500"
    case "d3":
      return "border-green-500"
    case "naia":
      return "border-yellow-500"
    case "njcaa":
      return "border-purple-500"
    default:
      return "border-gray-300"
  }
}

function getStatsBgColor(divisionType: string): string {
  switch (divisionType) {
    case "d1":
      return "bg-blue-50"
    case "d2":
      return "bg-red-50"
    case "d3":
      return "bg-green-50"
    case "naia":
      return "bg-yellow-50"
    case "njcaa":
      return "bg-purple-50"
    default:
      return "bg-gray-50"
  }
}

function getStatsIconColor(divisionType: string): string {
  switch (divisionType) {
    case "d1":
      return "text-blue-600"
    case "d2":
      return "text-red-600"
    case "d3":
      return "text-green-600"
    case "naia":
      return "text-yellow-600"
    case "njcaa":
      return "text-purple-600"
    default:
      return "text-gray-600"
  }
}

function getWeightClassBgColor(divisionType: string): string {
  switch (divisionType) {
    case "d1":
      return "bg-blue-50"
    case "d2":
      return "bg-red-50"
    case "d3":
      return "bg-green-50"
    case "naia":
      return "bg-yellow-50"
    case "njcaa":
      return "bg-purple-50"
    default:
      return "bg-gray-50"
  }
}

function getButtonHoverColor(divisionType: string): string {
  switch (divisionType) {
    case "d1":
      return "hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
    case "d2":
      return "hover:bg-red-50 hover:text-red-700 hover:border-red-300"
    case "d3":
      return "hover:bg-green-50 hover:text-green-700 hover:border-green-300"
    case "naia":
      return "hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-300"
    case "njcaa":
      return "hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300"
    default:
      return "hover:bg-gray-50"
  }
}

function getAwardIconColor(divisionType: string): string {
  switch (divisionType) {
    case "d1":
      return "text-blue-500"
    case "d2":
      return "text-red-500"
    case "d3":
      return "text-green-500"
    case "naia":
      return "text-yellow-500"
    case "njcaa":
      return "text-purple-500"
    default:
      return "text-amber-500"
  }
}

function getAthleteHoverBgColor(divisionType: string): string {
  switch (divisionType) {
    case "d1":
      return "bg-blue-50"
    case "d2":
      return "bg-red-50"
    case "d3":
      return "bg-green-50"
    case "naia":
      return "bg-yellow-50"
    case "njcaa":
      return "bg-purple-50"
    default:
      return "bg-gray-50"
  }
}
