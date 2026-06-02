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
  college_names?: string[]
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
  year?: "all" | "2025" | "2026" | "2027" | "2028"
  division?: "all" | "Division I" | "Division II" | "Division III" | "NAIA" | "NJCAA" | "Independent" | "DI"
  limit?: number
  searchTerm?: string
  onStatsUpdate?: (stats: { totalCommits: number; maleCommits: number; femaleCommits: number; uniqueColleges: number }) => void
}

export function CollegeLeaderboard({
  metric,
  gender,
  year = "all",
  division = "all",
  limit = 10,
  searchTerm = "",
  onStatsUpdate,
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
        setExpandedColleges(new Set())
        setCollegeAthletes({})

        console.log(
          `Fetching college leaderboard: metric=${metric}, gender=${gender}, year=${year}, division=${division}`,
        )

        const params = new URLSearchParams({
          metric,
          gender,
          year,
          division,
        })
        if (searchTerm.trim()) params.set("search", searchTerm.trim())

        const response = await fetch(`/api/colleges/leaderboard?${params.toString()}`)

        console.log(`College response status: ${response.status}`)

        if (!response.ok) {
          const errorText = await response.text()
          console.error("College API Error Response:", errorText)
          throw new Error(`Failed to fetch college leaderboard data: ${response.status} - ${errorText}`)
        }

        const data = await response.json()

        setColleges(data.colleges || [])
      } catch (err) {
        console.error("College fetch error:", err)
        setError(err instanceof Error ? err.message : "An error occurred")
        setColleges([])
        onStatsUpdate?.({
          totalCommits: 0,
          maleCommits: 0,
          femaleCommits: 0,
          uniqueColleges: 0,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [metric, gender, year, division, searchTerm, onStatsUpdate])

  // Calculate and update stats when colleges change (search applied server-side)
  useEffect(() => {
    if (onStatsUpdate) {
      const totalCommits = colleges.reduce((sum, college) => sum + college.total_commits, 0)
      const maleCommits = colleges.reduce((sum, college) => sum + college.male_commits, 0)
      const femaleCommits = colleges.reduce((sum, college) => sum + college.female_commits, 0)
      const uniqueColleges = colleges.length

      onStatsUpdate({
        totalCommits,
        maleCommits,
        femaleCommits,
        uniqueColleges,
      })
    }
  }, [colleges, onStatsUpdate])

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

  const fetchCollegeAthletes = async (college: CollegeStats) => {
    const collegeName = college.college_name
    if (collegeAthletes[collegeName] || loadingAthletes.has(collegeName)) {
      return
    }

    setLoadingAthletes((prev) => new Set(prev).add(collegeName))

    try {
      const names = college.college_names?.length ? college.college_names : [collegeName]
      const params = new URLSearchParams({
        college: collegeName,
        gender,
        year,
        division,
        collegeNames: names.join("|"),
      })
      const response = await fetch(`/api/colleges/athletes?${params.toString()}`)

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        console.error("[RecruitNC] College athletes fetch failed:", response.status, errBody)
        setCollegeAthletes((prev) => ({
          ...prev,
          [collegeName]: [],
        }))
        return
      }

      const data = await response.json()
      setCollegeAthletes((prev) => ({
        ...prev,
        [collegeName]: data.athletes || [],
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

  const toggleCollegeExpansion = async (college: CollegeStats) => {
    const collegeName = college.college_name
    const newExpanded = new Set(expandedColleges)

    if (expandedColleges.has(collegeName)) {
      newExpanded.delete(collegeName)
    } else {
      newExpanded.add(collegeName)
      await fetchCollegeAthletes(college)
    }

    setExpandedColleges(newExpanded)
  }

  const navigateToAthlete = (athleteId: string) => {
    window.location.href = `/athletes/${athleteId}`
  }

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

  const rankedColleges = calculateRankings(colleges)

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
      case "NCAA Division I":
      case "Division I":
      case "D1":
      case "DI":
        return "bg-[#003366]/80 text-white border-0"
      case "NCAA Division II":
      case "Division II":
      case "D2":
      case "DII":
        return "bg-[#012ECD]/80 text-white border-0"
      case "NCAA Division III":
      case "Division III":
      case "D3":
      case "DIII":
        return "bg-[#13294B]/80 text-white border-0"
      case "NAIA":
        return "bg-[#D3B574]/20 text-[#D3B574] border-0"
      case "NJCAA":
        return "bg-[#BC0B03]/20 text-[#BC0B03] border-0"
      default:
        return "bg-white/10 text-white/70 border-0"
    }
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
      <div className="text-center py-8 text-white/40">
        <p>Error loading college leaderboard: {error}</p>
      </div>
    )
  }

  if (rankedColleges.length === 0) {
    return (
      <div className="text-center py-8 text-white/40">
        <p>No colleges match the selected filters.</p>
        <p className="text-sm mt-2 text-white/30">Try clearing filters or choosing a different division or class year.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {rankedColleges.map(({ college, rank }) => (
        <Collapsible
          key={college.college_name}
          open={expandedColleges.has(college.college_name)}
          onOpenChange={() => toggleCollegeExpansion(college)}
        >
          <div className="rounded-xl border border-white/10 bg-[#0f1c2e] hover:border-white/20 transition-colors">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full p-4 h-auto justify-start hover:bg-white/5">
                <div className="flex items-center space-x-4 min-w-0 flex-1">
                  <span className="text-sm font-semibold text-white/40 w-8 text-center">#{rank}</span>
                  <Avatar className="h-12 w-12 border-2 border-white/10">
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
                    <AvatarFallback className="text-sm font-semibold bg-white/10 text-white/70">
                      {college.college_name
                        .split(" ")
                        .map((word) => word[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-base font-semibold text-white truncate">{college.college_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className={getDivisionBadgeColor(college.division)}>
                        {college.division}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#D3B574]">{getMetricLabel(getMetricValue(college))}</p>
                  </div>
                  {expandedColleges.has(college.college_name) ? (
                    <ChevronDown className="h-5 w-5 text-white/30" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-white/30" />
                  )}
                </div>
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="px-4 pb-4">
              <div className="border-t border-white/10 pt-4 mt-2">
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
                          className="flex items-center justify-between py-3 px-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10 border border-white/10">
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
                              <AvatarFallback className="text-sm bg-white/10 text-white/70">
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
                                className="text-sm font-semibold hover:text-[#D3B574] hover:underline cursor-pointer text-left text-white"
                              >
                                {athleteName}
                              </button>
                              <div className="flex items-center gap-2 text-sm text-white/60">
                                <span className="font-medium">{athlete.highschool}</span>
                                {athlete.weightclass && <span>• {athlete.weightclass}lbs</span>}
                                {athlete.graduationyear && <span>• Class of {athlete.graduationyear}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={`text-xs border-0 ${athlete.gender === "Male" || athlete.gender === "male" ? "bg-[#003366]/80 text-white" : "bg-[#BC0B03]/20 text-[#BC0B03]"}`}
                            >
                              {athlete.gender}
                            </Badge>
                            {athlete.commitmentdate && (
                              <span className="text-sm text-white/40 font-medium">
                                {new Date(athlete.commitmentdate).getFullYear()}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-white/40 text-center py-6">No athletes found for this college.</p>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}
    </div>
  )
}
