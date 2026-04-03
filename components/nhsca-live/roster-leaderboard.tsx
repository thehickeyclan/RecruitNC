"use client"

import { useState } from "react"
import type { NCWrestler } from "@/lib/nhsca-live/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Star, Filter, ArrowUpDown, Search } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface RosterLeaderboardProps {
  roster: NCWrestler[]
}

type SortOption = "wins" | "record" | "notable" | "weight"
type FilterOption = "all" | "active" | "eliminated" | "placed" | "champion"

export function RosterLeaderboard({ roster }: RosterLeaderboardProps) {
  const [sortBy, setSortBy] = useState<SortOption>("wins")
  const [filterBy, setFilterBy] = useState<FilterOption>("all")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [searchQuery, setSearchQuery] = useState("")
  const [weightFilter, setWeightFilter] = useState<string>("all")

  const weightClasses = Array.from(new Set(roster.map((w) => w.weight_class))).sort(
    (a, b) => Number.parseInt(a) - Number.parseInt(b),
  )

  const filteredRoster = roster.filter((wrestler) => {
    // Filter by status
    if (filterBy !== "all" && wrestler.bracket_status !== filterBy) return false

    // Filter by search query (name)
    if (searchQuery && !wrestler.name.toLowerCase().includes(searchQuery.toLowerCase())) return false

    // Filter by weight class
    if (weightFilter !== "all" && wrestler.weight_class !== weightFilter) return false

    return true
  })

  // Sort roster
  const sortedRoster = [...filteredRoster].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case "wins":
        comparison = b.wins - a.wins
        break
      case "record":
        // Sort by win percentage
        const aWinPct = a.wins + a.losses > 0 ? a.wins / (a.wins + a.losses) : 0
        const bWinPct = b.wins + b.losses > 0 ? b.wins / (b.wins + b.losses) : 0
        comparison = bWinPct - aWinPct
        break
      case "notable":
        comparison = (b.notable_wins?.length || 0) - (a.notable_wins?.length || 0)
        break
      case "weight":
        comparison = Number.parseInt(a.weight_class) - Number.parseInt(b.weight_class)
        break
    }

    return sortOrder === "desc" ? comparison : -comparison
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "champion":
        return "bg-primary text-primary-foreground"
      case "placed":
        return "bg-success text-white"
      case "active":
        return "bg-secondary text-secondary-foreground"
      case "eliminated":
        return "bg-muted text-muted-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "desc" ? "asc" : "desc")
  }

  return (
    <Card className="glass border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Roster Leaderboard
        </CardTitle>

        <div className="space-y-3 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search athlete..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 glass border-border h-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={weightFilter} onValueChange={setWeightFilter}>
              <SelectTrigger className="glass border-border h-9">
                <SelectValue placeholder="All Weights" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Weights</SelectItem>
                {weightClasses.map((weight) => (
                  <SelectItem key={weight} value={weight}>
                    {weight} lbs
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterBy} onValueChange={(value) => setFilterBy(value as FilterOption)}>
              <SelectTrigger className="glass border-border h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Wrestlers</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="eliminated">Eliminated</SelectItem>
                <SelectItem value="placed">Placed</SelectItem>
                <SelectItem value="champion">Champions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="glass border-border h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wins">Most Wins</SelectItem>
                <SelectItem value="record">Win Percentage</SelectItem>
                <SelectItem value="notable">Notable Wins</SelectItem>
                <SelectItem value="weight">Weight Class</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSortOrder}
              className="h-9 w-9 border-border bg-transparent"
            >
              <ArrowUpDown className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedRoster.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No wrestlers match the selected filters</p>
          </div>
        ) : (
          sortedRoster.map((wrestler, index) => {
            const winPct =
              wrestler.wins + wrestler.losses > 0
                ? ((wrestler.wins / (wrestler.wins + wrestler.losses)) * 100).toFixed(0)
                : "0"

            return (
              <div
                key={wrestler.id}
                className="glass rounded-lg p-3 flex items-center gap-3 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-bold flex-shrink-0">
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{wrestler.name}</p>
                    {wrestler.notable_wins && wrestler.notable_wins.length > 0 && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Star className="w-3 h-3 text-primary fill-primary" />
                        <span className="text-xs text-primary">{wrestler.notable_wins.length}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs border-primary/50">
                      {wrestler.weight_class} lbs
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {wrestler.wins}W - {wrestler.losses}L ({winPct}%)
                    </span>
                  </div>
                </div>

                <Badge className={`${getStatusColor(wrestler.bracket_status)} text-xs flex-shrink-0`}>
                  {wrestler.bracket_status}
                </Badge>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
