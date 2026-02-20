"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminHeader } from "@/components/admin-header"
import { ArrowUp, ArrowDown, Save, Rocket, Calculator, GripVertical } from 'lucide-react'
import Link from "next/link"
import Image from "next/image"

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
    record?: string
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
        { credentials: "include", cache: "no-store" },
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
    } catch (error) {
      console.error("[v0] Frontend - Failed to save rankings:", error)
      alert(`Failed to save rankings: ${error.message}`)
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
    } catch (error) {
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
    } catch (error) {
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
        <div className="mb-6">
          <div className="bg-gradient-to-r from-[#13294B] to-[#1e3a5f] text-white rounded-lg p-6 shadow-lg">
            <h1 className="text-3xl font-bold mb-2">Prospect Rankings Manager</h1>
            <p className="text-blue-100">Drag and drop athletes to reorder rankings, then save and publish</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
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
                    <SelectItem value="2028">Class of 2028</SelectItem>
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

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow style={{ backgroundColor: "#0D1A4D" }} className="text-white hover:bg-[#0D1A4D]">
                <TableHead className="w-20 text-white font-semibold text-center">Actions</TableHead>
                <TableHead className="w-16 text-white font-semibold">Rank</TableHead>
                <TableHead className="min-w-[200px] text-white font-semibold">Name</TableHead>
                <TableHead className="text-white font-semibold">School</TableHead>
                <TableHead className="w-24 text-white font-semibold">Weight</TableHead>
                <TableHead className="w-32 text-white font-semibold">Status</TableHead>
                <TableHead className="text-white font-semibold">State</TableHead>
                <TableHead className="text-white font-semibold">NHSCA</TableHead>
                <TableHead className="text-white font-semibold">Super 32</TableHead>
                <TableHead className="w-20 text-white font-semibold">GPA</TableHead>
                {athletes.some(a => a.recruitnc_score) && (
                  <TableHead className="w-24 text-white font-semibold">Score</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {athletes.map((athlete, index) => (
                <TableRow key={athlete.id} className="hover:bg-gray-50">
                  {/* Actions */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveAthlete(index, Math.max(0, index - 1))}
                        disabled={index === 0}
                        className="h-7 w-7 p-0 hover:bg-blue-50"
                      >
                        <ArrowUp className="h-3 w-3 text-[#13294B]" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveAthlete(index, Math.min(athletes.length - 1, index + 1))}
                        disabled={index === athletes.length - 1}
                        className="h-7 w-7 p-0 hover:bg-blue-50"
                      >
                        <ArrowDown className="h-3 w-3 text-[#13294B]" />
                      </Button>
                    </div>
                  </TableCell>

                  {/* Rank */}
                  <TableCell className="font-bold text-center">
                    <div className="text-lg text-[#13294B]">#{index + 1}</div>
                    {athlete.previous_ranking && athlete.previous_ranking !== index + 1 && (
                      <div className="text-xs mt-0.5">
                        {athlete.previous_ranking > index + 1 ? (
                          <span className="text-green-600 font-semibold">↑{athlete.previous_ranking - (index + 1)}</span>
                        ) : (
                          <span className="text-red-600 font-semibold">↓{(index + 1) - athlete.previous_ranking}</span>
                        )}
                      </div>
                    )}
                  </TableCell>

                  {/* Name */}
                  <TableCell>
                    <Link href={`/admin/athletes/edit?id=${encodeURIComponent(athlete.id)}`} className="hover:text-[#CC0000] transition-colors">
                      <div className="font-semibold text-[#13294B]">{athlete.name}</div>
                    </Link>
                  </TableCell>

                  {/* School */}
                  <TableCell className="text-sm text-gray-600">{athlete.highschool}</TableCell>

                  {/* Weight */}
                  <TableCell className="text-sm">{athlete.weight ? `${athlete.weight} lbs` : "TBD"}</TableCell>

                  {/* Status */}
                  <TableCell>
                    {athlete.college ? (
                      <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">
                        ✓ {athlete.college}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Uncommitted</Badge>
                    )}
                  </TableCell>

                  {/* State */}
                  <TableCell className="text-xs">
                    {athlete.nchsaa_results && athlete.nchsaa_results.length > 0 ? (
                      <div className="space-y-1">
                        {athlete.nchsaa_results.slice(0, 2).map((result, idx) => {
                          const emoji = result.place === 1 ? "🥇" : result.place === 2 ? "🥈" : result.place === 3 ? "🥉" : "🏅"
                          const placeSuffix = result.place === 1 ? "st" : result.place === 2 ? "nd" : result.place === 3 ? "rd" : "th"
                          return (
                            <div key={idx} className="text-xs text-gray-700">
                              {emoji} {result.place}{placeSuffix} • {result.classification} {result.weight_class} '{result.year.toString().slice(-2)}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>

                  {/* NHSCA */}
                  <TableCell className="text-xs">
                    {(athlete.nhsca_2025_placement || athlete.nhsca_2025_record || 
                      athlete.nhsca_2024_placement || athlete.nhsca_2024_record || 
                      athlete.nhsca_2023_placement || athlete.nhsca_2023_record || 
                      (athlete.nhsca_results && athlete.nhsca_results.length > 0)) ? (
                      <div className="space-y-1">
                        {(athlete.nhsca_2025_placement || athlete.nhsca_2025_record) && (
                          <div className="text-xs text-gray-700">
                            {athlete.nhsca_2025_placement && (
                              <>
                                {Number(athlete.nhsca_2025_placement) <= 8 ? "🥇" : "🏅"} {athlete.nhsca_2025_placement}
                                {athlete.nhsca_2025_placement === 1 || athlete.nhsca_2025_placement === "1" ? "st" : 
                                 athlete.nhsca_2025_placement === 2 || athlete.nhsca_2025_placement === "2" ? "nd" : 
                                 athlete.nhsca_2025_placement === 3 || athlete.nhsca_2025_placement === "3" ? "rd" : "th"}
                              </>
                            )}
                            {athlete.nhsca_2025_record && (
                              <> {athlete.nhsca_2025_placement ? "• " : ""}Record: {athlete.nhsca_2025_record}</>
                            )}
                            {" '25"}
                          </div>
                        )}
                        {(athlete.nhsca_2024_placement || athlete.nhsca_2024_record) && (
                          <div className="text-xs text-gray-700">
                            {athlete.nhsca_2024_placement && (
                              <>
                                {Number(athlete.nhsca_2024_placement) <= 8 ? "🥇" : "🏅"} {athlete.nhsca_2024_placement}
                                {athlete.nhsca_2024_placement === 1 || athlete.nhsca_2024_placement === "1" ? "st" : 
                                 athlete.nhsca_2024_placement === 2 || athlete.nhsca_2024_placement === "2" ? "nd" : 
                                 athlete.nhsca_2024_placement === 3 || athlete.nhsca_2024_placement === "3" ? "rd" : "th"}
                              </>
                            )}
                            {athlete.nhsca_2024_record && (
                              <> {athlete.nhsca_2024_placement ? "• " : ""}Record: {athlete.nhsca_2024_record}</>
                            )}
                            {" '24"}
                          </div>
                        )}
                        {(athlete.nhsca_2023_placement || athlete.nhsca_2023_record) && (
                          <div className="text-xs text-gray-700">
                            {athlete.nhsca_2023_placement && (
                              <>
                                {Number(athlete.nhsca_2023_placement) <= 8 ? "🥇" : "🏅"} {athlete.nhsca_2023_placement}
                                {athlete.nhsca_2023_placement === 1 || athlete.nhsca_2023_placement === "1" ? "st" : 
                                 athlete.nhsca_2023_placement === 2 || athlete.nhsca_2023_placement === "2" ? "nd" : 
                                 athlete.nhsca_2023_placement === 3 || athlete.nhsca_2023_placement === "3" ? "rd" : "th"}
                              </>
                            )}
                            {athlete.nhsca_2023_record && (
                              <> {athlete.nhsca_2023_placement ? "• " : ""}Record: {athlete.nhsca_2023_record}</>
                            )}
                            {" '23"}
                          </div>
                        )}
                        {(!athlete.nhsca_2025_placement && !athlete.nhsca_2024_placement && !athlete.nhsca_2023_placement) &&
                         athlete.nhsca_results && athlete.nhsca_results.length > 0 && (
                          athlete.nhsca_results.slice(0, 3).map((r, idx) => (
                            <div key={idx} className="text-xs text-gray-700">
                              {r.placement ? "🏅 " : ""}{r.placement}{r.record ? ` • Record: ${r.record}` : ""} {" '"}
                              {String(r.year).slice(-2)}
                            </div>
                          ))
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>

                  {/* Super 32 */}
                  <TableCell className="text-xs">
                    {(athlete.super_32_2025_placement || athlete.super_32_2025_record || 
                      athlete.super_32_2024_placement || athlete.super_32_2024_record) ? (
                      <div className="space-y-1">
                        {(athlete.super_32_2025_placement || athlete.super_32_2025_record) && (
                          <div className="text-xs text-gray-700">
                            {athlete.super_32_2025_placement && (
                              <>
                                {athlete.super_32_2025_placement <= 8 ? "🥇" : "🏅"} {athlete.super_32_2025_placement}
                                {athlete.super_32_2025_placement === 1 ? "st" : 
                                 athlete.super_32_2025_placement === 2 ? "nd" : 
                                 athlete.super_32_2025_placement === 3 ? "rd" : "th"}
                              </>
                            )}
                            {athlete.super_32_2025_record && (
                              <> {athlete.super_32_2025_placement ? "• " : ""}Record: {athlete.super_32_2025_record}</>
                            )}
                            {" '25"}
                          </div>
                        )}
                        {(athlete.super_32_2024_placement || athlete.super_32_2024_record) && (
                          <div className="text-xs text-gray-700">
                            {athlete.super_32_2024_placement && (
                              <>
                                {athlete.super_32_2024_placement <= 8 ? "🥇" : "🏅"} {athlete.super_32_2024_placement}
                                {athlete.super_32_2024_placement === 1 ? "st" : 
                                 athlete.super_32_2024_placement === 2 ? "nd" : 
                                 athlete.super_32_2024_placement === 3 ? "rd" : "th"}
                              </>
                            )}
                            {athlete.super_32_2024_record && (
                              <> {athlete.super_32_2024_placement ? "• " : ""}Record: {athlete.super_32_2024_record}</>
                            )}
                            {" '24"}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>

                  {/* GPA */}
                  <TableCell className="text-center text-sm">
                    {athlete.academic_gpa ? (
                      <span className="font-medium text-gray-700">{Number(athlete.academic_gpa).toFixed(1)}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>

                  {/* RecruitNC Score */}
                  {athletes.some(a => a.recruitnc_score) && (
                    <TableCell className="text-center">
                      {athlete.recruitnc_score ? (
                        <Badge className="bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200">
                          {athlete.recruitnc_score}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {athletes.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
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
