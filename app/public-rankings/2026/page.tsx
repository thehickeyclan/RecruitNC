"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AuthGuard } from "@/components/auth-guard"
import { Users, Target, ExternalLink, Instagram, Trophy } from "lucide-react"
import { RankingsTableView } from "@/components/rankings-table-view"

interface Athlete {
  id: string
  name: string
  highschool: string
  weight_display: string
  nhsca_record_display: string | null
  nhsca_results?: any[]
  super_32_record_display: string | null
  super_32_results?: any[]
  state_championship_summary: string
  state_results?: any[]
  has_ranked_win: boolean
  academic_gpa: number | null
  prospect_ranking: number
  photourl?: string
  nationally_ranked_wins?: string | number
}

export default function ClassOf2026RankingsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loadingAthletes, setLoadingAthletes] = useState(true)
  const hasFetched = useRef(false)

  useEffect(() => {
    const fetchAthletes = async () => {
      if (hasFetched.current) return
      hasFetched.current = true

      try {
        console.log("[v0] Fetching public rankings for:", { year: "2026", gender: "Male" })
        const response = await fetch("/api/public-rankings?year=2026&gender=Male")
        if (!response.ok) {
          console.log("[v0] API response not OK:", response.status, response.statusText)
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        console.log("[v0] Received data:", data)
        setAthletes(data.rankings || [])
      } catch (error) {
        console.error("[v0] Error fetching athletes:", error)
      } finally {
        setLoadingAthletes(false)
      }
    }

    if (user && !hasFetched.current) {
      fetchAthletes()
    }
  }, [user])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[#B31B1B]"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const top3Athletes = athletes.slice(0, 3)
  const athletePhotos = [
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-10-14%20at%207.57.01%E2%80%AFAM-PGH2D0MuZAsacRvSqOXnKn1x2sfXGW.png", // Bentley - #1 (celebration photo)
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-10-13%20at%207.18.06%E2%80%AFPM-6P0bLz6VrJAeHTUD4D6Cko2l4KEKLp.png", // Lorenzo - #2
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/cael%20-IXccm5vGGYkKBd43SVsfnkUXFFne6Z.jpg", // Cael - #3
  ]

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#03154C] to-[#1e3a8a] p-6 sm:p-12 mb-12 shadow-2xl">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
            <div className="relative z-10 text-center">
              <h1 className="text-3xl sm:text-5xl font-bold text-white mb-2 text-balance">
                North Carolina College Prospect Rankings
              </h1>
              <p className="text-2xl sm:text-4xl font-bold text-[#D3B574] mb-6 sm:mb-8">Class of 2026</p>

              <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 sm:px-6 py-3 sm:py-4 border border-white/20">
                  <div className="text-2xl sm:text-3xl font-bold text-[#D3B574]">26</div>
                  <div className="text-xs sm:text-sm text-white/90">State Titles</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 sm:px-6 py-3 sm:py-4 border border-white/20">
                  <div className="text-2xl sm:text-3xl font-bold text-[#D3B574]">68</div>
                  <div className="text-xs sm:text-sm text-white/90">State Placements</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 sm:px-6 py-3 sm:py-4 border border-white/20">
                  <div className="text-2xl sm:text-3xl font-bold text-[#D3B574]">2</div>
                  <div className="text-xs sm:text-sm text-white/90">National Ranked</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 sm:px-6 py-3 sm:py-4 border border-white/20">
                  <div className="text-2xl sm:text-3xl font-bold text-[#D3B574]">8</div>
                  <div className="text-xs sm:text-sm text-white/90">NHSCA All-Americans</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-8 shadow-xl">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Top 3 of the Class of 2026</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  {top3Athletes.map((athlete, index) => (
                    <div key={athlete.id} className="text-center">
                      <div className="relative mb-3 sm:mb-4 mx-auto w-full h-[250px] sm:h-[300px] rounded-lg overflow-hidden shadow-lg">
                        <img
                          src={athletePhotos[index] || athlete.photourl || "/placeholder.svg"}
                          alt={athlete.name}
                          className={`w-full h-full object-cover ${index === 2 ? "object-[center_25%]" : ""}`}
                        />
                        {athlete.has_ranked_win && (
                          <div className="absolute bottom-2 left-2">
                            <Badge className="bg-[#D3B574] text-gray-900 text-xs px-2 py-1">Nationally Ranked</Badge>
                          </div>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
                        {index === 0 && athlete.name.includes("Alston") ? "Lorenzo Alston" : athlete.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">{athlete.highschool}</p>
                      <Badge className="bg-[#D3B574] text-gray-900">#{index + 1} Ranked</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 sm:space-y-8 mb-8 sm:mb-12">
            <Card>
              <CardContent className="p-6 sm:p-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">A Unique Class</h2>
                <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-4">
                  The North Carolina Class of 2026 features a unique distinction: 2 consistently nationally ranked top
                  10 athletes in Lorenzo Alston and Bentley Sly. With 26 state titles, 68 state placements, 2 NHSCA
                  finalist appearances, and 8 NHSCA All-American placements, this class has proven themselves on every
                  stage.
                </p>
                <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
                  Their achievements include a Pembroke Open winner, wins over D1 competitors, and numerous victories
                  over nationally ranked opponents. This combination of consistent national-level performance and depth
                  of talent makes the Class of 2026 stand out in North Carolina wrestling.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gray-50 to-white">
              <CardContent className="p-6 sm:p-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-[#002147]" />
                  Statewide Excellence
                </h2>
                <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-4">
                  This group represents high schools across the state, showcasing the broad reach of elite wrestling
                  development in North Carolina. From the mountains to the coast, these athletes have consistently
                  dominated state competition while also making their mark on the national stage.
                </p>
                <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
                  With 26 state championships and 68 total state placements, the Class of 2026 has established
                  themselves as one of the most accomplished groups in recent North Carolina history. Their success at
                  both the state and national levels demonstrates the rising standard of wrestling across the entire
                  state.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="p-6 sm:p-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-[#002147]" />
                  The NC United Pipeline
                </h2>
                <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-4">
                  The Class of 2026 is deeply connected to the NC United program. 3 of the Top 5 ranked wrestlers have
                  been on the NC United National Team, and 6 of the Top 10 are NC United Blue Program members. This
                  integration has fueled both individual and team success, giving athletes opportunities to compete
                  against the nation's best every Sunday.
                </p>
                <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
                  Access to college-level training environments and resources has prepared these athletes for the next
                  level. The NC United Blue program continues to produce athletes ready for the spotlight, with the
                  Class of 2026 leading the way in demonstrating the program's impact on North Carolina wrestling.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-white">
              <CardContent className="p-6 sm:p-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3">
                  <Target className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                  College Recruiting Success
                </h2>
                <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-4">
                  The Class of 2026 has drawn unprecedented attention from college coaches nationwide. Multiple athletes
                  have already committed to Division I programs, including NC State and Appalachian State, with many
                  more in active recruitment.
                </p>
                <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
                  College coaches from across the country — from local programs like UNC, NC State, Gardner-Webb,
                  Appalachian State, UMO, Greensboro, and Pembroke to national powers including Stanford, Virginia,
                  Brown, Northwestern, and Bucknell — have shown strong interest in this talented group. Their success
                  in college opens and against D1 competition has demonstrated they're ready for the next level.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-8 sm:mb-12 overflow-hidden">
            <div className="bg-gradient-to-br from-[#03154C] to-[#1e3a8a] p-6 sm:p-12 border-2 sm:border-4 border-[#D3B574]">
              <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-full overflow-hidden border-2 sm:border-4 border-[#D3B574] shadow-xl">
                    <img
                      src="/images/coach-macchiavello-celebration.png"
                      alt="Coach Mike Macchiavello"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <blockquote className="text-lg sm:text-2xl font-medium text-white italic mb-3 sm:mb-4 leading-relaxed text-center sm:text-left">
                    "The Class of 2026 has proven themselves on every stage — from state championships to national
                    tournaments to college opens. Their success against D1 competition and nationally ranked opponents
                    shows they're ready for the next level."
                  </blockquote>
                  <div className="text-center sm:text-left">
                    <p className="text-base sm:text-lg font-semibold text-[#D3B574]">— Mike Macchiavello</p>
                    <p className="text-sm sm:text-base text-white/80">Co-Founder, NC United</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="mb-8 sm:mb-12">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">
                Official Rankings
              </h2>
              <div className="prose prose-base sm:prose-lg max-w-none text-gray-700">
                <p className="text-center mb-4 sm:mb-6 leading-relaxed">
                  Our rankings prioritize performance at the national level, where athletes measure themselves against
                  the country's best. Quality of wins — especially against nationally ranked opponents — carries
                  significant weight, along with success in college opens, which demonstrate readiness beyond the high
                  school level.
                </p>
                <p className="text-center leading-relaxed">
                  High-profile statewide wins and championship results provide important context, while academic
                  performance (GPA) is also factored in as a marker of overall college readiness. Below you'll find the
                  complete rankings for North Carolina's Class of 2026.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Top 30 Ranked Section */}
          <div className="mb-8 sm:mb-12">
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
                Top 30 Ranked Prospects
              </h2>
            </div>
            <RankingsTableView 
              athletes={athletes.filter(a => a.prospect_ranking && a.prospect_ranking <= 30)} 
              loading={loadingAthletes} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">
            <Card className="bg-gradient-to-r from-[#03154C] to-[#1e3a8a] text-white">
              <CardContent className="p-6 sm:p-8 text-center">
                <Instagram className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-90" />
                <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Follow Our Journey</h3>
                <p className="mb-4 sm:mb-6 opacity-90 text-sm sm:text-base">
                  Stay updated with the latest rankings, tournament results, and recruiting news.
                </p>
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-[#D3B574] text-gray-900 hover:bg-[#D3B574]/90 text-sm sm:text-base"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Follow NC United on Instagram
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#002147] to-[#003366] text-white">
              <CardContent className="p-6 sm:p-8 text-center">
                <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-90" />
                <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Join NC United Blue</h3>
                <p className="mb-4 sm:mb-6 opacity-90 text-sm sm:text-base">
                  Train with the best and develop your skills in our elite program.
                </p>
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-[#D3B574] text-gray-900 hover:bg-[#D3B574]/90 text-sm sm:text-base"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Learn About NC United Blue
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Navigation to Other Rankings and Prospects */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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

            <Link href="/prospects/all">
              <Card className="bg-gradient-to-br from-[#B31B1B] to-[#8B1515] text-white hover:shadow-xl transition-shadow cursor-pointer h-full">
                <CardContent className="p-6 sm:p-8 text-center flex flex-col items-center justify-center h-full">
                  <Users className="h-12 w-12 sm:h-16 sm:w-16 mb-4 text-[#D3B574]" />
                  <h3 className="text-xl sm:text-2xl font-bold mb-2">All Prospects</h3>
                  <p className="text-red-100 mb-4">Browse the complete database of North Carolina prospects</p>
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
        </div>
      </div>
    </AuthGuard>
  )
}
