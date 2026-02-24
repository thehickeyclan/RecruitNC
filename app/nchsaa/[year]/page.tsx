"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Crown, Calendar, Trophy, ArrowLeft, Download, Search, Eye } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { TournamentBracketModal } from "@/components/tournament-bracket-modal"

// Display order for classifications (boys: 1A/2A, 3A–8A; girls: 1-4A, 5A–8A; 2025 and earlier: 1A, 2A, 3A, 4A)
const CLASSIFICATION_ORDER = ["1-4A", "1A/2A", "1A", "2A", "3A", "4A", "5A", "6A", "7A", "8A"]

interface TournamentResult {
  id: string
  year: number
  weight_class: string
  classification: string
  place: number
  wrestler_name: string
  school: string
  result: string
  is_forfeit: boolean
}

interface MostOutstandingWrestler {
  id: number
  name: string
  school: string
  division: string
  year: number
}

interface TeamPointsWinner {
  id: number
  year: number
  division: string
  champion_school: string
  coach_name: string
  points: number
  tournament_site: string
}

interface ClassificationData {
  [weightClass: string]: TournamentResult[]
}

const DIVISION_BADGE_COLORS: Record<string, string> = {
  "1-4A": "bg-pink-500",
  "1A/2A": "bg-[#32cd32]",
  "1A": "bg-[#32cd32]",
  "2A": "bg-[#012ECD]",
  "3A": "bg-[#D3b574]",
  "4A": "bg-[#B91C1C]",
  "5A": "bg-[#6B21A8]",
  "6A": "bg-[#0D9488]",
  "7A": "bg-[#EA580C]",
  "8A": "bg-[#002147]",
}

function sortClassifications(classes: string[]): string[] {
  const orderSet = new Set(CLASSIFICATION_ORDER)
  const sorted = [...classes].sort((a, b) => {
    const ia = CLASSIFICATION_ORDER.indexOf(a)
    const ib = CLASSIFICATION_ORDER.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b)
  })
  return sorted
}

export default function NCHSAAYearResults() {
  const params = useParams()
  const yearParam = params?.year as string
  const year = yearParam ? parseInt(yearParam, 10) : 2025

  const [tournamentData, setTournamentData] = useState<Record<string, ClassificationData>>({})
  const [classifications, setClassifications] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalMedalists: 0, ncUnitedMedalists: 0 })
  const [mostOutstandingWrestlers, setMostOutstandingWrestlers] = useState<MostOutstandingWrestler[]>([])
  const [teamPointsWinners, setTeamPointsWinners] = useState<TeamPointsWinner[]>([])
  const [bracketModal, setBracketModal] = useState({ isOpen: false, weightClass: "", classification: "" })
  const [selectedDivision, setSelectedDivision] = useState("")
  const [selectedWeight, setSelectedWeight] = useState("")

  const openBracketModal = (classification: string, weightClass: string) => {
    setBracketModal({ isOpen: true, weightClass, classification })
  }
  const closeBracketModal = () => {
    setBracketModal({ isOpen: false, weightClass: "", classification: "" })
  }

  useEffect(() => {
    const fetchTournamentData = async () => {
      try {
        const { data: results, error } = await supabase
          .from("wrestling_nchsaa_results")
          .select("*")
          .eq("year", year)
          .order("classification")
          .order("weight_class")
          .order("place")

        if (error) {
          console.error("[NCHSAA] Error fetching tournament data:", error)
          setLoading(false)
          return
        }

        const { data: mowResults, error: mowError } = await supabase
          .from("most_outstanding_wrestlers")
          .select("*")
          .eq("year", year)
          .order("division")

        if (!mowError && mowResults?.length) {
          const uniqueMOW =
            mowResults?.reduce((acc: MostOutstandingWrestler[], current) => {
              if (!acc.find((item) => item.division === current.division)) acc.push(current)
              return acc
            }, []) || []
          setMostOutstandingWrestlers(uniqueMOW)
        }

        const { data: teamPointsResults, error: teamPointsError } = await supabase
          .from("tournament_champions")
          .select("*")
          .eq("year", year)
          .order("division")

        if (!teamPointsError && teamPointsResults?.length) {
          setTeamPointsWinners(teamPointsResults || [])
        }

        const groupedData: Record<string, ClassificationData> = {}
        let totalMedalists = 0
        let ncUnitedCount = 0

        const maxPlacerPlace = year >= 2026 ? 4 : 6 // 7-division (2026+): placers 1–4; 4-division: 1–6
        results?.forEach((result: TournamentResult) => {
          const classification = result.classification
          const weightClass = result.weight_class
          if (!groupedData[classification]) groupedData[classification] = {}
          if (!groupedData[classification][weightClass]) groupedData[classification][weightClass] = []
          groupedData[classification][weightClass].push(result)
          if (result.place >= 1 && result.place <= maxPlacerPlace) totalMedalists++
          if (result.school?.toLowerCase().includes("nc united") || result.school?.toLowerCase().includes("ncunited")) {
            ncUnitedCount++
          }
        })

        setTournamentData(groupedData)
        setClassifications(sortClassifications(Object.keys(groupedData)))
        setStats({ totalMedalists, ncUnitedMedalists: ncUnitedCount })
      } catch (e) {
        console.error("[NCHSAA] Error:", e)
      } finally {
        setLoading(false)
      }
    }

    fetchTournamentData()
  }, [year])

  const getPlaceBadgeColor = (place: number) => {
    switch (place) {
      case 1: return "bg-yellow-500 text-white"
      case 2: return "bg-gray-400 text-white"
      case 3: return "bg-amber-600 text-white"
      case 4: return "bg-blue-500 text-white"
      case 5: return "bg-green-500 text-white"
      case 6: return "bg-purple-500 text-white"
      default: return "bg-gray-200 text-gray-800"
    }
  }

  const maxPlacerPlace = year >= 2026 ? 4 : 6 // 7-division: placers 1–4; 4-division: 1–6

  const renderClassificationResults = (classification: string, data: ClassificationData) => {
    const weightClasses = Object.keys(data).sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    const badgeColor = DIVISION_BADGE_COLORS[classification] || "bg-gray-500"

    if (weightClasses.length === 0) {
      return (
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-6 rounded-lg border border-gray-200">
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-xl font-semibold text-[#03154c] mb-2">No Results Available</h4>
            <p className="text-slate-600">No {classification} results have been uploaded yet.</p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {weightClasses.map((weightClass) => (
          <div key={weightClass} className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="text-lg font-semibold text-[#03154c] mb-3">{weightClass} lbs</h4>
            <div className="space-y-2">
              {data[weightClass]
                .filter((r) => r.place != null && r.place >= 1 && r.place <= maxPlacerPlace)
                .map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-3">
                      <Badge className={getPlaceBadgeColor(result.place)}>
                        {result.place === 1 ? "1st" : result.place === 2 ? "2nd" : result.place === 3 ? "3rd" : result.place ? `${result.place}th` : "-"}
                      </Badge>
                      <div>
                        <div className="font-medium text-[#03154c]">{result.wrestler_name}</div>
                        <div className="text-sm text-slate-600">{result.school}</div>
                      </div>
                    </div>
                    {result.result && <div className="text-sm text-slate-500">{result.result}</div>}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B91C1C] mx-auto mb-4" />
          <p className="text-slate-600">Loading {year} NCHSAA Results...</p>
        </div>
      </div>
    )
  }

  const weightClasses = ["106", "113", "120", "126", "132", "138", "144", "150", "157", "165", "175", "190", "215", "285"]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/nchsaa">
            <Button variant="outline" size="sm" className="border-[#B91C1C] text-[#B91C1C] hover:bg-[#B91C1C] hover:text-white bg-transparent">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Overview
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-[#03154c]">{year} NCHSAA Results</h1>
            <p className="text-slate-600">North Carolina State Wrestling Championships</p>
          </div>
        </div>

        <Card className="mb-8 border-2 border-[#B91C1C]">
          <CardHeader className="bg-gradient-to-r from-[#B91C1C] to-[#7F1D1D] text-white">
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-6 h-6" />
              {year} Tournament Summary
            </CardTitle>
            <CardDescription className="text-red-100">
              State championship results and highlights
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-[#B91C1C] mb-2">{classifications.length}</div>
                <div className="text-sm text-slate-600">Classifications</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#D3b574] mb-2">{classifications.length * 14}</div>
                <div className="text-sm text-slate-600">Weight Classes</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#32cd32] mb-2">{stats.totalMedalists}</div>
                <div className="text-sm text-slate-600">Medal Winners</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#012ECD] mb-2">{stats.ncUnitedMedalists ?? "0"}</div>
                <div className="text-sm text-slate-600">NC United Medalists</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-[#03154c] flex items-center gap-2">
              <Trophy className="w-6 h-6" />
              Tournament Brackets
            </CardTitle>
            <CardDescription>Select a division and weight class to view the bracket</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#03154c]">Division</label>
                <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                  <SelectTrigger className="border-[#B91C1C]">
                    <SelectValue placeholder="Choose division..." />
                  </SelectTrigger>
                  <SelectContent>
                    {classifications.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#03154c]">Weight Class</label>
                <Select value={selectedWeight} onValueChange={setSelectedWeight} disabled={!selectedDivision}>
                  <SelectTrigger className="border-[#B91C1C]">
                    <SelectValue placeholder="Choose weight..." />
                  </SelectTrigger>
                  <SelectContent>
                    {weightClasses.map((w) => (
                      <SelectItem key={w} value={w}>{w} lbs</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button
                onClick={() => selectedDivision && selectedWeight && openBracketModal(selectedDivision, selectedWeight)}
                disabled={!selectedDivision || !selectedWeight}
                className="bg-[#B91C1C] hover:bg-[#7F1D1D] text-white"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Bracket
              </Button>
              <Button variant="outline" onClick={() => { setSelectedDivision(""); setSelectedWeight(""); }} className="border-[#B91C1C] text-[#B91C1C]">
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {mostOutstandingWrestlers.length > 0 && (
          <Card className="mb-8 border-2 border-[#D3b574]">
            <CardHeader className="bg-gradient-to-r from-[#D3b574] to-yellow-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-6 h-6" />
                Most Outstanding Wrestlers
              </CardTitle>
              <CardDescription className="text-yellow-100">{year} MOW by division</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {mostOutstandingWrestlers.map((mow) => (
                  <div key={mow.id} className="bg-gradient-to-br from-yellow-50 to-amber-50 p-4 rounded-lg border border-yellow-200">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#D3b574] mb-2">{mow.division}</div>
                      <div className="text-lg font-semibold text-[#03154c] mb-1">{mow.name}</div>
                      <div className="text-sm text-slate-600">{mow.school}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {teamPointsWinners.length > 0 && (
          <Card className="mb-8 border-2 border-[#B91C1C]">
            <CardHeader className="bg-gradient-to-r from-[#B91C1C] to-[#7F1D1D] text-white">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-6 h-6" />
                Team Points Champions
              </CardTitle>
              <CardDescription className="text-red-100">{year} team points by division</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {teamPointsWinners.map((w) => (
                  <div key={w.id} className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#B91C1C] mb-2">{w.division}</div>
                      <div className="text-lg font-semibold text-[#03154c] mb-1">{w.champion_school}</div>
                      <div className="text-sm text-slate-600 mb-1">Coach: {w.coach_name}</div>
                      <div className="text-lg font-bold text-[#B91C1C]">{w.points} pts</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-[#03154c] flex items-center gap-2">
              <Trophy className="w-6 h-6" />
              Results by Classification
            </CardTitle>
            <CardDescription>{year} NCHSAA State Championship results</CardDescription>
          </CardHeader>
          <CardContent>
            {classifications.length === 0 ? (
              <div className="text-center py-12 text-slate-600">
                No results for {year} yet. Upload data via Admin → NCHSAA State Results Upload.
              </div>
            ) : (
              <Tabs defaultValue={classifications[0]?.toLowerCase().replace("/", "") ?? "4a"} className="w-full">
                <TabsList className="flex flex-wrap gap-1 w-full">
                  {classifications.map((c) => (
                    <TabsTrigger key={c} value={c.toLowerCase().replace("/", "")}>
                      {c}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {classifications.map((c) => (
                  <TabsContent key={c} value={c.toLowerCase().replace("/", "")} className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-[#03154c]">{c} State Championship Results</h3>
                      <Badge className={DIVISION_BADGE_COLORS[c] || "bg-gray-500"}>{c}</Badge>
                    </div>
                    {renderClassificationResults(c, tournamentData[c] || {})}
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-2 border-[#012ECD] hover:shadow-lg transition-shadow">
            <CardHeader className="bg-gradient-to-r from-[#012ECD] to-[#03154c] text-white">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Historical Results
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-slate-600 text-sm mb-4">Browse complete NCHSAA championship history.</p>
              <Link href="/nchsaa/archive">
                <Button variant="outline" className="w-full border-[#012ECD] text-[#012ECD] hover:bg-[#012ECD] hover:text-white">
                  View Archive
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <TournamentBracketModal
        isOpen={bracketModal.isOpen}
        onClose={closeBracketModal}
        weightClass={bracketModal.weightClass}
        classification={bracketModal.classification}
      />
    </div>
  )
}
