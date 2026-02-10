"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Trophy,
  Medal,
  TrendingUp,
  Users,
  Target,
  Award,
  ExternalLink,
  Instagram,
  GraduationCap,
  Phone,
  Mail,
  Bell,
  Lock,
  BarChart,
} from "lucide-react"
import { RankingsTableView } from "@/components/rankings-table-view"
import { RankingsCardView } from "@/components/rankings-card-view"

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

export default function ClassOf2027RankingsPage() {
  const [viewMode, setViewMode] = useState<"table" | "cards">("table")
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loadingAthletes, setLoadingAthletes] = useState(true)

  useEffect(() => {
    const fetchAthletes = async () => {
      try {
        const response = await fetch("/api/public-rankings/2027")
        if (response.ok) {
          const data = await response.json()
          setAthletes(data.athletes || [])
        }
      } catch (error) {
        console.error("Error fetching athletes:", error)
      } finally {
        setLoadingAthletes(false)
      }
    }

    fetchAthletes()
  }, [])

  if (loadingAthletes) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="relative mx-auto w-24 h-24 mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-red-600 rounded-full animate-pulse"></div>
              <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                <Trophy className="h-12 w-12 text-blue-600" />
              </div>
            </div>

            <h1 className="text-5xl font-bold text-gray-900 mb-2 text-balance">
              North Carolina College Prospect Rankings
            </h1>
            <p className="text-2xl font-semibold text-blue-600 mb-6">Class of 2027 Dropping this Saturday</p>

            <div className="flex flex-wrap justify-center gap-4 mb-6 text-lg font-semibold">
              <Badge variant="secondary" className="text-lg px-4 py-2 bg-blue-100 text-blue-800">
                <Trophy className="h-4 w-4 mr-2" />
                10 State Champions
              </Badge>
              <Badge variant="secondary" className="text-lg px-4 py-2 bg-red-100 text-red-800">
                <Medal className="h-4 w-4 mr-2" />
                34 State Placements
              </Badge>
              <Badge variant="secondary" className="text-lg px-4 py-2 bg-yellow-100 text-yellow-800">
                <Award className="h-4 w-4 mr-2" />7 NHSCA All-Americans
              </Badge>
            </div>
          </div>

          <Card className="mb-12 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardHeader>
              <CardTitle className="text-3xl flex items-center gap-3">
                <GraduationCap className="h-8 w-8" />
                College Coaches — What to Expect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <GraduationCap className="h-6 w-6 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg mb-1">Athlete Academic Profiles</h3>
                  <p className="text-blue-100">GPA, SAT, ACT, transcripts (where available)</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Phone className="h-6 w-6 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg mb-1">Direct Contact Details</h3>
                  <p className="text-blue-100">Athlete e-mail, phone, social profiles</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Bell className="h-6 w-6 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg mb-1">Frequent Updates</h3>
                  <p className="text-blue-100">Automatic alerts after major tournaments, wins, and rankings changes</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Lock className="h-6 w-6 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg mb-1">Coaches Portal Access</h3>
                  <p className="text-blue-100">Secure dashboard to browse, sort, and manage North Carolina recruits</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <BarChart className="h-6 w-6 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg mb-1">Comprehensive Recruiting Data</h3>
                  <p className="text-blue-100">
                    Athletic results, progress metrics, highlight videos, and academic info in one place
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-12 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-red-600 text-white">
              <CardTitle className="text-2xl">Class of 2027 Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="prose prose-lg max-w-none">
                <p className="text-xl text-gray-700 mb-6 leading-relaxed">
                  The North Carolina Class of 2027 has quickly established itself as one of the most accomplished
                  sophomore groups in state history. With 10 state championships, 34 total state placements, and 7 NHSCA
                  All-American honors, this class is already setting a new standard for success. Their performance at
                  the 2025 NHSCA Nationals, where they produced six All-Americans (tied for the second-highest total in
                  state history), confirmed their place among the nation's elite.
                </p>

                <div className="grid md:grid-cols-3 gap-6 my-8">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-6 text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">10</div>
                      <div className="text-sm font-medium text-blue-800">State Champions</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-6 text-center">
                      <div className="text-3xl font-bold text-red-600 mb-2">7</div>
                      <div className="text-sm font-medium text-red-800">NHSCA All-Americans</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="p-6 text-center">
                      <div className="text-3xl font-bold text-yellow-600 mb-2">22/25</div>
                      <div className="text-sm font-medium text-yellow-800">Top 25 are NC United Blue</div>
                    </CardContent>
                  </Card>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="h-6 w-6 text-blue-600" />
                  NC United Pipeline
                </h3>
                <p className="mb-4">The Class of 2027 is deeply tied to the NC United Blue program:</p>
                <ul className="list-disc list-inside mb-6 space-y-2 text-gray-700">
                  <li>All of the Top 10 ranked wrestlers are members of NC United Blue.</li>
                  <li>22 of the Top 25 actively train and compete as part of Blue.</li>
                  <li>9 of the Top 25 have already represented North Carolina on the NC United National Team.</li>
                </ul>
                <p className="mb-6">
                  This integration has fueled both individual and team success, giving athletes opportunities to sharpen
                  their skills against the nation's best.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-red-600" />
                  Making History Together
                </h3>
                <p className="mb-4">
                  Tye Johnson, Mac Johnson, Jekai Sedgwick, and Aiden White competed on the 2025 NC United NHSCA Duals
                  Team, which advanced further than any all-North Carolina squad in history. Johnson added to his resume
                  with a ranked win at NHSCA Duals, underscoring his place as one of the state's premier lightweights.
                </p>
                <p className="mb-6">
                  Tobin McNair, Mac Johnson, Holt Quincy, and Jack Harty were part of the inaugural NC United National
                  Team at Ultimate Club Duals (2024, State College PA), reaching the Gold Pool finalist round. In 2025,
                  Jaxon Thomas, Jekai Sedgwick, Mac Johnson, Tobin McNair, Aiden White, Jack Harty, and Gavin Lopez all
                  competed on the NC United team at Ultimate Club Duals, cementing North Carolina's national presence.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Target className="h-6 w-6 text-green-600" />
                  Highly Recruited Nationwide
                </h3>
                <p className="mb-4">
                  When the NCAA contact period opened, this group's phones lit up. College coaches from across the
                  country and all divisions immediately reached out — from local programs like UNC, NC State,
                  Gardner-Webb, Appalachian State, UMO, Greensboro, and Pembroke to national powers including Stanford,
                  Virginia, Brown, Northwestern, and Bucknell.
                </p>
                <p className="mb-6">
                  Through NC United, the Class of 2027 has gained exposure to the nation's top-ranked athletes and
                  consistent access to elite training opportunities, positioning them for maximum visibility with
                  college programs. By competing at national-level events and sharpening their skills in
                  high-performance environments, these athletes are building the résumés and relationships that
                  translate directly into college recruiting success.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                  The Road Ahead
                </h3>
                <p className="mb-6">
                  With Blue program training, national team competition, and unprecedented college recruiting attention,
                  the Class of 2027 is on pace to become one of the most impactful groups in North Carolina wrestling
                  history. Their mix of state dominance, national success, and program-driven development marks them as
                  the future of the sport in our state.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-12 bg-gradient-to-r from-gray-50 to-blue-50 border-l-4 border-l-blue-600">
            <CardContent className="p-8">
              <blockquote className="text-2xl font-medium text-gray-900 italic text-center mb-4">
                "Exposure to the nation's top-ranked athletes and elite training opportunities is fueling unprecedented
                college recruiting interest in North Carolina's Class of 2027."
              </blockquote>
              <div className="text-center">
                <p className="text-lg font-semibold text-blue-600">Mike Macchiavello</p>
                <p className="text-gray-600">Co-Founder, NC United</p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">Class of 2027 Rankings</h2>
              <p className="text-lg text-gray-700 text-center max-w-4xl mx-auto leading-relaxed">
                Below you'll find the full list of North Carolina's Top 25 sophomores for 2027. This class has already
                combined for 10 state titles, 34 total state placements, and 7 NHSCA All-American finishes — making it
                one of the most accomplished groups in state history. These rankings reflect state and national
                performance, quality of wins, and exposure against elite competition.
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-center mb-6">
            <div className="bg-white rounded-lg p-1 shadow-sm border">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="mr-1"
              >
                Table View
              </Button>
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("cards")}
              >
                Card View
              </Button>
            </div>
          </div>

          <div className="mb-12">
            {viewMode === "table" ? (
              <RankingsTableView athletes={athletes} loading={loadingAthletes} />
            ) : (
              <RankingsCardView athletes={athletes} loading={loadingAthletes} />
            )}
          </div>

          <Card className="mb-12">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-red-600 text-white">
              <CardTitle className="text-2xl">Academic & Recruiting Profiles</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        High School
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        GPA
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Weight
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loadingAthletes ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="flex justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                          </div>
                        </td>
                      </tr>
                    ) : athletes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          No athletes found
                        </td>
                      </tr>
                    ) : (
                      athletes.map((athlete) => (
                        <tr key={athlete.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                #{athlete.prospect_ranking}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{athlete.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{athlete.highschool}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {athlete.academic_gpa ? athlete.academic_gpa.toFixed(2) : "N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{athlete.weight_display}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Button variant="outline" size="sm">
                              <Mail className="h-4 w-4 mr-2" />
                              Contact
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <CardContent className="p-8 text-center">
                <Instagram className="h-12 w-12 mx-auto mb-4 opacity-90" />
                <h3 className="text-2xl font-bold mb-4">Follow Our Journey</h3>
                <p className="mb-6 opacity-90">
                  Stay updated with the latest rankings, tournament results, and recruiting news.
                </p>
                <Button variant="secondary" size="lg" className="bg-white text-blue-600 hover:bg-gray-100" asChild>
                  <a href="https://www.instagram.com/ncwrestlingunited/" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Follow NC United on Instagram
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-red-600 to-red-700 text-white">
              <CardContent className="p-8 text-center">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-90" />
                <h3 className="text-2xl font-bold mb-4">Join NC United Blue</h3>
                <p className="mb-6 opacity-90">Train with the best and develop your skills in our elite program.</p>
                <Button variant="secondary" size="lg" className="bg-white text-red-600 hover:bg-gray-100">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Learn About NC United Blue
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  )
}
