"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface HighSchoolStats {
  school_name: string
  logo_url?: string
  division?: string
  total_commits: number
  d1_commits: number
  d2_commits: number
  d3_commits: number
  naia_commits: number
  recent_commits: number
  ranked_commits: number
  male_commits: number
  female_commits: number
}

interface Athlete {
  id: string
  name: string
  display_name?: string
  college: string
  gender: string
  graduationyear: number
  commitmentdate?: string
  rankings?: any
  weightclass?: string
  photo_url?: string
}

interface HighSchoolLeaderboardProps {
  metric: "total_commits" | "d1_commits" | "recent_commits" | "ranked_commits" | "emerging_programs"
  gender: "all" | "male" | "female"
  year?: "all" | "2024" | "2025" | "2026" | "2027"
  limit?: number
  searchTerm?: string
}

export function HighSchoolLeaderboard({
  metric,
  gender,
  year = "all",
  limit = 10,
  searchTerm = "",
}: HighSchoolLeaderboardProps) {
  const [schools, setSchools] = useState<HighSchoolStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set())
  const [schoolAthletes, setSchoolAthletes] = useState<Record<string, Athlete[]>>({})
  const [loadingAthletes, setLoadingAthletes] = useState<Set<string>>(new Set())
  const [schoolLogos, setSchoolLogos] = useState<Record<string, string>>({})
  const router = useRouter()

  const getMetricValue = (school: HighSchoolStats) => {
    switch (metric) {
      case "total_commits":
        return gender === "male"
          ? school.male_commits
          : gender === "female"
            ? school.female_commits
            : school.total_commits
      case "d1_commits":
        return school.d1_commits
      case "recent_commits":
        return school.recent_commits
      case "ranked_commits":
        return school.ranked_commits
      case "emerging_programs":
        return school.female_commits
      default:
        return school.total_commits
    }
  }

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true)
        setError(null)

        console.log(`Fetching leaderboard: metric=${metric}, gender=${gender}, year=${year}`)

        const params = new URLSearchParams({
          metric,
          gender,
          year,
        })

        const response = await fetch(`/api/high-schools/leaderboard?${params.toString()}`)

        console.log(`Response status: ${response.status}`)

        if (!response.ok) {
          const errorText = await response.text()
          console.error("API Error Response:", errorText)
          throw new Error(`Failed to fetch leaderboard data: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        console.log("Leaderboard data received:", data)
        setSchools(data.schools || [])
      } catch (err) {
        console.error("Fetch error:", err)
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [metric, gender, year])

  useEffect(() => {
    const fetchSchoolLogos = async () => {
      for (const school of schools) {
        if (schoolLogos[school.school_name]) {
          continue // Already have logo for this school
        }

        try {
          console.log(`🔍 Fetching logo for school: "${school.school_name}"`)
          const response = await fetch(
            `/api/logo-mappings/by-entity/highschool/${encodeURIComponent(school.school_name)}`,
          )

          if (response.ok) {
            const data = await response.json()
            if (data.success && data.logo_url) {
              console.log(`✅ Logo found for school: "${school.school_name}": ${data.logo_url}`)
              setSchoolLogos((prev) => ({
                ...prev,
                [school.school_name]: data.logo_url,
              }))
            } else {
              console.log(`❌ No logo found for school: "${school.school_name}"`)
            }
          } else {
            console.log(`❌ API error for school: "${school.school_name}": ${response.status}`)
          }
        } catch (error) {
          console.error(`❌ Error fetching logo for school: "${school.school_name}":`, error)
        }
      }
    }

    if (schools.length > 0) {
      fetchSchoolLogos()
    }
  }, [schools, schoolLogos])

  const fetchSchoolAthletes = async (schoolName: string) => {
    if (schoolAthletes[schoolName] || loadingAthletes.has(schoolName)) {
      return
    }

    setLoadingAthletes((prev) => new Set(prev).add(schoolName))

    try {
      const params = new URLSearchParams({
        school: schoolName,
        gender,
        ...(year !== "all" && { year }),
      })

      console.log(`Fetching athletes for ${schoolName} with params:`, params.toString())

      const response = await fetch(`/api/high-schools/athletes?${params.toString()}`)

      if (!response.ok) {
        console.error("Failed to fetch athletes for", schoolName, "Status:", response.status)
        const errorText = await response.text()
        console.error("Error response:", errorText)
        setSchoolAthletes((prev) => ({
          ...prev,
          [schoolName]: [],
        }))
        return
      }

      const data = await response.json()
      console.log(`Athletes data for ${schoolName}:`, data)
      setSchoolAthletes((prev) => ({
        ...prev,
        [schoolName]: data.athletes || [],
      }))
    } catch (err) {
      console.error("Error fetching athletes:", err)
      setSchoolAthletes((prev) => ({
        ...prev,
        [schoolName]: [],
      }))
    } finally {
      setLoadingAthletes((prev) => {
        const newSet = new Set(prev)
        newSet.delete(schoolName)
        return newSet
      })
    }
  }

  const toggleSchoolExpansion = async (schoolName: string) => {
    const newExpanded = new Set(expandedSchools)

    if (expandedSchools.has(schoolName)) {
      newExpanded.delete(schoolName)
    } else {
      newExpanded.add(schoolName)
      await fetchSchoolAthletes(schoolName)
    }

    setExpandedSchools(newExpanded)
  }

  const navigateToAthlete = (athleteId: string) => {
    window.location.href = `/athletes/${athleteId}`
  }

  const filteredSchools = schools.filter((school) => {
    if (!searchTerm) return true
    return school.school_name.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const calculateRankings = (schools: HighSchoolStats[]) => {
    const rankings: { school: HighSchoolStats; rank: number }[] = []
    let currentRank = 1

    for (let i = 0; i < schools.length; i++) {
      const currentValue = getMetricValue(schools[i])

      // If this is not the first school and the value is different from previous
      if (i > 0 && getMetricValue(schools[i - 1]) !== currentValue) {
        currentRank = i + 1 // Jump to the correct rank position
      }

      rankings.push({ school: schools[i], rank: currentRank })
    }

    return rankings
  }

  const rankedSchools = calculateRankings(filteredSchools)

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-6 w-8" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Error loading leaderboard: {error}</p>
      </div>
    )
  }

  if (rankedSchools.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No data available for this metric.</p>
      </div>
    )
  }

  const getMetricLabel = (value: number) => {
    switch (metric) {
      case "total_commits":
        return `${value} commits`
      case "d1_commits":
        return `${value} D1`
      case "recent_commits":
        return `${value} recent`
      case "ranked_commits":
        return `${value} ranked`
      case "emerging_programs":
        return `${value} female`
      default:
        return `${value}`
    }
  }

  return (
    <div className="space-y-3">
      {rankedSchools.map(({ school, rank }) => (
        <Collapsible
          key={school.school_name}
          open={expandedSchools.has(school.school_name)}
          onOpenChange={() => toggleSchoolExpansion(school.school_name)}
        >
          <div className="rounded-lg border border-gray-200 bg-white hover:shadow-sm transition-shadow">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full p-4 h-auto justify-start hover:bg-gray-50">
                <div className="flex items-center space-x-4 min-w-0 flex-1">
                  <span className="text-sm font-semibold text-gray-600 w-8 text-center">#{rank}</span>
                  <Avatar className="h-12 w-12 border-2 border-gray-200">
                    <AvatarImage
                      src={
                        schoolLogos[school.school_name] ||
                        `/placeholder.svg?height=48&width=48&query=${encodeURIComponent(school.school_name + " high school logo") || "/placeholder.svg"}`
                      }
                      alt={`${school.school_name} logo`}
                      onError={(e) => {
                        console.log(`Logo failed to load for ${school.school_name}:`, schoolLogos[school.school_name])
                        e.currentTarget.src = `/placeholder.svg?height=48&width=48&query=${encodeURIComponent(school.school_name + " high school logo")}`
                      }}
                    />
                    <AvatarFallback className="text-sm font-semibold bg-gray-100 text-gray-700">
                      {school.school_name
                        .split(" ")
                        .map((word) => word[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-base font-semibold text-gray-900 truncate">{school.school_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{getMetricLabel(getMetricValue(school))}</p>
                  </div>
                  {expandedSchools.has(school.school_name) ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="px-4 pb-4">
              <div className="border-t border-gray-200 pt-4 mt-2">
                {loadingAthletes.has(school.school_name) ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : schoolAthletes[school.school_name]?.length > 0 ? (
                  <div className="space-y-3">
                    {schoolAthletes[school.school_name].map((athlete) => {
                      const athleteName = athlete.display_name || athlete.name
                      return (
                        <div
                          key={athlete.id}
                          className="flex items-center justify-between py-3 px-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10 border border-gray-200">
                              <AvatarImage
                                src={
                                  athlete.photo_url ||
                                  `/placeholder.svg?height=40&width=40&query=${encodeURIComponent(athleteName + " athlete photo") || "/placeholder.svg"}`
                                }
                                alt={athleteName}
                                onError={(e) => {
                                  console.log(`Photo failed to load for ${athleteName}:`, athlete.photo_url)
                                }}
                              />
                              <AvatarFallback className="text-sm bg-gray-200 text-gray-700">
                                {athleteName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <button
                                onClick={() => navigateToAthlete(athlete.id)}
                                className="text-sm font-semibold hover:text-red-600 hover:underline cursor-pointer text-left text-gray-900"
                              >
                                {athleteName}
                              </button>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="font-medium">{athlete.college}</span>
                                {athlete.weightclass && <span>• {athlete.weightclass}lbs</span>}
                                {athlete.graduationyear && <span>• Class of {athlete.graduationyear}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={`text-xs ${athlete.gender === "Male" || athlete.gender === "male" ? "bg-blue-100 text-blue-800" : "bg-pink-100 text-pink-800"}`}
                            >
                              {athlete.gender}
                            </Badge>
                            {athlete.commitmentdate && (
                              <span className="text-sm text-gray-500 font-medium">
                                {new Date(athlete.commitmentdate).getFullYear()}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-6">No athletes found for this school.</p>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}
    </div>
  )
}
