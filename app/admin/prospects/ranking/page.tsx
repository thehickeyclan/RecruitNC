"use client"

import { useState, useEffect } from "react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GripVertical, Save, RotateCcw, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

interface Prospect {
  id: string
  name: string
  graduationyear: number
  prospect_ranking: number
  highschool: string
  weightclass: number
  division: string
  gender: string
  academic_gpa?: number
  is_prospect: boolean
  college?: string
  achievements?: string
  commitmentdate?: string
  highSchoolLogoUrl?: string
  collegeLogoUrl?: string
  recruiting_status?: string
  nhsca_2024_placement?: string
  nhsca_2025_placement?: string
  nhsca_2024_record?: string
  nhsca_2025_record?: string
  super_32_2024_placement?: string
  super_32_2025_placement?: string
  super_32_2024_record?: string
  super_32_2025_record?: string
  nationally_ranked_wins?: number
  nhsca_results?: Array<{ year: number; placement: string }>
  nchsaa_results?: Array<{ year: number; place: number }>
  aiRank?: string
  recruitnc_score?: number
  calculated_rank?: number
  score_breakdown?: any
}

export default function ProspectRankingPage() {
  const [selectedYear, setSelectedYear] = useState<string>("2025")
  const [selectedGender, setSelectedGender] = useState<string>("Male")
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showAllAthletes, setShowAllAthletes] = useState(false)
  const [aiRankings, setAiRankings] = useState<Record<string, string>>({})
  const [loadingAiRank, setLoadingAiRank] = useState<Record<string, boolean>>({})
  const [generatingBatchRanking, setGeneratingBatchRanking] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, number>>({})
  const [calculatingScores, setCalculatingScores] = useState(false)

  const availableYears = ["2025", "2026", "2027", "2028"]
  const genderOptions = ["Male", "Female"]

  useEffect(() => {
    const loadProspects = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `/api/admin/prospects/ranking?year=${selectedYear}&gender=${selectedGender}&uncommitted_only=true`,
        )

        if (response.ok) {
          const data = await response.json()
          let prospects = data.prospects || []
          if (!showAllAthletes && ["2026", "2027", "2028"].includes(selectedYear)) {
            prospects = prospects.slice(0, 25)
          }
          setProspects(prospects)
        } else {
          toast.error(`Failed to load prospects: ${response.status}`)
        }
      } catch (error) {
        console.error("Error loading prospects:", error)
        toast.error("Failed to load prospects")
      } finally {
        setLoading(false)
      }
    }

    loadProspects()
  }, [selectedYear, selectedGender, showAllAthletes])

  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const items = Array.from(prospects)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    const updatedProspects = items.map((prospect, index) => ({
      ...prospect,
      prospect_ranking: index + 1,
    }))

    setProspects(updatedProspects)
    setHasChanges(true)
  }

  const saveRankings = async () => {
    try {
      setSaving(true)
      const rankings = prospects.map((prospect, index) => ({
        id: prospect.id,
        prospect_ranking: index + 1,
      }))

      const response = await fetch("/api/admin/prospects/ranking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rankings, year: selectedYear, gender: selectedGender }),
      })

      if (response.ok) {
        toast.success("Rankings saved successfully")
        setHasChanges(false)
      } else {
        throw new Error("Failed to save rankings")
      }
    } catch (error) {
      console.error("Error saving rankings:", error)
      toast.error("Failed to save rankings")
    } finally {
      setSaving(false)
    }
  }

  const resetRankings = () => {
    window.location.reload()
  }

  const generateAiRanking = async (athleteId: string) => {
    try {
      setLoadingAiRank((prev) => ({ ...prev, [athleteId]: true }))

      const response = await fetch("/api/admin/prospects/ai-ranking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId }),
      })

      if (response.ok) {
        const data = await response.json()
        setAiRankings((prev) => ({ ...prev, [athleteId]: data.aiRank }))
        toast.success(`AI ranking generated: ${data.aiRank}`)
      } else {
        throw new Error("Failed to generate AI ranking")
      }
    } catch (error) {
      console.error("Error generating AI ranking:", error)
      toast.error("Failed to generate AI ranking")
    } finally {
      setLoadingAiRank((prev) => ({ ...prev, [athleteId]: false }))
    }
  }

  const generateBatchAiRanking = async () => {
    try {
      setGeneratingBatchRanking(true)

      const response = await fetch("/api/admin/prospects/batch-ai-ranking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: Number.parseInt(selectedYear),
          gender: selectedGender,
          suggestionsOnly: true, // Request suggestions only, don't update database
        }),
      })

      if (response.ok) {
        const data = await response.json()

        const suggestions: Record<string, number> = {}
        data.rankings.forEach((ranking: any) => {
          suggestions[ranking.id] = ranking.suggested_ranking
        })
        setAiSuggestions(suggestions)

        toast.success(`AI suggestions generated for ${data.rankings.length} athletes`)
      } else {
        throw new Error("Failed to generate batch AI rankings")
      }
    } catch (error) {
      console.error("Error generating batch AI rankings:", error)
      toast.error("Failed to generate AI suggestions")
    } finally {
      setGeneratingBatchRanking(false)
    }
  }

  const applyAiSuggestions = () => {
    if (Object.keys(aiSuggestions).length === 0) {
      toast.error("No AI suggestions available")
      return
    }

    const updatedProspects = [...prospects]
      .sort((a, b) => {
        const aRank = aiSuggestions[a.id] || 999
        const bRank = aiSuggestions[b.id] || 999
        return aRank - bRank
      })
      .map((prospect, index) => ({
        ...prospect,
        prospect_ranking: index + 1,
      }))

    setProspects(updatedProspects)
    setHasChanges(true)
    toast.success("AI suggestions applied to rankings")
  }

  const calculateRecruitNCScores = async () => {
    try {
      setCalculatingScores(true)

      const response = await fetch("/api/admin/prospects/calculate-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: Number.parseInt(selectedYear),
          gender: selectedGender,
        }),
      })

      if (response.ok) {
        const data = await response.json()

        // Update prospects with calculated scores and rankings
        const updatedProspects = prospects.map((prospect) => {
          const scoredAthlete = data.athletes.find((athlete: any) => athlete.id === prospect.id)
          if (scoredAthlete) {
            return {
              ...prospect,
              recruitnc_score: scoredAthlete.recruitnc_score,
              calculated_rank: scoredAthlete.calculated_rank,
              score_breakdown: scoredAthlete.score_breakdown,
            }
          }
          return prospect
        })

        // Sort by calculated rank
        const sortedProspects = updatedProspects.sort((a, b) => {
          const aRank = (a as any).calculated_rank || 999
          const bRank = (b as any).calculated_rank || 999
          return aRank - bRank
        })

        setProspects(sortedProspects)
        setHasChanges(true)
        toast.success(`RecruitNC scores calculated for ${data.athletes.length} athletes`)
      } else {
        throw new Error("Failed to calculate RecruitNC scores")
      }
    } catch (error) {
      console.error("Error calculating RecruitNC scores:", error)
      toast.error("Failed to calculate RecruitNC scores")
    } finally {
      setCalculatingScores(false)
    }
  }

  const getTournamentPills = (prospect: Prospect) => {
    const pills = []

    if (prospect.nchsaa_results && prospect.nchsaa_results.length > 0) {
      // Sort by year descending to show most recent first
      const sortedResults = [...prospect.nchsaa_results].sort((a, b) => b.year - a.year)

      sortedResults.forEach((result, idx) => {
        const placement = result.place
        const year = result.year.toString().slice(-2) // Get last 2 digits of year
        let pillText = ""
        let pillColor = ""

        if (placement === 1) {
          pillText = `🏆 State Champ '${year}`
          pillColor = "bg-yellow-100 text-yellow-800 border-yellow-300"
        } else if (placement <= 3) {
          pillText = `🥉 State ${placement}${getOrdinalSuffix(placement)} '${year}`
          pillColor = "bg-yellow-50 text-yellow-700 border-yellow-200"
        } else if (placement <= 8) {
          pillText = `📍 State ${placement}${getOrdinalSuffix(placement)} '${year}`
          pillColor = "bg-orange-50 text-orange-700 border-orange-200"
        } else if (placement <= 16) {
          pillText = `📊 State ${placement}${getOrdinalSuffix(placement)} '${year}`
          pillColor = "bg-gray-50 text-gray-700 border-gray-200"
        }

        if (pillText) {
          pills.push(
            <Badge key={`nchsaa-${idx}`} className={`text-xs px-2 py-1 ${pillColor}`}>
              {pillText}
            </Badge>,
          )
        }
      })
    }

    if (prospect.nhsca_results && prospect.nhsca_results.length > 0) {
      // Sort by year descending to show most recent first
      const sortedResults = [...prospect.nhsca_results].sort((a, b) => b.year - a.year)

      sortedResults.forEach((result, idx) => {
        const placement = result.placement
        const year = result.year.toString().slice(-2) // Get last 2 digits of year
        let pillText = ""
        let pillColor = ""

        if (placement === "1st" || placement === "1") {
          pillText = `🇺🇸 NHSCA Champ '${year}`
          pillColor = "bg-blue-100 text-blue-800 border-blue-300"
        } else if (placement.includes("2nd") || placement.includes("3rd") || placement === "2" || placement === "3") {
          pillText = `🇺🇸 NHSCA ${placement} '${year}`
          pillColor = "bg-blue-50 text-blue-700 border-blue-200"
        } else if (
          placement.includes("th") ||
          placement.includes("4") ||
          placement.includes("5") ||
          placement.includes("6") ||
          placement.includes("7") ||
          placement.includes("8")
        ) {
          pillText = `🇺🇸 NHSCA ${placement} '${year}`
          pillColor = "bg-indigo-50 text-indigo-700 border-indigo-200"
        }

        if (pillText) {
          pills.push(
            <Badge key={`nhsca-${idx}`} className={`text-xs px-2 py-1 ${pillColor}`}>
              {pillText}
            </Badge>,
          )
        }
      })
    }

    const super32Records = []
    if (prospect.super_32_2024_record)
      super32Records.push({
        year: "24",
        record: prospect.super_32_2024_record,
        placement: prospect.super_32_2024_placement,
      })
    if (prospect.super_32_2025_record)
      super32Records.push({
        year: "25",
        record: prospect.super_32_2025_record,
        placement: prospect.super_32_2025_placement,
      })

    super32Records.forEach((s32, idx) => {
      if (s32.placement) {
        let pillColor = "bg-purple-100 text-purple-800 border-purple-300"
        if (s32.placement === "1st" || s32.placement === "1")
          pillColor = "bg-purple-100 text-purple-800 border-purple-300"
        else if (s32.placement.includes("2nd") || s32.placement.includes("3rd"))
          pillColor = "bg-purple-50 text-purple-700 border-purple-200"

        pills.push(
          <Badge key={`s32-place-${idx}`} className={`text-xs px-2 py-1 ${pillColor}`}>
            ⭐ S32 {s32.placement} '${s32.year}
          </Badge>,
        )
      }
      if (s32.record) {
        pills.push(
          <Badge key={`s32-record-${idx}`} className="text-xs px-2 py-1 bg-purple-50 text-purple-700 border-purple-200">
            📈 S32 '${s32.year}: {s32.record}
          </Badge>,
        )
      }
    })

    return pills
  }

  const getAchievementFlags = (prospect: Prospect) => {
    const flags = []

    // NHSCA All American flag (top 8 placement)
    if (prospect.nhsca_results && prospect.nhsca_results.length > 0) {
      const hasAllAmerican = prospect.nhsca_results.some((result) => {
        const placement = result.placement.toString().toLowerCase()
        return (
          placement === "1st" ||
          placement === "1" ||
          placement === "2nd" ||
          placement === "2" ||
          placement === "3rd" ||
          placement === "3" ||
          placement === "4th" ||
          placement === "4" ||
          placement === "5th" ||
          placement === "5" ||
          placement === "6th" ||
          placement === "6" ||
          placement === "7th" ||
          placement === "7" ||
          placement === "8th" ||
          placement === "8"
        )
      })

      if (hasAllAmerican) {
        flags.push(
          <Badge
            key="nhsca-aa"
            className="text-xs px-3 py-1 bg-gradient-to-r from-red-500 to-red-600 text-white border-red-600 font-bold shadow-md"
          >
            🇺🇸 NHSCA ALL-AMERICAN
          </Badge>,
        )
      }
    }

    // NCHSAA State Champion flag
    if (prospect.nchsaa_results && prospect.nchsaa_results.length > 0) {
      const hasStateChamp = prospect.nchsaa_results.some((result) => result.place === 1)

      if (hasStateChamp) {
        flags.push(
          <Badge
            key="state-champ"
            className="text-xs px-3 py-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-yellow-600 font-bold shadow-md"
          >
            🏆 STATE CHAMPION
          </Badge>,
        )
      }
    }

    // NCHSAA State Placer flag (2nd-8th place)
    if (prospect.nchsaa_results && prospect.nchsaa_results.length > 0) {
      const hasStatePlacer = prospect.nchsaa_results.some((result) => result.place >= 2 && result.place <= 8)
      const hasStateChamp = prospect.nchsaa_results.some((result) => result.place === 1)

      if (hasStatePlacer && !hasStateChamp) {
        flags.push(
          <Badge
            key="state-placer"
            className="text-xs px-3 py-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-600 font-bold shadow-md"
          >
            🥉 STATE PLACER
          </Badge>,
        )
      }
    }

    // Nationally Ranked Wins flag
    if (prospect.nationally_ranked_wins && prospect.nationally_ranked_wins > 0) {
      flags.push(
        <Badge
          key="ranked-wins"
          className="text-xs px-3 py-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white border-purple-600 font-bold shadow-md"
        >
          🎯 {prospect.nationally_ranked_wins} RANKED WIN{prospect.nationally_ranked_wins > 1 ? "S" : ""}
        </Badge>,
      )
    }

    // NHSCA Record flag
    if (prospect.nhsca_2024_record || prospect.nhsca_2025_record) {
      flags.push(
        <Badge
          key="nhsca-record"
          className="text-xs px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-600 font-bold shadow-md"
        >
          📊 NHSCA RECORD
        </Badge>,
      )
    }

    // Super 32 Record flag
    if (
      prospect.super_32_2024_record ||
      prospect.super_32_2025_record ||
      prospect.super_32_2024_placement ||
      prospect.super_32_2025_placement
    ) {
      flags.push(
        <Badge
          key="super32-record"
          className="text-xs px-3 py-1 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-indigo-600 font-bold shadow-md"
        >
          ⭐ SUPER 32 COMPETITOR
        </Badge>,
      )
    }

    return flags
  }

  const getOrdinalSuffix = (num: number): string => {
    const j = num % 10
    const k = num % 100
    if (j === 1 && k !== 11) return "st"
    if (j === 2 && k !== 12) return "nd"
    if (j === 3 && k !== 13) return "rd"
    return "th"
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading prospects...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Athlete Rankings</h1>
          <p className="text-muted-foreground mt-1">Drag and drop to reorder prospects and commits within each class</p>
        </div>

        <div className="flex items-center gap-3">
          {["2026", "2027", "2028"].includes(selectedYear) && (
            <Button
              variant={showAllAthletes ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAllAthletes(!showAllAthletes)}
            >
              {showAllAthletes ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
              {showAllAthletes ? "All Athletes" : "Top 25 Only"}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={calculateRecruitNCScores}
            disabled={calculatingScores || prospects.length === 0}
            className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-700 hover:from-green-100 hover:to-emerald-100"
          >
            📊 {calculatingScores ? "Calculating..." : "RecruitNC Scores"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={generateBatchAiRanking}
            disabled={generatingBatchRanking || prospects.length === 0}
            className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 text-purple-700 hover:from-purple-100 hover:to-blue-100"
          >
            🤖 {generatingBatchRanking ? "Analyzing..." : "Get AI Suggestions"}
          </Button>

          {Object.keys(aiSuggestions).length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={applyAiSuggestions}
              className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-700 hover:from-green-100 hover:to-emerald-100"
            >
              ✅ Apply AI Suggestions
            </Button>
          )}

          <Button variant="outline" onClick={resetRankings} size="sm">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={saveRankings} disabled={saving} size="sm">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Rankings"}
          </Button>

          <Select value={selectedGender} onValueChange={setSelectedGender}>
            <SelectTrigger className="w-24">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              {genderOptions.map((gender) => (
                <SelectItem key={gender} value={gender}>
                  {gender}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year}>
                  Class of {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="bg-card border-ranking-border">
        <CardHeader>
          <CardTitle className="text-primary">
            {selectedGender} Class of {selectedYear} Rankings
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {prospects.length} uncommitted athletes •
            {["2026", "2027", "2028"].includes(selectedYear)
              ? showAllAthletes
                ? " All athletes (Admin View)"
                : " Top 25 rankings only (Public View)"
              : " All athletes"}{" "}
            • Drag to reorder rankings
          </p>
        </CardHeader>
        <CardContent>
          {showAllAthletes && ["2026", "2027", "2028"].includes(selectedYear) && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Admin View:</strong> You're viewing all athletes. Only the top 25 will be publicly ranked.
              </p>
            </div>
          )}

          {prospects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No {selectedGender.toLowerCase()} athletes found for Class of {selectedYear}
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="prospects">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`space-y-3 min-h-[200px] p-4 rounded-lg border-2 border-dashed transition-colors ${
                      snapshot.isDraggingOver ? "border-accent bg-drag-over" : "border-ranking-border bg-background"
                    }`}
                  >
                    {prospects.map((prospect, index) => (
                      <Draggable key={prospect.id} draggableId={prospect.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`bg-ranking-card hover:bg-ranking-card-hover border border-ranking-border rounded-lg p-4 transition-all duration-200 ${
                              snapshot.isDragging
                                ? "shadow-lg ring-2 ring-accent ring-opacity-50 rotate-2"
                                : "shadow-sm"
                            } ${!showAllAthletes || index < 25 ? "" : "opacity-60 border-dashed"}`}
                          >
                            <div className="flex items-center gap-4">
                              <div
                                {...provided.dragHandleProps}
                                className="text-muted-foreground hover:text-accent cursor-grab active:cursor-grabbing"
                              >
                                <GripVertical className="w-5 h-5" />
                              </div>

                              <div className="flex-shrink-0">
                                <Badge
                                  variant="outline"
                                  className={`${index < 25 ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-muted"}`}
                                >
                                  #{index + 1}
                                  {index >= 25 && showAllAthletes && <span className="ml-1 text-xs">(Not Ranked)</span>}
                                </Badge>
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="mb-2">
                                  <div className="flex flex-wrap gap-1">{getAchievementFlags(prospect)}</div>
                                </div>

                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-semibold text-foreground truncate">{prospect.name}</h3>
                                  <Badge variant="secondary" className="text-xs">
                                    {prospect.weightclass} lbs
                                  </Badge>
                                  <Badge variant={prospect.is_prospect ? "outline" : "default"} className="text-xs">
                                    {prospect.recruiting_status || "Uncommitted"}
                                  </Badge>
                                  {prospect.division && (
                                    <Badge variant="outline" className="text-xs">
                                      {prospect.division}
                                    </Badge>
                                  )}
                                  {aiSuggestions[prospect.id] && (
                                    <Badge className="text-xs px-2 py-1 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border-amber-300">
                                      🤖 AI Suggests: #{aiSuggestions[prospect.id]}
                                    </Badge>
                                  )}
                                  {(prospect as any).recruitnc_score && (
                                    <Badge className="text-xs px-2 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-300 font-bold">
                                      📊 RecruitNC: {(prospect as any).recruitnc_score}
                                    </Badge>
                                  )}
                                  {aiRankings[prospect.id] && (
                                    <Badge className="text-xs px-2 py-1 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-800 border-purple-300">
                                      🤖 AI Rank: {aiRankings[prospect.id]}
                                    </Badge>
                                  )}

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => generateAiRanking(prospect.id)}
                                    disabled={loadingAiRank[prospect.id]}
                                    className="text-xs px-2 py-1 h-6"
                                  >
                                    {loadingAiRank[prospect.id] ? "..." : "🤖 AI Rank"}
                                  </Button>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    {prospect.highSchoolLogoUrl && (
                                      <img
                                        src={prospect.highSchoolLogoUrl || "/placeholder.svg"}
                                        alt={`${prospect.highschool} logo`}
                                        className="w-5 h-5 object-contain rounded"
                                        onError={(e) => {
                                          e.currentTarget.style.display = "none"
                                        }}
                                      />
                                    )}
                                    <span>{prospect.highschool}</span>
                                  </div>
                                  {prospect.college && (
                                    <div className="flex items-center gap-2">
                                      {prospect.collegeLogoUrl && (
                                        <img
                                          src={prospect.collegeLogoUrl || "/placeholder.svg"}
                                          alt={`${prospect.college} logo`}
                                          className="w-5 h-5 object-contain rounded"
                                          onError={(e) => {
                                            e.currentTarget.style.display = "none"
                                          }}
                                        />
                                      )}
                                      <span className="text-blue-600 font-medium">{prospect.college}</span>
                                    </div>
                                  )}
                                  {prospect.academic_gpa && (
                                    <span className="text-green-600 font-medium bg-green-50 px-2 py-1 rounded text-xs">
                                      GPA: {prospect.academic_gpa}
                                    </span>
                                  )}
                                </div>

                                <div className="mt-2">
                                  <div className="flex flex-wrap gap-1">
                                    {/* Tournament Pills from database results - ALL YEARS */}
                                    {getTournamentPills(prospect)}

                                    {/* NHSCA Pills from manual fields */}
                                    {(prospect.nhsca_2024_placement || prospect.nhsca_2025_placement) && (
                                      <Badge className="text-xs px-2 py-1 bg-blue-100 text-blue-800 border-blue-300">
                                        🇺🇸 NHSCA Placer
                                      </Badge>
                                    )}
                                    {(prospect.nhsca_2024_record || prospect.nhsca_2025_record) && (
                                      <Badge className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border-blue-200">
                                        📊 NHSCA: {prospect.nhsca_2024_record || prospect.nhsca_2025_record}
                                      </Badge>
                                    )}

                                    {/* State Champion/Placer Pills from achievements string */}
                                    {prospect.achievements?.includes("State Champion") && (
                                      <Badge className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 border-yellow-300">
                                        🏆 State Champion
                                      </Badge>
                                    )}
                                    {prospect.achievements?.includes("State Placer") && (
                                      <Badge className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 border-yellow-200">
                                        🥉 State Placer
                                      </Badge>
                                    )}

                                    {/* Other achievements from string */}
                                    {prospect.achievements && typeof prospect.achievements === "string" && (
                                      <>
                                        {prospect.achievements
                                          .split("•")
                                          .filter((achievement) => {
                                            const trimmed = achievement.trim()
                                            return (
                                              trimmed &&
                                              !trimmed.includes("State Champion") &&
                                              !trimmed.includes("State Placer")
                                            )
                                          })
                                          .map((achievement, idx) => {
                                            const trimmed = achievement.trim()
                                            return (
                                              <Badge
                                                key={`achievement-${idx}`}
                                                variant="outline"
                                                className="text-xs px-2 py-1 bg-gray-50 text-gray-700 border-gray-200"
                                              >
                                                {trimmed}
                                              </Badge>
                                            )
                                          })}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>

      {hasChanges && (
        <div className="fixed bottom-6 right-6 bg-accent text-accent-foreground px-4 py-2 rounded-lg shadow-lg">
          <p className="text-sm font-medium">You have unsaved changes</p>
        </div>
      )}
    </div>
  )
}
