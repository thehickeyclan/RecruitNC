"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trophy, Users, Clock, MapPin, Megaphone, RefreshCw, ChevronDown, ChevronUp, Trash2, Check, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { HardLink } from "@/components/hard-link"
import { NhscaMediaAdmin } from "@/components/national-team/nhsca-media-admin"
import { NhscaOrdersAdmin } from "@/components/national-team/nhsca-orders-admin"

type Dual = {
  id: string
  team: 'national' | 'select'
  opponent: string
  day: number
  pool_round: string | null
  mat_number: number | null
  start_time: string | null
  status: 'upcoming' | 'live' | 'final'
  nc_score: number
  opponent_score: number
  published: boolean
  notes: string | null
}

type Match = {
  id: string
  dual_id: string
  weight_class: string
  nc_wrestler: string | null
  opponent_wrestler: string | null
  outcome: string
  bout_score: string | null
  nc_team_points: number
  opponent_team_points: number
}

type Announcement = {
  id: string
  team: 'all' | 'national' | 'select'
  body: string
  published: boolean
  created_at: string
}

const OUTCOMES = [
  { value: 'pending', label: 'Pending', nc: 0, opp: 0 },
  { value: 'nc_fall', label: 'NC Fall', nc: 6, opp: 0 },
  { value: 'nc_tech_fall', label: 'NC Tech', nc: 5, opp: 0 },
  { value: 'nc_major', label: 'NC Major', nc: 4, opp: 0 },
  { value: 'nc_decision', label: 'NC Dec', nc: 3, opp: 0 },
  { value: 'nc_forfeit', label: 'NC FF', nc: 6, opp: 0 },
  { value: 'opp_fall', label: 'Opp Fall', nc: 0, opp: 6 },
  { value: 'opp_tech_fall', label: 'Opp Tech', nc: 0, opp: 5 },
  { value: 'opp_major', label: 'Opp Major', nc: 0, opp: 4 },
  { value: 'opp_decision', label: 'Opp Dec', nc: 0, opp: 3 },
  { value: 'opp_forfeit', label: 'Opp FF', nc: 0, opp: 6 },
  { value: 'double_forfeit', label: 'Dbl FF', nc: 0, opp: 0 },
]

const WEIGHT_CLASSES = ['106','113','120','126','132','138','145','152','160','170','182','195','220','285']

export default function NhscaDualsCommandCenter() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [duals, setDuals] = useState<Dual[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [stats, setStats] = useState<{ national: { wins: number, losses: number }, select: { wins: number, losses: number } } | null>(null)
  const [expandedDual, setExpandedDual] = useState<string | null>(null)
  const [filterTeam, setFilterTeam] = useState<string>('all')
  const [filterDay, setFilterDay] = useState<string>('all')

  // Create dual form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newDual, setNewDual] = useState({ team: 'national', opponent: '', day: '1', pool_round: '', mat_number: '', start_time: '' })

  // Announcement form
  const [newAnnouncement, setNewAnnouncement] = useState({ team: 'all', body: '' })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterTeam !== 'all') params.set('team', filterTeam)
      if (filterDay !== 'all') params.set('day', filterDay)
      const res = await fetch(`/api/admin/nhsca-duals?${params}`)
      const data = await res.json()
      if (res.ok) {
        setDuals(data.duals || [])
        setMatches(data.matches || [])
        setAnnouncements(data.announcements || [])
        setStats(data.stats || null)
      }
    } catch (err) {
      console.error('Failed to fetch duals:', err)
    }
    setLoading(false)
  }, [filterTeam, filterDay])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const createDual = async () => {
    const res = await fetch('/api/admin/nhsca-duals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDual),
    })
    if (res.ok) {
      setShowCreateForm(false)
      setNewDual({ team: 'national', opponent: '', day: '1', pool_round: '', mat_number: '', start_time: '' })
      fetchData()
    }
  }

  const updateDual = async (id: string, updates: Partial<Dual>) => {
    await fetch('/api/admin/nhsca-duals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'dual', id, ...updates }),
    })
    fetchData()
  }

  const updateMatch = async (id: string, updates: Partial<Match>) => {
    await fetch('/api/admin/nhsca-duals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'match', id, ...updates }),
    })
    fetchData()
  }

  const deleteDual = async (id: string) => {
    if (!confirm('Delete this dual and all its matches?')) return
    await fetch(`/api/admin/nhsca-duals?type=dual&id=${id}`, { method: 'DELETE' })
    fetchData()
  }

  const createAnnouncement = async () => {
    if (!newAnnouncement.body.trim()) return
    const res = await fetch('/api/admin/nhsca-duals/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAnnouncement),
    })
    if (res.ok) {
      setNewAnnouncement({ team: 'all', body: '' })
      fetchData()
    }
  }

  const deleteAnnouncement = async (id: string) => {
    await fetch(`/api/admin/nhsca-duals?type=announcement&id=${id}`, { method: 'DELETE' })
    fetchData()
  }

  const getDualMatches = (dualId: string) => matches.filter(m => m.dual_id === dualId).sort((a, b) => {
    return WEIGHT_CLASSES.indexOf(a.weight_class) - WEIGHT_CLASSES.indexOf(b.weight_class)
  })

  return (
    <div className="min-h-screen bg-[#0a1628]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-[#002147] to-[#0a3a7a] border-b border-[#1a3a6a] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <HardLink href="/admin" className="text-white/70 hover:text-white">
                <ArrowLeft className="h-5 w-5" />
              </HardLink>
              <div>
                <h1 className="text-xl font-bold text-white">NHSCA Duals Command Center</h1>
                <p className="text-sm text-white/60">May 23-25, 2026 · Virginia Beach</p>
              </div>
            </div>
            <Button onClick={fetchData} variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-[#c9a227]/20 to-[#c9a227]/10 border-[#c9a227]/30">
              <CardContent className="pt-4">
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
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-blue-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.select.wins}-{stats.select.losses}</p>
                    <p className="text-xs text-white/60">Select Team</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2d4a] border-[#2a3f5f]">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-green-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{duals.filter(d => d.status === 'live').length}</p>
                    <p className="text-xs text-white/60">Live Now</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2d4a] border-[#2a3f5f]">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-8 w-8 text-purple-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{duals.length}</p>
                    <p className="text-xs text-white/60">Total Duals</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="duals" className="space-y-4">
          <TabsList className="bg-[#1a2d4a] border border-[#2a3f5f]">
            <TabsTrigger value="duals" className="data-[state=active]:bg-[#c9a227] data-[state=active]:text-[#002147]">
              Duals
            </TabsTrigger>
<TabsTrigger value="announcements" className="data-[state=active]:bg-[#c9a227] data-[state=active]:text-[#002147]">
Announcements
</TabsTrigger>
<TabsTrigger value="orders" className="data-[state=active]:bg-[#c9a227] data-[state=active]:text-[#002147]">
Orders
</TabsTrigger>
<TabsTrigger value="media" className="data-[state=active]:bg-[#c9a227] data-[state=active]:text-[#002147]">
Media
</TabsTrigger>
</TabsList>

          {/* Duals Tab */}
          <TabsContent value="duals" className="space-y-4">
            {/* Filters + Create */}
            <div className="flex flex-wrap items-center gap-3">
              <Select value={filterTeam} onValueChange={setFilterTeam}>
                <SelectTrigger className="w-[140px] bg-[#1a2d4a] border-[#2a3f5f] text-white">
                  <SelectValue placeholder="Team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  <SelectItem value="national">National</SelectItem>
                  <SelectItem value="select">Select</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterDay} onValueChange={setFilterDay}>
                <SelectTrigger className="w-[120px] bg-[#1a2d4a] border-[#2a3f5f] text-white">
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Days</SelectItem>
                  <SelectItem value="1">Day 1</SelectItem>
                  <SelectItem value="2">Day 2</SelectItem>
                  <SelectItem value="3">Day 3</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex-1" />
              <Button onClick={() => setShowCreateForm(!showCreateForm)} className="bg-[#c9a227] text-[#002147] hover:bg-[#d4af37]">
                <Plus className="h-4 w-4 mr-2" />
                Add Dual
              </Button>
            </div>

            {/* Create Dual Form */}
            {showCreateForm && (
              <Card className="bg-[#1a2d4a] border-[#2a3f5f]">
                <CardHeader>
                  <CardTitle className="text-white">Create New Dual</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-white/70">Team</Label>
                      <Select value={newDual.team} onValueChange={v => setNewDual({ ...newDual, team: v })}>
                        <SelectTrigger className="bg-[#0a1628] border-[#2a3f5f] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="national">National</SelectItem>
                          <SelectItem value="select">Select</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-white/70">Opponent</Label>
                      <Input
                        value={newDual.opponent}
                        onChange={e => setNewDual({ ...newDual, opponent: e.target.value })}
                        placeholder="e.g. Ohio"
                        className="bg-[#0a1628] border-[#2a3f5f] text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white/70">Day</Label>
                      <Select value={newDual.day} onValueChange={v => setNewDual({ ...newDual, day: v })}>
                        <SelectTrigger className="bg-[#0a1628] border-[#2a3f5f] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Day 1 (Sat)</SelectItem>
                          <SelectItem value="2">Day 2 (Sun)</SelectItem>
                          <SelectItem value="3">Day 3 (Mon)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-white/70">Pool/Round</Label>
                      <Input
                        value={newDual.pool_round}
                        onChange={e => setNewDual({ ...newDual, pool_round: e.target.value })}
                        placeholder="e.g. Pool A"
                        className="bg-[#0a1628] border-[#2a3f5f] text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setShowCreateForm(false)} className="text-white/70">Cancel</Button>
                    <Button onClick={createDual} className="bg-[#c9a227] text-[#002147] hover:bg-[#d4af37]">Create Dual</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Duals List */}
            {loading ? (
              <div className="text-center py-12 text-white/60">Loading...</div>
            ) : duals.length === 0 ? (
              <Card className="bg-[#1a2d4a] border-[#2a3f5f]">
                <CardContent className="py-12 text-center">
                  <Trophy className="h-12 w-12 mx-auto mb-4 text-white/30" />
                  <p className="text-white/60">No duals created yet. Click &quot;Add Dual&quot; to get started.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {duals.map(dual => (
                  <Card key={dual.id} className={`border ${dual.status === 'live' ? 'border-green-500/50 bg-green-900/10' : 'border-[#2a3f5f] bg-[#1a2d4a]'}`}>
                    <CardContent className="p-4">
                      {/* Dual Header */}
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={dual.team === 'national' ? 'default' : 'secondary'} className={dual.team === 'national' ? 'bg-[#c9a227] text-[#002147]' : 'bg-blue-600'}>
                              {dual.team === 'national' ? 'National' : 'Select'}
                            </Badge>
                            <Badge variant="outline" className={`
                              ${dual.status === 'live' ? 'border-green-500 text-green-400' : ''}
                              ${dual.status === 'final' ? 'border-white/30 text-white/60' : ''}
                              ${dual.status === 'upcoming' ? 'border-yellow-500/50 text-yellow-400' : ''}
                            `}>
                              {dual.status === 'live' ? 'LIVE' : dual.status === 'final' ? 'Final' : 'Upcoming'}
                            </Badge>
                            {dual.pool_round && <span className="text-white/50 text-sm">{dual.pool_round}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-white">NC United</span>
                            <span className="text-2xl font-black text-[#c9a227]">{dual.nc_score}</span>
                            <span className="text-white/40">-</span>
                            <span className="text-2xl font-black text-white/80">{dual.opponent_score}</span>
                            <span className="text-xl font-bold text-white/70">{dual.opponent}</span>
                          </div>
                          <p className="text-sm text-white/50">Day {dual.day} {dual.mat_number ? `· Mat ${dual.mat_number}` : ''}</p>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-2">
                          <Select value={dual.status} onValueChange={v => updateDual(dual.id, { status: v as Dual['status'] })}>
                            <SelectTrigger className="w-[100px] h-8 text-xs bg-[#0a1628] border-[#2a3f5f] text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="upcoming">Upcoming</SelectItem>
                              <SelectItem value="live">Live</SelectItem>
                              <SelectItem value="final">Final</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-white/50">Pub</span>
                            <Switch
                              checked={dual.published}
                              onCheckedChange={v => updateDual(dual.id, { published: v })}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedDual(expandedDual === dual.id ? null : dual.id)}
                            className="text-white/60 hover:text-white"
                          >
                            {expandedDual === dual.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDual(dual.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Expanded: Match Entry */}
                      {expandedDual === dual.id && (
                        <div className="mt-4 pt-4 border-t border-[#2a3f5f]">
                          <h4 className="text-sm font-semibold text-white/70 mb-3">Match Results</h4>
                          <div className="space-y-2">
                            {getDualMatches(dual.id).map(match => (
                              <div key={match.id} className="grid grid-cols-[60px_1fr_1fr_160px_60px] gap-2 items-center py-2 px-3 rounded bg-[#0a1628]">
                                <span className="font-bold text-[#c9a227]">{match.weight_class}</span>
                                <Input
                                  value={match.nc_wrestler || ''}
                                  onChange={e => updateMatch(match.id, { nc_wrestler: e.target.value })}
                                  placeholder="NC Wrestler"
                                  className="h-8 text-sm bg-transparent border-[#2a3f5f] text-white"
                                />
                                <Input
                                  value={match.opponent_wrestler || ''}
                                  onChange={e => updateMatch(match.id, { opponent_wrestler: e.target.value })}
                                  placeholder="Opp Wrestler"
                                  className="h-8 text-sm bg-transparent border-[#2a3f5f] text-white/70"
                                />
                                <Select value={match.outcome} onValueChange={v => updateMatch(match.id, { outcome: v })}>
                                  <SelectTrigger className={`h-8 text-sm border-[#2a3f5f] ${
                                    match.outcome.startsWith('nc_') ? 'bg-green-900/30 text-green-400' :
                                    match.outcome.startsWith('opp_') ? 'bg-red-900/30 text-red-400' :
                                    'bg-transparent text-white/50'
                                  }`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {OUTCOMES.map(o => (
                                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <div className="text-center">
                                  <span className={`font-bold ${match.nc_team_points > 0 ? 'text-green-400' : match.opponent_team_points > 0 ? 'text-red-400' : 'text-white/30'}`}>
                                    {match.nc_team_points > 0 ? `+${match.nc_team_points}` : match.opponent_team_points > 0 ? `-${match.opponent_team_points}` : '—'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements" className="space-y-4">
            <Card className="bg-[#1a2d4a] border-[#2a3f5f]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-[#c9a227]" />
                  Post Announcement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Select value={newAnnouncement.team} onValueChange={v => setNewAnnouncement({ ...newAnnouncement, team: v })}>
                    <SelectTrigger className="w-[140px] bg-[#0a1628] border-[#2a3f5f] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teams</SelectItem>
                      <SelectItem value="national">National Only</SelectItem>
                      <SelectItem value="select">Select Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  value={newAnnouncement.body}
                  onChange={e => setNewAnnouncement({ ...newAnnouncement, body: e.target.value })}
                  placeholder="Type your announcement here..."
                  className="bg-[#0a1628] border-[#2a3f5f] text-white min-h-[100px]"
                />
                <Button onClick={createAnnouncement} className="bg-[#c9a227] text-[#002147] hover:bg-[#d4af37]">
                  <Check className="h-4 w-4 mr-2" />
                  Post Announcement
                </Button>
              </CardContent>
            </Card>

            {/* Announcement List */}
            <div className="space-y-3">
              {announcements.map(ann => (
                <Card key={ann.id} className="bg-[#1a2d4a] border-[#2a3f5f]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="border-[#c9a227]/50 text-[#c9a227]">
                            {ann.team === 'all' ? 'All Teams' : ann.team === 'national' ? 'National' : 'Select'}
                          </Badge>
                          <span className="text-xs text-white/40">
                            {new Date(ann.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-white/90">{ann.body}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAnnouncement(ann.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {announcements.length === 0 && (
                <div className="text-center py-8 text-white/40">
                  No announcements yet
                </div>
              )}
            </div>
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media">
            <NhscaMediaAdmin />
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <NhscaOrdersAdmin />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
