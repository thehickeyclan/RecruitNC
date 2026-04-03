"use client"

import { useState, useEffect } from "react"
import type { DashboardStats, NCWrestlerWithHistory, LiveMatch } from "@/lib/nhsca-live/types"
import { Trophy, Users, Target, ChevronDown, ChevronUp, TrendingUp, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { getWinTypeDisplay } from "@/lib/nhsca-live/wrestling-terms"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { BigWinsSection } from "./big-wins-section" // Import BigWinsSection

interface ScoreboardSectionProps {
  stats: DashboardStats
  roster: NCWrestlerWithHistory[]
  liveMatches: LiveMatch[]
  genderFilter: "Male" | "Female" // Added genderFilter prop
}

export function ScoreboardSection({ stats, roster, liveMatches, genderFilter }: ScoreboardSectionProps) {
  const [expandedWrestler, setExpandedWrestler] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "eliminated">("all")
  const [wrestlerMatches, setWrestlerMatches] = useState<Record<string, LiveMatch[]>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedWeights, setSelectedWeights] = useState<string[]>([])

  const totalMatches = stats.totalWins + stats.totalLosses
  const winPercentage = totalMatches > 0 ? ((stats.totalWins / totalMatches) * 100).toFixed(1) : "0.0"

  const stats2024 = stats.stats2024

  const genderFilteredRoster = roster.filter((w) => w.gender === genderFilter)

  const weightClasses = Array.from(new Set(genderFilteredRoster.map((w) => w.weight_class))).sort(
    (a, b) => Number.parseInt(a) - Number.parseInt(b),
  )

  const championshipWrestlers = genderFilteredRoster.filter((w) => w.losses === 0 && w.wins + w.losses > 0).length

  const consolationWrestlers = genderFilteredRoster.filter((w) => w.losses === 1).length

  const activeWrestlers138Plus = genderFilteredRoster.filter((w) => w.losses < 2 && w.wins + w.losses > 0).length

  const filteredRoster = genderFilteredRoster.filter((w) => {
    if (filterStatus === "active" && w.bracket_status !== "active") return false
    if (filterStatus === "eliminated" && w.bracket_status !== "eliminated") return false
    if (searchQuery && !w.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (selectedWeights.length > 0 && !selectedWeights.includes(w.weight_class)) return false
    return true
  })

  const sortedRoster = [...filteredRoster].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    const totalMatchesA = a.wins + a.losses
    const totalMatchesB = b.wins + b.losses
    if (totalMatchesA > 0 && totalMatchesB === 0) return -1
    if (totalMatchesA === 0 && totalMatchesB > 0) return 1
    if (a.losses !== b.losses) return a.losses - b.losses
    return Number.parseInt(a.weight_class) - Number.parseInt(b.weight_class)
  })

  const toggleWeight = (weight: string) => {
    setSelectedWeights((prev) => (prev.includes(weight) ? prev.filter((w) => w !== weight) : [...prev, weight]))
  }

  const clearWeights = () => {
    setSelectedWeights([])
  }

  useEffect(() => {
    if (expandedWrestler && !wrestlerMatches[expandedWrestler]) {
      const fetchWrestlerMatches = async () => {
        const supabase = getSupabaseBrowserClient()
        const wrestler = roster.find((w) => w.id === expandedWrestler)

        if (wrestler) {
          const { data, error } = await supabase
            .from("live_matches")
            .select("*")
            .ilike("nc_wrestler_name", wrestler.name)
            .eq("status", "completed")
            .order("created_at", { ascending: false })

          if (error) {
            console.error("Error fetching wrestler matches:", error)
            setWrestlerMatches((prev) => ({
              ...prev,
              [expandedWrestler]: [],
            }))
          } else if (data) {
            setWrestlerMatches((prev) => ({
              ...prev,
              [expandedWrestler]: data as LiveMatch[],
            }))
          }
        }
      }

      fetchWrestlerMatches()
    }
  }, [expandedWrestler, roster, wrestlerMatches])

  return (
    <TooltipProvider>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-[#B31B1B] rounded-lg p-8 text-white">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">
              NORTH CAROLINA {genderFilter === "Male" ? "MEN'S" : "WOMEN'S"} SUPER 32 STATS
            </h2>
            <p className="text-white/80 mt-1">Super 32 Tournament 2025</p>
            {stats2024 && genderFilter === "Male" && (
              <div className="mt-2 text-sm text-white/90">
                2024: {stats2024.totalWrestlers} wrestlers • {stats2024.totalWins}-{stats2024.totalLosses} (
                {stats2024.winPercentage.toFixed(1)}%)
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-sm text-white/80 mb-2">Total Wrestlers</div>
              <div className="text-5xl font-bold text-[#D3B574]">{stats.totalWrestlers}</div>
              <div className="text-sm text-white/80 mt-2">
                {stats.returningWrestlers} returning • {stats.newWrestlers} new
              </div>
            </div>
            <div>
              <div className="text-sm text-white/80 mb-2">NC Record</div>
              <div className="text-5xl font-bold text-[#D3B574]">
                {stats.totalWins}-{stats.totalLosses}
              </div>
              {stats2024 && genderFilter === "Male" && (
                <div className="text-sm text-white/80 mt-2">
                  2024: {stats2024.totalWins}-{stats2024.totalLosses}
                </div>
              )}
            </div>
            <div>
              <div className="text-sm text-white/80 mb-2">Win Percentage</div>
              <div className="text-5xl font-bold text-[#D3B574]">{winPercentage}%</div>
              {stats2024 && genderFilter === "Male" && (
                <div className="text-sm text-white/80 mt-2">2024: {stats2024.winPercentage.toFixed(1)}%</div>
              )}
            </div>
          </div>
        </div>

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#D3B574] rounded">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-[#0D1A4D]">Active Wrestlers</h3>
            </div>
            <div className="text-3xl font-bold text-[#0D1A4D]">{activeWrestlers138Plus}</div>
            <div className="text-sm text-gray-600 mt-1">with matches competed</div>
          </div>

          <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-600 rounded">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-[#0D1A4D]">Winning Records</h3>
            </div>
            <div className="text-3xl font-bold text-[#0D1A4D]">{stats.winningRecords || 0}</div>
            <div className="text-sm text-gray-600 mt-1">wrestlers above .500</div>
          </div>

          <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#B31B1B] rounded">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-[#0D1A4D]">Total Wins</h3>
            </div>
            <div className="text-3xl font-bold text-[#0D1A4D]">{stats.totalWins}</div>
            <div className="text-sm text-gray-600 mt-1">{stats.totalLosses} losses</div>
          </div>

          <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#D3B574] rounded">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-[#0D1A4D]">Notable Wins</h3>
            </div>
            <div className="text-3xl font-bold text-[#0D1A4D]">{stats.notableWins}</div>
            <div className="text-sm text-gray-600 mt-1">vs ranked opponents</div>
          </div>
        </div>

        <BigWinsSection genderFilter={genderFilter} />

        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-xl font-bold text-[#0D1A4D]">
              NORTH CAROLINA {genderFilter === "Male" ? "MEN'S" : "WOMEN'S"} LEADERBOARD
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
                  variant={filterStatus === "eliminated" ? "default" : "outline"}
                  onClick={() => setFilterStatus("eliminated")}
                  className={`${filterStatus === "eliminated" ? "bg-red-600 hover:bg-red-600/90" : ""}`}
                >
                  Eliminated
                </Button>
              </div>
            </div>
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

          {selectedWeights.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedWeights.map((weight) => (
                <div
                  key={weight}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-[#0D1A4D] text-white text-xs rounded"
                >
                  {weight} lbs
                  <button onClick={() => toggleWeight(weight)} className="hover:bg-white/20 rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#0D1A4D]">
                  <th className="text-left py-3 px-4 font-bold text-[#0D1A4D]">Wrestler</th>
                  <th className="text-center py-3 px-4 font-bold text-[#0D1A4D]">Wt</th>
                  <th className="text-center py-3 px-4 font-bold text-[#0D1A4D] hidden md:table-cell">2024</th>
                  <th className="text-center py-3 px-4 font-bold text-[#0D1A4D]">2025</th>
                  <th className="text-center py-3 px-4 font-bold text-[#0D1A4D]">Win %</th>
                  <th className="text-center py-3 px-4 font-bold text-[#0D1A4D] hidden lg:table-cell">Status</th>
                  <th className="text-center py-3 px-4 font-bold text-[#0D1A4D]"></th>
                </tr>
              </thead>
              <tbody>
                {sortedRoster.map((wrestler, index) => {
                  const totalMatches = wrestler.wins + wrestler.losses
                  const winPct = totalMatches > 0 ? ((wrestler.wins / totalMatches) * 100).toFixed(0) : "0"
                  const isExpanded = expandedWrestler === wrestler.id

                  const data2024 = wrestler.data_2024
                    ? Array.isArray(wrestler.data_2024)
                      ? wrestler.data_2024[0]
                      : wrestler.data_2024
                    : null
                  const total2024 = data2024 ? data2024.wins + data2024.losses : 0
                  const winPct2024 = total2024 > 0 ? ((data2024!.wins / total2024) * 100).toFixed(0) : "0"

                  const matches = wrestlerMatches[wrestler.id] || []

                  const wrestlerStatus = wrestler.bracket_status || "active"

                  return (
                    <>
                      <tr
                        key={wrestler.id}
                        className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${isExpanded ? "bg-gray-50" : ""}`}
                        onClick={() => setExpandedWrestler(isExpanded ? null : wrestler.id)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-400">#{index + 1}</span>
                            <span className="font-bold text-[#0D1A4D]">{wrestler.name}</span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-4 text-[#0D1A4D]">{wrestler.weight_class}</td>
                        <td className="text-center py-3 px-4 hidden md:table-cell">
                          {data2024 ? (
                            <span className="text-sm text-gray-600">
                              {data2024.wins}-{data2024.losses}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">DNC</span>
                          )}
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className="font-bold text-[#0D1A4D]">
                            {wrestler.wins}-{wrestler.losses}
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className="font-bold text-[#D3B574]">{winPct}%</span>
                        </td>
                        <td className="text-center py-3 px-4 hidden lg:table-cell">
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold ${
                              wrestlerStatus === "eliminated"
                                ? "bg-red-100 text-red-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {wrestlerStatus.toUpperCase()}
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400 mx-auto" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400 mx-auto" />
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <td colSpan={7} className="py-4 px-4">
                            <div className="ml-8 space-y-3">
                              {data2024 && (
                                <>
                                  <div className="text-sm font-bold text-[#0D1A4D]">2024 Performance</div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                      <div className="text-xs text-gray-600">2024 Record</div>
                                      <div className="font-bold text-[#0D1A4D]">
                                        {data2024.wins}-{data2024.losses}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-600">2024 Win %</div>
                                      <div className="font-bold text-[#0D1A4D]">{winPct2024}%</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-600">Champ Wins</div>
                                      <div className="font-bold text-[#0D1A4D]">{data2024.champ_wins}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-600">Consi Wins</div>
                                      <div className="font-bold text-[#0D1A4D]">{data2024.consi_wins}</div>
                                    </div>
                                  </div>
                                  {data2024.school && (
                                    <div className="text-xs text-gray-600">
                                      School: {data2024.school} • Class: {data2024.class}
                                    </div>
                                  )}
                                </>
                              )}
                              {totalMatches > 0 && (
                                <div className="border-t pt-3 mt-3">
                                  <div className="text-sm font-bold text-[#0D1A4D] mb-3">2025 Match Results</div>
                                  {matches.length > 0 ? (
                                    <div className="space-y-2">
                                      {matches.map((match) => {
                                        const isWin =
                                          match.result?.toLowerCase() === "w" || match.result?.toLowerCase() === "win"
                                        return (
                                          <div
                                            key={match.id}
                                            className="flex items-center gap-3 p-2 bg-white rounded border border-gray-200"
                                          >
                                            <span
                                              className={`px-2 py-1 rounded text-xs font-bold text-white ${
                                                isWin ? "bg-green-600" : "bg-red-600"
                                              }`}
                                            >
                                              {isWin ? "W" : "L"}
                                            </span>
                                            <div className="flex-1">
                                              <div className="text-sm font-medium text-[#0D1A4D] flex items-center gap-1">
                                                <span>vs {match.opponent_name}</span>
                                                {match.opponent_seed && (
                                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#D3B574] text-white text-xs font-bold">
                                                    {match.opponent_seed}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-xs text-gray-600">
                                                {getWinTypeDisplay(match.win_type)} • {match.nc_score}-
                                                {match.opponent_score}
                                                {match.round && ` • ${match.round}`}
                                              </div>
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-gray-500">Loading match results...</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
