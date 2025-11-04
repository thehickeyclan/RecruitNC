"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdminHeader } from "@/components/admin-header"
import { ArrowUp, ArrowDown, Save, Rocket, Calculator } from "lucide-react"
import Link from "next/link"

interface Athlete {
  id: string
  name: string
  graduationyear: number
  gender: string
  highschool: string
  weight: number | null
  college: string | null
  prospect_ranking: number | null
  previous_ranking: number | null
  academic_gpa: number | null
  nationally_ranked_wins: string | null
  college_opens_experience: string | null
  nhsca_2023_record: string | null
  nhsca_2023_placement: string | null
  nhsca_2024_record: string | null
  nhsca_2024_placement: string | null
  nhsca_2025_record: string | null
  nhsca_2025_placement: string | null
  super_32_2024_record: string | null
  super_32_2024_placement: string | null
  super_32_2025_record: string | null
  super_32_2025_placement: string | null
  recruitnc_score?: number
  calculated_rank?: number
  score_breakdown?: {
    ranked_wins: number
    college_opens: number
    super_32: number
    nhsca: number
    state: number
    gpa: number
  }
  nchsaa_results?: Array<{
    year: number
    place: number
    classification: string
    weight_class: string
    school: string
  }>
  nhsca_results?: Array<{
    year: number
    placement: string
  }>
}

export default function SimpleRankingPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState("2025")
  const [selectedGender, setSelectedGender] = useState("Male")
  const [selectedDivision, setSelectedDivision] = useState("all")
  const [saving, setSaving] = useState(false)
  const [calculatingScores, setCalculatingScores] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const loadAthletes = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/prospects/simple-ranking?year=${selectedYear}&gender=${selectedGender}&division=${selectedDivision}`,
      )
      const data = await response.json()
      setAthletes(data.athletes || [])
    } catch (error) {
      console.error("Failed to load athletes:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAthletes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedGender, selectedDivision])

  const updateRanking = (athleteId: string, newRanking: number) => {
    setAthletes((prev) =>
      prev.map((athlete) => (athlete.id === athleteId ? { ...athlete, prospect_ranking: newRanking } : athlete)),
    )
  }

  const saveRankings = async () => {
    setSaving(true)
    try {
      const rankings = athletes.map((athlete, index) => ({
        id: athlete.id,
        ranking: index + 1,
        current_ranking: athlete.prospect_ranking,
      }))

      console.log("[v0] Frontend - About to save rankings:", rankings.length)
      console.log("[v0] Frontend - Sample rankings:", rankings.slice(0, 3))

      const response = await fetch("/api/admin/prospects/simple-ranking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rankings }),
      })

      console.log("[v0] Frontend - API response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] Frontend - API error response:", errorText)
        throw new Error(`API returned ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      console.log("[v0] Frontend - API success response:", result)

      alert("Rankings saved successfully!")
    } catch (error: any) {
      console.error("[v0] Frontend - Failed to save rankings:", error)
      alert(`Failed to save rankings: ${error?.message || "Unknown error"}`)
    } finally {
      setSaving(false)
    }
  }

  const moveAthlete = (fromIndex: number, toIndex: number) => {
    const newAthletes = [...athletes]
    const [movedAthlete] = newAthletes.splice(fromIndex, 1)
    newAthletes.splice(toIndex, 0, movedAthlete)
    setAthletes(newAthletes)
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

        const updatedAthletes = athletes.map((athlete) => {
          const scoredAthlete = data.athletes.find((a: any) => a.id === athlete.id)
          if (scoredAthlete) {
            return {
              ...athlete,
              recruitnc_score: scoredAthlete.recruitnc_score,
              calculated_rank: scoredAthlete.calculated_rank,
              score_breakdown: scoredAthlete.score_breakdown,
            }
          }
          return athlete
        })

        const sortedAthletes = updatedAthletes.sort((a, b) => {
          const aScore = a.recruitnc_score || 0
          const bScore = b.recruitnc_score || 0
          return bScore - aScore
        })

        setAthletes(sortedAthletes)
        alert(`RecruitNC scores calculated for ${data.athletes.length} athletes`)
      } else {
        throw new Error("Failed to calculate RecruitNC scores")
      }
    } catch (error: any) {
      console.error("Error calculating RecruitNC scores:", error)
      alert("Failed to calculate RecruitNC scores")
    } finally {
      setCalculatingScores(false)
    }
  }

  const publishRankings = async () => {
    setPublishing(true)
    try {
      const response = await fetch("/api/admin/prospects/publish-rankings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: selectedYear,
          gender: selectedGender.toLowerCase(),
          rankings: athletes.map((athlete, index) => ({
            id: athlete.id,
            ranking: index + 1,
            name: athlete.name,
            high_school: athlete.highschool,
            weight_class: athlete.weight ? `${athlete.weight} lbs` : "TBD",
            academic_gpa: athlete.academic_gpa,
            nhsca_record: athlete.nhsca_2025_record || athlete.nhsca_2024_record || athlete.nhsca_2023_record || "N/A",
            super32_record: athlete.super_32_2025_record || athlete.super_32_2024_record || "N/A",
            ranked_win: athlete.nationally_ranked_wins ? "Yes" : "No",
            state_result: athlete.nchsaa_results?.[0]
              ? (() => {
                  const result = athlete.nchsaa_results[0]
                  const suffix = result.place === 2 ? "nd" : result.place === 3 ? "rd" : "th"
                  const placement = result.place === 1 ? "Champion" : result.place + suffix
                  return `${result.classification} ${placement} '${result.year.toString().slice(-2)}`
                })()
              : "N/A",
          })),
        }),
      })

      if (response.ok) {
        alert(`Rankings published successfully for Class of ${selectedYear} ${selectedGender}!`)
      } else {
        throw new Error("Failed to publish rankings")
      }
    } catch (error: any) {
      console.error("Failed to publish rankings:", error)
      alert("Failed to publish rankings")
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <div>
        <AdminHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600">Loading rankings...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <AdminHeader />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-[#13294B] to-[#1e3a5f] text-white rounded-lg p-6 shadow-lg">
            <h1 className="text-3xl font-bold mb-2">Prospect Rankings Manager</h1>
            <p className="text-blue-100">Drag and drop athletes to reorder rankings, then save and publish</p>
          </div>
        </div>

        {/* Controls Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Filters */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Filters:</span>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">Class of 2025</SelectItem>
                    <SelectItem value="2026">Class of 2026</SelectItem>
                    <SelectItem value="2027">Class of 2027</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedGender} onValueChange={setSelectedGender}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Divisions</SelectItem>
                    <SelectItem value="8A">8A</SelectItem>
                    <SelectItem value="7A">7A</SelectItem>
                    <SelectItem value="6A">6A</SelectItem>
                    <SelectItem value="5A">5A</SelectItem>
                    <SelectItem value="4A">4A</SelectItem>
                    <SelectItem value="3A">3A</SelectItem>
                    <SelectItem value="2A">2A</SelectItem>
                    <SelectItem value="1A">1A</SelectItem>
                    <SelectItem value="Independent">Independent</SelectItem>
                    <SelectItem value="NCISAA">NCISAA</SelectItem>
                    <SelectItem value="NoDivision">No Division</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  onClick={calculateRecruitNCScores}
                  disabled={calculatingScores || athletes.length === 0}
                  variant="outline"
                  className="border-green-300 text-green-700 hover:bg-green-50"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  {calculatingScores ? "Calculating..." : "Calculate Scores"}
                </Button>

                <Button
                  onClick={saveRankings}
                  disabled={saving}
                  className="bg-[#13294B] hover:bg-[#1e3a5f] text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Rankings"}
                </Button>

                <Button
                  onClick={publishRankings}
                  disabled={publishing || athletes.length === 0}
                  className="bg-[#CC0000] hover:bg-[#990000] text-white"
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  {publishing ? "Publishing..." : "Publish Live"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rankings List */}
        <div className="space-y-3">
          {athletes.map((athlete, index) => (
          <Card key={athlete.id} className="hover:shadow-md transition-shadow border-l-4 border-l-[#13294B]">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Rank Controls */}
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveAthlete(index, Math.max(0, index - 1))}
                    disabled={index === 0}
                    className="h-7 w-7 p-0 hover:bg-blue-50"
                  >
                    <ArrowUp className="h-4 w-4 text-[#13294B]" />
                  </Button>
                  <div className="flex flex-col items-center">
                    <div className="bg-gradient-to-br from-[#13294B] to-[#1e3a5f] text-white font-bold text-lg min-w-[3rem] text-center px-3 py-2 rounded-lg shadow">
                      #{index + 1}
                    </div>
                    {athlete.previous_ranking && athlete.previous_ranking !== index + 1 && (
                      <span className="text-xs mt-1">
                        {athlete.previous_ranking > index + 1 ? (
                          <span className="text-green-600 font-semibold">↑ +{athlete.previous_ranking - (index + 1)}</span>
                        ) : (
                          <span className="text-red-600 font-semibold">↓ -{(index + 1) - athlete.previous_ranking}</span>
                        )}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveAthlete(index, Math.min(athletes.length - 1, index + 1))}
                    disabled={index === athletes.length - 1}
                    className="h-7 w-7 p-0 hover:bg-blue-50"
                  >
                    <ArrowDown className="h-4 w-4 text-[#13294B]" />
                  </Button>
                </div>

                {/* Athlete Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Link href={`/admin/athletes/edit/${athlete.id}`} className="hover:text-[#CC0000] transition-colors">
                      <h3 className="font-bold text-lg text-[#13294B]">{athlete.name}</h3>
                    </Link>
                    {athlete.recruitnc_score && (
                      <Badge className="bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200">
                        Score: {athlete.recruitnc_score}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <span className="font-medium">{athlete.highschool}</span>
                    <span>•</span>
                    <Badge variant="outline" className="font-normal">
                      {athlete.weight ? `${athlete.weight} lbs` : "Weight TBD"}
                    </Badge>
                    {(athlete.graduationyear === 2026 || athlete.graduationyear === 2027) && athlete.college && (
                      <>
                        <span>•</span>
                        <Badge className="bg-green-50 text-green-700 border-green-200">
                          ✓ Committed: {athlete.college}
                        </Badge>
                      </>
                    )}
                  </div>
                  {athlete.score_breakdown && (
                    <div className="flex flex-wrap gap-1.5">
                      {athlete.score_breakdown.ranked_wins > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          RW: {athlete.score_breakdown.ranked_wins}pts
                        </Badge>
                      )}
                      {athlete.score_breakdown.college_opens > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          CO: {athlete.score_breakdown.college_opens}pts
                        </Badge>
                      )}
                      {athlete.score_breakdown.super_32 > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          S32: {athlete.score_breakdown.super_32}pts
                        </Badge>
                      )}
                      {athlete.score_breakdown.nhsca > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          NHSCA: {athlete.score_breakdown.nhsca}pts
                        </Badge>
                      )}
                      {athlete.score_breakdown.state > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          State: {athlete.score_breakdown.state}pts
                        </Badge>
                      )}
                      {athlete.score_breakdown.gpa > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          GPA: {athlete.score_breakdown.gpa}pts
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Achievement Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-3 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-xs text-yellow-800 mb-2">STATE</h4>
                {athlete.nchsaa_results && athlete.nchsaa_results.length > 0 ? (
                  <div className="space-y-1">
                    {athlete.nchsaa_results.slice(0, 3).map((result, idx) => (
                      <Badge
                        key={idx}
                        className={`text-xs block w-full ${
                          result.place === 1
                            ? "bg-yellow-500 text-black"
                            : result.place === 2
                              ? "bg-gray-300 text-black"
                              : result.place === 3
                                ? "bg-amber-600 text-white"
                                : "bg-blue-500 text-white"
                        }`}
                      >
                        {result.classification}{" "}
                        {result.place === 1
                          ? "Champ"
                          : `${result.place}${result.place === 2 ? "nd" : result.place === 3 ? "rd" : "th"}`}{" "}
                        '{result.year.toString().slice(-2)}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No state results</p>
                )}
              </div>

                <div className="bg-gradient-to-br from-red-50 to-rose-50 p-3 rounded-lg border border-red-200">
                  <h4 className="font-semibold text-xs text-red-800 mb-2">NHSCA</h4>
                {athlete.nhsca_2025_placement ||
                athlete.nhsca_2025_record ||
                athlete.nhsca_2024_placement ||
                athlete.nhsca_2024_record ||
                athlete.nhsca_2023_placement ||
                athlete.nhsca_2023_record ? (
                  <div className="space-y-1">
                    {athlete.nhsca_2025_placement && (
                      <Badge className="bg-red-500 text-white text-xs block w-full">
                        2025: {athlete.nhsca_2025_placement}
                      </Badge>
                    )}
                    {athlete.nhsca_2025_record && (
                      <Badge className="bg-red-400 text-white text-xs block w-full">
                        2025 Record: {athlete.nhsca_2025_record}
                      </Badge>
                    )}
                    {athlete.nhsca_2024_placement && (
                      <Badge className="bg-red-500 text-white text-xs block w-full">
                        2024: {athlete.nhsca_2024_placement}
                      </Badge>
                    )}
                    {athlete.nhsca_2024_record && (
                      <Badge className="bg-red-400 text-white text-xs block w-full">
                        2024 Record: {athlete.nhsca_2024_record}
                      </Badge>
                    )}
                    {athlete.nhsca_2023_placement && (
                      <Badge className="bg-red-500 text-white text-xs block w-full">
                        2023: {athlete.nhsca_2023_placement}
                      </Badge>
                    )}
                    {athlete.nhsca_2023_record && (
                      <Badge className="bg-red-400 text-white text-xs block w-full">
                        2023 Record: {athlete.nhsca_2023_record}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No NHSCA results</p>
                )}
              </div>

                <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-3 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-xs text-purple-800 mb-2">SUPER 32</h4>
                {athlete.super_32_2025_placement ||
                athlete.super_32_2025_record ||
                athlete.super_32_2024_placement ||
                athlete.super_32_2024_record ? (
                  <div className="space-y-1">
                    {athlete.super_32_2025_placement && (
                      <Badge className="bg-purple-500 text-white text-xs block w-full">
                        2025: {athlete.super_32_2025_placement}
                      </Badge>
                    )}
                    {athlete.super_32_2025_record && (
                      <Badge className="bg-purple-400 text-white text-xs block w-full">
                        2025 Record: {athlete.super_32_2025_record}
                      </Badge>
                    )}
                    {athlete.super_32_2024_placement && (
                      <Badge className="bg-purple-500 text-white text-xs block w-full">
                        2024: {athlete.super_32_2024_placement}
                      </Badge>
                    )}
                    {athlete.super_32_2024_record && (
                      <Badge className="bg-purple-400 text-white text-xs block w-full">
                        2024 Record: {athlete.super_32_2024_record}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No Super 32 results</p>
                )}
              </div>

                <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-3 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-xs text-orange-800 mb-2">RANKED WINS</h4>
                {athlete.nationally_ranked_wins ? (
                  <div className="space-y-1">
                    {athlete.nationally_ranked_wins
                      .split("\n")
                      .filter((win) => win.trim())
                      .slice(0, 3)
                      .map((win, idx) => (
                        <div key={idx} className="text-xs text-orange-700 leading-tight">
                          {win.trim().length > 40 ? `${win.trim().substring(0, 40)}...` : win.trim()}
                        </div>
                      ))}
                    {athlete.nationally_ranked_wins.split("\n").filter((win) => win.trim()).length > 3 && (
                      <div className="text-xs text-orange-600 font-medium">
                        +{athlete.nationally_ranked_wins.split("\n").filter((win) => win.trim()).length - 3} more
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No ranked wins</p>
                )}
              </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-3 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-xs text-blue-800 mb-2">COLLEGE OPENS</h4>
                {athlete.college_opens_experience ? (
                  <div className="space-y-1">
                    {athlete.college_opens_experience
                      .split("\n")
                      .filter((line) => line.trim())
                      .slice(0, 4)
                      .map((line, idx) => (
                        <div key={idx} className="text-xs text-blue-700 leading-tight">
                          {line.trim().length > 35 ? `${line.trim().substring(0, 35)}...` : line.trim()}
                        </div>
                      ))}
                    {athlete.college_opens_experience.split("\n").filter((line) => line.trim()).length > 4 && (
                      <div className="text-xs text-blue-600 font-medium">
                        +{athlete.college_opens_experience.split("\n").filter((line) => line.trim()).length - 4} more
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No college opens</p>
                )}
              </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-xs text-green-800 mb-2">GPA</h4>
                {athlete.academic_gpa ? (
                  <Badge className="bg-green-500 text-white text-xs">
                    GPA: {Number(athlete.academic_gpa).toFixed(1)}
                  </Badge>
                ) : (
                  <p className="text-xs text-gray-500">No GPA data</p>
                )}
              </div>
                </div>
              </div>
            </CardContent>
          </Card>
          ))}
        </div>

        {/* Empty State */}
        {athletes.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Athletes Found</h3>
              <p className="text-gray-500">
                No athletes found for {selectedYear} {selectedGender}
                {selectedDivision !== "all" ? ` in ${selectedDivision}` : ""}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

