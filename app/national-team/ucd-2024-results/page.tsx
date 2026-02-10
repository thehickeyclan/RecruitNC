"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Trophy, Users, Target, Loader2, Calendar, MapPin, ChevronRight, Filter, Search, ArrowUpDown } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { getFullTournamentData, type TournamentResult, type DualResult } from "@/lib/nc-united-api"
import { getStorageImageUrl } from "@/lib/nc-united-storage"
import { Footer } from "@/components/footer"

export default function UCD2024Results() {
  const [loading, setLoading] = useState(true)
  const [tournament, setTournament] = useState<any>(null)
  const [results, setResults] = useState<TournamentResult[]>([])
  const [duals, setDuals] = useState<DualResult[]>([])
  const [error, setError] = useState<string | null>(null)
  
  // Filter and sort state
  const [searchTerm, setSearchTerm] = useState("")
  const [weightFilter, setWeightFilter] = useState<string>("all")
  const [recordFilter, setRecordFilter] = useState<string>("all")
  const [sortColumn, setSortColumn] = useState<"weight" | "name" | "record" | "points">("weight")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getFullTournamentData("Ultimate Club Duals", 2024)
        setTournament(data.tournament)
        setResults(data.results)
        setDuals(data.duals)
      } catch (err: any) {
        console.error("Error loading UCD 2024 data:", err)
        setError(err.message || "Failed to load tournament data")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Filter and sort logic
  const filteredAndSortedResults = useMemo(() => {
    let filtered = results.filter((result) => {
      const fullName = `${result.wrestler.first_name} ${result.wrestler.last_name}`.toLowerCase()
      const matchesSearch = !searchTerm || fullName.includes(searchTerm.toLowerCase())
      const matchesWeight = weightFilter === "all" || result.weight.toString() === weightFilter
      
      let matchesRecord = true
      if (recordFilter !== "all") {
        const [wins, losses] = result.record.split("-").map(Number)
        if (recordFilter === "undefeated") matchesRecord = losses === 0
        else if (recordFilter === "one-loss") matchesRecord = losses === 1
        else if (recordFilter === "two-loss") matchesRecord = losses === 2
        else if (recordFilter === "three-plus") matchesRecord = losses >= 3
      }
      
      return matchesSearch && matchesWeight && matchesRecord
    })

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0
      if (sortColumn === "weight") {
        comparison = a.weight - b.weight
      } else if (sortColumn === "name") {
        const nameA = `${a.wrestler.first_name} ${a.wrestler.last_name}`
        const nameB = `${b.wrestler.first_name} ${b.wrestler.last_name}`
        comparison = nameA.localeCompare(nameB)
      } else if (sortColumn === "record") {
        const [winsA, lossesA] = a.record.split("-").map(Number)
        const [winsB, lossesB] = b.record.split("-").map(Number)
        comparison = winsA - winsB || lossesA - lossesB
      } else if (sortColumn === "points") {
        comparison = (a.total_points || 0) - (b.total_points || 0)
      }
      return sortDirection === "asc" ? comparison : -comparison
    })

    return filtered
  }, [results, searchTerm, weightFilter, recordFilter, sortColumn, sortDirection])

  const handleSort = (column: "weight" | "name" | "record" | "points") => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("desc")
    }
  }

  const getRecordBadgeColor = (record: string) => {
    const [wins, losses] = record.split("-").map(Number)
    if (losses === 0) return "bg-green-600 text-white"
    if (losses === 1) return "bg-blue-600 text-white"
    if (losses === 2) return "bg-orange-500 text-white"
    return "bg-gray-700 text-white"
  }


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
            {/* Red Badge - Tournament Recap */}
            <Badge className="mb-6 bg-[#B31B1B] text-white text-base md:text-lg px-6 py-2 rounded-full">
              Tournament Recap
            </Badge>

            {/* Main Headline with Flame Emojis - White Text on Dark Blue Background */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight text-white mb-4 md:mb-6">
              🔥 NC United Takes 2nd at Ultimate Club Duals! 🔥
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-white mb-8 md:mb-12 max-w-2xl mx-auto">
              A spectacular finish for our inaugural team
            </p>

            {/* Event Details */}
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 mb-8 md:mb-12 text-white">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span>September 19-21, 2024</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <span>State College, PA</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                <span>2nd Place Finish</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Photo Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="relative w-full aspect-[16/9] bg-gray-200 rounded-lg overflow-hidden">
            <Image
              src={getStorageImageUrl("/images/ucd-team-group-front.png")}
              alt="NC United team photo at Ultimate Club Duals 2024"
              fill
              className="object-cover"
              onError={(e) => {
                // Try fallback images
                const img = e.currentTarget as HTMLImageElement
                if (img.src.includes("ucd-team-group-front")) {
                  img.src = getStorageImageUrl("/images/ucd-team-singlets.png")
                } else if (img.src.includes("ucd-team-singlets")) {
                  img.src = getStorageImageUrl("/images/ucd-team-lineup-back.png")
                } else {
                  img.style.display = "none"
                }
              }}
            />
            {/* Overlay text on bottom left */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 md:p-8">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">NC United - Inaugural Team</h2>
              <p className="text-white/90 text-base md:text-lg">Ultimate Club Duals 2024 • 2nd Place Gold Pool</p>
            </div>
            {/* Navigation arrow on right */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 rounded-full p-2 cursor-pointer transition-colors">
              <ChevronRight className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </section>

      {/* Summary/Callout Box */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="border-l-4 border-[#002147] pl-6 md:pl-8 bg-gradient-to-r from-blue-50 to-pink-50 rounded-lg p-6 md:p-8">
            <p className="text-base md:text-lg leading-relaxed text-[#002147]">
              An incredible performance by NC United at the Ultimate Club Duals! Our inaugural team took 2<sup>nd</sup> in the Gold Pool, losing to just one team throughout the entire tournament, and proving that NC can compete with the best in the country when we are &quot;United!&quot;
            </p>
          </div>
        </div>
      </section>

      {/* The Toughest Pool Challenge Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-[#002147] mb-4 md:mb-6">The Toughest Pool Challenge</h2>
          <p className="text-base md:text-lg leading-relaxed text-gray-700 mb-6 md:mb-8">
            We began in what the tournament director called &quot;the toughest pool,&quot; facing elite teams Triumph and Meatballs, the eventual tournament champions. Day 1 ended with a 3-1 record, including an impressive 39-22 victory over the highly regarded Team Triumph in our opening match.
          </p>
          {/* Team Photo under the text */}
          <div className="relative w-full aspect-video bg-gray-200 rounded-lg overflow-hidden">
            <Image
              src={getStorageImageUrl("/images/ucd-team-victory-photo.png")}
              alt="NC United team photo on orange wrestling mat at Ultimate Club Duals 2024"
              fill
              className="object-cover"
              onError={(e) => {
                // Try fallback images
                const img = e.currentTarget as HTMLImageElement
                if (img.src.includes("ucd-team-victory-photo")) {
                  img.src = getStorageImageUrl("/images/ucd-team-group-front.png")
                } else if (img.src.includes("ucd-team-group-front")) {
                  img.src = getStorageImageUrl("/images/ucd-team-singlets.png")
                } else {
                  img.style.display = "none"
                }
              }}
            />
          </div>
        </div>
      </section>

      {/* Dominating Performance on Day 2 Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-[#002147] mb-4 md:mb-6">Dominating Performance on Day 2</h2>
          <p className="text-base md:text-lg leading-relaxed text-gray-700 mb-6 md:mb-8">
            On Day 2, we dominated a tough &quot;Brothers of Wow&quot; team 49-20, setting up a semi-final matchup with &quot;Team Gotcha.&quot; It came down to a heavyweight bout that secured our spot in the finals for a rematch with Meatballs. We finished as Gold Pool runner-up, showing NC can compete at the highest level when we are United!
          </p>

          {/* Team Photo - Wrestlers in singlets showing backs */}
          <div className="relative w-full aspect-video bg-gray-200 rounded-lg overflow-hidden mb-8 md:mb-12">
            <Image
              src={getStorageImageUrl("/images/ucd-team-lineup-back.png")}
              alt="NC United team showing unity and team spirit at Ultimate Club Duals 2024"
              fill
              className="object-cover"
              onError={(e) => {
                // Try fallback images
                const img = e.currentTarget as HTMLImageElement
                if (img.src.includes("ucd-team-lineup-back")) {
                  img.src = getStorageImageUrl("/images/ucd-team-singlets.png")
                } else if (img.src.includes("ucd-team-singlets")) {
                  img.src = getStorageImageUrl("/images/ucd-team-singlets-display.png")
                } else {
                  img.style.display = "none"
                }
              }}
            />
          </div>

          {/* Two Cards Side by Side */}
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {/* Left Card: Tournament Results */}
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Trophy className="w-6 h-6 text-[#002147]" />
                  <h3 className="text-2xl font-bold text-[#002147]">Tournament Results</h3>
                </div>
                <div className="space-y-3">
                  {/* vs Team Triumph - Win */}
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="font-semibold text-gray-700">vs Team Triumph</span>
                    <Badge className="bg-green-600 text-white px-3 py-1 rounded-full">W 39-22</Badge>
                  </div>
                  {/* vs Meatballs (Pool) - Loss */}
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <span className="font-semibold text-gray-700">vs Meatballs (Pool)</span>
                    <Badge className="bg-red-600 text-white px-3 py-1 rounded-full">L 27-45</Badge>
                  </div>
                  {/* vs Michigan Premier Gold - Win */}
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="font-semibold text-gray-700">vs Michigan Premier Gold</span>
                    <Badge className="bg-green-600 text-white px-3 py-1 rounded-full">W 61-12</Badge>
                  </div>
                  {/* vs Mat Assassins Blue - Win */}
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="font-semibold text-gray-700">vs Mat Assassins Blue</span>
                    <Badge className="bg-green-600 text-white px-3 py-1 rounded-full">W 42-30</Badge>
                  </div>
                  {/* vs Brothers of WOW - Win */}
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="font-semibold text-gray-700">vs Brothers of WOW</span>
                    <Badge className="bg-green-600 text-white px-3 py-1 rounded-full">W 49-20</Badge>
                  </div>
                  {/* vs Team Gotcha (Semi) - Win */}
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="font-semibold text-gray-700">vs Team Gotcha (Semi)</span>
                    <Badge className="bg-green-600 text-white px-3 py-1 rounded-full">W 38-31</Badge>
                  </div>
                  {/* vs Meatballs (Final) - Loss */}
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <span className="font-semibold text-gray-700">vs Meatballs (Final)</span>
                    <Badge className="bg-red-600 text-white px-3 py-1 rounded-full">L 22-48</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right Card: Final Stats */}
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Users className="w-6 h-6 text-[#002147]" />
                  <h3 className="text-2xl font-bold text-[#002147]">Final Stats</h3>
                </div>
                <div className="space-y-4">
                  {/* Gold Pool Finish */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-4xl font-bold text-blue-600 mb-2">2nd</div>
                    <div className="text-sm font-semibold text-gray-700">Gold Pool Finish</div>
                  </div>
                  {/* Dual Meet Record */}
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-4xl font-bold text-green-600 mb-2">5-2</div>
                    <div className="text-sm font-semibold text-gray-700">Dual Meet Record</div>
                  </div>
                  {/* Individual Matches */}
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-4xl font-bold text-purple-600 mb-2">61-44</div>
                    <div className="text-sm font-semibold text-gray-700">Individual Matches</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Special Recognition Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-[#002147] mb-6 md:mb-8">Special Recognition</h2>
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-6 md:p-8">
              <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-center">
                {/* Text Content */}
                <div className="space-y-4">
                  <p className="text-base md:text-lg leading-relaxed text-gray-700">
                    Special shout-out to <strong>Ethan Oakley</strong>, who made his coaching debut and provided thoughtful feedback to each wrestler. His pride in NC was clear, and we&apos;re grateful to have him with us.
                  </p>
                  <p className="text-base md:text-lg leading-relaxed text-gray-700">
                    Also, thankful to have some of our club coaches in the corner, offering valuable individual feedback and helping with match strategy.
                  </p>
                  <p className="text-base md:text-lg leading-relaxed text-gray-700">
                    A huge thank you to the parents for organizing and supporting us all weekend—your energy was incredible! And a special shout-out to our photographer, <strong>Joe Taylor</strong>, for volunteering his time and talent.
                  </p>
                </div>
                {/* Image */}
                <div className="relative w-full aspect-square max-w-md mx-auto">
                  <Image
                    src={getStorageImageUrl("/images/EthanOakley.png")}
                    alt="Ethan Oakley"
                    fill
                    className="object-cover rounded-lg"
                    onError={(e) => {
                      // Try alternative filenames
                      const img = e.currentTarget as HTMLImageElement
                      if (img.src.includes("EthanOakley.png")) {
                        img.src = getStorageImageUrl("/images/ethan-oakley.png")
                      } else if (img.src.includes("ethan-oakley")) {
                        img.src = getStorageImageUrl("/images/ethan-oakley-coach.png")
                      } else {
                        img.style.display = "none"
                      }
                    }}
                  />
                  {/* Name overlay at bottom left */}
                  <div className="absolute bottom-0 left-0 bg-black/80 px-4 py-2 rounded-tr-lg">
                    <p className="text-white font-semibold">Ethan Oakley</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Looking Forward Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-[#002147] mb-6 md:mb-8">Looking Forward</h2>
          <Card className="bg-gradient-to-r from-[#002147] to-[#B31B1B] border-0 shadow-lg">
            <CardContent className="p-6 md:p-8 text-white">
              <p className="text-lg md:text-xl leading-relaxed mb-4">
                We left State College, PA, turning heads and opening eyes, but we know our best days are ahead.
              </p>
              <p className="text-lg md:text-xl leading-relaxed mb-4">
                This was validation we are on the right path.
              </p>
              <p className="text-xl md:text-2xl font-bold">
                Extremely proud of this team and excited for what&apos;s next! 🔥
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Team Gallery Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-[#002147] mb-2 text-center">Team Gallery</h2>
          <p className="text-center text-gray-600 mb-8 md:mb-12">
            NC United wrestlers in action at UCD 2024
          </p>

          {/* Main Team Photo */}
          <div className="relative w-full aspect-[16/9] bg-gray-200 rounded-lg overflow-hidden mb-8 md:mb-12">
            <Image
              src={getStorageImageUrl("/images/ucd-team-victory-photo.png")}
              alt="NC United team photo at Ultimate Club Duals 2024"
              fill
              className="object-cover"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement
                if (img.src.includes("ucd-team-victory-photo")) {
                  img.src = getStorageImageUrl("/images/ucd-team-group-front.png")
                } else {
                  img.style.display = "none"
                }
              }}
            />
            {/* Overlay text on bottom left */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 md:p-8">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">NC United - Victory Team Photo</h3>
              <p className="text-white/90 text-base md:text-lg">Ultimate Club Duals 2024 • 2nd Place Finish</p>
            </div>
            {/* Navigation arrow on left */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 rounded-full p-2 cursor-pointer transition-colors">
              <ChevronRight className="w-6 h-6 text-white rotate-180" />
            </div>
          </div>

          {/* Individual Wrestler Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {results
              .sort((a, b) => b.weight - a.weight) // Sort by weight descending to match Individual Results table default
              .map((result) => (
              <Card key={result.id} className="overflow-hidden shadow-lg border-0">
                <div className="relative w-full aspect-square">
                  {result.image_path ? (
                    <Image
                      src={getStorageImageUrl(result.image_path)}
                      alt={`${result.wrestler.first_name} ${result.wrestler.last_name}`}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <Users className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  {/* Overlay with name, weight, and record */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 md:p-4">
                    <p className="text-white font-bold text-sm md:text-base mb-1">
                      {result.wrestler.first_name} {result.wrestler.last_name}
                    </p>
                    <p className="text-white/90 text-xs md:text-sm">
                      {result.weight} lbs • {result.record} Record
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Complete Results Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-4xl md:text-5xl font-black text-[#002147] mb-3 md:mb-4">
              UCD 2024 - Complete Results
            </h2>
            <p className="text-lg md:text-xl text-gray-600">
              Detailed match-by-match performance for every wrestler
            </p>
          </div>

          {/* Record Color Legend */}
          <Card className="mb-8 md:mb-12 bg-white border-gray-200">
            <CardContent className="p-6">
              <h3 className="text-xl md:text-2xl font-bold text-[#002147] mb-4">Record Color Legend</h3>
              <div className="flex flex-wrap gap-4">
                <Badge className="bg-green-600 text-white px-4 py-2 text-base">7-0 Undefeated</Badge>
                <Badge className="bg-blue-600 text-white px-4 py-2 text-base">6-1 One Loss</Badge>
                <Badge className="bg-orange-500 text-white px-4 py-2 text-base">5-2 Two Losses</Badge>
                <Badge className="bg-gray-700 text-white px-4 py-2 text-base">4-3 or more Three+ Losses</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Tournament Bracket & Final Standings */}
          <div className="mb-8 md:mb-12">
            <h3 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6 md:mb-8">Tournament Bracket & Final Standings</h3>
            <div className="grid md:grid-cols-2 gap-6 md:gap-8">
              {/* Pool Play Results */}
              <Card className="bg-white border-gray-200">
                <CardContent className="p-6">
                  <h4 className="text-xl md:text-2xl font-bold text-[#002147] mb-4">Pool Play Results</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="font-semibold text-gray-700">vs Triumph Blue</span>
                      <Badge className="bg-green-600 text-white px-3 py-1">W 39-22</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <span className="font-semibold text-gray-700">vs Meatballs</span>
                      <Badge className="bg-red-600 text-white px-3 py-1">L 27-45</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="font-semibold text-gray-700">vs Michigan Premier Gold</span>
                      <Badge className="bg-green-600 text-white px-3 py-1">W 61-12</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="font-semibold text-gray-700">vs Brothers of WOW</span>
                      <Badge className="bg-green-600 text-white px-3 py-1">W 49-20</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Elimination Rounds */}
              <Card className="bg-white border-gray-200">
                <CardContent className="p-6">
                  <h4 className="text-xl md:text-2xl font-bold text-[#002147] mb-4">Elimination Rounds</h4>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="font-semibold text-gray-700">Semi-Final vs Team Gotcha</span>
                      <Badge className="bg-green-600 text-white px-3 py-1">W 38-31</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <span className="font-semibold text-gray-700">Final vs Meatballs</span>
                      <Badge className="bg-red-600 text-white px-3 py-1">L 22-48</Badge>
                    </div>
                  </div>
                  {/* Final Placement Box */}
                  <div className="border-l-4 border-blue-600 bg-blue-50 rounded-lg p-4 mt-4">
                    <p className="text-lg font-bold text-blue-900 mb-1">Final Placement: 2nd Place</p>
                    <p className="text-base text-blue-800">Overall Record: 5-2</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Tournament Summary */}
          <div>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6 md:mb-8">Tournament Summary</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {/* Undefeated Wrestlers */}
              <Card className="bg-green-100 border-0">
                <CardContent className="p-6 text-center">
                  <div className="text-6xl md:text-7xl font-black text-white mb-3">2</div>
                  <div className="text-lg md:text-xl font-bold text-white mb-2">Undefeated Wrestlers</div>
                  <div className="text-base md:text-lg text-white">
                    Sullivan (7-0), Ouellette (7-0)
                  </div>
                </CardContent>
              </Card>

              {/* 6-1 Records */}
              <Card className="bg-blue-100 border-0">
                <CardContent className="p-6 text-center">
                  <div className="text-6xl md:text-7xl font-black text-blue-600 mb-3">1</div>
                  <div className="text-lg md:text-xl font-bold text-blue-900 mb-2">6-1 Records</div>
                  <div className="text-base md:text-lg text-blue-800">
                    Sly (6-1)
                  </div>
                </CardContent>
              </Card>

              {/* 5-2 Records */}
              <Card className="bg-yellow-100 border-0">
                <CardContent className="p-6 text-center">
                  <div className="text-6xl md:text-7xl font-black text-orange-600 mb-3">6</div>
                  <div className="text-lg md:text-xl font-bold text-orange-900 mb-2">5-2 Records</div>
                  <div className="text-base md:text-lg text-orange-800">
                    Brown, Watt, Hickey, McNair, Blue, Harty
                  </div>
                </CardContent>
              </Card>

              {/* Gold Pool Finish */}
              <Card className="bg-purple-100 border-0">
                <CardContent className="p-6 text-center">
                  <div className="text-5xl md:text-6xl font-black text-purple-600 mb-3">2nd</div>
                  <div className="text-lg md:text-xl font-bold text-purple-900 mb-2">Gold Pool Finish</div>
                  <div className="text-base md:text-lg text-purple-800">
                    5-2 dual meet record
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Individual Wrestler Results Section */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Filter & Search Bar */}
          <Card className="mb-6 bg-gray-100 border-gray-200">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-[#002147]" />
                <h3 className="text-xl md:text-2xl font-bold text-[#002147]">Tournament Results - Filter & Search</h3>
              </div>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search wrestler name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={weightFilter} onValueChange={setWeightFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="All Weights" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Weights</SelectItem>
                    {Array.from(new Set(results.map((r) => r.weight))).sort((a, b) => a - b).map((weight) => (
                      <SelectItem key={weight} value={weight.toString()}>
                        {weight} lbs
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={recordFilter} onValueChange={setRecordFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="All Records" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Records</SelectItem>
                    <SelectItem value="undefeated">Undefeated</SelectItem>
                    <SelectItem value="one-loss">One Loss</SelectItem>
                    <SelectItem value="two-loss">Two Losses</SelectItem>
                    <SelectItem value="three-plus">Three+ Losses</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setWeightFilter("all")
                    setRecordFilter("all")
                  }}
                  className="w-full md:w-auto"
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Individual Wrestler Results Table */}
          <Card className="bg-white border-gray-200">
            <CardContent className="p-6">
              <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                Individual Wrestler Results ({filteredAndSortedResults.length} wrestlers)
              </h3>

              {/* Table - scroll horizontally on narrow screens */}
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th
                        className="text-left p-2 md:p-3 text-xs md:text-sm font-semibold cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("weight")}
                      >
                        <div className="flex items-center gap-1 md:gap-2">
                          Weight {sortColumn === "weight" && <ArrowUpDown className="w-3 h-3 md:w-4 md:h-4" />}
                        </div>
                      </th>
                      <th
                        className="text-left p-2 md:p-3 text-xs md:text-sm font-semibold cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("name")}
                      >
                        <div className="flex items-center gap-1 md:gap-2">
                          Name {sortColumn === "name" && <ArrowUpDown className="w-3 h-3 md:w-4 md:h-4" />}
                        </div>
                      </th>
                      <th
                        className="text-left p-2 md:p-3 text-xs md:text-sm font-semibold cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("record")}
                      >
                        <div className="flex items-center gap-1 md:gap-2">
                          Record {sortColumn === "record" && <ArrowUpDown className="w-3 h-3 md:w-4 md:h-4" />}
                        </div>
                      </th>
                      <th
                        className="text-left p-2 md:p-3 text-xs md:text-sm font-semibold cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("points")}
                      >
                        <div className="flex items-center gap-1 md:gap-2">
                          Team Points {sortColumn === "points" && <ArrowUpDown className="w-3 h-3 md:w-4 md:h-4" />}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedResults.map((result) => (
                      <tr
                        key={result.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="p-2 md:p-3 font-semibold text-sm md:text-base">{result.weight}</td>
                        <td className="p-2 md:p-3 font-bold text-[#002147] text-sm md:text-base">
                          {result.wrestler.first_name} {result.wrestler.last_name}
                        </td>
                        <td className="p-2 md:p-3">
                          <Badge className={`${getRecordBadgeColor(result.record)} text-xs md:text-sm`}>
                            {result.record}
                          </Badge>
                        </td>
                        <td className="p-2 md:p-3 font-semibold text-sm md:text-base">{result.total_points || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-600 italic mt-4 text-center">
                Note: Records exclude forfeits and reflect on-the-mat results only.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Highlights */}
      {tournament.highlights && tournament.highlights.length > 0 && (
        <section className="py-8 md:py-12 bg-white">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-black text-[#002147] mb-6">Tournament Highlights</h2>
            <ul className="space-y-3">
              {tournament.highlights.map((highlight: string, index: number) => (
                <li key={index} className="flex items-start">
                  <Trophy className="w-5 h-5 text-[#CBAF5D] mr-3 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Site Footer */}
      <Footer />
    </div>
  )
}

