"use client"

import { useState, useEffect } from "react"
import { Search, Trophy, Crown, Users, Star, Filter, School, TrendingUp, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import type React from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { normalizeSchoolNameForSearch, createSchoolSearchPatterns } from "@/lib/school-normalization"

interface AthleteResult {
  id: string
  athlete_name?: string
  first_name?: string
  last_name?: string
  wrestler_name?: string
  year: number
  place?: number
  placement?: number
  weight_class?: string
  weight?: string
  classification?: string
  division?: string
  college?: string
  graduation_year?: number
  high_school?: string
  school?: string
  name?: string
  graduationyear?: number
  weightclass?: string
  recruiting_status?: string
  collegeLogoUrl?: string
}

interface SchoolStats {
  school: string
  nhsca_champions: number
  nhsca_placers: number
  super32_champions: number
  super32_placers: number
  nchsaa_champions: number
  nchsaa_placers: number
  dual_meet_champions: number
  total_score: number
}

interface TournamentChampion {
  id: string
  year: number
  tournament_site: string
  division: string | null
  champion_school: string
  coach_name: string | null
  points: number | null
  is_co_champion: boolean
  notes: string | null
}

interface TournamentLeaderboard {
  school: string
  total_championships: number
  divisions: { [key: string]: number }
  years: number[]
  most_recent_year: number
  coaches: string[]
}

interface DualTeamChampion {
  id: string
  year: number
  division: string
  champion_school: string
  champion_score?: number | null
  runner_up_school?: string | null
  runner_up_score?: number | null
  is_vacated: boolean
  notes: string | null
}

interface DualTeamLeaderboard {
  school: string
  total_championships: number
  divisions: { [key: string]: number }
  years: number[]
  most_recent_year: number
}

interface SchoolDetails {
  nhsca: AthleteResult[]
  nchsaa: AthleteResult[]
  commits: AthleteResult[]
  mostOutstanding: any[]
}

export default function SchoolsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null)
  const [schoolDetails, setSchoolDetails] = useState<SchoolDetails>({
    nhsca: [],
    nchsaa: [],
    commits: [],
    mostOutstanding: [],
  })
  const [leaderboard, setLeaderboard] = useState<SchoolStats[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [tournamentChampions, setTournamentChampions] = useState<TournamentChampion[]>([])
  const [tournamentLoading, setTournamentLoading] = useState(false)
  const [tournamentLeaderboard, setTournamentLeaderboard] = useState<TournamentLeaderboard[]>([])

  const [dualTeamChampions, setDualTeamChampions] = useState<DualTeamChampion[]>([])
  const [dualTeamLoading, setDualTeamLoading] = useState(false)
  const [dualTeamLeaderboard, setDualTeamLeaderboard] = useState<DualTeamLeaderboard[]>([])

  const [selectedTopSchoolsDivision, setSelectedTopSchoolsDivision] = useState<string>("all")
  const [selectedTournamentDivision, setSelectedTournamentDivision] = useState<string>("all")
  const [selectedDualTeamDivision, setSelectedDualTeamDivision] = useState<string>("all")

  const [filteredLeaderboard, setFilteredLeaderboard] = useState<SchoolStats[]>([])
  const [filteredTournamentLeaderboard, setFilteredTournamentLeaderboard] = useState<TournamentLeaderboard[]>([])
  const [filteredDualTeamLeaderboard, setFilteredDualTeamLeaderboard] = useState<DualTeamLeaderboard[]>([])

  const [tournamentViewType, setTournamentViewType] = useState<"leaderboard" | "by-year">("leaderboard")
  const [dualTeamViewType, setDualTeamViewType] = useState<"leaderboard" | "by-year">("leaderboard")
  const [showPoints, setShowPoints] = useState(false) // Toggle between counts and points

  const [activeTab, setActiveTab] = useState("search")

  // Add loading state for search results
  const [loading, setLoading] = useState(false)

  // Scroll to top when school is selected and results are loaded
  useEffect(() => {
    if (selectedSchool && schoolDetails) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 100)
    }
  }, [selectedSchool, schoolDetails])

  const handleTabSwitch = async (tabName: string) => {
    try {
      setActiveTab(tabName)
      setError(null) // Clear any existing errors

      // Load data for specific tabs if needed
      if (tabName === "tournament" && tournamentChampions.length === 0) {
        await loadTournamentChampions()
      }
      if (tabName === "dual" && dualTeamChampions.length === 0) {
        await loadDualTeamChampions()
      }
      if (tabName === "best" && leaderboard.length === 0) {
        await loadLeaderboard()
      }
    } catch (err) {
      console.error("[v0] Tab switch error:", err)
      setError("Failed to load tab content")
    }
  }

  const loadTournamentChampions = async () => {
    if (tournamentLoading) return // Prevent multiple simultaneous loads

    setTournamentLoading(true)
    try {
      console.log("[v0] Loading tournament champions from database...")

      const { data, error } = await supabase
        .from("tournament_champions")
        .select("*")
        .order("year", { ascending: false })

      if (error) throw error

      console.log("[v0] Tournament champions raw data:", data?.length, "records")
      console.log("[v0] Sample records:", data?.slice(0, 3))

      const championshipMap = new Map<string, TournamentLeaderboard>()

      if (data && Array.isArray(data)) {
        data.forEach((champion) => {
          if (!champion?.champion_school) return // Skip invalid records

          const schoolName = champion.champion_school.trim()

          if (!championshipMap.has(schoolName)) {
            championshipMap.set(schoolName, {
              school: schoolName,
              total_championships: 0,
              divisions: {},
              years: [],
              most_recent_year: 0,
              coaches: [],
            })
          }

          const stats = championshipMap.get(schoolName)!
          stats.total_championships++
          if (champion.year) stats.years.push(champion.year)
          if (champion.year) stats.most_recent_year = Math.max(stats.most_recent_year, champion.year)

          // Track division championships
          const division = champion.division || "Single"
          stats.divisions[division] = (stats.divisions[division] || 0) + 1

          // Track coaches
          if (champion.coach_name && !stats.coaches.includes(champion.coach_name)) {
            stats.coaches.push(champion.coach_name)
          }
        })
      }

      // Convert to array and sort by total championships, then by most recent
      const leaderboard = Array.from(championshipMap.values()).sort((a, b) => {
        if (b.total_championships !== a.total_championships) {
          return b.total_championships - a.total_championships
        }
        return b.most_recent_year - a.most_recent_year
      })

      console.log("[v0] Tournament leaderboard processed:", leaderboard.length, "schools")
      console.log("[v0] Top 3 schools:", leaderboard.slice(0, 3))

      setTournamentChampions(data || [])
      setTournamentLeaderboard(leaderboard)
    } catch (err) {
      console.error("Tournament Champions Error:", err)
      setError("Failed to load tournament champions")
    } finally {
      setTournamentLoading(false)
    }
  }

  const loadLeaderboard = async () => {
    if (leaderboardLoading) return // Prevent multiple simultaneous loads

    setLeaderboardLoading(true)
    try {
      console.log("[v0] Starting optimized leaderboard load")

      const { data: nhscaData, error: nhscaError } = await supabase
        .from("wrestling_nhsca_results")
        .select("high_school, placement, athlete_name, year")
        .not("high_school", "is", null)
        .not("high_school", "eq", "")
        .gte("placement", 1)
        .lte("placement", 8)
        .order("high_school")
        .limit(10000)

      if (nhscaError) throw nhscaError

      // Query Super32 results - handle both high_school and school fields
      const { data: super32Data, error: super32Error } = await supabase
        .from("super32_results")
        .select("high_school, school, placement, athlete_name, year")
        .gte("placement", 1)
        .lte("placement", 8)
        .or("high_school.not.is.null,school.not.is.null")
        .order("high_school")
        .limit(5000)

      if (super32Error) {
        console.warn("[v0] Super32 query error:", super32Error)
        // Continue without Super32 data if query fails
      }

      let allNchsaaData: any[] = []
      let offset = 0
      const batchSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: batch, error: batchError } = await supabase
          .from("wrestling_nchsaa_results")
          .select("school, place, wrestler_name, year")
          .not("school", "is", null)
          .not("school", "eq", "")
          .gte("place", 1)
          .lte("place", 8)
          .order("school")
          .range(offset, offset + batchSize - 1)

        if (batchError) throw batchError

        if (batch && batch.length > 0) {
          allNchsaaData = [...allNchsaaData, ...batch]
          offset += batchSize
          hasMore = batch.length === batchSize
        } else {
          hasMore = false
        }
      }

      console.log("[v0] Fetched data - NHSCA:", nhscaData?.length, "NCHSAA:", allNchsaaData.length)

      // Query dual team champions (champions only, no runner-up data)
      // Exclude vacated titles, "No Dual Tournament" entries, and tournaments that weren't held
      const { data: dualTeamData, error: dualTeamError } = await supabase
        .from("dual_team_champions")
        .select("champion_school, year, division, is_vacated, held")
        .eq("is_vacated", false)
        .neq("champion_school", "No Dual Tournament")
        .or("held.is.null,held.eq.true")
        .not("champion_school", "is", null)
        .not("champion_school", "eq", "")

      if (dualTeamError) {
        console.warn("[v0] Dual team query error:", dualTeamError)
        // Continue without dual team data if query fails
      }

      const schoolStatsMap = new Map<string, SchoolStats>()

      if (nhscaData && Array.isArray(nhscaData)) {
        nhscaData.forEach((result) => {
          if (!result?.high_school) return // Skip invalid records

          const schoolName = result.high_school.trim()
          const normalizedName = schoolName.toLowerCase()

          if (!schoolStatsMap.has(normalizedName)) {
            schoolStatsMap.set(normalizedName, {
              school: schoolName,
              nhsca_champions: 0,
              nhsca_placers: 0,
              super32_champions: 0,
              super32_placers: 0,
              nchsaa_champions: 0,
              nchsaa_placers: 0,
              dual_meet_champions: 0,
              total_score: 0,
            })
          }

          const stats = schoolStatsMap.get(normalizedName)!
          if (result.placement === 1) {
            stats.nhsca_champions++
          } else {
            stats.nhsca_placers++ // Count non-champion All-Americans (placements 2-8)
          }
        })
      }

      // Process Super32 data
      if (super32Data && Array.isArray(super32Data)) {
        super32Data.forEach((result) => {
          // Use high_school if available, otherwise use school field
          const schoolName = (result.high_school || result.school || "").trim()
          if (!schoolName) return // Skip invalid records

          const normalizedName = schoolName.toLowerCase()

          if (!schoolStatsMap.has(normalizedName)) {
            schoolStatsMap.set(normalizedName, {
              school: schoolName,
              nhsca_champions: 0,
              nhsca_placers: 0,
              super32_champions: 0,
              super32_placers: 0,
              nchsaa_champions: 0,
              nchsaa_placers: 0,
              dual_meet_champions: 0,
              total_score: 0,
            })
          }

          const stats = schoolStatsMap.get(normalizedName)!
          if (result.placement === 1) {
            stats.super32_champions++
          } else {
            stats.super32_placers++ // Count non-champion Super32 All-Americans (placements 2-8)
          }
        })
      }

      if (allNchsaaData && Array.isArray(allNchsaaData)) {
        allNchsaaData.forEach((result) => {
          if (!result?.school) return // Skip invalid records

          const schoolName = result.school.trim()
          const normalizedName = schoolName.toLowerCase()

          if (!schoolStatsMap.has(normalizedName)) {
            schoolStatsMap.set(normalizedName, {
              school: schoolName,
              nhsca_champions: 0,
              nhsca_placers: 0,
              super32_champions: 0,
              super32_placers: 0,
              nchsaa_champions: 0,
              nchsaa_placers: 0,
              dual_meet_champions: 0,
              total_score: 0,
            })
          }

          const stats = schoolStatsMap.get(normalizedName)!
          if (result.place === 1) {
            stats.nchsaa_champions++
          } else {
            stats.nchsaa_placers++ // Count non-champion state placers (placements 2-8)
          }
        })
      }

      // Process dual team champions data (champions only, no runner-up/finalist data)
      if (dualTeamData && Array.isArray(dualTeamData)) {
        dualTeamData.forEach((record) => {
          // Process champion only
          if (record?.champion_school) {
            const championSchool = record.champion_school.trim()
            const normalizedChampion = championSchool.toLowerCase()

            if (!schoolStatsMap.has(normalizedChampion)) {
              schoolStatsMap.set(normalizedChampion, {
                school: championSchool,
                nhsca_champions: 0,
                nhsca_placers: 0,
                super32_champions: 0,
                super32_placers: 0,
                nchsaa_champions: 0,
                nchsaa_placers: 0,
                dual_meet_champions: 0,
                total_score: 0,
              })
            }

            const championStats = schoolStatsMap.get(normalizedChampion)!
            championStats.dual_meet_champions++
          }
        })
      }

      const schoolStats: SchoolStats[] = []
      schoolStatsMap.forEach((stats) => {
        // Calculate total score using NC Wrestling Excellence Index:
        // 5 points for national champ (NHSCA + Super32)
        // 4 points for national AA (NHSCA + Super32, non-champions only)
        // 3 points for individual state champ
        // 2 points for dual meet state champ
        // 1 point for state placer (non-champions)
        stats.total_score =
          (stats.nhsca_champions + stats.super32_champions) * 5 +
          (stats.nhsca_placers + stats.super32_placers) * 4 +
          stats.nchsaa_champions * 3 +
          stats.nchsaa_placers * 1 +
          stats.dual_meet_champions * 2

        if (stats.total_score > 0) {
          schoolStats.push(stats)
        }
      })

      const top25 = schoolStats.sort((a, b) => b.total_score - a.total_score).slice(0, 25)

      console.log(
        "[v0] Top 5 schools:",
        top25.slice(0, 5).map((s) => ({
          school: s.school,
          nhsca_champs: s.nhsca_champions,
          nhsca_placers: s.nhsca_placers,
          super32_champs: s.super32_champions,
          super32_placers: s.super32_placers,
          nchsaa_champs: s.nchsaa_champions,
          nchsaa_placers: s.nchsaa_placers,
        })),
      )

      // Debug: Check specific schools
      const riverside = Array.from(schoolStatsMap.entries()).find(([k]) => k.includes("riverside"))
      const wheatmore = Array.from(schoolStatsMap.entries()).find(([k]) => k.includes("wheatmore"))
      console.log("[v0] Riverside data:", riverside)
      console.log("[v0] Wheatmore data:", wheatmore)

      console.log("[v0] Leaderboard processed:", top25.length, "schools from", schoolStats.length, "total")
      setLeaderboard(top25)
    } catch (err) {
      console.error("Leaderboard Error:", err)
      setError("Failed to load leaderboard")
    } finally {
      setLeaderboardLoading(false)
    }
  }

  const searchSchool = async (schoolName: string) => {
    if (!schoolName.trim()) {
      setSelectedSchool(null)
      return
    }

    setLoading(true) // Use the declared loading state
    setError(null)

    try {
      // Normalize user input and create search patterns
      // This handles: case variations, "High School" variations, apostrophes, etc.
      const normalizedInput = normalizeSchoolNameForSearch(schoolName)
      const searchPatterns = createSchoolSearchPatterns(schoolName)
      
      // Also try to get canonical name from database for exact matching
      let canonicalName: string | null = null
      try {
        const { data: canonical } = await supabase.rpc('normalize_school_name', {
          input_name: schoolName.trim()
        })
        if (canonical) {
          canonicalName = canonical
          // Add canonical name to search patterns
          if (!searchPatterns.includes(`%${canonical}%`)) {
            searchPatterns.push(`%${canonical}%`)
          }
        }
      } catch (rpcError) {
        // RPC might not be available, continue with client-side normalization
        console.warn('[School Search] RPC normalization failed, using client-side:', rpcError)
      }
      console.log("[v0] Searching for school:", schoolName)
      console.log("[v0] Search patterns:", searchPatterns)

      let nhscaQuery = supabase
        .from("wrestling_nhsca_results")
        .select("*")
        .gt("placement", 0)
        .order("year", { ascending: false })

      if (searchPatterns.length === 1) {
        nhscaQuery = nhscaQuery.ilike("high_school", searchPatterns[0])
      } else {
        nhscaQuery = nhscaQuery.or(searchPatterns.map((pattern) => `high_school.ilike.${pattern}`).join(","))
      }

      const { data: nhscaData, error: nhscaError } = await nhscaQuery

      if (nhscaError) throw nhscaError

      let nchsaaQuery = supabase
        .from("wrestling_nchsaa_results")
        .select("*")
        .gt("place", 0)
        .order("year", { ascending: false })

      if (searchPatterns.length === 1) {
        nchsaaQuery = nchsaaQuery.ilike("school", searchPatterns[0])
      } else {
        nchsaaQuery = nchsaaQuery.or(searchPatterns.map((pattern) => `school.ilike.${pattern}`).join(","))
      }

      const { data: nchsaaData, error: nchsaaError } = await nchsaaQuery

      if (nchsaaError) throw nchsaaError

      console.log("[v0] Starting commits query for:", schoolName)

      let commitsQuery = supabase
        .from("athletes")
        .select("*")
        .or("recruiting_status.eq.Committed,recruiting_status.eq.College Athlete")
        .order("graduationyear", { ascending: false })

      if (searchPatterns.length === 1) {
        commitsQuery = commitsQuery.ilike("highschool", searchPatterns[0])
      } else {
        commitsQuery = commitsQuery.or(searchPatterns.map((pattern) => `highschool.ilike.${pattern}`).join(","))
      }

      const { data: commitsData, error: commitsError } = await commitsQuery

      let mostOutstandingQuery = supabase
        .from("most_outstanding_wrestlers")
        .select("*")
        .order("year", { ascending: false })

      if (searchPatterns.length === 1) {
        mostOutstandingQuery = mostOutstandingQuery.ilike("school", searchPatterns[0])
      } else {
        mostOutstandingQuery = mostOutstandingQuery.or(
          searchPatterns.map((pattern) => `school.ilike.${pattern}`).join(","),
        )
      }

      const { data: mostOutstandingData, error: mostOutstandingError } = await mostOutstandingQuery

      console.log("[v0] Commits query completed")
      console.log("[v0] Commits error:", commitsError)
      console.log("[v0] Commits data length:", commitsData?.length)
      console.log("[v0] Most Outstanding data length:", mostOutstandingData?.length)

      if (commitsError) {
        console.error("[v0] Commits query error:", commitsError)
        throw commitsError
      }

      if (mostOutstandingError) {
        console.error("[v0] Most Outstanding query error:", mostOutstandingError)
        throw mostOutstandingError
      }

      console.log("[v0] Search results for", schoolName)
      console.log("[v0] NHSCA results:", nhscaData?.length, "records")
      console.log("[v0] NCHSAA results:", nchsaaData?.length, "records")
      console.log("[v0] Commits results:", commitsData?.length, "records")
      console.log("[v0] Most Outstanding results:", mostOutstandingData?.length, "records")

      if (schoolName.toLowerCase().includes("cardinal gibbons")) {
        console.log("[v0] Cardinal Gibbons commits data:", commitsData)
        console.log("[v0] Looking for Liam Hickey and John Henry...")

        const { data: liamCheck } = await supabase
          .from("wrestling_commits")
          .select("*")
          .ilike("athlete_name", "%liam hickey%")

        const { data: johnCheck } = await supabase
          .from("wrestling_commits")
          .select("*")
          .ilike("athlete_name", "%john henry%")

        console.log("[v0] Liam Hickey found anywhere:", liamCheck)
        console.log("[v0] John Henry found anywhere:", johnCheck)
      }

      setSchoolDetails({
        nhsca: nhscaData || [],
        nchsaa: nchsaaData || [],
        commits: commitsData || [],
        mostOutstanding: mostOutstandingData || [],
      })
      setSelectedSchool(schoolName)
    } catch (err) {
      console.error("[v0] Search error:", err)
      setError(err instanceof Error ? err.message : "Failed to search school")
    } finally {
      setLoading(false) // Use the declared loading state
    }
  }

  const getMOWBadge = (athleteName: string, year: number) => {
    const mowAward = schoolDetails.mostOutstanding.find(
      (award) =>
        award.name.toLowerCase().includes(athleteName.toLowerCase().split(" ")[0]) &&
        award.name.toLowerCase().includes(athleteName.toLowerCase().split(" ").slice(-1)[0]) &&
        award.year === year,
    )

    if (mowAward) {
      return (
        <Badge className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs ml-2">
          <Star className="w-3 h-3 mr-1" />
          MOW {mowAward.year}
        </Badge>
      )
    }
    return null
  }

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchSchool(searchQuery)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const getPlacementBadge = (place: number) => {
    if (place === 1) return <Badge className="bg-[#CBAF5D] text-[#003366]">1st</Badge>
    if (place === 2) return <Badge className="bg-[#6b7280] text-white">2nd</Badge>
    if (place === 3) return <Badge className="bg-[#B31B1B] text-white">3rd</Badge>
    if (place <= 8) return <Badge className="bg-[#003366] text-white">{place}th</Badge>
    return (
      <Badge variant="outline" className="border-[#003366] text-[#003366]">
        {place}th
      </Badge>
    )
  }

  const loadDualTeamChampions = async () => {
    if (dualTeamLoading) return // Prevent multiple simultaneous loads

    setDualTeamLoading(true)
    try {
      console.log("[v0] Loading dual team champions from database...")

      const { data, error } = await supabase.from("dual_team_champions").select("*").order("year", { ascending: false })

      if (error) throw error

      console.log("[v0] Dual team champions raw data:", data?.length, "records")
      console.log("[v0] Sample dual team records:", data?.slice(0, 5))

      const championshipMap = new Map<string, DualTeamLeaderboard>()

      if (data && Array.isArray(data)) {
        data.forEach((champion) => {
          if (champion.is_vacated || !champion?.champion_school) return // Skip vacated or invalid championships

          const schoolName = champion.champion_school.trim()
          
          // Skip placeholder entries like "No Dual Tournament"
          if (schoolName.toLowerCase().includes("no dual tournament") || 
              schoolName.toLowerCase().includes("no tournament") ||
              schoolName.toLowerCase() === "none" ||
              schoolName.toLowerCase() === "n/a") {
            return
          }

          if (!championshipMap.has(schoolName)) {
            championshipMap.set(schoolName, {
              school: schoolName,
              total_championships: 0,
              divisions: {},
              years: [],
              most_recent_year: 0,
            })
          }

          const stats = championshipMap.get(schoolName)!
          stats.total_championships++
          if (champion.year) stats.years.push(champion.year)
          if (champion.year) stats.most_recent_year = Math.max(stats.most_recent_year, champion.year)

          // Track division championships
          if (champion.division) {
            stats.divisions[champion.division] = (stats.divisions[champion.division] || 0) + 1
          }
        })
      }

      // Convert to array and sort by total championships, then by most recent
      const leaderboard = Array.from(championshipMap.values()).sort((a, b) => {
        if (b.total_championships !== a.total_championships) {
          return b.total_championships - a.total_championships
        }
        return b.most_recent_year - a.most_recent_year
      })

      console.log("[v0] Dual team leaderboard processed:", leaderboard.length, "schools")
      console.log("[v0] Top 5 dual team champions:", leaderboard.slice(0, 5))

      const parklandStats = leaderboard.find((school) => school.school.toLowerCase().includes("parkland"))
      if (parklandStats) {
        console.log(
          "[v0] Parkland dual team championships:",
          parklandStats.total_championships,
          "- Should be 10 according to analysis",
        )
      } else {
        console.log("[v0] Parkland not found in dual team leaderboard - checking raw data...")
        const parklandRaw = data?.filter((record) => record.champion_school.toLowerCase().includes("parkland"))
        console.log("[v0] Parkland raw records:", parklandRaw?.length, parklandRaw)
      }

      setDualTeamChampions(data || [])
      setDualTeamLeaderboard(leaderboard)
    } catch (err) {
      console.error("Dual Team Champions Error:", err)
      setError("Failed to load dual team champions")
    } finally {
      setDualTeamLoading(false)
    }
  }

  const filterTopSchoolsByDivision = async (division: string) => {
    if (division === "all") {
      setFilteredLeaderboard(leaderboard)
      return
    }

    try {
      // Get schools that have athletes in the selected division
      const { data: nchsaaData, error: nchsaaError } = await supabase
        .from("wrestling_nchsaa_results")
        .select("school, place, wrestler_name, year, classification")
        .not("school", "is", null)
        .not("school", "eq", "")
        .eq("classification", division)
        .gte("place", 1)
        .lte("place", 8)

      if (nchsaaError) throw nchsaaError

      const schoolsInDivision = new Set(nchsaaData?.map((r) => r.school.trim().toLowerCase()) || [])

      const filtered = leaderboard.filter((school) => schoolsInDivision.has(school.school.toLowerCase()))

      setFilteredLeaderboard(filtered)
    } catch (err) {
      console.error("Division filtering error:", err)
      setFilteredLeaderboard(leaderboard)
    }
  }

  const filterTournamentByDivision = (division: string) => {
    if (division === "all") {
      setFilteredTournamentLeaderboard(tournamentLeaderboard)
      return
    }

    const filtered = tournamentLeaderboard.filter((school) => {
      // For 1A and 2A, include both individual and combined 1A/2A championships
      if (division === "1A") {
        return (
          (school.divisions["1A"] && school.divisions["1A"] > 0) ||
          (school.divisions["1A/2A"] && school.divisions["1A/2A"] > 0)
        )
      }
      if (division === "2A") {
        return (
          (school.divisions["2A"] && school.divisions["2A"] > 0) ||
          (school.divisions["1A/2A"] && school.divisions["1A/2A"] > 0)
        )
      }
      // For other divisions, use exact match
      return school.divisions[division] && school.divisions[division] > 0
    })

    setFilteredTournamentLeaderboard(filtered)
  }

  const filterDualTeamByDivision = (division: string) => {
    if (division === "all") {
      setFilteredDualTeamLeaderboard(dualTeamLeaderboard)
      return
    }

    const filtered = dualTeamLeaderboard.filter((school) => {
      // For 1A and 2A, include both individual and combined 1A/2A championships
      if (division === "1A") {
        return (
          (school.divisions["1A"] && school.divisions["1A"] > 0) ||
          (school.divisions["1A/2A"] && school.divisions["1A/2A"] > 0)
        )
      }
      if (division === "2A") {
        return (
          (school.divisions["2A"] && school.divisions["2A"] > 0) ||
          (school.divisions["1A/2A"] && school.divisions["1A/2A"] > 0)
        )
      }
      // For other divisions, use exact match
      return school.divisions[division] && school.divisions[division] > 0
    })

    setFilteredDualTeamLeaderboard(filtered)
  }

  useEffect(() => {
    filterTopSchoolsByDivision(selectedTopSchoolsDivision)
  }, [leaderboard, selectedTopSchoolsDivision])

  useEffect(() => {
    filterTournamentByDivision(selectedTournamentDivision)
  }, [tournamentLeaderboard, selectedTournamentDivision])

  useEffect(() => {
    filterDualTeamByDivision(selectedDualTeamDivision)
  }, [dualTeamLeaderboard, selectedDualTeamDivision])

  useEffect(() => {
    loadLeaderboard()
    loadTournamentChampions()
    loadDualTeamChampions()
  }, [])

  return (
    <div className="min-h-screen bg-white">
        <div className="bg-[#003366] text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <Image
                src="/images/nc-united-logo.png"
                alt="NC Wrestling United"
                width={100}
                height={100}
                className="object-contain"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">SCHOOL PROGRAMS</h1>
            <p className="text-xl text-white/80 mb-8">
              Comprehensive wrestling program rankings and championship history for North Carolina high schools
            </p>

            <div className="grid md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-2xl font-bold text-[#CBAF5D]">500+</div>
                <div className="text-sm text-white/80">Schools Tracked</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-2xl font-bold text-[#CBAF5D]">95+</div>
                <div className="text-sm text-white/80">Years of History</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-2xl font-bold text-[#CBAF5D]">1,200+</div>
                <div className="text-sm text-white/80">Team Championships</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-2xl font-bold text-[#CBAF5D]">8,000+</div>
                <div className="text-sm text-white/80">Individual Titles</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4 sm:p-6 space-y-6 pb-8">
        {/* Main Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-[#003366]/20 p-1">
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 sm:gap-2">
            <button
              onClick={() => handleTabSwitch("search")}
              className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-3 sm:py-4 rounded-lg text-xs sm:text-sm font-medium transition-all min-h-[44px] ${
                activeTab === "search"
                  ? "bg-[#003366] text-white shadow-sm"
                  : "text-[#003366] hover:text-[#003366] hover:bg-[#003366]/10"
              }`}
            >
              <Search className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Search Programs</span>
            </button>
            <button
              onClick={() => handleTabSwitch("best")}
              className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-3 sm:py-4 rounded-lg text-xs sm:text-sm font-medium transition-all min-h-[44px] ${
                activeTab === "best"
                  ? "bg-[#003366] text-white shadow-sm"
                  : "text-[#003366] hover:text-[#003366] hover:bg-[#003366]/10"
              }`}
            >
              <Trophy className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Best of All-Time</span>
            </button>
            <button
              onClick={() => handleTabSwitch("tournament")}
              className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-3 sm:py-4 rounded-lg text-xs sm:text-sm font-medium transition-all min-h-[44px] ${
                activeTab === "tournament"
                  ? "bg-[#003366] text-white shadow-sm"
                  : "text-[#003366] hover:text-[#003366] hover:bg-[#003366]/10"
              }`}
            >
              <Crown className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Tournament Champions</span>
            </button>
            <button
              onClick={() => handleTabSwitch("dual")}
              className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-3 sm:py-4 rounded-lg text-xs sm:text-sm font-medium transition-all min-h-[44px] ${
                activeTab === "dual"
                  ? "bg-[#003366] text-white shadow-sm"
                  : "text-[#003366] hover:text-[#003366] hover:bg-[#003366]/10"
              }`}
            >
              <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Dual Team Champions</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-[#B31B1B]/10 border-2 border-[#B31B1B] rounded-xl p-4 text-[#B31B1B] text-center">
            {error}
          </div>
        )}

        {activeTab === "search" && (
          <Card className="border-2 border-[#003366]/20 rounded-2xl shadow-lg overflow-hidden">
            <CardHeader className="bg-[#003366] text-white rounded-t-2xl">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <School className="h-5 w-5 sm:h-6 sm:w-6" />
                Search High School Programs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 bg-white">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Search for a specific high school..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 h-12 rounded-xl border-2 border-[#003366]/20 bg-white px-4 text-[#003366] placeholder:text-[#003366]/50 focus:border-[#003366] focus:ring-[#003366]"
                />
                <Button
                  onClick={handleSearch}
                  disabled={loading}
                  className="h-12 px-6 bg-[#B31B1B] hover:bg-[#003366] text-white rounded-xl font-medium shadow-lg w-full sm:w-auto"
                >
                  {loading ? "Searching..." : "Search"}
                </Button>
              </div>

              {selectedSchool && schoolDetails && (
                <div className="mt-6 mb-8">
                  <Card className="border-2 border-[#003366]/20 rounded-2xl shadow-sm">
                    <CardHeader className="pb-4 bg-[#003366]/5 rounded-t-2xl">
                      <CardTitle className="flex items-center gap-2 text-[#003366]">
                        <School className="h-5 w-5" />
                        {selectedSchool}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <Tabs defaultValue="nchsaa" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-gray-100 rounded-xl p-1">
                          <TabsTrigger
                            value="nhsca"
                            className="rounded-lg data-[state=active]:bg-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-sm font-medium text-sm px-2 py-2"
                          >
                            NHSCA ({schoolDetails.nhsca.length})
                          </TabsTrigger>
                          <TabsTrigger
                            value="nchsaa"
                            className="rounded-lg data-[state=active]:bg-[#B31B1B] data-[state=active]:text-white data-[state=active]:shadow-sm font-medium text-sm px-2 py-2"
                          >
                            NCHSAA ({schoolDetails.nchsaa.length})
                          </TabsTrigger>
                          <TabsTrigger
                            value="commits"
                            className="rounded-lg data-[state=active]:bg-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-sm font-medium text-sm px-2 py-2"
                          >
                            Next Level ({schoolDetails.commits.length})
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="nhsca" className="space-y-4 mt-6">
                          {schoolDetails.nhsca.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">No NHSCA results found</div>
                          ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                              {schoolDetails.nhsca.map((result, index) => (
                                <Card key={index} className="border border-gray-200 rounded-xl">
                                  <CardContent className="pt-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center flex-wrap gap-2">
                                        <h3 className="font-semibold text-gray-900">{result.athlete_name}</h3>
                                        {getMOWBadge(result.athlete_name || "", result.year)}
                                      </div>
                                      {result.placement && getPlacementBadge(result.placement)}
                                    </div>
                                    <div className="text-sm text-gray-600 space-y-1">
                                      <div>
                                        {result.year} • {result.division} •{" "}
                                        {String(result.weight).endsWith("lbs") ? result.weight : `${result.weight}lbs`}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="nchsaa" className="space-y-4 mt-6">
                          {schoolDetails.nchsaa.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">No NCHSAA results found</div>
                          ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                              {schoolDetails.nchsaa.map((result, index) => (
                                <Card key={index} className="border border-gray-200 rounded-xl">
                                  <CardContent className="pt-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center flex-wrap gap-2">
                                        <h3 className="font-semibold text-gray-900">{result.wrestler_name}</h3>
                                        {getMOWBadge(result.wrestler_name || "", result.year)}
                                      </div>
                                      {result.place && getPlacementBadge(result.place)}
                                    </div>
                                    <div className="text-sm text-gray-600 space-y-1">
                                      <div>
                                        {result.year} • {result.classification} •{" "}
                                        {result.weight_class?.endsWith("lbs")
                                          ? result.weight_class
                                          : `${result.weight_class}lbs`}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="commits" className="space-y-4 mt-6">
                          {schoolDetails.commits.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">No college placements found</div>
                          ) : (
                            <div className="space-y-6">
                              {(() => {
                                const currentYear = new Date().getFullYear()
                                const currentCommits = schoolDetails.commits.filter(
                                  (c) => c.recruiting_status === "Committed" && (c.graduationyear ?? 0) >= currentYear,
                                )
                                const collegeAthletes = schoolDetails.commits.filter(
                                  (c) => c.recruiting_status === "College Athlete" || (c.graduationyear != null && c.graduationyear < currentYear),
                                )

                                // Group college athletes by graduation year
                                const athletesByYear = collegeAthletes.reduce(
                                  (acc, athlete) => {
                                    const year = athlete.graduationyear || "Unknown"
                                    if (!acc[year]) acc[year] = []
                                    acc[year].push(athlete)
                                    return acc
                                  },
                                  {} as Record<string | number, typeof collegeAthletes>,
                                )

                                const sortedYears = Object.keys(athletesByYear).sort((a, b) => Number(b) - Number(a))

                                return (
                                  <>
                                    {/* Current Commits Section */}
                                    {currentCommits.length > 0 && (
                                      <div>
                                        <h4 className="text-sm font-semibold text-[#003366] mb-3 flex items-center gap-2">
                                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                          Current Commits ({currentCommits.length})
                                        </h4>
                                        <div className="grid gap-3 md:grid-cols-2">
                                          {currentCommits.map((result, index) => (
                                            <Card
                                              key={index}
                                              className="border border-green-200 bg-green-50/50 rounded-xl"
                                            >
                                              <CardContent className="pt-4 pb-3">
                                                <div className="flex items-center justify-between mb-2">
                                                  <h3 className="font-semibold text-gray-900">{result.name}</h3>
                                                  <Badge className="bg-green-600 text-white text-xs px-2 py-1">
                                                    Class of {result.graduationyear}
                                                  </Badge>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  {result.collegeLogoUrl && (
                                                    <img
                                                      src={result.collegeLogoUrl || "/placeholder.svg"}
                                                      alt={result.college || ""}
                                                      className="w-6 h-6 object-contain"
                                                    />
                                                  )}
                                                  <span className="text-sm font-medium text-gray-700">
                                                    {result.college || "TBD"}
                                                  </span>
                                                </div>
                                                {result.weightclass && (
                                                  <div className="text-xs text-gray-500 mt-1">
                                                    {result.weightclass} lbs
                                                  </div>
                                                )}
                                              </CardContent>
                                            </Card>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* College Athletes Section - Grouped by Year */}
                                    {sortedYears.length > 0 && (
                                      <div>
                                        <h4 className="text-sm font-semibold text-[#003366] mb-3 flex items-center gap-2">
                                          <span className="w-2 h-2 bg-[#003366] rounded-full"></span>
                                          College Athletes ({collegeAthletes.length})
                                        </h4>
                                        <div className="space-y-4">
                                          {sortedYears.map((year) => (
                                            <div key={year}>
                                              <div className="text-xs font-medium text-gray-500 mb-2">
                                                Class of {year}
                                              </div>
                                              <div className="grid gap-3 md:grid-cols-2">
                                                {athletesByYear[year].map((result, index) => (
                                                  <Card key={index} className="border border-gray-200 rounded-xl">
                                                    <CardContent className="pt-4 pb-3">
                                                      <div className="flex items-center justify-between mb-2">
                                                        <h3 className="font-semibold text-gray-900">{result.name}</h3>
                                                        <Badge
                                                          variant="outline"
                                                          className="border-[#003366] text-[#003366] text-xs px-2 py-1"
                                                        >
                                                          '${String(year).slice(-2)}
                                                        </Badge>
                                                      </div>
                                                      <div className="flex items-center gap-2">
                                                        {result.collegeLogoUrl && (
                                                          <img
                                                            src={result.collegeLogoUrl || "/placeholder.svg"}
                                                            alt={result.college || ""}
                                                            className="w-6 h-6 object-contain"
                                                          />
                                                        )}
                                                        <span className="text-sm font-medium text-gray-700">
                                                          {result.college || "Unknown"}
                                                        </span>
                                                      </div>
                                                      {result.weightclass && (
                                                        <div className="text-xs text-gray-500 mt-1">
                                                          {result.weightclass} lbs
                                                        </div>
                                                      )}
                                                    </CardContent>
                                                  </Card>
                                                ))}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )
                              })()}
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700">{error}</div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "best" && (
          <div className="space-y-6 mt-6">
            <div className="bg-[#003366] rounded-2xl p-4 md:p-8 text-white shadow-lg">
              <div className="text-center">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">HIGH SCHOOL WRESTLING EXCELLENCE</h1>
                <p className="text-white/80 mb-4 md:mb-6 text-sm md:text-base">Combined NHSCA National and NCHSAA State Performance Rankings</p>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                  <div className="text-center bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <div className="text-xl font-bold text-[#CBAF5D]">5 pts</div>
                    <div className="text-xs text-white/80">National Champs<br />(NHSCA & S32)</div>
                  </div>
                  <div className="text-center bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <div className="text-xl font-bold text-[#CBAF5D]">4 pts</div>
                    <div className="text-xs text-white/80">National AAs<br />(NHSCA & S32)</div>
                  </div>
                  <div className="text-center bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <div className="text-xl font-bold text-[#CBAF5D]">3 pts</div>
                    <div className="text-xs text-white/80">State Champs<br />(Individual)</div>
                  </div>
                  <div className="text-center bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <div className="text-xl font-bold text-[#CBAF5D]">2 pts</div>
                    <div className="text-xs text-white/80">Dual Meet Champs<br />(State Dual Team)</div>
                  </div>
                  <div className="text-center bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <div className="text-xl font-bold text-[#CBAF5D]">1 pt</div>
                    <div className="text-xs text-white/80">State Placers<br />(Individual 2-8)</div>
                  </div>
                  <div className="text-center bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <div className="text-xl font-bold text-[#CBAF5D]">1 pt</div>
                    <div className="text-xs text-white/80">Dual Finalists<br />(Runner-Up)</div>
                  </div>
                </div>

                <div className="flex justify-center gap-4">
                  <Badge className="bg-[#B31B1B] hover:bg-[#B31B1B] text-white px-4 py-2 text-sm font-medium shadow-lg">
                    {leaderboard.length} Total Schools
                  </Badge>
                  <Badge className="bg-[#CBAF5D] hover:bg-[#CBAF5D] text-[#003366] px-4 py-2 text-sm font-medium shadow-lg">
                    All-Time Rankings
                  </Badge>
                </div>
              </div>
            </div>

            <Card className="border-2 border-[#003366]/20 rounded-2xl shadow-lg overflow-hidden">
              <CardHeader className="pb-4 bg-[#003366]/5 rounded-t-2xl border-b-2 border-[#003366]/20">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-2 text-[#003366]">
                    <Filter className="h-5 w-5" />
                    Filter by Division
                  </CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="points-toggle" className="text-sm text-[#003366] cursor-pointer">
                        Show Points
                      </Label>
                      <Switch
                        id="points-toggle"
                        checked={showPoints}
                        onCheckedChange={setShowPoints}
                        className="data-[state=checked]:bg-[#003366]"
                      />
                    </div>
                    <Select value={selectedTopSchoolsDivision} onValueChange={setSelectedTopSchoolsDivision}>
                      <SelectTrigger className="w-48 border-2 border-[#003366]/20 focus:border-[#003366]">
                        <SelectValue placeholder="Select division" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Divisions</SelectItem>
                        <SelectItem value="1A">1A</SelectItem>
                        <SelectItem value="2A">2A</SelectItem>
                        <SelectItem value="3A">3A</SelectItem>
                        <SelectItem value="4A">4A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {leaderboardLoading ? (
                  <div className="text-center py-12 text-[#003366]/60">
                    <TrendingUp className="h-8 w-8 mx-auto mb-4 text-[#003366]/40" />
                    Loading leaderboard...
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#003366] hover:bg-[#003366] border-0">
                          <TableHead className="text-white font-semibold py-4 text-left whitespace-nowrap">
                            Rank
                          </TableHead>
                          <TableHead className="text-white font-semibold text-left whitespace-nowrap">School</TableHead>
                          <TableHead className="text-white font-semibold text-center whitespace-nowrap">
                            NHSCA Champ{showPoints ? " (5pts)" : ""}
                          </TableHead>
                          <TableHead className="text-white font-semibold text-center whitespace-nowrap">
                            NHSCA AA{showPoints ? " (4pts)" : ""}
                          </TableHead>
                          <TableHead className="text-white font-semibold text-center whitespace-nowrap">
                            S32 Champ{showPoints ? " (5pts)" : ""}
                          </TableHead>
                          <TableHead className="text-white font-semibold text-center whitespace-nowrap">
                            S32 AA{showPoints ? " (4pts)" : ""}
                          </TableHead>
                          <TableHead className="text-white font-semibold text-center whitespace-nowrap">
                            State Champs{showPoints ? " (3pts)" : ""}
                          </TableHead>
                          <TableHead className="text-white font-semibold text-center whitespace-nowrap text-xs">
                            State Placers{showPoints ? " (1pt)" : ""}
                          </TableHead>
                          <TableHead className="text-white font-semibold text-center whitespace-nowrap text-xs">
                            Dual Champs{showPoints ? " (2pts)" : ""}
                          </TableHead>
                          <TableHead className="text-white font-semibold text-center whitespace-nowrap">
                            Total Score
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLeaderboard.map((school, index) => (
                          <TableRow
                            key={school.school}
                            className={`border-b hover:bg-[#003366]/5 transition-colors ${
                              index % 2 === 0 ? "bg-white" : "bg-[#003366]/5"
                            }`}
                          >
                            <TableCell className="font-bold text-[#003366] py-4">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#CBAF5D] text-[#003366] text-sm font-bold">
                                {index + 1}
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold text-[#003366] py-4 text-sm">
                              <a
                                href={`/schools?q=${encodeURIComponent(school.school)}`}
                                className="hover:underline hover:text-[#B31B1B] transition-colors cursor-pointer"
                                onClick={(e) => {
                                  e.preventDefault()
                                  setSearchQuery(school.school)
                                  handleSearch()
                                  setActiveTab("search")
                                  setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100)
                                }}
                              >
                                {school.school}
                              </a>
                            </TableCell>
                            <TableCell className="text-center py-4">
                              <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#B31B1B] text-white text-xs font-bold">
                                {showPoints ? school.nhsca_champions * 5 : school.nhsca_champions}
                              </div>
                            </TableCell>
                            <TableCell className="text-center py-4">
                              <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-500 text-white text-xs font-bold">
                                {showPoints ? school.nhsca_placers * 4 : school.nhsca_placers}
                              </div>
                            </TableCell>
                            <TableCell className="text-center py-4">
                              <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-600 text-white text-xs font-bold">
                                {showPoints ? school.super32_champions * 5 : school.super32_champions}
                              </div>
                            </TableCell>
                            <TableCell className="text-center py-4">
                              <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-bold">
                                {showPoints ? school.super32_placers * 4 : school.super32_placers}
                              </div>
                            </TableCell>
                            <TableCell className="text-center py-4">
                              <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#003366] text-white text-xs font-bold">
                                {showPoints ? school.nchsaa_champions * 3 : school.nchsaa_champions}
                              </div>
                            </TableCell>
                            <TableCell className="text-center py-4">
                              <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#CBAF5D] text-[#003366] text-xs font-bold">
                                {showPoints ? school.nchsaa_placers * 1 : school.nchsaa_placers}
                              </div>
                            </TableCell>
                            <TableCell className="text-center py-4">
                              <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-600 text-white text-xs font-bold">
                                {showPoints ? school.dual_meet_champions * 2 : school.dual_meet_champions}
                              </div>
                            </TableCell>
                            <TableCell className="text-center py-4">
                              <div className="inline-flex items-center justify-center w-12 h-8 rounded-full bg-[#003366] text-white text-sm font-bold">
                                {school.total_score}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "tournament" && (
          <div className="space-y-6 mt-6">
            <div className="bg-[#CBAF5D] rounded-2xl p-4 md:p-8 text-[#003366] shadow-lg">
              <div className="text-center">
                <h1 className="text-3xl font-bold mb-2">NCHSAA STATE TOURNAMENT CHAMPIONS</h1>
                <p className="text-[#003366]/80 mb-6">
                  Team Championship Leaderboard - Individual Wrestling Tournament (1931-2025)
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center bg-[#003366]/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="text-2xl font-bold text-[#B31B1B]">95 Years</div>
                    <div className="text-sm text-[#003366]/80">Tournament History</div>
                  </div>
                  <div className="text-center bg-[#003366]/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="text-2xl font-bold text-[#B31B1B]">{tournamentLeaderboard.length}</div>
                    <div className="text-sm text-[#003366]/80">Championship Schools</div>
                  </div>
                  <div className="text-center bg-[#003366]/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="text-2xl font-bold text-[#B31B1B]">{tournamentChampions.length}</div>
                    <div className="text-sm text-[#003366]/80">Total Championships</div>
                  </div>
                </div>

                <div className="flex justify-center gap-4">
                  <Badge className="bg-[#B31B1B] hover:bg-[#B31B1B] text-white px-4 py-2 text-sm font-medium shadow-lg">
                    NCHSAA Official
                  </Badge>
                  <Badge className="bg-[#003366] hover:bg-[#003366] text-white px-4 py-2 text-sm font-medium shadow-lg">
                    Team Champions
                  </Badge>
                </div>
              </div>
            </div>

            <Card className="border border-[#003366]/20 rounded-2xl shadow-sm overflow-hidden">
              <CardHeader className="pb-4 bg-[#003366]/5 rounded-t-2xl border-b border-[#003366]/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-[#003366]">
                    <Filter className="h-5 w-5" />
                    {tournamentViewType === "leaderboard" ? "Filter by Division" : "View Options"}
                  </CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-[#003366]/20">
                      <button
                        onClick={() => setTournamentViewType("leaderboard")}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          tournamentViewType === "leaderboard"
                            ? "bg-[#CBAF5D] text-[#003366]"
                            : "text-[#003366] hover:bg-[#003366]/10"
                        }`}
                      >
                        Leaderboard
                      </button>
                      <button
                        onClick={() => setTournamentViewType("by-year")}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          tournamentViewType === "by-year"
                            ? "bg-[#CBAF5D] text-[#003366]"
                            : "text-[#003366] hover:bg-[#003366]/10"
                        }`}
                      >
                        By Year
                      </button>
                    </div>
                    {tournamentViewType === "leaderboard" && (
                      <Select value={selectedTournamentDivision} onValueChange={setSelectedTournamentDivision}>
                        <SelectTrigger className="w-48 border-[#003366]/20 focus:border-[#003366]">
                          <SelectValue placeholder="Select division" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Divisions</SelectItem>
                          <SelectItem value="Single">Single Division (1931-1986)</SelectItem>
                          <SelectItem value="1A">1A</SelectItem>
                          <SelectItem value="2A">2A</SelectItem>
                          <SelectItem value="3A">3A</SelectItem>
                          <SelectItem value="4A">4A</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {tournamentLoading ? (
                  <div className="text-center py-12 text-gray-500">
                    <Crown className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                    Loading tournament champions...
                  </div>
                ) : tournamentViewType === "leaderboard" ? (
                  <div className="overflow-hidden rounded-2xl">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#CBAF5D] hover:bg-[#CBAF5D] border-0">
                          <TableHead className="text-[#003366] font-semibold py-4 text-left">Rank</TableHead>
                          <TableHead className="text-[#003366] font-semibold text-left">School</TableHead>
                          <TableHead className="text-[#003366] font-semibold text-center">
                            Total Championships
                          </TableHead>
                          <TableHead className="text-[#003366] font-semibold text-center">Divisions</TableHead>
                          <TableHead className="text-[#003366] font-semibold text-center">Most Recent</TableHead>
                          <TableHead className="text-[#003366] font-semibold text-left">Championship Years</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTournamentLeaderboard.map((school, index) => (
                          <TableRow key={school.school} className="hover:bg-[#003366]/10 border-b border-gray-100">
                            <TableCell className="py-4">
                              <div className="flex items-center gap-2">
                                {index === 0 && <Crown className="h-4 w-4 text-[#CBAF5D]" />}
                                {index === 1 && <Crown className="h-4 w-4 text-gray-400" />}
                                {index === 2 && <Crown className="h-4 w-4 text-orange-500" />}
                                <span className="font-semibold text-gray-900">#{index + 1}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium text-blue-600">{school.school}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#CBAF5D] text-[#003366] text-lg font-bold">
                                {school.total_championships}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-wrap gap-1 justify-center">
                                {Object.entries(school.divisions).map(([division, count]) => (
                                  <Badge
                                    key={division}
                                    variant="outline"
                                    className="border-[#CBAF5D] text-[#CBAF5D] bg-[#003366]/5 text-xs"
                                  >
                                    {division}: {count}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-medium text-gray-900">
                              {school.most_recent_year}
                            </TableCell>
                            <TableCell className="text-gray-600 text-sm">
                              {school.years
                                .sort((a, b) => b - a)
                                .slice(0, 5)
                                .join(", ")}
                              {school.years.length > 5 && ` (+${school.years.length - 5} more)`}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#CBAF5D] hover:bg-[#CBAF5D] border-0">
                          <TableHead className="text-[#003366] font-semibold py-4 text-center">Year</TableHead>
                          <TableHead className="text-[#003366] font-semibold text-left">School</TableHead>
                          <TableHead className="text-[#003366] font-semibold text-center">Division</TableHead>
                          <TableHead className="text-[#003366] font-semibold text-left">Tournament Site</TableHead>
                          <TableHead className="text-[#003366] font-semibold text-left">Coach</TableHead>
                          <TableHead className="text-[#003366] font-semibold text-center">Points</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tournamentChampions.map((champion, index) => (
                          <TableRow key={champion.id} className="hover:bg-gray-50 border-b border-gray-100">
                            <TableCell className="text-center font-bold text-[#CBAF5D]">{champion.year}</TableCell>
                            <TableCell className="font-medium text-gray-900">
                              {champion.champion_school}
                              {champion.is_co_champion && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Co-Champion
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="text-xs">
                                {champion.division || "Single"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-600 text-sm">{champion.tournament_site || "—"}</TableCell>
                            <TableCell className="text-gray-600 text-sm">{champion.coach_name || "—"}</TableCell>
                            <TableCell className="text-center text-gray-600">{champion.points || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "dual" && (
          <div className="space-y-6 mt-6">
            <div className="bg-[#B31B1B] rounded-2xl p-4 md:p-8 text-white shadow-lg">
              <div className="text-center">
                <h1 className="text-3xl font-bold mb-2">NCHSAA STATE DUAL TEAM CHAMPIONS</h1>
                <p className="text-white/80 mb-6">
                  Team Championship Leaderboard - Dual Team Wrestling Tournament (1990-2025)
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="text-2xl font-bold text-[#CBAF5D]">36 Years</div>
                    <div className="text-sm text-white/80">Tournament History</div>
                  </div>
                  <div className="text-center bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="text-2xl font-bold text-[#CBAF5D]">{dualTeamLeaderboard.length}</div>
                    <div className="text-sm text-white/80">Championship Schools</div>
                  </div>
                  <div className="text-center bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="text-2xl font-bold text-[#CBAF5D]">
                      {dualTeamChampions.filter((c) => !c.is_vacated).length}
                    </div>
                    <div className="text-sm text-white/80">Total Championships</div>
                  </div>
                </div>

                <div className="flex justify-center gap-4">
                  <Badge className="bg-[#003366] hover:bg-[#003366] text-white px-4 py-2 text-sm font-medium shadow-lg">
                    NCHSAA Official
                  </Badge>
                  <Badge className="bg-[#CBAF5D] hover:bg-[#CBAF5D] text-[#003366] px-4 py-2 text-sm font-medium shadow-lg">
                    Dual Team Champions
                  </Badge>
                </div>
              </div>
            </div>

            <Card className="border border-[#003366]/20 rounded-2xl shadow-sm overflow-hidden">
              <CardHeader className="pb-4 bg-[#003366]/5 rounded-t-2xl border-b border-[#003366]/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-[#003366]">
                    <Filter className="h-5 w-5" />
                    {dualTeamViewType === "leaderboard" ? "Filter by Division" : "View Options"}
                  </CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-[#003366]/20">
                      <button
                        onClick={() => setDualTeamViewType("leaderboard")}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          dualTeamViewType === "leaderboard"
                            ? "bg-[#B31B1B] text-white"
                            : "text-[#003366] hover:text-[#003366] hover:bg-[#003366]/10"
                        }`}
                      >
                        Leaderboard
                      </button>
                      <button
                        onClick={() => setDualTeamViewType("by-year")}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          dualTeamViewType === "by-year"
                            ? "bg-[#B31B1B] text-white"
                            : "text-[#003366] hover:text-[#003366] hover:bg-[#003366]/10"
                        }`}
                      >
                        By Year
                      </button>
                    </div>
                    {dualTeamViewType === "leaderboard" && (
                      <Select value={selectedDualTeamDivision} onValueChange={setSelectedDualTeamDivision}>
                        <SelectTrigger className="w-48 border-2 border-[#003366]/20 focus:border-[#003366]">
                          <SelectValue placeholder="Select division" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Divisions</SelectItem>
                          <SelectItem value="1A">1A</SelectItem>
                          <SelectItem value="2A">2A</SelectItem>
                          <SelectItem value="3A">3A</SelectItem>
                          <SelectItem value="4A">4A</SelectItem>
                          <SelectItem value="1A/2A">1A/2A Combined (1990-2001)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {dualTeamLoading ? (
                  <div className="text-center py-12 text-gray-500">
                    <Award className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                    Loading dual team champions...
                  </div>
                ) : dualTeamViewType === "leaderboard" ? (
                  <div className="overflow-hidden rounded-2xl">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#B31B1B] hover:bg-[#B31B1B] border-0">
                          <TableHead className="text-white font-semibold py-4 text-left">Rank</TableHead>
                          <TableHead className="text-white font-semibold text-left">School</TableHead>
                          <TableHead className="text-white font-semibold text-center">Total Championships</TableHead>
                          <TableHead className="text-white font-semibold text-center">Divisions</TableHead>
                          <TableHead className="text-white font-semibold text-center">Most Recent</TableHead>
                          <TableHead className="text-white font-semibold text-left">Championship Years</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDualTeamLeaderboard.map((school, index) => (
                          <TableRow key={school.school} className="hover:bg-[#003366]/10 border-b border-gray-100">
                            <TableCell className="py-4">
                              <div className="flex items-center gap-2">
                                {index === 0 && <Award className="h-4 w-4 text-[#B31B1B]" />}
                                {index === 1 && <Award className="h-4 w-4 text-gray-400" />}
                                {index === 2 && <Award className="h-4 w-4 text-orange-500" />}
                                <span className="font-semibold text-gray-900">#{index + 1}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium text-blue-600">{school.school}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#B31B1B] text-white text-lg font-bold">
                                {school.total_championships}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-wrap gap-1 justify-center">
                                {Object.entries(school.divisions).map(([division, count]) => (
                                  <Badge
                                    key={division}
                                    variant="outline"
                                    className="border-[#B31B1B] text-[#B31B1B] bg-[#003366]/5 text-xs"
                                  >
                                    {division}: {count}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-medium text-gray-900">
                              {school.most_recent_year}
                            </TableCell>
                            <TableCell className="text-gray-600 text-sm">
                              {school.years
                                .sort((a, b) => b - a)
                                .slice(0, 5)
                                .join(", ")}
                              {school.years.length > 5 && ` (+${school.years.length - 5} more)`}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#B31B1B] hover:bg-[#B31B1B] border-0">
                          <TableHead className="text-white font-semibold py-4 text-center">Year</TableHead>
                          <TableHead className="text-white font-semibold text-left">School</TableHead>
                          <TableHead className="text-white font-semibold text-center">Division</TableHead>
                          <TableHead className="text-white font-semibold text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dualTeamChampions.map((champion, index) => (
                          <TableRow key={champion.id} className="hover:bg-gray-50 border-b border-gray-100">
                            <TableCell className="text-center font-bold text-[#B31B1B]">{champion.year}</TableCell>
                            <TableCell className="font-medium text-gray-900">{champion.champion_school}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="text-xs">
                                {champion.division}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {champion.is_vacated ? (
                                <Badge variant="destructive" className="text-xs">
                                  Vacated
                                </Badge>
                              ) : (
                                <Badge variant="default" className="text-xs bg-[#B31B1B]">
                                  Champion
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
