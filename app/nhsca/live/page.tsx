"use client"

import { useEffect, useState } from "react"
import { RefreshCw, Trophy, Users, Target, TrendingUp, ChevronDown, ChevronUp, Search, MapPin, ExternalLink, Flame, Medal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import Image from "next/image"
import Link from "next/link"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { getWinTypeDisplay } from "@/lib/nhsca-live/wrestling-terms"
import { cn } from "@/lib/utils"
import { SeededWinsRanking } from "@/components/nhsca-live/seeded-wins-ranking"

type Classification = "All" | "Freshman" | "Sophomore" | "Junior" | "Senior"

interface NHSCARoster {
  id: string
  name: string
  weight_class: string
  classification: Classification
  school: string
  wins: number
  losses: number
  seed: number | null
  placement: number | null
  bracket_status: string
  bracket_side: string | null
  current_round: string | null
  furthest_consi_round: string | null
  seeded_wins: number | null
  seeded_losses: number | null
  created_at: string
  updated_at: string
}

interface NHSCAMatch {
  id: string
  nc_wrestler_id: string
  nc_wrestler_name: string
  opponent_name: string
  opponent_state: string
  opponent_school: string
  opponent_seed: number | null
  weight_class: string
  classification: Classification
  result: string
  win_type: string
  nc_score: number | null
  opponent_score: number | null
  round: string
  status: string
  created_at: string
}

interface RankedWrestler {
  id: string
  name: string
  weight_class: string
  classification: Classification
  school: string
  state: string
  national_rank: number
}

// Brand Colors - NC United
const NAVY = "#0D1A4D"
const RED = "#B31B1B"
const GOLD = "#D3B574"

// ESPN-style Live Results Ticker - exactly like Super32
function LiveResultsTicker({ matches }: { matches: NHSCAMatch[] }) {
  // Show placeholder when no matches yet
  const demoMatches: NHSCAMatch[] = matches.length === 0 ? [
    { id: "demo1", nc_wrestler_id: "", nc_wrestler_name: "Tournament Starts Soon", opponent_name: "Stay Tuned", opponent_state: "", opponent_school: "", opponent_seed: null, weight_class: "106", classification: "Senior", result: "W", win_type: "DEC", nc_score: 0, opponent_score: 0, round: "", status: "demo", created_at: "" },
  ] : []

  const displayData = matches.length > 0 ? matches : demoMatches
  const displayMatches = [...displayData, ...displayData, ...displayData]

  return (
    <div className="relative overflow-hidden bg-[#0D1A4D] border-b-2 border-[#D3B574]">
      <div className="absolute left-0 top-0 bottom-0 bg-[#B31B1B] px-2 md:px-6 flex items-center z-10">
        <span className="font-bold text-white text-[10px] md:text-sm tracking-wider">LIVE RESULTS</span>
      </div>

      <div className="ticker-wrapper ml-20 md:ml-40">
        <div className="ticker-content">
          {displayMatches.map((match, index) => {
            const isWin = match.result === "W"
            const isDemo = match.status === "demo"
            return (
              <div key={`${match.id}-${index}`} className="inline-flex items-center gap-1.5 md:gap-3 px-3 md:px-8 whitespace-nowrap">
                {isDemo ? (
                  <>
                    <span className="font-bold text-[#D3B574] text-xs md:text-base">NHSCA NATIONALS 2025</span>
                    <span className="text-white/70 text-xs md:text-sm">- Live results will appear here during the tournament</span>
                  </>
                ) : (
                  <>
                    <span className="font-bold text-white text-xs md:text-base">{match.nc_wrestler_name}</span>
                    <span className={cn("font-bold px-1.5 md:px-2 py-0.5 rounded text-xs", isWin ? "bg-green-600 text-white" : "bg-red-600 text-white")}>
                      {isWin ? "W" : "L"}
                    </span>
                    <span className="text-white/90 text-xs hidden sm:inline">{getWinTypeDisplay(match.win_type)}</span>
                    <span className="font-semibold text-white text-xs md:text-base">
                      {match.nc_score}-{match.opponent_score}
                    </span>
                    <span className="text-white/70 text-xs md:text-sm">vs {match.opponent_name}</span>
                    {match.opponent_seed && (
                      <span className="text-[#D3B574] text-xs font-bold">#{match.opponent_seed}</span>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <style jsx>{`
        .ticker-wrapper {
          display: flex;
          overflow: hidden;
          padding: 8px 0;
        }
        @media (min-width: 768px) {
          .ticker-wrapper {
            padding: 12px 0;
          }
        }
        .ticker-content {
          display: flex;
          animation: scroll 240s linear infinite;
        }
        .ticker-content:hover {
          animation-play-state: paused;
        }
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  )
}

// Breaking News / Big Wins Banner - like WinAlertsBanner
function BreakingResults({ matches }: { matches: NHSCAMatch[] }) {
  const bigWins = matches.filter(m => m && m.nc_wrestler_name && (m.result === "W" || m.result === "win") && m.opponent_seed && m.opponent_seed <= 8).slice(0, 5)
  const [currentIndex, setCurrentIndex] = useState(0)
  
  useEffect(() => {
    if (bigWins.length <= 1) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % bigWins.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [bigWins.length])
  
  if (bigWins.length === 0) return null

  const currentWin = bigWins[currentIndex % bigWins.length]
  if (!currentWin) return null

  return (
    <div className="relative bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-4 overflow-hidden">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <Trophy className="h-6 w-6 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center rounded-md bg-white/20 px-2 py-1 text-xs font-bold text-white">
              BIG WIN
            </span>
            <span className="text-sm font-medium text-white/90">NEWS ALERT</span>
            <span className="text-sm text-white/70">-</span>
            <span className="text-sm text-white/90">
              {currentWin.nc_wrestler_name} ({currentWin.weight_class} lbs)
            </span>
          </div>
          <p className="text-lg font-bold text-white">
            {currentWin.nc_wrestler_name} wins by {getWinTypeDisplay(currentWin.win_type)} over #{currentWin.opponent_seed} {currentWin.opponent_name} ({currentWin.nc_score}-{currentWin.opponent_score})
          </p>
        </div>
      </div>
      
      {bigWins.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {bigWins.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentIndex ? "w-6 bg-white" : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function NHSCADashboardPage() {
  const [roster, setRoster] = useState<NHSCARoster[]>([])
  const [matches, setMatches] = useState<NHSCAMatch[]>([])
  const [recentMatches, setRecentMatches] = useState<NHSCAMatch[]>([])
  const [rankedWrestlers, setRankedWrestlers] = useState<RankedWrestler[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [classification, setClassification] = useState<Classification>("All")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "eliminated" | "placed" | "seeded">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedWeights, setSelectedWeights] = useState<string[]>([])
  const [expandedWrestler, setExpandedWrestler] = useState<string | null>(null)
  const [wrestlerMatches, setWrestlerMatches] = useState<Record<string, NHSCAMatch[]>>({})
  const [mounted, setMounted] = useState(false)
  const [sortBy, setSortBy] = useState<"wins" | "weight" | "round" | "name">("wins")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const fetchData = async () => {
    const supabase = getSupabaseBrowserClient()

  let rosterQuery = supabase.from("nhsca_roster").select("*")
  if (classification !== "All") {
    rosterQuery = rosterQuery.eq("classification", classification)
  }
  const { data: rosterData } = await rosterQuery.order("weight_class", { ascending: true })
  
  let matchesQuery = supabase.from("nhsca_matches").select("*")
  if (classification !== "All") {
    matchesQuery = matchesQuery.eq("classification", classification)
  }
  const { data: matchesData } = await matchesQuery
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(5000)

    const { data: allRecentMatches } = await supabase
      .from("nhsca_matches")
      .select("*")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(30)

    // Fetch nationally ranked wrestlers
    const { data: rankedData } = await supabase
      .from("nhsca_ranked_wrestlers")
      .select("*")
      .order("national_rank", { ascending: true })

    setRoster((rosterData as NHSCARoster[]) || [])
    setMatches((matchesData as NHSCAMatch[]) || [])
    setRecentMatches((allRecentMatches as NHSCAMatch[]) || [])
    setRankedWrestlers((rankedData as RankedWrestler[]) || [])
    setLoading(false)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  useEffect(() => {
    const timeout = setTimeout(() => setMounted(true), 100)
    fetchData()

    const supabase = getSupabaseBrowserClient()

    const rosterChannel = supabase
      .channel("nhsca-roster-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "nhsca_roster" }, () => fetchData())
      .subscribe()

    const matchesChannel = supabase
      .channel("nhsca-matches-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "nhsca_matches" }, () => fetchData())
      .subscribe()

    return () => {
      clearTimeout(timeout)
      supabase.removeChannel(rosterChannel)
      supabase.removeChannel(matchesChannel)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [classification])

  useEffect(() => {
    if (expandedWrestler && !wrestlerMatches[expandedWrestler]) {
      const fetchWrestlerMatches = async () => {
        const supabase = getSupabaseBrowserClient()
        const wrestler = roster.find((w) => w.id === expandedWrestler)

        if (wrestler) {
          const { data } = await supabase
            .from("nhsca_matches")
            .select("*")
            .ilike("nc_wrestler_name", wrestler.name)
            .eq("weight_class", wrestler.weight_class)
            .eq("classification", wrestler.classification)
            .eq("status", "completed")
            .order("created_at", { ascending: false })

          setWrestlerMatches((prev) => ({
            ...prev,
            [expandedWrestler]: (data as NHSCAMatch[]) || [],
          }))
        }
      }
      fetchWrestlerMatches()
    }
  }, [expandedWrestler, roster, wrestlerMatches])

  // Helper to check if opponent is nationally ranked
  const isRankedOpponent = (opponentName: string, weightClass: string, classif: Classification) => {
    return rankedWrestlers.find(
      (r) => 
        r.name.toLowerCase() === opponentName.toLowerCase() && 
        r.weight_class === weightClass &&
        r.classification === classif
    )
  }

  // Get matches against ranked opponents
  const rankedMatchups = matches.filter((m) => isRankedOpponent(m.opponent_name, m.weight_class, m.classification))
  const rankedWins = rankedMatchups.filter((m) => isWin(m.result)).length
  const rankedLosses = rankedMatchups.filter((m) => isLoss(m.result)).length

  // Normalize result helper
  const isWin = (result: string) => result === "win" || result === "W"
  const isLoss = (result: string) => result === "loss" || result === "L"

  // Get matches against seeded opponents (tournament seeds #1-16)
  const seededMatchups = matches.filter((m) => m.opponent_seed !== null && m.opponent_seed <= 16)
  const seededWins = seededMatchups.filter((m) => isWin(m.result)).length
  const seededLosses = seededMatchups.filter((m) => isLoss(m.result)).length

  // Helper to get seeded matchup details for a specific wrestler, grouped by seed
  // Matches on full name (case-insensitive) + weight class for accuracy
  const getWrestlerSeededRecord = (wrestlerName: string, weightClass?: string) => {
    const seeded = matches.filter(
      (m) => {
        const nameMatch = m.nc_wrestler_name.toLowerCase() === wrestlerName.toLowerCase()
        const weightMatch = !weightClass || m.weight_class === weightClass
        return nameMatch && weightMatch && m.opponent_seed !== null && m.opponent_seed <= 16
      }
    )
    const group = (list: number[]) => {
      const counts: Record<number, number> = {}
      list.forEach((s) => { counts[s] = (counts[s] || 0) + 1 })
      return Object.entries(counts).map(([seed, count]) => ({ seed: Number(seed), count })).sort((a, b) => a.seed - b.seed)
    }
    return {
      wins: group(seeded.filter((m) => isWin(m.result)).map((m) => m.opponent_seed as number)),
      losses: group(seeded.filter((m) => isLoss(m.result)).map((m) => m.opponent_seed as number)),
    }
  }

  // Stats calculations
  const totalWins = roster.reduce((sum, w) => sum + w.wins, 0)
  const totalLosses = roster.reduce((sum, w) => sum + w.losses, 0)
  const totalMatches = totalWins + totalLosses
  const winPercentage = totalMatches > 0 ? ((totalWins / totalMatches) * 100).toFixed(1) : "0.0"
  const championshipWrestlers = roster.filter((w) => w.losses === 0 && w.wins > 0).length
  const consolationWrestlers = roster.filter((w) => w.losses === 1).length
  const notableWins = matches.filter((m) => isWin(m.result) && m.opponent_seed !== null && m.opponent_seed <= 16).length
  const activeWrestlers = roster.filter((w) => w.losses < 2).length
  const winningRecords = roster.filter((w) => w.wins > w.losses).length

  const weightClasses = Array.from(new Set(roster.map((w) => w.weight_class))).sort(
    (a, b) => Number.parseInt(a) - Number.parseInt(b)
  )

const filteredRoster = roster.filter((w) => {
  // In double elimination, eliminated = 2+ losses
  const isEliminated = w.losses >= 2
  if (filterStatus === "active" && isEliminated) return false
  if (filterStatus === "eliminated" && (!isEliminated || w.placement)) return false
  if (filterStatus === "placed" && !w.placement) return false
  if (filterStatus === "seeded") {
    const rec = getWrestlerSeededRecord(w.name, w.weight_class)
    if (rec.wins.length === 0 && rec.losses.length === 0) return false
  }
  if (searchQuery && !w.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (selectedWeights.length > 0 && !selectedWeights.includes(w.weight_class)) return false
    return true
  })

  const roundOrder: Record<string, number> = { "QF": 5, "R16": 4, "R32": 3, "R64": 2, "R128": 1, "R256": 0 }

  const handleSort = (column: "wins" | "weight" | "round" | "name") => {
    if (sortBy === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortDir(column === "name" ? "asc" : "desc")
    }
  }

  const sortedRoster = [...filteredRoster].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1

    if (sortBy === "name") {
      return dir * a.name.localeCompare(b.name)
    }
    if (sortBy === "weight") {
      return dir * (parseInt(a.weight_class) - parseInt(b.weight_class))
    }
    if (sortBy === "round") {
      const aRound = roundOrder[a.current_round || "R128"] || 0
      const bRound = roundOrder[b.current_round || "R128"] || 0
      return dir * (aRound - bRound)
    }
    // When filtering by seeded opponents, sort by seeded_wins desc
    if (filterStatus === "seeded") {
      const aSeededWins = a.seeded_wins ?? 0
      const bSeededWins = b.seeded_wins ?? 0
      if (bSeededWins !== aSeededWins) return bSeededWins - aSeededWins
      const aSeededLosses = a.seeded_losses ?? 0
      const bSeededLosses = b.seeded_losses ?? 0
      return aSeededLosses - bSeededLosses
    }
    // Default: wins (placed wrestlers always first)
    if (a.placement && !b.placement) return -1
    if (!a.placement && b.placement) return 1
    if (a.placement && b.placement) return a.placement - b.placement
    if (b.wins !== a.wins) return dir * (a.wins - b.wins)
    if (a.losses !== b.losses) return -dir * (a.losses - b.losses)
    return Number.parseInt(a.weight_class) - Number.parseInt(b.weight_class)
  })

  const toggleWeight = (weight: string) => {
    setSelectedWeights((prev) => (prev.includes(weight) ? prev.filter((w) => w !== weight) : [...prev, weight]))
  }

  const clearWeights = () => setSelectedWeights([])

  if (loading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 mx-auto mb-4 text-[#D3B574] animate-spin" />
          <p className="text-[#0D1A4D]">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white animate-in fade-in duration-300">
      {/* Live Results Ticker */}
      <LiveResultsTicker matches={recentMatches} />

      {/* Header - matching Super32 exactly */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
          {/* Mobile Layout: Stacked */}
          <div className="flex flex-col gap-3 sm:hidden">
            {/* Top row: Logos and title */}
            <div className="flex items-center justify-between">
              <Image src="/images/nc-united-logo-navy.png" alt="NC United" width={40} height={40} className="object-contain" />
              <div className="text-center flex-1">
                <div className="text-xl font-bold text-[#B31B1B]">NATIONALS</div>
                <h1 className="text-sm font-bold text-[#0D1A4D]">NC United - NHSCA</h1>
              </div>
              <Image src="/images/nhsca-logo.png" alt="NHSCA" width={40} height={40} className="object-contain" />
            </div>

            {/* Bottom row: Buttons */}
            <div className="flex items-center justify-center gap-1 flex-wrap">
              {(["All", "Freshman", "Sophomore", "Junior", "Senior"] as Classification[]).map((c) => (
                <Button
                  key={c}
                  onClick={() => setClassification(c)}
                  variant={classification === c ? "default" : "outline"}
                  size="sm"
                  className={`text-xs px-2 ${classification === c ? "bg-[#0D1A4D] hover:bg-[#0D1A4D]/90 text-white" : "border-[#0D1A4D] text-[#0D1A4D]"}`}
                >
                  {c === "All" ? "All" : c.slice(0, 2)}
                </Button>
              ))}
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                size="sm"
                className="border-[#D3B574] text-[#0D1A4D] hover:bg-[#D3B574]/10 bg-transparent"
              >
                <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Desktop Layout: Single row */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image src="/images/nc-united-logo-navy.png" alt="NC United" width={60} height={60} className="object-contain" />
              <div>
                <div className="text-2xl font-bold text-[#B31B1B]">NATIONALS</div>
                <h1 className="text-xl font-bold text-[#0D1A4D]">
                  NC United - <span className="font-bold">NHSCA</span>
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                {(["All", "Freshman", "Sophomore", "Junior", "Senior"] as Classification[]).map((c) => (
                  <Button
                    key={c}
                    onClick={() => setClassification(c)}
                    variant={classification === c ? "default" : "outline"}
                    className={`${classification === c ? "bg-[#0D1A4D] hover:bg-[#0D1A4D]/90 text-white" : "border-[#0D1A4D] text-[#0D1A4D]"}`}
                  >
                    {c}
                  </Button>
                ))}
              </div>
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                className="border-[#D3B574] text-[#0D1A4D] hover:bg-[#D3B574]/10 bg-transparent"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Image src="/images/nhsca-logo.png" alt="NHSCA" width={60} height={60} className="object-contain" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breaking News */}
        {matches.length > 0 && <BreakingResults matches={matches} />}

        {/* Ranked Matchups Section */}
        {rankedMatchups.length > 0 && (
          <div className="mt-6 bg-gradient-to-r from-[#0D1A4D] to-[#1a2d6b] rounded-lg p-6 border-2 border-[#D3B574]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#D3B574] rounded-lg">
                <Flame className="w-6 h-6 text-[#0D1A4D]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">NC vs Nationally Ranked</h3>
                <p className="text-[#D3B574] text-sm">{classification} Division - Top 25 Matchups</p>
              </div>
              <div className="ml-auto text-right">
                <div className="text-3xl font-bold text-white">{rankedWins}-{rankedLosses}</div>
                <div className="text-[#D3B574] text-sm">vs Ranked</div>
              </div>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {rankedMatchups.map((match) => {
                const ranked = isRankedOpponent(match.opponent_name, match.weight_class, match.classification)
                return (
                  <div
                    key={match.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg",
                      match.result === "W" ? "bg-green-600/20 border border-green-500/30" : "bg-red-600/20 border border-red-500/30"
                    )}
                  >
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-bold",
                      match.result === "W" ? "bg-green-600 text-white" : "bg-red-600 text-white"
                    )}>
                      {match.result}
                    </span>
                    <div className="flex-1">
                      <span className="font-bold text-white">{match.nc_wrestler_name}</span>
                      <span className="text-white/60 mx-2">vs</span>
                      <span className="text-white">{match.opponent_name}</span>
                      {ranked && (
                        <span className="ml-2 px-2 py-0.5 bg-[#D3B574] text-[#0D1A4D] text-xs font-bold rounded">
                          #{ranked.national_rank} NATIONALLY
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">{match.nc_score}-{match.opponent_score}</div>
                      <div className="text-white/60 text-xs">{match.weight_class} lbs</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Stats Section - like ScoreboardSection */}
        <div className="mt-6 space-y-6">
          {/* Main Stats Banner */}
          <div className="bg-[#B31B1B] rounded-lg p-8 text-white">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">
                NORTH CAROLINA {classification.toUpperCase()} NHSCA STATS
              </h2>
              <p className="text-white/80 mt-1">NHSCA High School Nationals 2025</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-sm text-white/80 mb-2">Total Wrestlers</div>
                <div className="text-5xl font-bold text-[#D3B574]">{roster.length}</div>
              </div>
              <div>
                <div className="text-sm text-white/80 mb-2">NC Record</div>
                <div className="text-5xl font-bold text-[#D3B574]">
                  {totalWins}-{totalLosses}
                </div>
              </div>
              <div>
                <div className="text-sm text-white/80 mb-2">Win Percentage</div>
                <div className="text-5xl font-bold text-[#D3B574]">{winPercentage}%</div>
              </div>
            </div>
          </div>

          {/* Championship/Consolation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border-4 border-green-500 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-green-600 rounded-lg">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#0D1A4D]">Championship Round</h3>
              </div>
              <div className="text-5xl font-bold text-green-600">{championshipWrestlers}</div>
            </div>

            <div className="bg-white border-4 border-orange-500 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-orange-600 rounded-lg">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#0D1A4D]">Consolation Round</h3>
              </div>
              <div className="text-5xl font-bold text-orange-600">{consolationWrestlers}</div>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#D3B574] rounded">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-[#0D1A4D]">Active Wrestlers</h3>
              </div>
              <div className="text-3xl font-bold text-[#0D1A4D]">{activeWrestlers}</div>
              <div className="text-sm text-gray-600 mt-1">with matches competed</div>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-600 rounded">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-[#0D1A4D]">Winning Records</h3>
              </div>
              <div className="text-3xl font-bold text-[#0D1A4D]">{winningRecords}</div>
              <div className="text-sm text-gray-600 mt-1">wrestlers above .500</div>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#B31B1B] rounded">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-[#0D1A4D]">Total Wins</h3>
              </div>
              <div className="text-3xl font-bold text-[#0D1A4D]">{totalWins}</div>
              <div className="text-sm text-gray-600 mt-1">{totalLosses} losses</div>
            </div>

            <div className="bg-white border-2 border-[#D3B574] rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#D3B574] rounded">
                  <Medal className="w-5 h-5 text-[#0D1A4D]" />
                </div>
                <h3 className="font-bold text-[#0D1A4D]">vs Seeded Opponents</h3>
              </div>
              <div className="text-3xl font-bold text-[#0D1A4D]">{seededWins}-{seededLosses}</div>
              <div className="text-sm text-gray-600 mt-1">
                {seededMatchups.length > 0 
                  ? `${((seededWins / seededMatchups.length) * 100).toFixed(0)}% win rate vs seeds`
                  : "no seeded matchups yet"}
              </div>
            </div>

          </div>

          {/* Sponsor Banner - RecruitNC */}
          <a
            href="https://app.ncwrestlingunited.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-[#0D1A4D] rounded-lg p-6 hover:bg-[#0D1A4D]/90 transition-colors"
          >
            <div className="flex items-center justify-center gap-6">
              <Image src="/images/recruitnc-logo.png" alt="RecruitNC" width={100} height={100} className="object-contain" />
              <div className="text-center md:text-left">
                <div className="text-xs text-[#D3B574] font-bold uppercase tracking-widest">Presented By</div>
                <div className="text-3xl font-black text-white">RecruitNC</div>
                <div className="text-white/70 text-sm">NC College Commits, Rankings, Athlete Profiles</div>
              </div>
              <ExternalLink className="w-6 h-6 text-[#D3B574] hidden md:block" />
            </div>
          </a>

          {/* The Guild Sponsor */}
          <a
            href="https://www.wrestlingguild.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 bg-gray-50 hover:bg-gray-100 rounded-lg p-4 border border-gray-200 transition-colors"
          >
            <Image src="/images/guild-logo.png" alt="The Guild" width={60} height={60} className="object-contain" />
            <div className="flex-1">
              <div className="text-xs text-[#D3B574] font-bold uppercase tracking-widest">Sponsor</div>
              <div className="font-bold text-[#0D1A4D]">The Guild</div>
              <div className="text-[#0D1A4D]/60 text-xs">Access The Elite - Master Technique - Private Instruction with D1 Athletes</div>
            </div>
            <ExternalLink className="w-4 h-4 text-[#0D1A4D]/40" />
          </a>

          {/* Seeded Wins Ranking */}
          <SeededWinsRanking roster={roster} currentClassification={classification} />

          {/* Leaderboard */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h3 className="text-xl font-bold text-[#0D1A4D]">
                NORTH CAROLINA {classification.toUpperCase()} LEADERBOARD
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={filterStatus === "all" ? "default" : "outline"}
                    onClick={() => setFilterStatus("all")}
                    className={`${filterStatus === "all" ? "bg-[#B31B1B] hover:bg-[#B31B1B]/90" : ""}`}
                  >
                    All Status
                  </Button>
                  <Button
                    size="sm"
                    variant={filterStatus === "active" ? "default" : "outline"}
                    onClick={() => setFilterStatus("active")}
                    className={`${filterStatus === "active" ? "bg-green-600 hover:bg-green-600/90" : ""}`}
                  >
                    Active
                  </Button>
                  <Button
                    size="sm"
                    variant={filterStatus === "placed" ? "default" : "outline"}
                    onClick={() => setFilterStatus("placed")}
                    className={`${filterStatus === "placed" ? "bg-[#D3B574] hover:bg-[#D3B574]/90 text-[#0D1A4D]" : ""}`}
                  >
                    Placed
                  </Button>
                  <Button
                    size="sm"
                    variant={filterStatus === "seeded" ? "default" : "outline"}
                    onClick={() => setFilterStatus("seeded")}
                    className={`${filterStatus === "seeded" ? "bg-green-600 hover:bg-green-600/90 text-white" : ""}`}
                  >
                    vs Seeds
                  </Button>
                  <Button
                    size="sm"
                    variant={filterStatus === "eliminated" ? "default" : "outline"}
                    onClick={() => setFilterStatus("eliminated")}
                    className={`${filterStatus === "eliminated" ? "bg-red-600 hover:bg-red-600/90" : ""}`}
                  >
                    Eliminated
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {(["All", "Freshman", "Sophomore", "Junior", "Senior"] as Classification[]).map((c) => (
                <Button
                  key={c}
                  onClick={() => setClassification(c)}
                  variant={classification === c ? "default" : "outline"}
                  size="sm"
                  className={`${classification === c ? "bg-[#0D1A4D] hover:bg-[#0D1A4D]/90 text-white" : "border-[#0D1A4D] text-[#0D1A4D]"}`}
                >
                  {c}
                </Button>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search athlete..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full md:w-[240px] justify-between bg-transparent">
                    {selectedWeights.length === 0
                      ? "All Weight Classes"
                      : `${selectedWeights.length} weight${selectedWeights.length > 1 ? "s" : ""} selected`}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-0" align="end">
                  <div className="p-3 border-b flex items-center justify-between">
                    <span className="text-sm font-medium">Weight Classes</span>
                    {selectedWeights.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearWeights} className="h-auto p-1 text-xs">
                        Clear all
                      </Button>
                    )}
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-2">
                    {weightClasses.map((weight) => (
                      <div
                        key={weight}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                        onClick={() => toggleWeight(weight)}
                      >
                        <Checkbox
                          id={`weight-${weight}`}
                          checked={selectedWeights.includes(weight)}
                          onCheckedChange={() => toggleWeight(weight)}
                        />
                        <label htmlFor={`weight-${weight}`} className="text-sm flex-1 cursor-pointer">
                          {weight} lbs
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Leaderboard Table */}
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b-2 border-[#0D1A4D]">
                    <th className="text-center py-3 px-1 font-bold text-[#0D1A4D] w-[5%]"><span className="sr-only">Expand</span></th>
                    <th 
                      className="text-left py-3 px-2 font-bold text-[#0D1A4D] cursor-pointer hover:bg-gray-100 w-[35%] md:w-[30%]"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-1">
                        Wrestler
                        {sortBy === "name" && <span className="text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>}
                      </div>
                    </th>
                    <th 
                      className="text-center py-3 px-2 font-bold text-[#0D1A4D] cursor-pointer hover:bg-gray-100 w-[12%] md:w-[10%]"
                      onClick={() => handleSort("weight")}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Wt
                        {sortBy === "weight" && <span className="text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>}
                      </div>
                    </th>
                    <th 
                      className="text-center py-3 px-4 font-bold text-[#0D1A4D] cursor-pointer hover:bg-gray-100 w-[20%] md:w-[15%]"
                      onClick={() => handleSort("wins")}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Record
                        {sortBy === "wins" && <span className="text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>}
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-bold text-[#0D1A4D] w-[15%] md:w-[12%]">
                      <div className="flex items-center justify-center gap-1">
                        vs Seeds
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-bold text-[#0D1A4D] hidden lg:table-cell w-[15%]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRoster.map((wrestler, index) => {
                    const wrestlerTotal = wrestler.wins + wrestler.losses
                    const winPct = wrestlerTotal > 0 ? ((wrestler.wins / wrestlerTotal) * 100).toFixed(0) : "0"
                    const isExpanded = expandedWrestler === wrestler.id
                    const matchHistory = wrestlerMatches[wrestler.id] || []
                    const wrestlerStatus = wrestler.losses >= 2 ? "eliminated" : "active"
                    const wrestlerSeededRecord = getWrestlerSeededRecord(wrestler.name, wrestler.weight_class)

                    return (
                      <tr key={wrestler.id}>
                        <td colSpan={6} className="p-0">
                          <div
                            className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${isExpanded ? "bg-gray-50" : ""}`}
                            onClick={() => setExpandedWrestler(isExpanded ? null : wrestler.id)}
                          >
                            <div className="flex items-center">
                              <div className="text-center py-3 px-1 w-[5%]">
                                {isExpanded ? (
                                  <ChevronUp className="w-5 h-5 text-[#0D1A4D] mx-auto" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-[#0D1A4D] mx-auto" />
                                )}
                              </div>
                              <div className="py-3 px-2 w-[35%] md:w-[30%]">
                                <div className="flex items-center gap-2">
{wrestler.placement ? (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded ${
      wrestler.placement === 1 ? "bg-[#D3B574] text-[#0D1A4D]" :
      wrestler.placement === 2 ? "bg-gray-300 text-gray-800" :
      wrestler.placement === 3 ? "bg-amber-700 text-white" :
      wrestler.placement <= 6 ? "bg-[#0D1A4D] text-[#D3B574]" :
      "bg-[#0D1A4D] text-white"
    }`}>
      <Medal className="w-3 h-3" />
      {wrestler.placement === 1 ? "1st" : wrestler.placement === 2 ? "2nd" : wrestler.placement === 3 ? "3rd" : `${wrestler.placement}th`}
    </span>
  ) : (
    <>
      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${wrestlerStatus === "eliminated" ? "bg-red-600 text-white" : "bg-green-600 text-white"}`}>{wrestler.current_round || "-"}</span>
      {wrestler.furthest_consi_round && (
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${wrestlerStatus === "eliminated" ? "bg-orange-600 text-white" : "bg-yellow-500 text-white"}`}>{wrestler.furthest_consi_round}</span>
      )}
    </>
  )}
  <div className="flex flex-col">
    <span className="font-bold text-[#0D1A4D]">{wrestler.name}</span>
    <span className="text-xs text-gray-500">{wrestler.classification}</span>
  </div>
                                </div>
                              </div>
                              <div className="text-center py-3 px-2 text-[#0D1A4D] w-[12%] md:w-[10%]">{wrestler.weight_class}</div>
                              <div className="text-center py-3 px-2 w-[20%] md:w-[15%]">
                                <span className="font-bold text-[#0D1A4D]">
                                  {wrestler.wins}-{wrestler.losses}
                                </span>
                              </div>
                              <div className="text-center py-3 px-2 w-[15%] md:w-[12%]">
                                {(wrestlerSeededRecord.wins.length > 0 || wrestlerSeededRecord.losses.length > 0) ? (
                                  <div className="flex items-center justify-center gap-1 flex-wrap">
                                    {wrestlerSeededRecord.wins.map(({ seed, count }) => (
                                      <span key={`w${seed}`} className="font-bold text-xs px-1.5 py-0.5 rounded bg-green-600 text-white">
                                        #{seed}{count > 1 ? ` x${count}` : ""}
                                      </span>
                                    ))}
                                    {wrestlerSeededRecord.losses.map(({ seed, count }) => (
                                      <span key={`l${seed}`} className="font-bold text-xs px-1.5 py-0.5 rounded bg-red-600 text-white">
                                        #{seed}{count > 1 ? ` x${count}` : ""}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </div>
                              <div className="text-center py-3 px-2 hidden lg:block w-[15%]">
                                {wrestler.placement ? (
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    wrestler.placement <= 3 ? "bg-[#D3B574]/20 text-[#0D1A4D]" : "bg-[#0D1A4D]/10 text-[#0D1A4D]"
                                  }`}>
                                    PLACED {wrestler.placement === 1 ? "1ST" : wrestler.placement === 2 ? "2ND" : wrestler.placement === 3 ? "3RD" : `${wrestler.placement}TH`}
                                  </span>
                                ) : (
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-bold ${
                                      wrestlerStatus === "eliminated"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-green-100 text-green-800"
                                    }`}
                                  >
                                    {wrestlerStatus.toUpperCase()}
                                  </span>
                                )}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="bg-gray-50 px-4 pb-4">
                                <div className="ml-8 space-y-3">
                                  <div className="text-sm font-bold text-[#0D1A4D]">Match History</div>
                                  {/* Match list */}
                                  {matchHistory.length > 0 ? (
                                    <div className="space-y-2">
                                      {matchHistory.map((match) => {
                                        const ranked = isRankedOpponent(match.opponent_name, match.weight_class, match.classification)
                                        return (
                                          <div
                                            key={match.id}
                                            className={cn(
                                              "flex items-center gap-3 text-sm rounded p-2",
                                              ranked ? "bg-[#0D1A4D]/5 border-2 border-[#D3B574]" : "bg-white border border-gray-100"
                                            )}
                                          >
                                            <span
                                              className={`px-2 py-0.5 rounded text-xs font-bold ${
                                                match.result === "win" || match.result === "W"
                                                  ? "bg-green-100 text-green-800"
                                                  : "bg-red-100 text-red-800"
                                              }`}
                                            >
                                              {match.result === "win" || match.result === "W" ? "W" : "L"}
                                            </span>
                                            <span className="text-gray-600">vs {match.opponent_name}</span>
                                            {ranked && (
                                              <span className="px-2 py-0.5 bg-[#D3B574] text-[#0D1A4D] text-xs font-bold rounded">
                                                #{ranked.national_rank} NATIONALLY
                                              </span>
                                            )}
                                            {match.opponent_seed && (
                                              <span className="text-[#B31B1B] font-bold text-xs">
                                                #{match.opponent_seed} seed
                                              </span>
                                            )}
                                            <span className="text-gray-400 text-xs">
                                              {getWinTypeDisplay(match.win_type)}
                                            </span>
                                            <span className="font-bold text-[#0D1A4D]">
                                              {match.nc_score}-{match.opponent_score}
                                            </span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-gray-500 text-sm">No matches recorded yet</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {sortedRoster.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No wrestlers found matching your filters</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
