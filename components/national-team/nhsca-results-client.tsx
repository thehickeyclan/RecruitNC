"use client"

import { useState, useEffect, useCallback } from "react"
import { Trophy, Users, Clock, ChevronDown, ChevronUp, Megaphone, RefreshCw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type Dual = {
  id: string
  team: 'national' | 'select'
  opponent: string
  day: number
  pool_round: string | null
  mat_number: number | null
  status: 'upcoming' | 'live' | 'final'
  nc_score: number
  opponent_score: number
}

type Match = {
  id: string
  dual_id: string
  weight_class: string
  nc_wrestler: string | null
  opponent_wrestler: string | null
  outcome: string
  nc_team_points: number
  opponent_team_points: number
}

type Announcement = {
  id: string
  team: 'all' | 'national' | 'select'
  body: string
  created_at: string
}

const WEIGHT_CLASSES = ['106','113','120','126','132','138','145','152','160','170','182','195','220','285']

export function NhscaResultsClient() {
  const [loading, setLoading] = useState(true)
  const [duals, setDuals] = useState<Dual[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [stats, setStats] = useState<{ national: { wins: number, losses: number }, select: { wins: number, losses: number } } | null>(null)
  const [expandedDual, setExpandedDual] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string>('all')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedTeam !== 'all') params.set('team', selectedTeam)
      const res = await fetch(`/api/nhsca-duals/results?${params}`)
      const data = await res.json()
      if (res.ok) {
        setDuals(data.duals || [])
        setMatches(data.matches || [])
        setAnnouncements(data.announcements || [])
        setStats(data.stats || null)
      }
    } catch (err) {
      console.error('Failed to fetch results:', err)
    }
    setLoading(false)
  }, [selectedTeam])

  useEffect(() => {
    fetchData()
    // Auto-refresh every 30 seconds for live updates
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const getDualMatches = (dualId: string) => matches.filter(m => m.dual_id === dualId).sort((a, b) => {
    return WEIGHT_CLASSES.indexOf(a.weight_class) - WEIGHT_CLASSES.indexOf(b.weight_class)
  })

  const liveDuals = duals.filter(d => d.status === 'live')
  const finalDuals = duals.filter(d => d.status === 'final')
  const upcomingDuals = duals.filter(d => d.status === 'upcoming')

  const getOutcomeLabel = (outcome: string) => {
    const labels: Record<string, string> = {
      'nc_fall': 'Fall',
      'nc_tech_fall': 'Tech Fall',
      'nc_major': 'Major',
      'nc_decision': 'Dec',
      'nc_forfeit': 'Forfeit',
      'opp_fall': 'Fall',
      'opp_tech_fall': 'Tech Fall',
      'opp_major': 'Major',
      'opp_decision': 'Dec',
      'opp_forfeit': 'Forfeit',
      'double_forfeit': 'Dbl FF',
      'pending': '—',
    }
    return labels[outcome] || outcome
  }

  return (
    <div className="space-y-6">
      {/* Announcements Banner */}
      {announcements.length > 0 && (
        <Card className="bg-gradient-to-r from-[#c9a227]/20 to-[#c9a227]/10 border-[#c9a227]/40">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Megaphone className="h-5 w-5 text-[#c9a227] shrink-0 mt-0.5" />
              <div className="space-y-2">
                {announcements.slice(0, 3).map(ann => (
                  <p key={ann.id} className="text-white/90 text-sm">
                    <span className="text-[#c9a227] font-semibold">
                      {ann.team === 'all' ? '' : ann.team === 'national' ? '[National] ' : '[Select] '}
                    </span>
                    {ann.body}
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-[#c9a227]/20 to-[#c9a227]/10 border-[#c9a227]/30">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Trophy className="h-8 w-8 text-[#c9a227]" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.national.wins}-{stats.national.losses}</p>
                  <p className="text-xs text-white/60">National Team</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#003366]/40 to-[#003366]/20 border-[#003366]/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.select.wins}-{stats.select.losses}</p>
                  <p className="text-xs text-white/60">Select Team</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team Filter */}
      <div className="flex items-center justify-between">
        <Tabs value={selectedTeam} onValueChange={setSelectedTeam} className="w-full">
          <div className="flex items-center justify-between">
            <TabsList className="bg-[#1a2d4a] border border-[#2a3f5f]">
              <TabsTrigger value="all" className="data-[state=active]:bg-[#c9a227] data-[state=active]:text-[#002147]">
                All
              </TabsTrigger>
              <TabsTrigger value="national" className="data-[state=active]:bg-[#c9a227] data-[state=active]:text-[#002147]">
                National
              </TabsTrigger>
              <TabsTrigger value="select" className="data-[state=active]:bg-[#c9a227] data-[state=active]:text-[#002147]">
                Select
              </TabsTrigger>
            </TabsList>
            <Button onClick={fetchData} variant="ghost" size="sm" className="text-white/60 hover:text-white">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </Tabs>
      </div>

      {/* Live Now */}
      {liveDuals.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-green-400 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            LIVE NOW
          </h3>
          {liveDuals.map(dual => (
            <DualCard
              key={dual.id}
              dual={dual}
              matches={getDualMatches(dual.id)}
              expanded={expandedDual === dual.id}
              onToggle={() => setExpandedDual(expandedDual === dual.id ? null : dual.id)}
              getOutcomeLabel={getOutcomeLabel}
            />
          ))}
        </div>
      )}

      {/* Final Results */}
      {finalDuals.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white/60">FINAL RESULTS</h3>
          {finalDuals.map(dual => (
            <DualCard
              key={dual.id}
              dual={dual}
              matches={getDualMatches(dual.id)}
              expanded={expandedDual === dual.id}
              onToggle={() => setExpandedDual(expandedDual === dual.id ? null : dual.id)}
              getOutcomeLabel={getOutcomeLabel}
            />
          ))}
        </div>
      )}

      {/* Upcoming */}
      {upcomingDuals.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-yellow-400/70">UPCOMING</h3>
          {upcomingDuals.map(dual => (
            <DualCard
              key={dual.id}
              dual={dual}
              matches={getDualMatches(dual.id)}
              expanded={expandedDual === dual.id}
              onToggle={() => setExpandedDual(expandedDual === dual.id ? null : dual.id)}
              getOutcomeLabel={getOutcomeLabel}
            />
          ))}
        </div>
      )}

      {loading && duals.length === 0 && (
        <div className="text-center py-12 text-white/60">Loading results...</div>
      )}

      {!loading && duals.length === 0 && (
        <Card className="bg-[#1a2d4a] border-[#2a3f5f]">
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-white/30" />
            <p className="text-white/60">No results published yet. Check back soon!</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function DualCard({
  dual,
  matches,
  expanded,
  onToggle,
  getOutcomeLabel,
}: {
  dual: Dual
  matches: Match[]
  expanded: boolean
  onToggle: () => void
  getOutcomeLabel: (o: string) => string
}) {
  const isWin = dual.nc_score > dual.opponent_score
  const isLoss = dual.nc_score < dual.opponent_score
  const isLive = dual.status === 'live'

  return (
    <Card className={`border ${isLive ? 'border-green-500/50 bg-green-900/10' : 'border-[#2a3f5f] bg-[#1a2d4a]'}`}>
      <CardContent className="p-4">
        <button onClick={onToggle} className="w-full text-left">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={dual.team === 'national' ? 'default' : 'secondary'} className={dual.team === 'national' ? 'bg-[#c9a227] text-[#002147]' : 'bg-blue-600'}>
                  {dual.team === 'national' ? 'National' : 'Select'}
                </Badge>
                {isLive && (
                  <Badge className="bg-green-600 animate-pulse">LIVE</Badge>
                )}
                {dual.pool_round && <span className="text-white/40 text-xs">{dual.pool_round}</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${isWin ? 'text-green-400' : isLoss ? 'text-white/70' : 'text-white'}`}>NC United</span>
                <span className={`text-2xl font-black ${isWin ? 'text-green-400' : isLoss ? 'text-red-400' : 'text-[#c9a227]'}`}>{dual.nc_score}</span>
                <span className="text-white/40">-</span>
                <span className={`text-2xl font-black ${isLoss ? 'text-green-400' : isWin ? 'text-red-400' : 'text-white/60'}`}>{dual.opponent_score}</span>
                <span className={`text-lg font-bold ${isLoss ? 'text-green-400' : isWin ? 'text-white/70' : 'text-white'}`}>{dual.opponent}</span>
              </div>
              <p className="text-xs text-white/40">Day {dual.day} {dual.mat_number ? `· Mat ${dual.mat_number}` : ''}</p>
            </div>
            <div className="text-white/40">
              {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </div>
        </button>

        {expanded && matches.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#2a3f5f]">
            <div className="space-y-1">
              {matches.map(match => {
                const ncWon = match.outcome.startsWith('nc_')
                const oppWon = match.outcome.startsWith('opp_')
                return (
                  <div key={match.id} className="grid grid-cols-[50px_1fr_60px_1fr_50px] gap-2 items-center py-1.5 px-2 rounded text-sm">
                    <span className="font-bold text-[#c9a227] text-center">{match.weight_class}</span>
                    <span className={`truncate ${ncWon ? 'text-green-400 font-semibold' : 'text-white/70'}`}>
                      {match.nc_wrestler || '—'}
                    </span>
                    <span className={`text-center text-xs ${ncWon ? 'text-green-400' : oppWon ? 'text-red-400' : 'text-white/40'}`}>
                      {getOutcomeLabel(match.outcome)}
                    </span>
                    <span className={`truncate text-right ${oppWon ? 'text-green-400 font-semibold' : 'text-white/70'}`}>
                      {match.opponent_wrestler || '—'}
                    </span>
                    <span className={`text-center font-bold ${match.nc_team_points > 0 ? 'text-green-400' : match.opponent_team_points > 0 ? 'text-red-400' : 'text-white/20'}`}>
                      {match.nc_team_points > 0 ? `+${match.nc_team_points}` : match.opponent_team_points > 0 ? `-${match.opponent_team_points}` : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
