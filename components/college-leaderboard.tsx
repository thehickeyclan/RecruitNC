"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface CollegeStats {
  college_name: string
  logo_url?: string
  division: string
  total_commits: number
  d1_commits: number
  d2_commits: number
  d3_commits: number
  naia_commits: number
  recent_commits: number
  ranked_commits: number
  male_commits: number
  female_commits: number
  nc_commits: number
  out_of_state_commits: number
}

interface Athlete {
  id: string
  name: string
  display_name?: string
  highschool: string
  gender: string
  graduationyear: number
  commitmentdate?: string
  rankings?: any
  weightclass?: string
  photourl?: string
  college?: string
}

interface CollegeLeaderboardProps {
  metric: "total_commits" | "d1_commits" | "recent_commits" | "ranked_commits" | "nc_commits"
  gender: "all" | "male" | "female"
  year?: "all" | "2024" | "2025" | "2026" | "2027"
  division?: "all" | "Division I" | "Division II" | "Division III" | "NAIA" | "NJCAA" | "Independent" | "DI"
  limit?: number
  searchTerm?: string
}

export function CollegeLeaderboard({
  metric,
  gender,
  year = "all",
  division = "all",
  limit = 10,
  searchTerm = "",
}: CollegeLeaderboardProps) {
  const [colleges, setColleges] = useState<CollegeStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedColleges, setExpandedColleges] = useState<Set<string>>(new Set())
  const [collegeAthletes, setCollegeAthletes] = useState<Record<string, Athlete[]>>({})
  const [loadingAthletes, setLoadingAthletes] = useState<Set<string>>(new Set())
  const [collegeLogos, setCollegeLogos] = useState<Record<string, string>>({})
  const router = useRouter()

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true)
        setError(null)

        console.log(
          `Fetching college leaderboard: metric=${metric}, gender=${gender}, year=${year}, division=${division}`,
        )

        const params = new URLSearchParams({
          metric,
          gender,
          year,
          division,
        })

        const response = await fetch(`/api/colleges/leaderboard?${params.toString()}`)

        console.log(`College response status: ${response.status}`)

        if (!response.ok) {
          const errorText = await response.text()
          console.error("College API Error Response:", errorText)
          throw new Error(`Failed to fetch college leaderboard data: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        console.log("College leaderboard data received:", data)

        const filteredColleges = data.colleges || []

        // If DI filter is selected, ensure NC State is included regardless of database division value
        if (division === "DI") {
          const hasNCState = filteredColleges.some(
            (college: CollegeStats) =>
              college.college_name.toLowerCase().includes("nc state") ||
              college.college_name.toLowerCase().includes("north carolina state") ||
              college.college_name.toLowerCase().includes("ncsu"),
          )

          // If NC State is not in the filtered results, fetch all colleges and add NC State
          if (!hasNCState) {
            const allCollegesParams = new URLSearchParams({
              metric,
              gender,
              year,
              division: "all", // Get all divisions to find NC State
            })

            const allCollegesResponse = await fetch(`/api/colleges/leaderboard?${allCollegesParams.toString()}`)
            if (allCollegesResponse.ok) {
              const allCollegesData = await allCollegesResponse.json()
              const ncState = allCollegesData.colleges?.find(
                (college: CollegeStats) =>
                  college.college_name.toLowerCase().includes("nc state") ||
                  college.college_name.toLowerCase().includes("north carolina state") ||
                  college.college_name.toLowerCase().includes("ncsu"),
              )

              if (ncState) {
                filteredColleges.push(ncState)
              }
            }
          }
        }

        setColleges(filteredColleges)
      } catch (err) {
        console.error("College fetch error:", err)
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [metric, gender, year, division])

  useEffect(() => {
    const fetchCollegeLogos = async () => {
      for (const college of colleges) {
        if (collegeLogos[college.college_name]) {
          continue // Already have logo for this college
        }

        try {
          console.log(`🔍 Fetching logo for college: "${college.college_name}"`)
          const response = await fetch(
            `/api/logo-mappings/by-entity/college/${encodeURIComponent(college.college_name)}`,
          )

          if (response.ok) {
            const data = await response.json()
            if (data.success && data.logo_url) {
              console.log(`✅ Logo found for college: "${college.college_name}": ${data.logo_url}`)
              setCollegeLogos((prev) => ({
                ...prev,
                [college.college_name]: data.logo_url,
              }))
            } else {
              console.log(`❌ No logo found for college: "${college.college_name}"`)
            }
          } else {
            console.log(`❌ API error for college: "${college.college_name}": ${response.status}`)
          }
        } catch (error) {
          console.error(`❌ Error fetching logo for college: "${college.college_name}":`, error)
        }
      }
    }

    if (colleges.length > 0) {
      fetchCollegeLogos()
    }
  }, [colleges, collegeLogos])

  const fetchCollegeAthletes = async (collegeName: string) => {
    if (collegeAthletes[collegeName] || loadingAthletes.has(collegeName)) {
      return
    }

    setLoadingAthletes((prev) => new Set(prev).add(collegeName))

    try {
      console.log(`🔍 Fetching athletes for college: "${collegeName}"`)

      const response = await fetch("/api/athletes")

      if (!response.ok) {
        console.error("Failed to fetch athletes. Status:", response.status)
        setCollegeAthletes((prev) => ({
          ...prev,
          [collegeName]: [],
        }))
        return
      }

      const data = await response.json()
      console.log(`📊 Total athletes fetched: ${data.athletes?.length || 0}`)

      const allAthletes = data.athletes || []

      const collegeAthletesList = allAthletes.filter((athlete: any) => {
        const athleteCollege = (athlete.college || "").trim()
        const targetCollege = collegeName.trim()

        // Only match if athlete has a college and it exactly matches the target college
        if (!athleteCollege) return false

        // Exact match (case insensitive)
        return athleteCollege.toLowerCase() === targetCollege.toLowerCase()
      })

      let filteredAthletes = collegeAthletesList

      if (gender !== "all") {
        filteredAthletes = filteredAthletes.filter((athlete: any) => {
          const athleteGender = (athlete.gender || "").toLowerCase()
          return gender === "male"
            ? athleteGender === "male" || athleteGender === "m"
            : athleteGender === "female" || athleteGender === "f"
        })
      }

      if (year !== "all") {
        filteredAthletes = filteredAthletes.filter((athlete: any) => {
          return athlete.graduationyear?.toString() === year
        })
      }

      console.log(`✅ Found ${filteredAthletes.length} athletes for ${collegeName}`)
      console.log(
        `🎯 Sample athletes:`,
        filteredAthletes.slice(0, 3).map((a: any) => ({
          name: a.display_name || a.name,
          college: a.college,
          gender: a.gender,
          year: a.graduationyear,
        })),
      )

      setCollegeAthletes((prev) => ({
        ...prev,
        [collegeName]: filteredAthletes,
      }))
    } catch (err) {
      console.error("Error fetching college athletes:", err)
      setCollegeAthletes((prev) => ({
        ...prev,
        [collegeName]: [],
      }))
    } finally {
      setLoadingAthletes((prev) => {
        const newSet = new Set(prev)
        newSet.delete(collegeName)
        return newSet
      })
    }
  }

  const toggleCollegeExpansion = async (collegeName: string) => {
    const newExpanded = new Set(expandedColleges)

    if (expandedColleges.has(collegeName)) {
      newExpanded.delete(collegeName)
    } else {
      newExpanded.add(collegeName)
      await fetchCollegeAthletes(collegeName)
    }

    setExpandedColleges(newExpanded)
  }

  const navigateToAthlete = (athleteId: string) => {
    router.push(`/athletes/${athleteId}`)
  }

  const filteredColleges = colleges.filter((college) => {
    if (!searchTerm) return true
    return college.college_name.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const getMetricValue = (college: CollegeStats) => {
    switch (metric) {
      case "total_commits":
        return gender === "male"
          ? college.male_commits
          : gender === "female"
            ? college.female_commits
            : college.total_commits
      case "d1_commits":
        return college.d1_commits
      case "recent_commits":
        return college.recent_commits
      case "ranked_commits":
        return college.ranked_commits
      case "nc_commits":
        return college.nc_commits
      default:
        return college.total_commits
    }
  }

  const calculateRankings = (colleges: CollegeStats[]) => {
    const rankings: { college: CollegeStats; rank: number }[] = []
    let currentRank = 1

    for (let i = 0; i < colleges.length; i++) {
      const currentValue = getMetricValue(colleges[i])

      // If this is not the first college and the value is different from previous
      if (i > 0 && getMetricValue(colleges[i - 1]) !== currentValue) {
        currentRank = i + 1 // Jump to the correct rank position
      }

      rankings.push({ college: colleges[i], rank: currentRank })
    }

    return rankings
  }

  const rankedColleges = calculateRankings(filteredColleges)

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
      case "nc_commits":
        return `${value} NC`
      default:
        return `${value}`
    }
  }

  const getDivisionBadgeColor = (division: string) => {
    switch (division) {
      case "Division I":
      case "D1":
        return "bg-red-100 text-red-800"
      case "Division II":
      case "D2":
        return "bg-blue-100 text-blue-800"
      case "Division III":
      case "D3":
        return "bg-green-100 text-green-800"
      case "NAIA":
        return "bg-purple-100 text-purple-800"
      case "NJCAA":
        return "bg-orange-100 text-orange-800"
      case "Independent":
        return "bg-gray-100 text-gray-800"
      case "DI":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getDisplayDivision = (collegeName: string, division: string) => {
    if (
      collegeName.toLowerCase().includes("nc state") ||
      collegeName.toLowerCase().includes("north carolina state") ||
      collegeName.toLowerCase().includes("ncsu")
    ) {
      return "DI"
    }
    return division
  }

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
        <p>Error loading college leaderboard: {error}</p>
      </div>
    )
  }

  if (rankedColleges.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No college data available for this metric.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {rankedColleges.map(({ college, rank }) => (
        <Collapsible
          key={college.college_name}
          open={expandedColleges.has(college.college_name)}
          onOpenChange={() => toggleCollegeExpansion(college.college_name)}
        >
          <div className="rounded-lg border border-gray-200 bg-white hover:shadow-sm transition-shadow">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full p-4 h-auto justify-start hover:bg-gray-50">
                <div className="flex items-center space-x-4 min-w-0 flex-1">
                  <span className="text-sm font-semibold text-gray-600 w-8 text-center">#{rank}</span>
                  <Avatar className="h-12 w-12 border-2 border-gray-200">
                    <AvatarImage
                      src={
                        collegeLogos[college.college_name] ||
                        `/placeholder.svg?height=48&width=48&query=${encodeURIComponent(college.college_name + " college logo") || "/placeholder.svg"}`
                      }
                      alt={`${college.college_name} logo`}
                      onError={(e) => {
                        console.log(
                          `Logo failed to load for ${college.college_name}:`,
                          collegeLogos[college.college_name],
                        )
                        e.currentTarget.src = `/placeholder.svg?height=48&width=48&query=${encodeURIComponent(college.college_name + " college logo")}`
                      }}
                    />
                    <AvatarFallback className="text-sm font-semibold bg-gray-100 text-gray-700">
                      {college.college_name
                        .split(" ")
                        .map((word) => word[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-base font-semibold text-gray-900 truncate">{college.college_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="secondary"
                        className={getDivisionBadgeColor(getDisplayDivision(college.college_name, college.division))}
                      >
                        {getDisplayDivision(college.college_name, college.division)}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{getMetricLabel(getMetricValue(college))}</p>
                  </div>
                  {expandedColleges.has(college.college_name) ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="px-4 pb-4">
              <div className="border-t border-gray-200 pt-4 mt-2">
                {loadingAthletes.has(college.college_name) ? (
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
                ) : collegeAthletes[college.college_name]?.length > 0 ? (
                  <div className="space-y-3">
                    {collegeAthletes[college.college_name].map((athlete) => {
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
                                  athlete.photourl ||
                                  `/placeholder.svg?height=40&width=40&query=${encodeURIComponent(athleteName + " athlete photo") || "/placeholder.svg"}`
                                }
                                alt={athleteName}
                                onError={(e) => {
                                  console.log(`Photo failed to load for ${athleteName}:`, athlete.photourl)
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
                                <span className="font-medium">{athlete.highschool}</span>
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
                  <p className="text-sm text-gray-500 text-center py-6">No athletes found for this college.</p>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}
    </div>
  )
}
