"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Award } from "lucide-react"

interface WrestlingAchievementsSectionProps {
  athlete: {
    nhsca_2024_record?: string
    nhsca_2025_record?: string
    nhsca_2023_record?: string
    nhsca_2024_placement?: string
    nhsca_2025_placement?: string
    nhsca_2023_placement?: string
    super_32_2023_record?: string
    super_32_2024_record?: string
    super_32_2025_record?: string
    super_32_2023_placement?: string
    super_32_2024_placement?: string
    super_32_2025_placement?: string
    nationally_ranked_wins?: string
    college_opens_experience?: string
    recruiting_status?: string
    name?: string
  }
  nchsaaResults?: Array<{
    year: number
    place: number
    classification: string
    weight_class: string
  }>
  graduationYear?: number
}

interface Achievement {
  year?: number
  place?: number
  placement?: number
  weight_class?: string
  division?: string
  tournament?: string
  wrestler_name?: string
  athlete_name?: string
}

interface AchievementsData {
  state_championships: Achievement[]
  state_placers: Achievement[]
  national_placers: Achievement[]
  all_results: {
    nchsaa: Achievement[]
    nhsca: Achievement[]
    super32: Achievement[]
  }
}

export function WrestlingAchievementsSection({
  athlete,
  nchsaaResults = [],
  graduationYear,
}: WrestlingAchievementsSectionProps) {
  const [achievements, setAchievements] = useState<AchievementsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const athleteName = athlete?.name || ""

  useEffect(() => {
    async function fetchAchievements() {
      if (!athleteName) {
        setLoading(false)
        return
      }

      try {
        console.log("[v0] Fetching achievements for:", athleteName)
        const params = new URLSearchParams({ name: athleteName })
        if (graduationYear && graduationYear > 0) params.set("graduation_year", String(graduationYear))
        const response = await fetch(`/api/wrestling-achievements?${params.toString()}`)
        const data = await response.json()

        console.log("[v0] Achievements API response:", data)
        console.log("[v0] State championships:", data.achievements?.state_championships)
        console.log("[v0] All NCHSAA results:", data.achievements?.all_results?.nchsaa)

        if (data.success) {
          setAchievements(data.achievements)
          setError(null)
        } else {
          setError(data.error || "Failed to load achievements")
        }
      } catch (err) {
        setError("Failed to load wrestling achievements")
        console.error("Wrestling achievements error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchAchievements()
  }, [athleteName, graduationYear])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Wrestling Tournament Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !achievements) {
    return null
  }

  const isClassOf2025 = graduationYear === 2025

  let nhscaData: Array<{
    year: number
    placement: number | null
    record?: string
    weight?: string
    division?: string
  }> = []

  if (isClassOf2025 && achievements?.all_results?.nhsca) {
    nhscaData = achievements.all_results.nhsca
      .map((result) => ({
        year: result.year || 0,
        placement: result.placement || result.place || null,
        weight: result.weight_class,
        division: result.division,
      }))
      .filter((item) => item.placement)
  } else {
    // Try new JSON format first
    if (athlete.nhsca_results && Array.isArray(athlete.nhsca_results) && athlete.nhsca_results.length > 0) {
      nhscaData = athlete.nhsca_results.map((result: any) => ({
        year: result.year,
        placement: typeof result.placement === 'string' ? parseInt(result.placement) || null : result.placement,
        record: result.record,
        weight: result.weight,
        division: result.division,
      })).filter((item: any) => item.placement || item.record)
    } else {
      // Fallback to old columns
      nhscaData = [
        {
          year: 2025,
          placement: athlete.nhsca_2025_placement ? Number.parseInt(athlete.nhsca_2025_placement) : null,
          record: athlete.nhsca_2025_record,
        },
        {
          year: 2024,
          placement: athlete.nhsca_2024_placement ? Number.parseInt(athlete.nhsca_2024_placement) : null,
          record: athlete.nhsca_2024_record,
        },
        {
          year: 2023,
          placement: athlete.nhsca_2023_placement ? Number.parseInt(athlete.nhsca_2023_placement) : null,
          record: athlete.nhsca_2023_record,
        },
      ].filter((item) => item.placement || item.record)
    }
  }

  // Try new JSON format first for Super 32
  let super32Data: Array<{
    year: number
    placement: number | null
    record?: string
    weight?: string
    division?: string
  }> = []
  
  if (athlete.super32_results && Array.isArray(athlete.super32_results) && athlete.super32_results.length > 0) {
    super32Data = athlete.super32_results.map((result: any) => ({
      year: result.year,
      placement: typeof result.placement === 'string' ? parseInt(result.placement) || null : result.placement,
      record: result.record,
      weight: result.weight,
      division: result.division,
    })).filter((item: any) => item.placement || item.record)
  } else {
    // Fallback to old columns
    super32Data = [
      {
        year: 2025,
        placement: athlete.super_32_2025_placement ? Number.parseInt(athlete.super_32_2025_placement) : null,
        record: athlete.super_32_2025_record,
      },
      {
        year: 2024,
        placement: athlete.super_32_2024_placement ? Number.parseInt(athlete.super_32_2024_placement) : null,
        record: athlete.super_32_2024_record,
      },
      {
        year: 2023,
        placement: athlete.super_32_2023_placement ? Number.parseInt(athlete.super_32_2023_placement) : null,
        record: athlete.super_32_2023_record,
      },
    ].filter((item) => item.placement || item.record)
  }

  const hasAnyAchievements =
    achievements.state_championships.length > 0 ||
    achievements.state_placers.length > 0 ||
    nhscaData.length > 0 ||
    super32Data.length > 0 ||
    athlete.college_opens_experience ||
    athlete.nationally_ranked_wins

  if (!hasAnyAchievements) {
    return null
  }

  const getPlaceDisplay = (place: number) => {
    if (place === 1) return "1st"
    if (place === 2) return "2nd"
    if (place === 3) return "3rd"
    return `${place}th`
  }

  const getPlaceBadgeColor = (place: number) => {
    if (place === 1) return "bg-yellow-500 text-white"
    if (place === 2) return "bg-gray-400 text-white"
    if (place === 3) return "bg-amber-600 text-white"
    if (place <= 8) return "bg-blue-600 text-white"
    return "bg-gray-500 text-white"
  }

  const getGradeLevel = (year: number, graduationYear?: number) => {
    if (!graduationYear) return ""
    const yearsUntilGrad = graduationYear - year
    if (yearsUntilGrad === 4) return "Freshman"
    if (yearsUntilGrad === 3) return "Sophomore"
    if (yearsUntilGrad === 2) return "Junior"
    if (yearsUntilGrad === 1) return "Senior"
    return ""
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-600" />
          Wrestling Tournament Achievements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* State Championships */}
        {achievements.all_results.nchsaa.length > 0 && (
          <div className="border-l-4 border-red-700 pl-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-red-700">
              <Trophy className="h-4 w-4" />
              NCHSAA State Championships
            </h3>
            <div className="grid gap-3">
              {achievements.all_results.nchsaa.map((achievement, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    achievement.place === 1
                      ? "bg-yellow-50 border border-yellow-200"
                      : "bg-gray-50 border border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {achievement.place === 1 ? (
                      <Badge className="bg-yellow-500 text-white font-bold">CHAMPION</Badge>
                    ) : (
                      <Badge className={getPlaceBadgeColor(achievement.place || 0)}>
                        {getPlaceDisplay(achievement.place || 0)}
                      </Badge>
                    )}
                    <div>
                      <p className="font-semibold">
                        {achievement.year} State {achievement.place === 1 ? "Champion" : "Placer"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {achievement.weight_class}
                        {achievement.division && ` • ${achievement.division}`}
                      </p>
                    </div>
                  </div>
                  <Trophy className="h-6 w-6 text-yellow-600" />
                </div>
              ))}
            </div>
          </div>
        )}

        {nhscaData.length > 0 && (
          <div className="border-l-4 border-blue-700 pl-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-blue-700">
              <Award className="h-4 w-4" />
              NHSCA National Tournament Results
            </h3>
            <p className="text-xs text-gray-500 mb-3 italic">National High School Coaches Association</p>
            <div className="grid gap-2">
              {nhscaData.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {result.placement && result.placement <= 8 && (
                      <Badge className="bg-red-700 text-white font-bold">ALL AMERICAN</Badge>
                    )}
                    {result.placement && (
                      <Badge className={getPlaceBadgeColor(result.placement)}>
                        {getPlaceDisplay(result.placement)}
                      </Badge>
                    )}
                    <div>
                      <p className="font-medium">{result.year} NHSCA Tournament</p>
                      {isClassOf2025 && (result.weight || result.division) && (
                        <p className="text-sm text-gray-600">
                          {result.weight && `${result.weight}`}
                          {result.weight && result.division && " • "}
                          {result.division && result.division}
                          {result.placement && result.placement <= 8 && " • "}
                          {result.placement && result.placement <= 8 && (
                            <span className="text-red-600 font-medium">All American</span>
                          )}
                        </p>
                      )}
                      {!isClassOf2025 && result.record && (
                        <p className="text-sm text-gray-600">
                          Tournament Record: {result.record}
                          {result.placement && result.placement <= 8 && " • "}
                          {result.placement && result.placement <= 8 && (
                            <span className="text-red-600 font-medium">All American</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  <Award className="h-5 w-5 text-blue-600" />
                </div>
              ))}
            </div>
          </div>
        )}

        {super32Data.length > 0 && (
          <div className="border-l-4 border-yellow-700 pl-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-yellow-700">
              <Award className="h-4 w-4" />
              Super 32 Championships
            </h3>
            <div className="grid gap-2">
              {super32Data.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {result.placement ? (
                      <Badge className={getPlaceBadgeColor(result.placement)}>
                        {getPlaceDisplay(result.placement)}
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-400 text-white">DNP</Badge>
                    )}
                    <div>
                      <p className="font-medium">{result.year} Super 32</p>
                      {result.record && <p className="text-sm text-gray-600">Tournament Record: {result.record}</p>}
                    </div>
                  </div>
                  <Award className="h-5 w-5 text-yellow-600" />
                </div>
              ))}
            </div>
          </div>
        )}

        {athlete.college_opens_experience && (
          <div className="border-l-4 border-purple-700 pl-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-purple-700">
              <Award className="h-4 w-4" />
              College Opens Experience
            </h3>
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-gray-700">{athlete.college_opens_experience}</p>
              <p className="text-xs text-gray-500 mt-1 italic">College-level tournament experience</p>
            </div>
          </div>
        )}

        {athlete.nationally_ranked_wins && (
          <div className="border-l-4 border-green-700 pl-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-green-700">
              <Trophy className="h-4 w-4" />
              Nationally Ranked Wins
            </h3>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-gray-900">{athlete.nationally_ranked_wins}</p>
              <p className="text-xs text-gray-500 mt-1 italic">Victories over nationally ranked opponents</p>
            </div>
          </div>
        )}

        {/* Simplified summary stats */}
        <div className="pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-3 sm:p-0">
              <p className="text-3xl sm:text-2xl font-bold text-red-600">{achievements.all_results.nchsaa.length}</p>
              <p className="text-sm text-gray-600 mt-1">State Placements</p>
            </div>
            <div className="p-3 sm:p-0">
              <p className="text-3xl sm:text-2xl font-bold text-red-600">{achievements.state_championships.length}</p>
              <p className="text-sm text-gray-600 mt-1">State Titles</p>
            </div>
            <div className="p-3 sm:p-0">
              <p className="text-3xl sm:text-2xl font-bold text-blue-600">{nhscaData.length}</p>
              <p className="text-sm text-gray-600 mt-1">National Tournaments</p>
            </div>
            <div className="p-3 sm:p-0">
              <p className="text-3xl sm:text-2xl font-bold text-blue-600">
                {nhscaData.filter((r) => r.placement && r.placement <= 8).length}
              </p>
              <p className="text-sm text-gray-600 mt-1">All Americans</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
