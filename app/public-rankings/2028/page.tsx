"use client"

import { useEffect, useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import { ViewToggle } from "@/components/view-toggle"
import { RankingsTableView } from "@/components/rankings-table-view"
import { RankingsCardView } from "@/components/rankings-card-view"
import { Search, Filter, ArrowLeft, Trophy, Users, Clock } from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"

interface PublicRanking {
  id: string
  name: string
  highschool: string
  weight_display: string
  state_championship_summary: string
  nhsca_record_display: string
  super_32_record_display: string
  has_ranked_win: boolean
  academic_gpa: number
  graduationyear: number
  gender: string
  photourl?: string
  prospect_ranking?: number
  recruiting_status?: string
  college?: string
}

// Top 20 data for Class of 2028
const top20Data = [
  { rank: 1, name: "Aaron Ellison", school: "Lumberton", weight: "150 lbs", achievements: "NHSCA 4th (2024) + Fargo AA • State 4th (2025) • Super32 2-2 (2025) • 45-0 perfect record" },
  { rank: 2, name: "Connor Reece", school: "Northwest Guilford", weight: "144 lbs", achievements: "NHSCA 7th AA (2025) • State 4th (2025) • Super32 2-2 (2025) • 36-3 record" },
  { rank: 3, name: "Ryan Thompson", school: "Cardinal Gibbons", weight: "165 lbs", achievements: "NHSCA 6th AA (2025) • State 5th (2025) • 44-3 record • Beat #29 in 2027" },
  { rank: 4, name: "Hayden Smith", school: "White Oak", weight: "150 lbs", achievements: "State 2nd (2025) • NHSCA 0-2 (2025) • Super32 0-2 (2024) • 41-2, 82.5% pin rate" },
  { rank: 5, name: "Jacob Perry", school: "New Bern", weight: "150 lbs", achievements: "NHSCA 8th AA (2025) • State: Injured • Super32 0-2 (2025) • 52-3 record" },
  { rank: 6, name: "Mitchell Rowland", school: "Pinecrest", weight: "144 lbs", achievements: "NHSCA 8th AA (2025) • State Qualifier • 29-3 record" },
  { rank: 7, name: "Luke Richards", school: "Cardinal Gibbons", weight: "120 lbs", achievements: "Journeymen Finalist (2nd) • State 5th (2025) • NHSCA 1-2 (2025) • 35-2 record" },
  { rank: 8, name: "Jake Amiott", school: "Topsail", weight: "138 lbs", achievements: "State 5th (2025) • Super32 1-2 (2025) • 37-1 record" },
  { rank: 9, name: "Jackson D'Ettore", school: "Charlotte Catholic", weight: "126 lbs", achievements: "State 2nd (2025) • 34-2 record" },
  { rank: 10, name: "Drew Teeter", school: "Mooresville", weight: "190 lbs", achievements: "State 6th (2025) • NHSCA 2-2 (2025) • 33-4 record • Beat #9 in 2027" },
  { rank: 11, name: "Aaron Ruiz-Angel", school: "Mount Airy", weight: "215 lbs", achievements: "NHSCA 5th AA (2025) • State 2nd (2025) • 39-3 record" },
  { rank: 12, name: "Stephen Cross", school: "Trinity", weight: "120 lbs", achievements: "State 5th (2025) • 49-1 record (most wins) • 67.35% pin rate" },
  { rank: 13, name: "Adrian Feliciano", school: "William Amos Hough", weight: "120 lbs", achievements: "State 4th (2025) • Super32 0-2 (2024, 2025) • 36-3, 69.44% pin rate" },
  { rank: 14, name: "Christian Riddick", school: "First Flight", weight: "132 lbs", achievements: "State Qualifier (injured) • 33-1 record • 68.97% pin rate" },
  { rank: 15, name: "Joseph Shook", school: "Union Pines", weight: "138 lbs", achievements: "NHSCA 2-2 (2025) • 35-4 record • Beat #17 in 2027" },
  { rank: 16, name: "Matthew Akins", school: "Pinecrest", weight: "120 lbs", achievements: "State Qualifier • 37-6 record • 64.86% pin rate" },
  { rank: 17, name: "Paxton Kearns", school: "Uwharrie Charter", weight: "126 lbs", achievements: "State Qualifier (2025) • 44-4 record • Beat #18 H2H" },
  { rank: 18, name: "Sheppard Homan", school: "Enka", weight: "126 lbs", achievements: "State Qualifier • 47-2 record • 55.56% pin rate" },
  { rank: 19, name: "Caleb Edwards", school: "Piedmont", weight: "132 lbs", achievements: "State Qualifier • 47-5 record • Beat multiple 99%+ wrestlers" },
  { rank: 20, name: "Vincent Grack", school: "William Amos Hough", weight: "157 lbs", achievements: "State Qualifier • 39-6 record • 64.29% pin rate" },
]

// Profile ID map for 2028 - use direct IDs when by-name lookup fails (name/school spelling can differ)
const PROFILE_IDS_2028: Record<string, string> = {
  "Jacob Perry": "ddea34af-ae6a-4880-8a1c-687576bef1fe",
  "Stephen Cross": "f5dfa7b9-49b3-4296-94a2-b6f587d03b5c",
}

function norm(s: string) {
  return (s || "").trim().replace(/\s+/g, " ").toLowerCase()
}

function getProfileUrl(
  name: string,
  school: string,
  linkRes: { id: string; name: string; highschool: string }[]
): string {
  const n = norm(name)
  const s = norm(school)
  // 1. Hardcoded map (handles name spelling differences)
  const hardcoded = PROFILE_IDS_2028[name] ?? Object.entries(PROFILE_IDS_2028).find(
    ([k]) => norm(k) === n
  )?.[1]
  if (hardcoded) return `/unified-profile/${hardcoded}`
  // 2. API linkResolution - match name + school
  const fromApi = linkRes.find((r) => {
    if (norm(r.name) !== n) return false
    if (!s) return true
    const hs = norm(r.highschool || "")
    return hs === s || hs.includes(s) || s.includes(hs)
  })
  if (fromApi) return `/unified-profile/${fromApi.id}`
  // 3. Fallback: by-name lookup
  return `/unified-profile/by-name?${new URLSearchParams({ name, school, year: "2028" }).toString()}`
}

export default function Class2028RankingsPage() {
  const [rankings, setRankings] = useState<PublicRanking[]>([])
  const [linkResolution, setLinkResolution] = useState<{ id: string; name: string; highschool: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [updatePostUrl, setUpdatePostUrl] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedGender, setSelectedGender] = useState<string>("Male")
  const [viewMode, setViewMode] = useState<"grid" | "table">("table")

  useEffect(() => {
    fetchRankings()
  }, [selectedGender])

  // Set page metadata
  useEffect(() => {
    document.title = "Class of 2028 Rankings | NC United Wrestling"
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute("content", "Official Class of 2028 wrestling rankings for North Carolina. Featuring 6 NHSCA All-Americans and top college prospects.")
    } else {
      const meta = document.createElement("meta")
      meta.name = "description"
      meta.content = "Official Class of 2028 wrestling rankings for North Carolina. Featuring 6 NHSCA All-Americans and top college prospects."
      document.getElementsByTagName("head")[0].appendChild(meta)
    }
  }, [])

  const fetchRankings = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        year: "2028",
        gender: selectedGender,
        mode: "rankings",
      })

      const response = await fetch(`/api/public-rankings?${params}`)
      if (!response.ok) {
        throw new Error("Failed to fetch rankings")
      }

      const data = await response.json()
      setRankings(data.rankings || [])
      setLinkResolution(data.linkResolution || [])
      setLastUpdated(data.metadata?.last_updated || null)
      setUpdatePostUrl(data.metadata?.update_post_url || null)
    } catch (err) {
      console.error("Error fetching 2028 rankings:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  // Filter by search term and limit to top 20
  const filteredRankings = rankings
    .filter((ranking) => {
      if (!searchTerm) return true

      const term = searchTerm.toLowerCase()
      return (
        (ranking.name?.toLowerCase() || "").includes(term) ||
        (ranking.highschool?.toLowerCase() || "").includes(term) ||
        (ranking.weight_display?.toLowerCase() || "").includes(term)
      )
    })
    .filter((ranking) => ranking.prospect_ranking && ranking.prospect_ranking <= 20)

  const hasActiveFilters = searchTerm !== ""

  // Get Top 3 from actual rankings data - recompute when rankings change
  const top3Spotlight = useMemo(() => {
    if (!rankings || rankings.length === 0) return []
    
    return rankings
      .filter((r) => r.prospect_ranking && r.prospect_ranking <= 3)
      .sort((a, b) => (a.prospect_ranking || 999) - (b.prospect_ranking || 999))
      .slice(0, 3)
      .map((athlete) => {
        // Build achievements string from available data
        const achievements = []
        if (athlete.nhsca_record_display) achievements.push(athlete.nhsca_record_display)
        if (athlete.state_championship_summary) achievements.push(athlete.state_championship_summary)
        if (athlete.super_32_record_display) achievements.push(athlete.super_32_record_display)
        
        return {
          name: athlete.name,
          school: athlete.highschool,
          weight: athlete.weight_display || "N/A",
          achievements: achievements.length > 0 ? achievements.join(" • ") : "Top ranked prospect",
          photourl: athlete.photourl,
          prospect_ranking: athlete.prospect_ranking,
          id: athlete.id, // Include ID for profile links
        }
      })
  }, [rankings])

  // Static photo URLs for Top 3 (used when API lacks photourl)
  const TOP3_PHOTO_URLS: Record<string, string> = {
    "Aaron Ellison": "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/V8uRmiV3jvkW1MHswu7L5-Aaron%20Ellison.png",
    "Connor Reece": "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/t9NpTXJchAu90ghSHuimP-Connor%20Reese.png",
    "Connor Reese": "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/t9NpTXJchAu90ghSHuimP-Connor%20Reese.png",
    "Ryan Thompson": "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/Cgw26wOygo4xndja5nd5u-Ryan%20Thompson.png",
  }

  const displayTop3 = [
    { name: "Aaron Ellison", school: "Lumberton", weight: "150 lbs", achievements: "NHSCA 4th (2024) + Fargo AA • State 4th (2025) • Super32 2-2 (2025) • 45-0 perfect record", photourl: TOP3_PHOTO_URLS["Aaron Ellison"], prospect_ranking: 1, id: undefined as string | undefined },
    { name: "Connor Reece", school: "Northwest Guilford", weight: "144 lbs", achievements: "NHSCA 7th AA (2025) • State 4th (2025) • Super32 2-2 (2025) • 36-3 record", photourl: TOP3_PHOTO_URLS["Connor Reece"], prospect_ranking: 2, id: undefined as string | undefined },
    { name: "Ryan Thompson", school: "Cardinal Gibbons", weight: "165 lbs", achievements: "NHSCA 6th AA (2025) • State 5th (2025) • 44-3 record • Beat #29 in 2027", photourl: TOP3_PHOTO_URLS["Ryan Thompson"], prospect_ranking: 3, id: undefined as string | undefined },
  ]

  // Always show exactly 3 cards: use API data when available, pad with static so we never show 0–2 cards
  const staticPhotosByIndex = [TOP3_PHOTO_URLS["Aaron Ellison"], TOP3_PHOTO_URLS["Connor Reece"], TOP3_PHOTO_URLS["Ryan Thompson"]]
  const NEEDED = 3
  const merged = top3Spotlight.slice(0, NEEDED).map((a, i) => ({
    ...a,
    photourl: (a.photourl && String(a.photourl).trim() ? a.photourl : null) || TOP3_PHOTO_URLS[a.name] || staticPhotosByIndex[i] || displayTop3[i]?.photourl,
  }))
  while (merged.length < NEEDED) {
    merged.push(displayTop3[merged.length])
  }
  const finalTop3 = merged.slice(0, NEEDED)

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#03154C] via-[#0a2571] to-[#1e3a8a] p-6 sm:p-12 mb-12 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-[#03154C]/90 via-[#03154C]/65 to-[#1e3a8a]/80"></div>
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <Link href="/public-rankings">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Rankings
                  </Button>
                </Link>
              </div>
              <div className="text-center">
                <h1 className="text-3xl sm:text-5xl font-bold text-white mb-2 text-balance">
                  North Carolina College Prospect Rankings
                </h1>
                <p className="text-2xl sm:text-4xl font-bold text-[#D3B574] mb-6 sm:mb-8">Class of 2028</p>
                <p className="text-lg sm:text-xl text-blue-100 mb-6 sm:mb-8 leading-relaxed">
                  A new wave of North Carolina wrestling talent
                </p>

                {/* By The Numbers */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 sm:px-6 py-3 sm:py-4 border border-white/20">
                    <div className="text-2xl sm:text-3xl font-bold text-[#D3B574]">6</div>
                    <div className="text-xs sm:text-sm text-white/90">NHSCA All-Americans</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 sm:px-6 py-3 sm:py-4 border border-white/20">
                    <div className="text-2xl sm:text-3xl font-bold text-[#D3B574]">3</div>
                    <div className="text-xs sm:text-sm text-white/90">State Runnerups</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 sm:px-6 py-3 sm:py-4 border border-white/20">
                    <div className="text-2xl sm:text-3xl font-bold text-[#D3B574]">17</div>
                    <div className="text-xs sm:text-sm text-white/90">High Schools Represented</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 sm:px-6 py-3 sm:py-4 border border-white/20">
                    <div className="text-2xl sm:text-3xl font-bold text-[#D3B574]">13/17</div>
                    <div className="text-xs sm:text-sm text-white/90">Train with NC United Blue</div>
                  </div>
                </div>

                {/* Top 3 Spotlight */}
                <div className="bg-white/95 rounded-2xl p-4 sm:p-8 shadow-xl">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Top 3 of the Class of 2028</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                    {finalTop3.map((athlete, index) => {
                      const photoUrl = athlete.photourl &&
                                      String(athlete.photourl).trim() !== "" &&
                                      String(athlete.photourl) !== "null" &&
                                      String(athlete.photourl) !== "undefined"
                                        ? String(athlete.photourl).trim()
                                        : null
                      const rank = athlete.prospect_ranking || index + 1
                      return (
                        <div key={`${athlete.name}-${index}`} className="text-center">
                          <div className="relative mb-3 sm:mb-4 mx-auto w-full h-[220px] sm:h-[280px] rounded-lg overflow-hidden shadow-lg bg-gray-100">
                            {photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={`${athlete.name} - ${athlete.school}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Hide image on error and show trophy fallback
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                  const parent = target.parentElement
                                  if (parent && !parent.querySelector('.trophy-fallback')) {
                                    const fallback = document.createElement('div')
                                    fallback.className = 'trophy-fallback w-full h-full bg-gradient-to-br from-[#03154C] to-[#1e3a8a] flex items-center justify-center absolute inset-0'
                                    fallback.innerHTML = '<svg class="h-16 w-16 text-[#D3B574]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>'
                                    parent.appendChild(fallback)
                                  }
                                }}
                                onLoad={() => {}}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-[#03154C] to-[#1e3a8a] flex items-center justify-center">
                                <Trophy className="h-16 w-16 text-[#D3B574]" />
                              </div>
                            )}
                            <div className="absolute top-3 left-3">
                              <Badge className="bg-[#D3B574] text-gray-900 font-semibold px-3 py-1">#{rank}</Badge>
                            </div>
                          </div>
                          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">{athlete.name}</h3>
                          <p className="text-sm text-gray-600 mb-2">{athlete.school}</p>
                          <Badge variant="outline" className="border-[#D3B574] text-[#D3B574] mb-2">
                            {athlete.weight}
                          </Badge>
                          <div className="mt-2">
                            <Link
                              href={athlete.id ? `/unified-profile/${athlete.id}` : getProfileUrl(athlete.name || "", (athlete.school as string) || "", linkResolution)}
                              className="text-xs text-[#03154C] hover:text-[#D3B574] hover:underline"
                            >
                              View Profile →
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 sm:space-y-8 mb-8 sm:mb-12">
            {/* A Class Built on National Performance */}
            <Card>
              <CardContent className="p-6 sm:p-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">
                  A Class Built on National Performance
                </h2>
                <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
                  The Class of 2028 represents a new wave of North Carolina wrestling talent that has proven itself on
                  the national stage as freshmen. With 6 NHSCA All-Americans in the top 7 and consistent participation in
                  elite events like Super32 and Fargo, this class has demonstrated they can compete with the country's
                  best.
                </p>
              </CardContent>
            </Card>

            {/* Quote Box */}
            <div className="bg-[#D3B574] text-white p-8 rounded-lg my-12 border-l-4 border-[#D3B574]">
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-shrink-0">
                  <img
                    src="/images/coach-macchiavello-celebration.png"
                    alt="Coach Mike Macchiavello celebrating with team"
                    className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-[#D3B574]"
                  />
                </div>
                <div className="flex-1">
                  <blockquote className="text-xl italic leading-relaxed mb-4">
                    "The Class of 2028 is special because they're not waiting to compete nationally — they're already
                    doing it as freshmen and sophomores. Seeing six NHSCA All-Americans in one class tells you these
                    athletes are serious about wrestling at the next level. They're building the foundation now."
                  </blockquote>
                  <cite className="text-[#03154C] font-semibold">— Mike Macchiavello, Co-Founder NC United</cite>
                </div>
              </div>
            </div>

            {/* The NC United Pipeline */}
            <Card>
              <CardContent className="p-6 sm:p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-6">The NC United Pipeline</h3>
                <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-4">
                  The success of the Class of 2028 reflects North Carolina's growing wrestling infrastructure. 13 out of
                  20 ranked wrestlers train with NC United Blue, giving them weekly exposure to elite competition and
                  college-level coaching. This investment in high-level training is paying dividends, as evidenced by the
                  class's national tournament success.
                </p>
                <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
                  From Lumberton to Charlotte Catholic to Northwest Guilford, the geographic diversity of this class
                  shows wrestling's expansion across the state. Multiple training hubs are producing nationally
                  competitive athletes, creating a pipeline that college coaches are starting to notice.
                </p>
              </CardContent>
            </Card>

            {/* Official Rankings */}
            <Card>
              <CardContent className="p-6 sm:p-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">Official Rankings</h2>
                <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-4">
                  Our rankings prioritize national performance above all else — NHSCA and Super32 results carry the most
                  weight, as these events measure athletes against the country's best. Quality wins over nationally ranked
                  opponents and head-to-head results between ranked wrestlers are factored heavily. State championship
                  results provide important context, while participation in college opens demonstrates readiness for the
                  next level. We also consider complete competitive resumes — wrestlers who compete in multiple national
                  events show a commitment to testing themselves at the highest level.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="bg-gray-50 border-b">
            <div className="container mx-auto px-4 py-8">
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="Search by name, school, or weight class..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-3 text-lg border-2 focus:border-[#03154C] rounded-lg"
                  />
                </div>

                {/* Filters and View Toggle */}
                <div className="flex flex-wrap items-center gap-4 justify-between">
                  <div className="flex flex-wrap gap-4">
                    <Select value={selectedGender} onValueChange={setSelectedGender}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Men's Wrestling</SelectItem>
                        <SelectItem value="Female">Women's Wrestling</SelectItem>
                      </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                      <Button variant="outline" onClick={() => setSearchTerm("")} size="sm">
                        <Filter className="h-4 w-4 mr-2" />
                        Clear Search
                      </Button>
                    )}
                  </div>

                  <ViewToggle view={viewMode} onChange={setViewMode} />
                </div>

                {/* Active Filters Display */}
                {hasActiveFilters && (
                  <div className="flex flex-wrap gap-2">
                    {searchTerm && (
                      <Badge variant="secondary" className="bg-[#03154C]/10 text-[#03154C] border-[#031574]/20">
                        Search: "{searchTerm}"
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="container mx-auto px-4 py-8">
            {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

            {/* Rankings Display */}
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-white" />
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-bold text-gray-900">Top 20 Wrestling Prospects</h2>
                    <div className="text-sm text-gray-600">Showing {filteredRankings.length} ranked prospects</div>
                  </div>
                  {lastUpdated && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-600" />
                      <span className="text-gray-600">
                        Last updated: {new Date(lastUpdated).toLocaleString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {viewMode === "table" && (
                  <div className="md:hidden mb-4 text-center">
                    <p className="text-sm text-gray-600 italic">Scroll right to see more data and profile links →</p>
                  </div>
                )}

                {/* Static Top 20 Table */}
                <div className="mb-8">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-[#03154C] text-white">
                          <th className="px-4 py-3 text-left font-semibold">Rank</th>
                          <th className="px-4 py-3 text-left font-semibold">Name</th>
                          <th className="px-4 py-3 text-left font-semibold">School</th>
                          <th className="px-4 py-3 text-left font-semibold">Weight</th>
                          <th className="px-4 py-3 text-left font-semibold">Profile</th>
                        </tr>
                      </thead>
                      <tbody>
                        {top20Data.map((athlete) => {
                          const profileUrl = getProfileUrl(athlete.name, athlete.school, linkResolution)
                          return (
                            <tr key={athlete.rank} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <Badge className="bg-[#D3B574] text-gray-900">#{athlete.rank}</Badge>
                              </td>
                              <td className="px-4 py-3 font-medium">{athlete.name}</td>
                              <td className="px-4 py-3">{athlete.school}</td>
                              <td className="px-4 py-3">{athlete.weight}</td>
                              <td className="px-4 py-3">
                                <Link
                                  href={profileUrl}
                                  className="text-[#03154C] hover:text-[#D3B574] hover:underline font-medium transition-colors"
                                >
                                  View Profile
                                </Link>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top 20 Details Section */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Top 20 Details</h3>
                  <div className="space-y-3">
                    {top20Data.map((athlete) => (
                      <div key={athlete.rank} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start gap-3">
                          <Badge className="bg-[#D3B574] text-gray-900 font-semibold px-3 py-1 flex-shrink-0">#{athlete.rank}</Badge>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{athlete.name} - {athlete.school} ({athlete.weight})</h4>
                            {athlete.achievements && (
                              <p className="text-sm text-gray-600 mt-1">{athlete.achievements}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {viewMode === "table" ? (
                  <RankingsTableView athletes={filteredRankings} />
                ) : (
                  <RankingsCardView athletes={filteredRankings} />
                )}

                {filteredRankings.length === 0 && !isLoading && (
                  <div className="text-center py-16">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No rankings found</h3>
                    <p className="text-gray-600">
                      {hasActiveFilters
                        ? "Try adjusting your search or filters"
                        : "Rankings for this class and gender are not yet available"}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Navigation to Other Rankings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">
            <Link href="/public-rankings/2027">
              <Card className="bg-gradient-to-br from-[#03154C] to-[#1e3a8a] text-white hover:shadow-xl transition-shadow cursor-pointer h-full">
                <CardContent className="p-6 sm:p-8 text-center flex flex-col items-center justify-center h-full">
                  <Trophy className="h-12 w-12 sm:h-16 sm:w-16 mb-4 text-[#D3B574]" />
                  <h3 className="text-xl sm:text-2xl font-bold mb-2">Class of 2027 Rankings</h3>
                  <p className="text-blue-100 mb-4">View the Top 30 ranked prospects for 2027</p>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="bg-[#D3B574] text-gray-900 hover:bg-[#D3B574]/90"
                  >
                    View 2027 Rankings
                  </Button>
                </CardContent>
              </Card>
            </Link>

            <Link href="/public-rankings/2026">
              <Card className="bg-gradient-to-br from-[#B31B1B] to-[#8B1515] text-white hover:shadow-xl transition-shadow cursor-pointer h-full">
                <CardContent className="p-6 sm:p-8 text-center flex flex-col items-center justify-center h-full">
                  <Trophy className="h-12 w-12 sm:h-16 sm:w-16 mb-4 text-[#D3B574]" />
                  <h3 className="text-xl sm:text-2xl font-bold mb-2">Class of 2026 Rankings</h3>
                  <p className="text-red-100 mb-4">View the Top 30 ranked prospects for 2026</p>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="bg-[#D3B574] text-gray-900 hover:bg-[#D3B574]/90"
                  >
                    View 2026 Rankings
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </div>

          <div className="bg-[#03154C] text-white py-16">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-3xl font-bold mb-4">Join the Legacy</h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                The Class of 2028 is building the foundation now. Be part of the next generation of NC United excellence.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-[#D3B574] hover:bg-[#D3B574]/90 text-[#03154C] font-semibold">
                  Learn About NC United
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-[#03154C] bg-transparent"
                >
                  Contact Our Coaches
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
