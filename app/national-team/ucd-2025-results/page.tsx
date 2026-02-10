"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Trophy, Calendar, MapPin, Loader2, Search, Filter, Users, Shield, Target, Star, MessageSquare, CheckCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { getFullTournamentData, type TournamentResult, type DualResult } from "@/lib/nc-united-api"
import { getStorageImageUrl } from "@/lib/nc-united-storage"

export default function UCD2025Results() {
  const [loading, setLoading] = useState(true)
  const [tournament, setTournament] = useState<any>(null)
  const [results, setResults] = useState<TournamentResult[]>([])
  const [duals, setDuals] = useState<DualResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [weightFilter, setWeightFilter] = useState("all")

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getFullTournamentData("Ultimate Club Duals", 2025)
        setTournament(data.tournament)
        setResults(data.results)
        setDuals(data.duals)
      } catch (err: any) {
        console.error("Error loading UCD 2025 data:", err)
        setError(err.message || "Failed to load tournament data")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#002147] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-white">Loading tournament results...</p>
        </div>
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-[#002147] flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <p className="text-red-300 mb-4">{error || "Tournament not found"}</p>
          <Link href="/national-team">
            <Button className="bg-white text-[#002147] hover:bg-gray-100">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to National Team
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Calculate stats
  const teamWinPercentage = tournament.win_percentage ? Math.round(tournament.win_percentage) : null
  const individualWinPercentage = tournament.individual_wins && tournament.individual_losses
    ? Math.round((tournament.individual_wins / (tournament.individual_wins + tournament.individual_losses)) * 100)
    : null

  // Get date from tournament or default to September 2025
  const tournamentDate = tournament.start_date
    ? new Date(tournament.start_date).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "September 2025"

  // Count wrestlers by category
  const undefeatedCount = results.filter((r) => r.losses === 0).length
  const oneLossCount = results.filter((r) => r.losses === 1).length
  const twoLossCount = results.filter((r) => r.losses === 2).length
  const threePlusLossCount = results.filter((r) => r.losses >= 3).length

  // Filter results
  const filteredResults = results.filter((result) => {
    const matchesSearch =
      searchTerm === "" ||
      `${result.wrestler.first_name} ${result.wrestler.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.weight.toString().includes(searchTerm) ||
      (result.notes && result.notes.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory = categoryFilter === "all" || result.category === categoryFilter

    const matchesWeight = weightFilter === "all" || result.weight.toString() === weightFilter

    return matchesSearch && matchesCategory && matchesWeight
  })

  // Get unique weights for filter
  const uniqueWeights = Array.from(new Set(results.map((r) => r.weight.toString()))).sort(
    (a, b) => parseInt(a) - parseInt(b)
  )

  // Sort duals by match number
  const sortedDuals = [...duals].sort((a, b) => (a.match_number || 0) - (b.match_number || 0))

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Dark Blue Background */}
      <section className="relative bg-[#002147] text-white py-12 md:py-20">
        <div className="container mx-auto px-4">
          <Link href="/national-team" className="inline-block mb-6">
            <Button variant="ghost" className="text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to National Team
            </Button>
          </Link>

          <div className="max-w-4xl mx-auto text-center">
            {/* Red Badge */}
            <Badge className="mb-6 bg-[#B31B1B] text-white text-base md:text-lg px-6 py-2 rounded-md">
              ULTIMATE CLUB DUALS 2025
            </Badge>

            {/* Main Headline with Flame Emojis */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 md:mb-6 leading-tight">
              🔥 NC UNITED GOES 7-2 AT UCD 2025! 🔥
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-blue-100 mb-8 md:mb-12 max-w-2xl mx-auto">
              A statement weekend showing NC can run with anyone when we are United.
            </p>

            {/* Event Details */}
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 mb-8 md:mb-12 text-blue-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span>{tournamentDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <span>{tournament.location || "State College, PA"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                <span>{tournament.overall_placement || "3rd Overall"}</span>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto">
              <Card className="bg-[#002147]/80 border-[#002147]">
                <CardContent className="p-4 md:p-6 text-center">
                  <div className="text-3xl md:text-4xl font-bold text-[#CBAF5D] mb-2">7-2</div>
                  <div className="text-sm md:text-base text-white">Dual Meet Record</div>
                </CardContent>
              </Card>
              <Card className="bg-[#002147]/80 border-[#002147]">
                <CardContent className="p-4 md:p-6 text-center">
                  <div className="text-3xl md:text-4xl font-bold text-[#CBAF5D] mb-2">94-41</div>
                  <div className="text-sm md:text-base text-white">Individual Matches</div>
                </CardContent>
              </Card>
              <Card className="bg-[#002147]/80 border-[#002147]">
                <CardContent className="p-4 md:p-6 text-center">
                  <div className="text-3xl md:text-4xl font-bold text-[#CBAF5D] mb-2">78%</div>
                  <div className="text-sm md:text-base text-white">Win %</div>
                </CardContent>
              </Card>
              <Card className="bg-[#002147]/80 border-[#002147]">
                <CardContent className="p-4 md:p-6 text-center">
                  <div className="text-3xl md:text-4xl font-bold text-[#CBAF5D] mb-2">69%</div>
                  <div className="text-sm md:text-base text-white">Individual Win %</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Tournament Summary Section - White Background */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-black text-[#002147] mb-6 md:mb-8 text-center">
            Tournament Summary
          </h2>

          <div className="space-y-6 md:space-y-8 text-gray-700">
            <p className="text-base md:text-lg leading-relaxed">
              NC United closed the weekend with a {tournament.team_record || "7-2"} dual record. The squad notched
              statement wins over Roundtree, Michigan Premier Red, Virginia Predators, DoughBoy, Gold Medal, M2, and a
              shutout of Outsiders. Our only setbacks were a tight criteria loss to eventual champion Michigan Premier
              Blue after a 30-30 tie, and a narrow loss to 4M.
            </p>

            <p className="text-base md:text-lg leading-relaxed">
              We wrestled with grit across the lineup, earned bonus in bunches, and finished with three undefeated
              athletes. Momentum is real.
            </p>
          </div>

          {/* Team Photo */}
          <div className="mt-8 md:mt-12">
            <div className="relative w-full aspect-video bg-gray-200 rounded-lg overflow-hidden">
              <Image
                src={getStorageImageUrl("/images/ucd-2025-team-photo.png")}
                alt="NC United celebrating together after a statement weekend at UCD 2025"
                fill
                className="object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none"
                }}
              />
            </div>
            <p className="text-center text-sm text-gray-600 italic mt-4">
              NC United celebrating together after a statement weekend at UCD 2025
            </p>
          </div>
        </div>
      </section>

      {/* Building on Our Foundation Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-black text-[#002147] mb-6 md:mb-8 text-center">
            Building on Our Foundation
          </h2>

          <p className="text-base md:text-lg text-gray-700 mb-8 md:mb-12 leading-relaxed">
            NC United's 2025 performance represents significant growth from our inaugural 2024 season. Moving from a
            pools-and-bracket format to true round-robin competition, we improved across every key metric while facing
            tougher, more consistent competition throughout the weekend.
          </p>

          {/* Comparison Table */}
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <table className="w-full border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-[#002147] text-white">
                  <th className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-left font-bold text-xs md:text-sm">Metric</th>
                  <th className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-left font-bold text-xs md:text-sm">
                    2024 (Inaugural; pools/bracket)
                  </th>
                  <th className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-left font-bold text-xs md:text-sm">
                    2025 (Round robin; true placement)
                  </th>
                  <th className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-center font-bold text-xs md:text-sm">Δ</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <td className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 font-semibold text-xs md:text-sm">Format</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm">Pools + bracket</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm">Full round-robin</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-center text-xs md:text-sm">—</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 font-semibold text-xs md:text-sm">Placement</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm">2nd (Gold Pool)</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm">{tournament.overall_placement || "3rd (True 3rd Overall)"}</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-center text-xs md:text-sm">—</td>
                </tr>
                <tr className="bg-white">
                  <td className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 font-semibold text-xs md:text-sm">Team win rate</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm">71%</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm">{teamWinPercentage || 78}%</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-center text-green-600 font-semibold text-xs md:text-sm">
                    +{teamWinPercentage ? teamWinPercentage - 71 : 7} pts
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 font-semibold text-xs md:text-sm">Individual win rate</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm">58.1%</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm">69.6%</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-center text-green-600 font-semibold text-xs md:text-sm">
                    +11.5 pts
                  </td>
                </tr>
                <tr className="bg-white">
                  <td className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 font-semibold text-xs md:text-sm">Undefeated wrestlers</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm">2</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm">{undefeatedCount}</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-center text-green-600 font-semibold text-xs md:text-sm">
                    +{undefeatedCount - 2}
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 font-semibold text-xs md:text-sm">Wrestlers with winning records</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm">11 of 15</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm">12 of 15</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-center text-green-600 font-semibold text-xs md:text-sm">+1</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Veterans Lead, Newcomers Deliver Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-black text-[#002147] mb-6 md:mb-8 text-center">
            Veterans Lead, Newcomers Deliver
          </h2>

          <div className="relative w-full aspect-video bg-gray-200 rounded-lg overflow-hidden mt-8">
            <Image
              src={getStorageImageUrl("/images/tobin-mac-bentley-trio.jpeg")}
              alt="Veteran leadership trio: Tobin McNair (left), Mac Johnson (center), and Bentley Sly (right) after their dominant performances"
              fill
              className="object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none"
              }}
            />
          </div>
          <p className="text-center text-sm text-gray-600 italic mt-4">
            Veteran leadership trio: Tobin McNair (left), Mac Johnson (center), and Bentley Sly (right) after their
            dominant performances
          </p>

          <div className="mt-8 md:mt-12 max-w-3xl mx-auto">
            <p className="text-base md:text-lg text-gray-700 leading-relaxed">
              Our core returned intact with six vets from last year&apos;s UCD team—Bentley Sly, Carson Raper, Eli
              Taylor, Tobin McNair, Jack Harty, and Mac Johnson—and they delivered exactly what you&apos;d expect (Sly
              9–0, Harty 9–0, Johnson 8–1, McNair 7–2, Raper 6–3, Taylor 6–3). The newcomers to UCD made an immediate
              impact, headlined by Gavin Lopez (9–0) and Jacob Perry (8–1), plus strong weekends from Sam Harper
              (6–3), Aiden White (6–3), and Jekai Sedgwick (4–5)—all three having previously wrestled for our NHSCA Dual
              team—along with first-time NC United wrestlers Jaxon Thomas (5–4), Aaron Ellison (5–4), Braylon Butts
              (4–5), and Blayden Thompson (2–7). Bottom line: a young roster with real depth, reinforced by
              battle-tested leaders.
            </p>
          </div>
        </div>
      </section>

      {/* Tournament Statistics Section */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-white">
              <CardContent className="p-6 text-center">
                <Trophy className="w-8 h-8 text-[#002147] mx-auto mb-4" />
                <div className="text-4xl font-bold text-[#002147] mb-2">7-2</div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Dual Meet Record</div>
                <div className="text-xs text-gray-500">78% Win Rate</div>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 text-[#002147] mx-auto mb-4" />
                <div className="text-4xl font-bold text-[#002147] mb-2">94-41</div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Individual Matches</div>
                <div className="text-xs text-gray-500">80-41 on the mat</div>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-6 text-center">
                <Trophy className="w-8 h-8 text-[#B31B1B] mx-auto mb-4" />
                <div className="text-4xl font-bold text-[#002147] mb-2">3rd</div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Overall Placement</div>
                <div className="text-xs text-gray-500">Lost to champs on criteria</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Survey Highlights Section */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <Card className="bg-white">
            <CardContent className="p-6 md:p-8">
              <h2 className="text-3xl md:text-4xl font-black text-[#002147] mb-6 md:mb-8 text-center">
                Survey Highlights
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-bold text-orange-600 mb-2">32</div>
                  <div className="text-sm font-semibold text-gray-700 mb-1">Total Responses</div>
                  <div className="text-xs text-gray-500">Athletes & Parents</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-bold text-green-600 mb-2">100%</div>
                  <div className="text-sm font-semibold text-gray-700 mb-1">Would Recommend</div>
                  <div className="text-xs text-gray-500">UCD Experience</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-bold text-[#B31B1B] mb-2">4.74</div>
                  <div className="text-sm font-semibold text-gray-700 mb-1">Average Rating</div>
                  <div className="text-xs text-gray-500">Across All Categories</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-bold text-[#002147] mb-2">4.87</div>
                  <div className="text-sm font-semibold text-gray-700 mb-1">Highest Rating</div>
                  <div className="text-xs text-gray-500">Event Organization</div>
                </div>
              </div>
              <p className="text-center text-gray-700 text-sm md:text-base max-w-3xl mx-auto">
                Feedback collected from both Blue and Gold team participants shows strong satisfaction with the tournament
                experience, competition level, and organizational quality. Suggestions for improvement focus on
                additional practice opportunities and team building.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Participant Feedback Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-black text-[#002147] mb-2 text-center">Participant Feedback</h2>
          <p className="text-center text-gray-600 mb-8 md:mb-12">
            What athletes and families said about UCD 2025
          </p>

          {/* Rating Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 mb-12">
            <Card className="bg-white">
              <CardContent className="p-4 md:p-6 text-center">
                <div className="text-3xl md:text-4xl font-bold text-[#002147] mb-2">4.67</div>
                <div className="flex justify-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= 4 ? "fill-yellow-400 text-yellow-400" : "fill-yellow-200 text-yellow-200"
                      }`}
                    />
                  ))}
                </div>
                <div className="text-sm font-semibold text-gray-700">Overall Experience</div>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-4 md:p-6 text-center">
                <div className="text-3xl md:text-4xl font-bold text-[#002147] mb-2">4.77</div>
                <div className="flex justify-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= 4 ? "fill-yellow-400 text-yellow-400" : "fill-yellow-200 text-yellow-200"
                      }`}
                    />
                  ))}
                </div>
                <div className="text-sm font-semibold text-gray-700">Competition Quality</div>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-4 md:p-6 text-center">
                <div className="text-3xl md:text-4xl font-bold text-[#002147] mb-2">4.87</div>
                <div className="flex justify-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= 4 ? "fill-yellow-400 text-yellow-400" : "fill-yellow-200 text-yellow-200"
                      }`}
                    />
                  ))}
                </div>
                <div className="text-sm font-semibold text-gray-700">Event Organization</div>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-4 md:p-6 text-center">
                <div className="text-3xl md:text-4xl font-bold text-[#002147] mb-2">4.73</div>
                <div className="flex justify-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= 4 ? "fill-yellow-400 text-yellow-400" : "fill-yellow-200 text-yellow-200"
                      }`}
                    />
                  ))}
                </div>
                <div className="text-sm font-semibold text-gray-700">Coaching Support</div>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-4 md:p-6 text-center">
                <div className="text-3xl md:text-4xl font-bold text-[#002147] mb-2">4.67</div>
                <div className="flex justify-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= 4 ? "fill-yellow-400 text-yellow-400" : "fill-yellow-200 text-yellow-200"
                      }`}
                    />
                  ))}
                </div>
                <div className="text-sm font-semibold text-gray-700">Gear Quality</div>
              </CardContent>
            </Card>
          </div>

          {/* Testimonials */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700 italic mb-3">
                      &quot;It was a great experience, only suggestion or feedback would be to take more teams so as many
                      of the athletes have the opportunity to compete with higher level competition. NC United has so
                      many good kids and everybody is eager to get better. If it was possible of course.&quot;
                    </p>
                    <p className="text-sm text-gray-600 font-semibold">Gold Team Athlete</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700 italic mb-3">
                      &quot;The level of competition was perfect for my son&apos;s development. He faced tough opponents
                      but felt supported by the coaching staff throughout.&quot;
                    </p>
                    <p className="text-sm text-gray-600 font-semibold">Blue Team Parent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700 italic mb-3">
                      &quot;Great organization and communication. The tournament ran smoothly and we always knew what was
                      happening next.&quot;
                    </p>
                    <p className="text-sm text-gray-600 font-semibold">Gold Team Parent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Target className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700 italic mb-3">
                      &quot;The team gear quality was excellent and my wrestler felt proud representing NC United. The
                      coaching was top-notch.&quot;
                    </p>
                    <p className="text-sm text-gray-600 font-semibold">Blue Team Athlete</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Dual Meet Results */}
      {sortedDuals.length > 0 && (
        <section className="py-12 md:py-16 bg-white">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="w-6 h-6 text-[#CBAF5D]" />
              <h2 className="text-3xl md:text-4xl font-black text-[#002147]">Dual Meet Results</h2>
            </div>
            <div className="space-y-3">
              {sortedDuals.map((dual) => {
                const isWin = dual.result === "W" || dual.result === "Win"
                return (
                  <div
                    key={dual.id}
                    className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${
                      isWin
                        ? "bg-green-50 border-green-500"
                        : "bg-red-50 border-red-500"
                    }`}
                  >
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-[#002147]">vs {dual.opponent_team}</h3>
                      {dual.notes && <p className="text-sm text-gray-600 mt-1">{dual.notes}</p>}
                    </div>
                    <div className="flex items-center gap-4">
                      {dual.our_score !== null && dual.opponent_score !== null && (
                        <div className="text-2xl font-bold text-[#002147]">
                          {dual.our_score}-{dual.opponent_score}
                        </div>
                      )}
                      <Badge
                        className={`text-base px-4 py-2 ${
                          isWin ? "bg-green-600 text-white" : "bg-red-600 text-white"
                        }`}
                      >
                        {isWin ? "W" : "L"}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Individual Results Section */}
      {results.length > 0 && (
        <section className="py-12 md:py-16 bg-white">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-3xl md:text-4xl font-black text-[#002147] mb-2 text-center">Individual Results</h2>
            <p className="text-center text-gray-600 mb-8">Complete roster performance breakdown</p>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-white">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Trophy className="w-6 h-6 text-green-600" />
                    <span className="text-2xl font-bold text-green-600">{undefeatedCount}</span>
                  </div>
                  <div className="text-sm text-gray-600">Undefeated</div>
                </CardContent>
              </Card>
              <Card className="bg-white">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Shield className="w-6 h-6 text-blue-600" />
                    <span className="text-2xl font-bold text-blue-600">{oneLossCount}</span>
                  </div>
                  <div className="text-sm text-gray-600">One Loss</div>
                </CardContent>
              </Card>
              <Card className="bg-white">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Target className="w-6 h-6 text-yellow-600" />
                    <span className="text-2xl font-bold text-yellow-600">{twoLossCount}</span>
                  </div>
                  <div className="text-sm text-gray-600">Two Losses</div>
                </CardContent>
              </Card>
              <Card className="bg-white">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Users className="w-6 h-6 text-gray-600" />
                    <span className="text-2xl font-bold text-gray-600">{threePlusLossCount}</span>
                  </div>
                  <div className="text-sm text-gray-600">3+ Losses</div>
                </CardContent>
              </Card>
            </div>

            {/* Search & Filter */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-5 h-5 text-[#002147]" />
                  <h3 className="text-lg font-bold text-[#002147]">Search & Filter Results</h3>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      placeholder="Search by name, weight, or notes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-4 py-2 border rounded-md text-[#002147]"
                  >
                    <option value="all">All Categories</option>
                    <option value="undefeated">Undefeated</option>
                    <option value="one-loss">One Loss</option>
                    <option value="two-loss">Two Losses</option>
                    <option value="three-plus">3+ Losses</option>
                  </select>
                  <select
                    value={weightFilter}
                    onChange={(e) => setWeightFilter(e.target.value)}
                    className="px-4 py-2 border rounded-md text-[#002147]"
                  >
                    <option value="all">Weight Class</option>
                    {uniqueWeights.map((weight) => (
                      <option key={weight} value={weight}>
                        {weight} lbs
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Wrestler Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResults.map((result) => (
                <Card key={result.id} className="overflow-hidden">
                  <div className="relative">
                    {result.image_path ? (
                      <div className="relative w-full h-48 bg-gray-200">
                        <Image
                          src={getStorageImageUrl(result.image_path)}
                          alt={`${result.wrestler.first_name} ${result.wrestler.last_name}`}
                          fill
                          className="object-cover"
                onError={(e) => {
                  // Fallback to other team photos
                  const img = e.currentTarget as HTMLImageElement
                  if (img.src && !img.src.includes("ucd-team-group-front")) {
                    img.src = getStorageImageUrl("/images/ucd-team-group-front.png")
                  } else if (img.src && !img.src.includes("team-photo")) {
                    img.src = getStorageImageUrl("/images/team-photo.png")
                  } else {
                    e.currentTarget.style.display = "none"
                  }
                }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                        <Users className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-2">
                      <Badge className="bg-gray-800 text-white text-xs">{result.weight} lbs</Badge>
                      <Badge className="bg-gray-800 text-white text-xs flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {result.record}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="text-xl font-bold text-[#002147] mb-2">
                      {result.wrestler.first_name} {result.wrestler.last_name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-semibold">Record:</span> {result.record}
                    </p>
                    {result.notes && (
                      <p className="text-sm text-gray-700 italic mt-2">{result.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Footer Note */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Note: Records exclude forfeits and reflect on-the-mat results only.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Tournament Gallery Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-black text-[#002147] mb-2 text-center">Tournament Gallery</h2>
          <p className="text-center text-gray-600 mb-8 md:mb-12">
            Capturing the moments from our statement weekend
          </p>

          {/* Photo Album Buttons */}
          <div className="flex flex-col md:flex-row gap-4 mb-8 md:mb-12 justify-center">
            <Button
              asChild
              className="bg-[#002147] hover:bg-[#003366] text-white font-semibold px-6 py-3"
            >
              <a href="https://lightroom.adobe.com/shares/a92edbe1d2cd476a9c5c6f17773badae" target="_blank" rel="noopener noreferrer">
                View Full Photo Album - Brad Harper Photography
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-2 border-[#002147] text-[#002147] hover:bg-[#002147] hover:text-white font-semibold px-6 py-3"
            >
              <a href="https://lightroom.adobe.com/shares/a92edbe1d2cd476a9c5c6f17773badae" target="_blank" rel="noopener noreferrer">
                View Additional Photos from RAW Photography
              </a>
            </Button>
          </div>

          {/* Gallery Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { path: "/images/blayden-thompson-action.jpeg", alt: "Blayden Thompson action shot" },
              { path: "/images/gavin-lopez-celebration.jpeg", alt: "Gavin Lopez celebration" },
              { path: "/images/bentley-sly-action.jpeg", alt: "Bentley Sly action shot" },
              { path: "/images/mac-johnson-tournament.jpeg", alt: "Mac Johnson tournament action" },
              { path: "/images/team-celebration-photo.jpeg", alt: "Team celebration" },
              { path: "/images/braylon-butts-action.jpeg", alt: "Braylon Butts action shot" },
              { path: "/images/bentley-sly-throw.jpeg", alt: "Bentley Sly throw" },
              { path: "/images/jack-harty-wrestling.jpeg", alt: "Jack Harty wrestling" },
              { path: "/images/jacob-perry-celebration.jpeg", alt: "Jacob Perry celebration" },
              { path: "/images/sam-harper-victory.jpeg", alt: "Sam Harper victory" },
              { path: "/images/tobin-mcnair-action.jpeg", alt: "Tobin McNair action shot" },
              { path: "/images/jacob-perry-ground-control.jpeg", alt: "Jacob Perry ground control" },
            ].map((img, idx) => (
              <Card key={idx} className="overflow-hidden shadow-lg border-0">
                <div className="relative w-full aspect-square">
                  <Image
                    src={getStorageImageUrl(img.path)}
                    alt={img.alt}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
