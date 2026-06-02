"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { ViewToggle } from "@/components/view-toggle"
import { RankingsTableView } from "@/components/rankings-table-view"
import { RankingsCardView } from "@/components/rankings-card-view"
import { Search, Filter, ArrowLeft, Trophy, Users, Clock } from "lucide-react"
import {
  RANKINGS_BODY,
  RANKINGS_FILTER_BAR,
  RANKINGS_HEADING,
  RANKINGS_INPUT,
  RANKINGS_PAGE,
  RANKINGS_PANEL,
  RANKINGS_SPOTLIGHT,
  RANKINGS_SUBHEADING,
  RANKINGS_TOP3_PHOTO_FRAME,
  RANKINGS_TOP3_PHOTO_IMG,
} from "@/lib/public-rankings-theme"

interface PublicRanking {
  id: string
  name: string
  highschool: string
  high_school_division?: string | null
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
  const [isLaunched, setIsLaunched] = useState(true)
  const [rankings, setRankings] = useState<PublicRanking[]>([])
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
        const errBody = await response.json().catch(() => ({}))
        throw new Error((errBody as { error?: string }).error || "Failed to fetch rankings")
      }

      const data = await response.json()
      setRankings(data.rankings || [])
      setLastUpdated(data.metadata?.last_updated || null)
      setUpdatePostUrl(data.metadata?.update_post_url || null)
    } catch (err) {
      console.error("Error fetching 2027 rankings:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  // Filter by search term and limit to top 30
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
    .filter((ranking) => ranking.prospect_ranking && ranking.prospect_ranking <= 30)

  const hasActiveFilters = searchTerm !== ""

  const topRankedAthletes = rankings.slice(0, 3)
  const heroAthlete = topRankedAthletes[0]
  const heroImage = heroAthlete?.photourl && heroAthlete.photourl.trim() !== "" ? heroAthlete.photourl : null

  if (!isLaunched) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#003366] to-[#1e3a8a] px-4 py-16">
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
                    <span className="text-[#003366] font-bold text-xl">1</span>
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
                    <span className="text-[#003366] font-bold text-xl">2</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Direct Contact Access</h3>
                    <p className="text-lg text-blue-100">Email, phone, social profiles — reach recruits instantly</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-[#D3B574] rounded-full flex items-center justify-center">
                    <span className="text-[#003366] font-bold text-xl">3</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Real-Time Tournament Updates</h3>
                    <p className="text-lg text-blue-100">Automatic alerts after major wins and rankings changes</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-[#D3B574] rounded-full flex items-center justify-center">
                    <span className="text-[#003366] font-bold text-xl">4</span>
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
            <p className="text-2xl md:text-3xl font-bold text-[#003366] mb-2">30 Ranked Athletes</p>
            <p className="text-lg text-[#003366]/80 font-medium">
              12 State Champions • 7 NHSCA All-Americans • 40 State Placements • Academic Phenoms
            </p>
          </div>
          {/* End of redesigned value proposition section */}

          <div className="text-center">
            <Link href="/public-rankings">
              <Button
                size="lg"
                className="bg-[#D3B574] hover:bg-[#D3B574]/90 text-[#003366] font-semibold text-lg px-8 py-6"
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
    <div className={RANKINGS_PAGE}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#003366] via-[#0a2571] to-[#1e3a8a] p-6 sm:p-12 mb-12 shadow-2xl">
          {heroImage && (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${heroImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center top",
                filter: "saturate(1.1)",
                opacity: 0.35,
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-[#003366]/90 via-[#003366]/65 to-[#1e3a8a]/80"></div>
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

              <div className={RANKINGS_SPOTLIGHT}>
                <h2 className={`${RANKINGS_SUBHEADING} text-xl sm:text-2xl`}>Top 3 of the Class of 2027</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  {topRankedAthletes.length > 0 ? (
                    topRankedAthletes.map((athlete, index) => {
                      const photo = athlete.photourl && athlete.photourl.trim() !== "" ? athlete.photourl : "/diverse-wrestlers.png"
                      const profileHref = `/view-profile?id=${encodeURIComponent(athlete.id)}`
                      return (
                        <div key={athlete.id} className="text-center">
                          <div className={RANKINGS_TOP3_PHOTO_FRAME}>
                            <img
                              src={photo}
                              alt={athlete.name}
                              className={RANKINGS_TOP3_PHOTO_IMG}
                              onError={(e) => {
                                e.currentTarget.src = "/diverse-wrestlers.png"
                              }}
                            />
                            <div className="absolute top-3 left-3">
                              <Badge className="bg-[#D3B574] text-gray-900 font-semibold px-3 py-1">#{athlete.prospect_ranking}</Badge>
                            </div>
                          </div>
                          <a href={profileHref} className="hover:text-[#D3B574] transition-colors">
                            <h3 className="text-base sm:text-lg font-bold text-white mb-1 cursor-pointer">{athlete.name}</h3>
                          </a>
                          <p className="text-sm text-white/60 mb-2">
                          {athlete.highschool || "High School TBD"}
                          {athlete.high_school_division ? (
                            <span className="text-white/40"> · {athlete.high_school_division}</span>
                          ) : null}
                        </p>
                          <Badge variant="outline" className="border-[#D3B574] text-[#D3B574] bg-transparent">
                            {athlete.weight_display}
                          </Badge>
                        </div>
                      )
                    })
                  ) : (
                    <div className="col-span-full text-center text-white/50 text-sm">
                      Rankings are coming soon. Check back shortly for featured athletes.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6 sm:space-y-8 mb-8 sm:mb-12">
          <Card className={RANKINGS_PANEL}>
            <CardContent className="p-6 sm:p-8">
              <h2 className={RANKINGS_HEADING}>A Historic Class</h2>
              <p className={`${RANKINGS_BODY} mb-4`}>
                The Class of 2027 represents one of the most accomplished sophomore groups in North Carolina wrestling
                history. With 12 state champions, 7 NHSCA All-Americans, and 40 total state placements, this class has
                advanced further on the national stage than any all-North Carolina squad in recent memory.
              </p>
              <p className={RANKINGS_BODY}>
                What sets this class apart isn't just individual accolades — it's their collective presence on the
                national stage. Through participation in the most competitive national tournaments and events, they have
                begun to establish themselves against the country's best.
              </p>
            </CardContent>
          </Card>

          <div className="rounded-xl border border-[#D3B574]/30 bg-[#0f1c2e] p-8 my-12">
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-shrink-0">
                <img
                  src="/images/coach-macchiavello-celebration.png"
                  alt="Coach Mike Macchiavello celebrating with team"
                  className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover object-top border-4 border-[#D3B574]"
                />
              </div>
              <div className="flex-1">
                <blockquote className="text-xl italic leading-relaxed mb-4 text-white/80">
                  "This class embodies everything we've worked to build at NC United. They've not only dominated locally
                  but are now starting to have success on the national stage. What excites me most is their commitment
                  to excellence both on the mat and in the classroom — they're setting the standard for future
                  generations."
                </blockquote>
                <cite className="text-[#D3B574] font-semibold">— Mike Macchiavello, Co-Founder NC United</cite>
              </div>
            </div>
          </div>

          <Card className={RANKINGS_PANEL}>
            <CardContent className="p-6 sm:p-8">
              <h3 className={RANKINGS_SUBHEADING}>The NC United Pipeline</h3>
              <p className={`${RANKINGS_BODY} mb-4`}>
                The success of the Class of 2027 reflects the strength of their high schools and clubs across North
                Carolina, which continue to produce athletes ready for the spotlight. In addition, the majority of the
                ranked wrestlers train as part of the NC United Blue program, giving them the chance to wrestle with the
                best in the state every Sunday and access college-level training environments and resources that prepare
                them for the next level.
              </p>
            </CardContent>
          </Card>

          <Card className={RANKINGS_PANEL}>
            <CardContent className="p-6 sm:p-8">
              <h3 className={RANKINGS_SUBHEADING}>College Recruiting Success</h3>
              <p className={`${RANKINGS_BODY} mb-4`}>
                This class has already drawn unprecedented attention from college coaches across the country. With the
                NCAA contact period opening, athletes from this group received interest from local programs like UNC, NC
                State, Gardner-Webb, Appalachian State, UMO, Greensboro, and Pembroke — and from national powers
                including Stanford, Virginia, Brown, Northwestern, and Bucknell.
              </p>
            </CardContent>
          </Card>

          <Card className={RANKINGS_PANEL}>
            <CardContent className="p-6 sm:p-8">
              <h2 className={RANKINGS_HEADING}>Official Rankings</h2>
              <p className={`${RANKINGS_BODY} mb-4`}>
                Our rankings prioritize performance at the national level, where athletes measure themselves against the
                country's best. Quality of wins — especially against nationally ranked opponents — carries significant
                weight, along with success in college opens, which demonstrate readiness beyond the high school level.
                High-profile statewide wins and championship results provide important context, while academic
                performance (GPA) is also factored in as a marker of overall college readiness.
              </p>
            </CardContent>
          </Card>

          <div className={RANKINGS_FILTER_BAR}>
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="Search by name, school, or weight class..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={RANKINGS_INPUT}
                  />
                </div>

                {/* Filters and View Toggle */}
                <div className="flex flex-wrap items-center gap-4 justify-between">
                  <div className="flex flex-wrap gap-4">
                    <Select value={selectedGender} onValueChange={setSelectedGender}>
                      <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Men&apos;s Wrestling</SelectItem>
                        <SelectItem value="Female">Women&apos;s Wrestling</SelectItem>
                      </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        onClick={() => setSearchTerm("")}
                        size="sm"
                        className="border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        <Filter className="h-4 w-4 mr-2" />
                        Clear Search
                      </Button>
                    )}
                  </div>

                  <ViewToggle view={viewMode} onChange={setViewMode} variant="dark" />
                </div>

                {/* Active Filters Display */}
                {hasActiveFilters && (
                  <div className="flex flex-wrap gap-2">
                    {searchTerm && (
                      <Badge variant="secondary" className="bg-[#D3B574]/20 text-[#D3B574] border-[#D3B574]/30">
                        Search: &quot;{searchTerm}&quot;
                      </Badge>
                    )}
                  </div>
                )}
            </div>
          </div>

          {/* Content */}
          <div>
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300">{error}</div>
            )}

            {/* Rankings Display */}
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-white" />
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-bold text-white">Top 30 Wrestling Prospects</h2>
                    <div className="text-sm text-white">Showing {filteredRankings.length} ranked prospects</div>
                  </div>
                  {lastUpdated && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-300" />
                      <span className="text-gray-300">
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
                    <p className="text-sm text-gray-300 italic">Scroll right to see more data and profile links →</p>
                  </div>
                )}

                {viewMode === "table" ? (
                  <RankingsTableView athletes={filteredRankings} theme="dark" />
                ) : (
                  <RankingsCardView athletes={filteredRankings} theme="dark" />
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
          </div>

          {/* Navigation to Other Rankings and Prospects */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">
            <Link href="/public-rankings/2028">
              <Card className="bg-gradient-to-br from-[#B31B1B] to-[#8B1515] text-white hover:shadow-xl transition-shadow cursor-pointer h-full">
                <CardContent className="p-6 sm:p-8 text-center flex flex-col items-center justify-center h-full">
                  <Trophy className="h-12 w-12 sm:h-16 sm:w-16 mb-4 text-[#D3B574]" />
                  <h3 className="text-xl sm:text-2xl font-bold mb-2">Class of 2028 Rankings</h3>
                  <p className="text-red-100 mb-4">View the Top 25 ranked prospects for 2028</p>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="bg-[#D3B574] text-gray-900 hover:bg-[#D3B574]/90"
                  >
                    View 2028 Rankings
                  </Button>
                </CardContent>
              </Card>
            </Link>

            <Link href="/prospects/all">
              <Card className="bg-gradient-to-br from-[#1e3a8a] to-[#0a2571] text-white hover:shadow-xl transition-shadow cursor-pointer h-full">
                <CardContent className="p-6 sm:p-8 text-center flex flex-col items-center justify-center h-full">
                  <Users className="h-12 w-12 sm:h-16 sm:w-16 mb-4 text-[#D3B574]" />
                  <h3 className="text-xl sm:text-2xl font-bold mb-2">All Prospects</h3>
                  <p className="text-blue-100 mb-4">Browse the complete database of North Carolina prospects</p>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="bg-[#D3B574] text-gray-900 hover:bg-[#D3B574]/90"
                  >
                    View All Prospects
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0f1c2e] py-16">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-3xl font-bold mb-4">Join the Legacy</h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                The Class of 2027 has set the standard. Be part of the next generation of NC United excellence.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-[#D3B574] hover:bg-[#D3B574]/90 text-[#003366] font-semibold">
                  Learn About NC United
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-[#003366] bg-transparent"
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
