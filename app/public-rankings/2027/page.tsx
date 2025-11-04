"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { ViewToggle } from "@/components/view-toggle"
import { RankingsTableView } from "@/components/rankings-table-view"
import { RankingsCardView } from "@/components/rankings-card-view"
import { Search, Filter, ArrowLeft, Lock, Trophy, Users } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

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

export default function Class2027RankingsPage() {
  const { isVerifiedCoach, isAdmin } = useAuth()
  const [isLaunched, setIsLaunched] = useState(true)
  const [rankings, setRankings] = useState<PublicRanking[]>([])
  const [allProspects, setAllProspects] = useState<PublicRanking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("rankings")

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedGender, setSelectedGender] = useState<string>("Male")
  const [viewMode, setViewMode] = useState<"grid" | "table">("table")

  // Advanced filters for "All Prospects" tab
  const [filterWeightClass, setFilterWeightClass] = useState<string>("all")
  const [filterMinGPA, setFilterMinGPA] = useState<number>(0)
  const [filterCommitmentStatus, setFilterCommitmentStatus] = useState<string>("all")

  useEffect(() => {
    fetchRankings()
    if (isVerifiedCoach || isAdmin) {
      fetchAllProspects()
    }
  }, [selectedGender, isVerifiedCoach, isAdmin])

  const fetchRankings = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        year: "2027",
        gender: selectedGender,
        mode: "rankings", // Top 30 only
      })

      const response = await fetch(`/api/public-rankings?${params}`)
      if (!response.ok) {
        throw new Error("Failed to fetch rankings")
      }

      const data = await response.json()
      setRankings(data.rankings || [])
    } catch (err) {
      console.error("Error fetching 2027 rankings:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAllProspects = async () => {
    try {
      const params = new URLSearchParams({
        year: "2027",
        gender: selectedGender,
        mode: "all", // All prospects
      })

      const response = await fetch(`/api/public-rankings?${params}`)
      if (!response.ok) {
        throw new Error("Failed to fetch all prospects")
      }

      const data = await response.json()
      setAllProspects(data.rankings || [])
    } catch (err) {
      console.error("Error fetching all prospects:", err)
    }
  }

  const filteredRankings = rankings.filter((ranking) => {
    if (!searchTerm) return true

    const term = searchTerm.toLowerCase()
    return (
      (ranking.name?.toLowerCase() || "").includes(term) ||
      (ranking.highschool?.toLowerCase() || "").includes(term) ||
      (ranking.weight_display?.toLowerCase() || "").includes(term)
    )
  })

  // Advanced filtering for "All Prospects" tab
  const filteredAllProspects = allProspects.filter((prospect) => {
    // Search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const matchesSearch = (
        (prospect.name?.toLowerCase() || "").includes(term) ||
        (prospect.highschool?.toLowerCase() || "").includes(term) ||
        (prospect.weight_display?.toLowerCase() || "").includes(term)
      )
      if (!matchesSearch) return false
    }

    // Weight class filter
    if (filterWeightClass !== "all") {
      const prospectWeight = prospect.weight_display?.replace(" lbs", "").trim()
      if (prospectWeight !== filterWeightClass) return false
    }

    // Minimum GPA filter
    if (filterMinGPA > 0) {
      const gpa = prospect.academic_gpa || 0
      if (gpa < filterMinGPA) return false
    }

    // Commitment status filter
    if (filterCommitmentStatus === "uncommitted") {
      if (prospect.college || prospect.recruiting_status !== "Prospect") return false
    }

    return true
  })

  const clearFilters = () => {
    setSearchTerm("")
    setFilterWeightClass("all")
    setFilterMinGPA(0)
    setFilterCommitmentStatus("all")
  }

  const hasActiveFilters = searchTerm !== "" || filterWeightClass !== "all" || filterMinGPA > 0 || filterCommitmentStatus !== "all"

  // Get unique weight classes for filter dropdown
  const weightClasses = [...new Set(allProspects.map(p => p.weight_display?.replace(" lbs", "").trim()).filter(Boolean))].sort((a, b) => {
    const numA = parseInt(a!)
    const numB = parseInt(b!)
    return numA - numB
  })

  if (!isLaunched) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#03154C] to-[#1e3a8a] px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white/10 rounded-full mb-6">
              <Lock className="h-12 w-12 text-[#D3B574]" />
            </div>
            <div className="mb-4">
              <p className="text-lg md:text-xl text-blue-200 font-semibold tracking-wide uppercase">
                North Carolina College Prospect Rankings
              </p>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">Class of 2027</h1>
            <p className="text-3xl md:text-4xl text-[#D3B574] font-bold mb-4">Dropping This Saturday</p>
            <p className="text-xl md:text-2xl text-blue-100 font-medium">North Carolina's Elite College Prospects</p>
          </div>

          <Card className="bg-white/10 border-white/20 backdrop-blur-sm mb-12">
            <CardContent className="p-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center">
                Everything College Coaches Need
              </h2>
              <div className="space-y-6 text-white">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-[#D3B574] rounded-full flex items-center justify-center">
                    <span className="text-[#03154C] font-bold text-xl">1</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Complete Academic Profiles</h3>
                    <p className="text-lg text-blue-100">
                      GPA, SAT, ACT, transcripts — know who can compete in your classroom
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-[#D3B574] rounded-full flex items-center justify-center">
                    <span className="text-[#03154C] font-bold text-xl">2</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Direct Contact Access</h3>
                    <p className="text-lg text-blue-100">Email, phone, social profiles — reach recruits instantly</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-[#D3B574] rounded-full flex items-center justify-center">
                    <span className="text-[#03154C] font-bold text-xl">3</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Real-Time Tournament Updates</h3>
                    <p className="text-lg text-blue-100">Automatic alerts after major wins and rankings changes</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-[#D3B574] rounded-full flex items-center justify-center">
                    <span className="text-[#03154C] font-bold text-xl">4</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Comprehensive Recruiting Data</h3>
                    <p className="text-lg text-blue-100">
                      Athletic results, highlight videos, academic info — all in one place
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-[#D3B574] rounded-lg p-8 mb-12 text-center">
            <p className="text-2xl md:text-3xl font-bold text-[#03154C] mb-2">30 Ranked Athletes</p>
            <p className="text-lg text-[#03154C]/80 font-medium">
              12 State Champions • 7 NHSCA All-Americans • 40 State Placements • Academic Phenoms
            </p>
          </div>
          {/* End of redesigned value proposition section */}

          <div className="text-center">
            <Link href="/public-rankings">
              <Button
                size="lg"
                className="bg-[#D3B574] hover:bg-[#D3B574]/90 text-[#03154C] font-semibold text-lg px-8 py-6"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Rankings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#03154C] to-[#1e3a8a] p-6 sm:p-12 mb-12 shadow-2xl">
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
              <p className="text-2xl sm:text-4xl font-bold text-[#D3B574] mb-6 sm:mb-8">Class of 2027</p>
              <p className="text-lg sm:text-xl text-blue-100 mb-6 sm:mb-8 leading-relaxed">
                One of the most accomplished classes in North Carolina wrestling history
              </p>

              <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 sm:px-6 py-3 sm:py-4 border border-white/20">
                  <div className="text-2xl sm:text-3xl font-bold text-[#D3B574]">12</div>
                  <div className="text-xs sm:text-sm text-white/90">State Champions</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 sm:px-6 py-3 sm:py-4 border border-white/20">
                  <div className="text-2xl sm:text-3xl font-bold text-[#D3B574]">7</div>
                  <div className="text-xs sm:text-sm text-white/90">NHSCA All-Americans</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 sm:px-6 py-3 sm:py-4 border border-white/20">
                  <div className="text-2xl sm:text-3xl font-bold text-[#D3B574]">25</div>
                  <div className="text-xs sm:text-sm text-white/90">High Schools</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 sm:px-6 py-3 sm:py-4 border border-white/20">
                  <div className="text-2xl sm:text-3xl font-bold text-[#D3B574]">22/30</div>
                  <div className="text-xs sm:text-sm text-white/90">Train with NC United Blue</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-8 shadow-xl">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Top 3 of the Class of 2027</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div className="text-center">
                    <div className="relative mb-3 sm:mb-4 mx-auto w-full h-[250px] sm:h-[300px] rounded-lg overflow-hidden shadow-lg bg-gray-100">
                      <img
                        src="/images/jack-harty-wrestling.png"
                        alt="Jack Harty competing in NC United singlet"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <Link href="/unified-profile/jack-harty" className="hover:text-[#D3B574] transition-colors">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 cursor-pointer">Jack Harty</h3>
                    </Link>
                    <p className="text-sm text-gray-600 mb-2">Greens Farms Academy</p>
                    <Badge className="bg-[#D3B574] text-gray-900">#1 Ranked</Badge>
                  </div>
                  <div className="text-center">
                    <div className="relative mb-3 sm:mb-4 mx-auto w-full h-[250px] sm:h-[300px] rounded-lg overflow-hidden shadow-lg bg-gray-100">
                      <img
                        src="/images/tye-johnson-wrestling.png"
                        alt="Tye Johnson competing at a wrestling tournament"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <Link href="/unified-profile/tye-johnson" className="hover:text-[#D3B574] transition-colors">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 cursor-pointer">Tye Johnson</h3>
                    </Link>
                    <p className="text-sm text-gray-600 mb-2">Cape Fear</p>
                    <Badge className="bg-[#D3B574] text-gray-900">#2 Ranked</Badge>
                  </div>
                  <div className="text-center">
                    <div className="relative mb-3 sm:mb-4 mx-auto w-full h-[250px] sm:h-[300px] rounded-lg overflow-hidden shadow-lg bg-gray-100">
                      <img
                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-10-11%20at%207.12.36%E2%80%AFPM-ZkEfz3JhMiotyYS7Ad8xnnDymOCFwT.png"
                        alt="Tobin McNair competing for Wakefield"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Link href="/unified-profile/tobin-mcnair" className="hover:text-[#D3B574] transition-colors">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 cursor-pointer">Tobin McNair</h3>
                    </Link>
                    <p className="text-sm text-gray-600 mb-2">Wakefield</p>
                    <Badge className="bg-[#D3B574] text-gray-900">#3 Ranked</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6 sm:space-y-8 mb-8 sm:mb-12">
          <Card>
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">A Historic Class</h2>
              <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-4">
                The Class of 2027 represents one of the most accomplished sophomore groups in North Carolina wrestling
                history. With 12 state champions, 7 NHSCA All-Americans, and 40 total state placements, this class has
                advanced further on the national stage than any all-North Carolina squad in recent memory.
              </p>
              <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
                What sets this class apart isn't just individual accolades — it's their collective presence on the
                national stage. Through participation in the most competitive national tournaments and events, they have
                begun to establish themselves against the country's best.
              </p>
            </CardContent>
          </Card>

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
                  "This class embodies everything we've worked to build at NC United. They've not only dominated locally
                  but are now starting to have success on the national stage. What excites me most is their commitment
                  to excellence both on the mat and in the classroom — they're setting the standard for future
                  generations."
                </blockquote>
                <cite className="text-[#D3B574] font-semibold">— Mike Macchiavello, Co-Founder NC United</cite>
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="p-6 sm:p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-6">The NC United Pipeline</h3>
              <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-4">
                The success of the Class of 2027 reflects the strength of their high schools and clubs across North
                Carolina, which continue to produce athletes ready for the spotlight. In addition, the majority of the
                ranked wrestlers train as part of the NC United Blue program, giving them the chance to wrestle with the
                best in the state every Sunday and access college-level training environments and resources that prepare
                them for the next level.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 sm:p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-6">College Recruiting Success</h3>
              <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-4">
                This class has already drawn unprecedented attention from college coaches across the country. With the
                NCAA contact period opening, athletes from this group received interest from local programs like UNC, NC
                State, Gardner-Webb, Appalachian State, UMO, Greensboro, and Pembroke — and from national powers
                including Stanford, Virginia, Brown, Northwestern, and Bucknell.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">Official Rankings</h2>
              <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-4">
                Our rankings prioritize performance at the national level, where athletes measure themselves against the
                country's best. Quality of wins — especially against nationally ranked opponents — carries significant
                weight, along with success in college opens, which demonstrate readiness beyond the high school level.
                High-profile statewide wins and championship results provide important context, while academic
                performance (GPA) is also factored in as a marker of overall college readiness.
              </p>
            </CardContent>
          </Card>

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
                      <Button variant="outline" onClick={clearFilters} size="sm">
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

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Tab Navigation */}
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8 bg-white/10 p-1">
                <TabsTrigger 
                  value="rankings" 
                  className="data-[state=active]:bg-white data-[state=active]:text-[#03154C] text-white font-semibold"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Top 30 Rankings
                </TabsTrigger>
                <TabsTrigger 
                  value="all" 
                  className="data-[state=active]:bg-white data-[state=active]:text-[#03154C] text-white font-semibold"
                  disabled={!isVerifiedCoach && !isAdmin}
                >
                  <Users className="w-4 h-4 mr-2" />
                  All Prospects
                  {(!isVerifiedCoach && !isAdmin) && <Lock className="w-3 h-3 ml-2" />}
                </TabsTrigger>
              </TabsList>

              {/* Rankings Tab */}
              <TabsContent value="rankings">
                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-white" />
                  </div>
                ) : (
                  <>
                    <div className="mb-6 flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-white">Top 30 Wrestling Prospects</h2>
                      <div className="text-sm text-white">Showing {filteredRankings.length} ranked prospects</div>
                    </div>

                    {viewMode === "table" && (
                      <div className="md:hidden mb-4 text-center">
                        <p className="text-sm text-gray-300 italic">Scroll right to see more data and profile links →</p>
                      </div>
                    )}

                    {viewMode === "table" ? (
                      <RankingsTableView athletes={filteredRankings} />
                    ) : (
                      <RankingsCardView athletes={filteredRankings} />
                    )}

                    {filteredRankings.length === 0 && !isLoading && (
                      <div className="text-center py-16">
                        <h3 className="text-xl font-semibold text-white mb-2">No rankings found</h3>
                        <p className="text-gray-300">
                          {hasActiveFilters
                            ? "Try adjusting your search or filters"
                            : "Rankings for this class and gender are not yet available"}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* All Prospects Tab (Coaches Only) */}
              <TabsContent value="all">
                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-white" />
                  </div>
                ) : (
                  <>
                    {/* Advanced Filters */}
                    <div className="mb-6 bg-white/10 backdrop-blur-sm rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Advanced Filters</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Weight Class Filter */}
                        <div>
                          <label className="text-sm text-gray-200 mb-2 block">Weight Class</label>
                          <Select value={filterWeightClass} onValueChange={setFilterWeightClass}>
                            <SelectTrigger className="bg-white/20 text-white border-white/30">
                              <SelectValue placeholder="All Weights" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Weight Classes</SelectItem>
                              {weightClasses.map((weight) => (
                                <SelectItem key={weight} value={weight!}>
                                  {weight} lbs
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Minimum GPA Filter */}
                        <div>
                          <label className="text-sm text-gray-200 mb-2 block">Minimum GPA</label>
                          <Select value={filterMinGPA.toString()} onValueChange={(v) => setFilterMinGPA(parseFloat(v))}>
                            <SelectTrigger className="bg-white/20 text-white border-white/30">
                              <SelectValue placeholder="Any GPA" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Any GPA</SelectItem>
                              <SelectItem value="2.5">2.5+</SelectItem>
                              <SelectItem value="3.0">3.0+</SelectItem>
                              <SelectItem value="3.5">3.5+</SelectItem>
                              <SelectItem value="4.0">4.0</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Commitment Status Filter */}
                        <div>
                          <label className="text-sm text-gray-200 mb-2 block">Commitment Status</label>
                          <Select value={filterCommitmentStatus} onValueChange={setFilterCommitmentStatus}>
                            <SelectTrigger className="bg-white/20 text-white border-white/30">
                              <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Prospects</SelectItem>
                              <SelectItem value="uncommitted">Uncommitted Only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {hasActiveFilters && (
                        <div className="mt-4">
                          <Button variant="outline" onClick={clearFilters} size="sm" className="text-white border-white/30 hover:bg-white/20">
                            <Filter className="h-4 w-4 mr-2" />
                            Clear All Filters
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="mb-6 flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-white">All Class of 2027 Prospects</h2>
                      <div className="text-sm text-white">Showing {filteredAllProspects.length} prospects</div>
                    </div>

                    {viewMode === "table" && (
                      <div className="md:hidden mb-4 text-center">
                        <p className="text-sm text-gray-300 italic">Scroll right to see more data and profile links →</p>
                      </div>
                    )}

                    {viewMode === "table" ? (
                      <RankingsTableView athletes={filteredAllProspects} />
                    ) : (
                      <RankingsCardView athletes={filteredAllProspects} />
                    )}

                    {filteredAllProspects.length === 0 && (
                      <div className="text-center py-16">
                        <h3 className="text-xl font-semibold text-white mb-2">No prospects found</h3>
                        <p className="text-gray-300">Try adjusting your filters</p>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="bg-[#03154C] text-white py-16">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-3xl font-bold mb-4">Join the Legacy</h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                The Class of 2027 has set the standard. Be part of the next generation of NC United excellence.
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
    </div>
  )
}
