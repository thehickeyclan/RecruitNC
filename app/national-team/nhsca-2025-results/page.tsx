"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Trophy, Calendar, MapPin, Loader2, Users } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { getFullTournamentData, type TournamentResult, type DualResult } from "@/lib/nc-united-api"
import { getStorageImageUrl } from "@/lib/nc-united-storage"
import { Footer } from "@/components/footer"

export default function NHSCA2025Results() {
  const [loading, setLoading] = useState(true)
  const [tournament, setTournament] = useState<any>(null)
  const [results, setResults] = useState<TournamentResult[]>([])
  const [duals, setDuals] = useState<DualResult[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getFullTournamentData("NHSCA Duals", 2025)
        setTournament(data.tournament)
        setResults(data.results)
        setDuals(data.duals)
        console.log("[NHSCA 2025] Loaded data:", {
          tournament: data.tournament?.name,
          resultsCount: data.results.length,
          wrestlers: data.results.map((r: any) => ({
            name: `${r.wrestler.first_name} ${r.wrestler.last_name}`,
            weight: r.weight,
            record: r.record,
            hasImage: !!r.image_path,
            imagePath: r.image_path
          }))
        })
      } catch (err: any) {
        console.error("Error loading NHSCA 2025 data:", err)
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

  // Count wrestlers by category
  const undefeatedCount = results.filter((r) => r.losses === 0).length
  const sevenOneCount = results.filter((r) => r.wins === 7 && r.losses === 1).length

  // Sort duals by match number
  const sortedDuals = [...duals].sort((a, b) => (a.match_number || 0) - (b.match_number || 0))

  // Get undefeated wrestlers
  const undefeatedWrestlers = results.filter((r) => r.losses === 0)
  const sevenOneWrestlers = results.filter((r) => r.wins === 7 && r.losses === 1)

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - White Background with Blue Badge */}
      <section className="relative bg-white py-12 md:py-20">
        <div className="container mx-auto px-4">
          <Link href="/national-team" className="inline-block mb-6">
            <Button variant="ghost" className="text-[#002147] hover:bg-gray-100">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to National Team
            </Button>
          </Link>

          <div className="max-w-4xl mx-auto text-center">
            {/* Blue Badge */}
            <Badge className="mb-6 bg-[#002147] text-white text-base md:text-lg px-6 py-2 rounded-full">
              Tournament Recap
            </Badge>

            {/* Main Headline - Blue Text */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 md:mb-6 leading-tight text-[#002147]">
              🏆 NC United Makes History at NHSCA Duals! 🏆
            </h1>

            {/* Subheadline - Gray Text */}
            <p className="text-lg md:text-xl text-gray-600 mb-8 md:mb-12 max-w-2xl mx-auto">
              First All-North Carolina team to reach Round of 16
            </p>

            {/* Event Details - Gray Text with Icons */}
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 mb-8 md:mb-12 text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span>May 24-26, 2025</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <span>Virginia Beach, VA</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                <span>Historic Achievement</span>
              </div>
            </div>

            {/* Statistics Cards - Styled Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto">
              <Card className="bg-white border-2 border-gray-200 shadow-lg">
                <CardContent className="p-4 md:p-6 text-center">
                  <div className="text-3xl md:text-4xl font-bold text-[#002147] mb-2">7-1</div>
                  <div className="text-sm md:text-base text-gray-700 font-semibold">Dual Meet Record</div>
                </CardContent>
              </Card>
              <Card className="bg-white border-2 border-gray-200 shadow-lg">
                <CardContent className="p-4 md:p-6 text-center">
                  <div className="text-3xl md:text-4xl font-bold text-[#002147] mb-2">91-21</div>
                  <div className="text-sm md:text-base text-gray-700 font-semibold">Individual Matches</div>
                </CardContent>
              </Card>
              <Card className="bg-white border-2 border-gray-200 shadow-lg">
                <CardContent className="p-4 md:p-6 text-center">
                  <div className="text-3xl md:text-4xl font-bold text-[#002147] mb-2">81%</div>
                  <div className="text-sm md:text-base text-gray-700 font-semibold">Win Percentage</div>
                </CardContent>
              </Card>
              <Card className="bg-white border-2 border-gray-200 shadow-lg">
                <CardContent className="p-4 md:p-6 text-center">
                  <div className="text-3xl md:text-4xl font-bold text-[#002147] mb-2">Round of 16</div>
                  <div className="text-sm md:text-base text-gray-700 font-semibold">Historic Achievement</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Tournament Summary Section - White Background */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="relative w-full aspect-video bg-gray-200 rounded-lg overflow-hidden mb-4">
            <Image
              src="/images/NHSCATEAMPIC.png"
              alt="NC United team photo at NHSCA Duals 2025"
              fill
              className="object-cover"
              onError={(e) => {
                // Fallback to other team photo if version doesn't exist
                const img = e.currentTarget as HTMLImageElement
                if (img.src.includes("NHSCATEAMPIC")) {
                  img.src = "/images/NHSCATEAMPIC2025.png"
                } else if (img.src.includes("NHSCATEAMPIC2025")) {
                  img.src = "/images/nhsca-team-photo-2025.png"
                } else {
                  img.style.display = "none"
                }
              }}
            />
            {/* Overlay text */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">NC United - NHSCA Duals 2025</h2>
              <p className="text-white/90">Virginia Beach, VA • Historic 7-1 Record</p>
            </div>
          </div>

          {/* Text block with blue left border */}
          <div className="border-l-4 border-[#002147] pl-6 mb-8">
            <p className="text-base md:text-lg leading-relaxed text-gray-700">
              NC United Wrestling made history at the 2025 NHSCA Duals in Virginia Beach, delivering a performance
              that will be remembered for years to come. The team achieved what many believed impossible - becoming the
              first All-North Carolina team to ever reach the Round of 16 at NHSCA Duals, breaking new ground for
              wrestling in the Tar Heel State.
            </p>
          </div>

          <h3 className="text-2xl md:text-3xl font-bold text-[#002147] mb-4">Dominant Tournament Performance</h3>
          <p className="text-base md:text-lg leading-relaxed text-gray-700 mb-8">
            With an incredible 7-1 dual meet record and an outstanding 81% individual match win rate (91-21), NC
            United showcased the depth and talent of North Carolina wrestling on the national stage. The team&apos;s
            performance exceeded all expectations and proved that when North Carolina wrestlers unite, they can compete
            with anyone in the country.
          </p>
        </div>
      </section>

      {/* Tournament Highlights Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Tournament Highlights Card */}
            <Card className="bg-white border-2 border-gray-200 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Trophy className="w-8 h-8 text-[#002147]" />
                  <h3 className="text-2xl font-bold text-[#002147]">Tournament Highlights</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <span className="font-semibold text-gray-700">Dual Meet Record</span>
                    <Badge className="bg-green-600 text-white px-3 py-1 rounded-full">7-1</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="font-semibold text-gray-700">Individual Matches</span>
                    <Badge className="bg-blue-600 text-white px-3 py-1 rounded-full">91-21</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <span className="font-semibold text-gray-700">Win Percentage</span>
                    <Badge className="bg-purple-600 text-white px-3 py-1 rounded-full">81%</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <span className="font-semibold text-gray-700">Historic Achievement</span>
                    <Badge className="bg-orange-600 text-white px-3 py-1 rounded-full">Round of 16</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Standout Performers Card */}
            <Card className="bg-white border-2 border-gray-200 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Users className="w-8 h-8 text-[#002147]" />
                  <h3 className="text-2xl font-bold text-[#002147]">Standout Performers</h3>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-4xl font-bold text-[#002147] mb-2">3</div>
                    <div className="text-lg font-semibold text-gray-700 mb-2">Undefeated Wrestlers</div>
                    <div className="text-sm text-gray-600">Alston, Blue, Ouellette</div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-4xl font-bold text-[#002147] mb-2">4</div>
                    <div className="text-lg font-semibold text-gray-700 mb-2">7-1 Records</div>
                    <div className="text-sm text-gray-600">T. Johnson, Sly, McCartney, Sullivan</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Breaking Barriers Section */}
          <Card className="bg-white border-2 border-gray-200 shadow-lg mb-12">
            <CardContent className="p-6 md:p-8">
              <h3 className="text-2xl md:text-3xl font-bold text-[#002147] mb-4">Breaking Barriers</h3>
              <p className="text-gray-700 leading-relaxed text-base md:text-lg">
                This historic achievement represents more than just wins and losses. NC United proved that North
                Carolina has the talent, coaching, and determination to compete at the highest levels of national
                wrestling. The team&apos;s success opens doors for future generations of Tar Heel wrestlers and
                establishes a new standard for what&apos;s possible when the state&apos;s best athletes come together.
              </p>
            </CardContent>
          </Card>

          {/* Tye Johnson Photo Section */}
          <div className="relative w-full aspect-video bg-gray-200 rounded-lg overflow-hidden mb-4">
            <Image
              src={getStorageImageUrl("/images/tyejohnsoncelebration.png")}
              alt="Tye Johnson celebrating victory at NHSCA Duals"
              fill
              className="object-cover"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement
                // Fallback to other Tye Johnson images if celebration image not found
                if (!img.src.includes("tye-johnson-nhsca")) {
                  img.src = getStorageImageUrl("/images/tye-johnson-nhsca.png")
                } else if (!img.src.includes("nhsca-tye-johnson-stance")) {
                  img.src = getStorageImageUrl("/images/nhsca-tye-johnson-stance.png")
                } else {
                  img.style.display = "none"
                }
              }}
            />
          </div>
          <p className="text-center text-sm text-gray-600 italic mb-12">
            Tye Johnson celebrates a crucial victory that helped propel NC United to their historic Round of 16 finish
          </p>

          {/* Elite Coaching Leadership - Yellow/Orange Box */}
          <Card className="bg-yellow-50 border-2 border-yellow-300 shadow-lg mb-8">
            <CardContent className="p-6 md:p-8">
              <h3 className="text-2xl md:text-3xl font-bold text-[#002147] mb-4">Elite Coaching Leadership</h3>
              <p className="text-gray-700 leading-relaxed mb-4 text-base md:text-lg">
                The team was led by an exceptional coaching staff including Michael Macchiavello (2018 NCAA Champion and
                Team USA member), Colton Palmer (NC&apos;s all-time wins leader and founder of NC Wrestling United), Arrad
                Fischer, and Joe Roberts.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4 text-base md:text-lg">
                Their combined expertise and deep understanding of North Carolina wrestling culture created the perfect
                environment for this historic achievement.
              </p>
              <p className="text-gray-700 leading-relaxed text-base md:text-lg">
                Special recognition goes to all the club coaches who supported the team throughout the tournament,
                providing valuable technical guidance and corner coaching.
              </p>
            </CardContent>
          </Card>

          {/* Looking to the Future - Gradient Box */}
          <Card className="bg-gradient-to-r from-[#002147] to-[#B31B1B] border-0 shadow-lg">
            <CardContent className="p-6 md:p-8 text-white">
              <h3 className="text-2xl md:text-3xl font-bold mb-4">Looking to the Future</h3>
              <p className="text-white/90 leading-relaxed mb-4 text-base md:text-lg">
                This historic performance at NHSCA Duals proves that North Carolina wrestling has arrived on the national
                stage. With continued unity and support, the future is incredibly bright for wrestling in the Tar Heel
                State.
              </p>
              <p className="text-white/90 leading-relaxed mb-4 text-base md:text-lg">
                The foundation has been laid for continued success at the highest levels of competition.
              </p>
              <p className="text-xl md:text-2xl font-bold">
                The best is yet to come for NC United Wrestling! 🔥
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Tournament Bracket & Final Standings */}
      {sortedDuals.length > 0 && (
        <section className="py-12 md:py-16 bg-white">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl md:text-4xl font-black text-[#002147] mb-8">Tournament Bracket & Final Standings</h2>
            
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-[#002147] mb-4">Tournament Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sortedDuals.slice(0, 4).map((dual) => {
                  const isWin = dual.result === "W" || dual.result === "Win"
                  return (
                    <Button
                      key={dual.id}
                      className={`h-auto p-4 justify-between ${
                        isWin ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"
                      }`}
                    >
                      <span className="font-semibold">vs {dual.opponent_team}</span>
                      <span className="font-bold">
                        {isWin ? "W" : "L"} {dual.our_score !== null && dual.opponent_score !== null
                          ? `${dual.our_score}-${dual.opponent_score}`
                          : ""}
                      </span>
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-2xl font-bold text-[#002147] mb-4">Additional Matches</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sortedDuals.slice(4).map((dual) => {
                  const isWin = dual.result === "W" || dual.result === "Win"
                  return (
                    <Button
                      key={dual.id}
                      className={`h-auto p-4 justify-between ${
                        isWin ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"
                      }`}
                    >
                      <span className="font-semibold">vs {dual.opponent_team}</span>
                      <span className="font-bold">
                        {isWin ? "W" : "L"} {dual.our_score !== null && dual.opponent_score !== null
                          ? `${dual.our_score}-${dual.opponent_score}`
                          : ""}
                      </span>
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Tournament Summary Stats */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-black text-[#002147] mb-8 text-center">Tournament Summary</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-green-50 border-2 border-green-300 shadow-lg">
              <CardContent className="p-6">
                <div className="text-4xl font-bold text-[#002147] mb-2">3</div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Undefeated Wrestlers</div>
                <div className="text-xs text-gray-600">Alston, Blue, Ouellette</div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 border-2 border-purple-300 shadow-lg">
              <CardContent className="p-6">
                <div className="text-4xl font-bold text-[#002147] mb-2">4</div>
                <div className="text-sm font-semibold text-gray-700 mb-2">7-1 Records</div>
                <div className="text-xs text-gray-600">Sullivan, Sly, McCartney, T. Johnson</div>
              </CardContent>
            </Card>
            <Card className="bg-pink-50 border-2 border-pink-300 shadow-lg">
              <CardContent className="p-6">
                <div className="text-4xl font-bold text-[#002147] mb-2">81%</div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Team Win Rate</div>
                <div className="text-xs text-gray-600">91 wins, 21 losses</div>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50 border-2 border-yellow-300 shadow-lg">
              <CardContent className="p-6">
                <div className="text-4xl font-bold text-[#002147] mb-2">377</div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Total Team Points</div>
                <div className="text-xs text-gray-600">Across all wrestlers</div>
              </CardContent>
            </Card>
          </div>
          
          {/* Historic Achievement - Blue left border */}
          <div className="border-l-4 border-[#002147] pl-6">
            <p className="text-lg font-semibold text-[#002147] mb-2">Overall Dual Record: 7-1</p>
            <p className="text-lg font-bold text-[#002147]">
              First All-North Carolina team to reach Round of 16 at NHSCA Duals
            </p>
          </div>
        </div>
      </section>

      {/* Team Gallery Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-black text-[#002147] mb-2 text-center">Team Gallery</h2>
          <p className="text-center text-gray-600 mb-8 md:mb-12">
            NC United wrestlers in action at NHSCA Duals 2025
          </p>

          <div className="text-center mb-4 text-sm text-gray-600">
            Total results from API: {results.length} | Wrestlers with data: {results.filter((r) => r.wrestler).length}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {results.map((result) => {
              if (!result.wrestler) {
                console.error("[NHSCA 2025] Result missing wrestler data:", result)
                return null
              }
              // Use object-contain for Nate McCartney and Sammy Gantt to prevent head cropping
              const needsContain = 
                (result.wrestler.first_name === "NATHAN" && result.wrestler.last_name === "MCCARTNEY") ||
                (result.wrestler.first_name === "SAMMY" && result.wrestler.last_name === "GANTT")
              const imageClass = needsContain ? "object-contain object-top" : "object-cover"
              
              return (
              <Card key={result.id} className="overflow-hidden shadow-lg border-0">
                <div className="relative w-full aspect-square bg-gray-100">
                  {result.image_path ? (
                    <Image
                      src={getStorageImageUrl(result.image_path)}
                      alt={`${result.wrestler.first_name} ${result.wrestler.last_name}`}
                      fill
                      className={imageClass}
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <Users className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="text-lg font-bold text-[#002147] mb-1">
                    {result.wrestler.first_name} {result.wrestler.last_name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">
                    {result.weight} lbs • {result.record} Record
                  </p>
                </CardContent>
              </Card>
              )
            })}
          </div>
          {results.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600">No wrestlers found. Check console logs for details.</p>
            </div>
          )}
          {results.filter((r) => !r.wrestler).length > 0 && (
            <div className="text-center py-4 bg-yellow-50 border border-yellow-200 rounded-lg mt-4">
              <p className="text-yellow-800 text-sm">
                Warning: {results.filter((r) => !r.wrestler).length} result(s) missing wrestler data. Check database.
              </p>
            </div>
          )}
          <p className="text-center text-sm text-gray-600 italic mt-8">
            Photos from NHSCA National Duals 2025 - showcasing the excellence of NC United wrestlers
          </p>
          <p className="text-center text-sm text-gray-600 italic mt-4">
            Note: Records exclude forfeits and reflect on-the-mat results only.
          </p>
        </div>
      </section>

      {/* Tournament Performance Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-black text-[#002147] mb-2 text-center">
            Tournament Performance
          </h2>
          <p className="text-center text-gray-600 mb-8">Outstanding results across all weight classes</p>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Undefeated Champions */}
            <Card className="bg-white border-2 border-gray-200 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold text-[#002147] mb-4">Undefeated Champions</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <div className="font-bold text-[#002147]">Alston (152)</div>
                    </div>
                    <Badge className="bg-green-600 text-white px-3 py-1 rounded-full">8-0</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <div className="font-bold text-[#002147]">Blue (170)</div>
                    </div>
                    <Badge className="bg-green-600 text-white px-3 py-1 rounded-full">8-0</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <div className="font-bold text-[#002147]">Ouellette (285)</div>
                    </div>
                    <Badge className="bg-green-600 text-white px-3 py-1 rounded-full">8-0</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card className="bg-white border-2 border-gray-200 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold text-[#002147] mb-4">Top Performers</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <div className="font-bold text-[#002147]">T. Johnson (126)</div>
                    </div>
                    <Badge className="bg-blue-600 text-white px-3 py-1 rounded-full">7-1</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <div className="font-bold text-[#002147]">Sly (145)</div>
                    </div>
                    <Badge className="bg-blue-600 text-white px-3 py-1 rounded-full">7-1</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <div className="font-bold text-[#002147]">McCartney (160)</div>
                    </div>
                    <Badge className="bg-blue-600 text-white px-3 py-1 rounded-full">7-1</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <div className="font-bold text-[#002147]">Sullivan (195)</div>
                    </div>
                    <Badge className="bg-blue-600 text-white px-3 py-1 rounded-full">7-1</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Team Statistics */}
            <Card className="bg-white border-2 border-gray-200 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold text-[#002147] mb-4">Team Statistics</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-3xl font-bold text-green-600 mb-1">452</div>
                    <div className="text-sm text-gray-700">Total Team Points</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-3xl font-bold text-blue-600 mb-1">81%</div>
                    <div className="text-sm text-gray-700">Win Percentage</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Site Footer */}
      <Footer />
    </div>
  )
}
