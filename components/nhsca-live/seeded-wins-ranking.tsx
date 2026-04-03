"use client"

import { useState } from "react"
import { Trophy, Medal } from "lucide-react"
import { cn } from "@/lib/utils"

type Classification = "All" | "Freshman" | "Sophomore" | "Junior" | "Senior"

interface NHSCARoster {
  id: string
  name: string
  weight_class: string
  classification: string
  seeded_wins: number | null
  seeded_losses: number | null
  wins: number
  losses: number
  placement: number | null
}

interface SeededWinsRankingProps {
  roster: NHSCARoster[]
  currentClassification: Classification
}

const DIVISIONS: Classification[] = ["All", "Freshman", "Sophomore", "Junior", "Senior"]

const NAVY = "#0D1A4D"
const RED = "#B31B1B"
const GOLD = "#D3B574"

function getRankMedal(rank: number) {
  if (rank === 1) return { icon: <Trophy className="w-4 h-4" style={{ color: GOLD }} />, bg: "bg-yellow-50 border-yellow-200" }
  if (rank === 2) return { icon: <Medal className="w-4 h-4 text-gray-400" />, bg: "bg-gray-50 border-gray-200" }
  if (rank === 3) return { icon: <Medal className="w-4 h-4 text-amber-600" />, bg: "bg-amber-50 border-amber-200" }
  return { icon: null, bg: "bg-white border-gray-100" }
}

export function SeededWinsRanking({ roster, currentClassification }: SeededWinsRankingProps) {
  const [division, setDivision] = useState<Classification>("All")

  const filtered = roster.filter((w) => {
    if (division !== "All" && w.classification !== division) return false
    return (w.seeded_wins ?? 0) > 0
  })

  const ranked = [...filtered].sort((a, b) => {
    const aW = a.seeded_wins ?? 0
    const bW = b.seeded_wins ?? 0
    if (bW !== aW) return bW - aW
    // tiebreak: alphabetical by name (gives stable, consistent ordering)
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100" style={{ backgroundColor: NAVY }}>
        <Trophy className="w-5 h-5 flex-shrink-0" style={{ color: GOLD }} />
        <span className="font-bold text-white text-sm tracking-wide uppercase">Seeded Wins Ranking</span>
      </div>

      {/* Division tabs */}
      <div className="flex overflow-x-auto border-b border-gray-100 bg-gray-50">
        {DIVISIONS.map((d) => (
          <button
            key={d}
            onClick={() => setDivision(d)}
            className={cn(
              "px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0",
              division === d
                ? "border-b-2 text-white"
                : "text-gray-500 hover:text-gray-800"
            )}
            style={division === d ? { borderBottomColor: RED, backgroundColor: NAVY, color: "white" } : {}}
          >
            {d === "All" ? "All" : d.slice(0, 2)}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="divide-y divide-gray-50">
        {ranked.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">No seeded wins recorded yet</div>
        ) : (
          ranked.map((wrestler, index) => {
            const rank = index + 1
            const isNoMedal = wrestler.name.toLowerCase().includes("cooper mathon") || wrestler.name.toLowerCase().includes("cooper maton")
            const { icon, bg } = isNoMedal ? { icon: null, bg: "bg-white border-gray-100" } : getRankMedal(rank)
            const seededWins = wrestler.seeded_wins ?? 0
            const seededLosses = wrestler.seeded_losses ?? 0

            return (
              <div
                key={wrestler.id}
                className={cn("flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors", rank <= 3 ? bg : "")}
              >
                {/* Rank */}
                <div className="w-8 flex-shrink-0 flex items-center justify-center">
                  {icon ?? (
                    <span className="text-xs font-bold text-gray-400">#{rank}</span>
                  )}
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: NAVY }}>{wrestler.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-gray-100 text-gray-600">
                      {wrestler.weight_class} lbs
                    </span>
                    {division === "All" && (
                      <span className="text-xs text-gray-400">{wrestler.classification}</span>
                    )}
                    {wrestler.placement && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${GOLD}30`, color: NAVY }}>
                        {wrestler.placement}{wrestler.placement === 1 ? "st" : wrestler.placement === 2 ? "nd" : wrestler.placement === 3 ? "rd" : "th"} place
                      </span>
                    )}
                  </div>
                </div>

                {/* Seeded record */}
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold" style={{ color: "#16a34a" }}>{seededWins}W</span>
                    <span className="text-xs text-gray-300">/</span>
                    <span className="text-sm font-bold text-red-500">{seededLosses}L</span>
                  </div>
                  <p className="text-xs text-gray-400">vs seeded</p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
