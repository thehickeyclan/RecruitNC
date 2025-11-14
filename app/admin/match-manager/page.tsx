"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Athlete {
  id: string
  name: string
  graduationyear: number
}

interface HighSchool {
  id: string
  name: string
}

type Match = {
  date: string
  winner: string
  winner_school: string
  loser: string
  loser_school: string
  result: string
  venue: string
  weight: string
  opp_percent: number | null
}

interface UploadProgress {
  athleteId: string
  athleteName: string
  years: { [year: string]: { uploaded: boolean; matchCount: number; grade?: string; season?: string } }
  totalMatches: number
  matchesFound?: number
}

export default function MatchManagerPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [highSchools, setHighSchools] = useState<HighSchool[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState<string>("")
  const [selectedHighSchool, setSelectedHighSchool] = useState<string>("")
  const [jsonData, setJsonData] = useState("")
  const [bulkJsonData, setBulkJsonData] = useState("")
  const [rawTextData, setRawTextData] = useState("")
  const [parseResult, setParseResult] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [bulkResult, setBulkResult] = useState<any>(null)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingError, setLoadingError] = useState<string>("")
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [isClearing, setIsClearing] = useState(false)
  const [clearResult, setClearResult] = useState<any>(null)
  const [selectedGradeForClear, setSelectedGradeForClear] = useState<string>("")

  useEffect(() => {
    loadAthletes()
    loadHighSchools()
    loadUploadProgress()
  }, [])

  const loadAthletes = async () => {
    try {
      console.log("Loading athletes...")
      const response = await fetch("/api/admin/athletes-list")
      const data = await response.json()

      console.log("Athletes response:", data)

      if (data.success && data.athletes) {
        setAthletes(data.athletes)
        console.log(`Loaded ${data.athletes.length} athletes`)
      } else {
        setLoadingError("Failed to load athletes: " + (data.error || "Unknown error"))
        console.error("Failed to load athletes:", data)
      }
    } catch (error) {
      console.error("Error loading athletes:", error)
      setLoadingError("Error loading athletes: " + (error instanceof Error ? error.message : "Unknown error"))
    }
  }

  const loadHighSchools = async () => {
    try {
      console.log("Loading high schools...")
      const response = await fetch("/api/admin/high-schools-list")
      const data = await response.json()

      console.log("High schools response:", data)

      if (data.success && data.highSchools) {
        setHighSchools(data.highSchools)
        console.log(`Loaded ${data.highSchools.length} high schools`)
      } else {
        console.error("Failed to load high schools:", data.error)
        const basicHighSchools = [
          { id: "1", name: "Cardinal Gibbons" },
          { id: "2", name: "Cary High School" },
          { id: "3", name: "Hough High School" },
          { id: "4", name: "Laney High School" },
          { id: "5", name: "Jack Britt High School" },
        ]
        setHighSchools(basicHighSchools)
        console.log("Using basic high schools list")
      }
    } catch (error) {
      console.error("Error loading high schools:", error)
      const basicHighSchools = [
        { id: "1", name: "Cardinal Gibbons" },
        { id: "2", name: "Cary High School" },
        { id: "3", name: "Hough High School" },
        { id: "4", name: "Laney High School" },
        { id: "5", name: "Jack Britt High School" },
      ]
      setHighSchools(basicHighSchools)
    }
  }

  const loadUploadProgress = async () => {
    try {
      console.log("Loading upload progress...")
      const response = await fetch("/api/admin/match-upload-progress")
      const data = await response.json()
      console.log("Upload progress response:", data)

      if (data.success) {
        setUploadProgress(data.progress)
        setDebugInfo(data.debug)
        console.log(`Loaded progress for ${data.progress.length} athletes`)
      } else {
        console.error("Failed to load progress:", data.error)
      }
    } catch (error) {
      console.error("Error loading progress:", error)
    } finally {
      setLoading(false)
    }
  }

  const sampleSingleJson = `{
  "wrestler_info": {
    "first_name": "Adrian",
    "last_name": "Fox",
    "season": "2023-24",
    "grade": "Junior",
    "high_school": "Cardinal Gibbons"
  },
  "season_summary": {
    "total_matches": 30,
    "wins": 25,
    "losses": 5,
    "pins": 15,
    "tech_falls": 4,
    "decisions": 6,
    "major_decisions": 0,
    "forfeits_won": 0,
    "pin_percentage": 50.0,
    "tf_percentage": 13.3,
    "finishing_percentage": 63.3
  },
  "matches": [
    {
      "date": "2023-11-18",
      "weight": 150,
      "opponent": "John Smith",
      "opponent_school": "Apex",
      "result": "Fall",
      "venue": "Apex Invitational",
      "win_loss": "W",
      "opponent_percentage": "45.20%"
    }
  ]
}`

  const sampleBulkJson = `{
  "wrestlers": [
    {
      "wrestler_name": "Liam Hickey",
      "wrestler_id": "liam-hickey-123",
      "high_school": "Cardinal Gibbons",
      "graduation_year": 2025,
      "seasons": {
        "freshman": {
          "season": "2021-22",
          "grade": "Freshman",
          "total_matches": 35,
          "wins": 28,
          "losses": 7,
          "pins": 15,
          "tech_falls": 5,
          "decisions": 8,
          "major_decisions": 0,
          "forfeits_won": 0,
          "matches": [
            {
              "date": "2021-11-15",
              "weight": 126,
              "opponent": "John Smith",
              "opponent_school": "Apex",
              "result": "Fall",
              "venue": "Apex Invitational",
              "win_loss": "W"
            }
          ]
        }
      }
    }
  ]
}`

  const handleSingleSubmit = async () => {
    console.log("=== FORM SUBMISSION DEBUG ===")
    console.log("Selected athlete:", selectedAthlete)
    console.log("Selected high school:", selectedHighSchool)
    console.log("JSON data length:", jsonData.length)

    if (!selectedAthlete || !jsonData.trim()) {
      setResult({ success: false, error: "Please select athlete and enter JSON data" })
      return
    }

    try {
      const parsedData = JSON.parse(jsonData)
      console.log("Parsed JSON data:", parsedData)
      console.log("JSON keys:", Object.keys(parsedData))

      if (parsedData.wrestler_info && parsedData.matches && Array.isArray(parsedData.matches)) {
        parsedData.athleteId = selectedAthlete
        console.log("Added athleteId:", selectedAthlete)

        if (selectedHighSchool) {
          const selectedSchoolName = highSchools.find((hs) => hs.id === selectedHighSchool)?.name
          if (selectedSchoolName) {
            parsedData.wrestler_info.high_school = selectedSchoolName
            console.log("Updated high school to:", selectedSchoolName)
          }
        }
      } else if (Array.isArray(parsedData)) {
        setResult({ success: false, error: "Please use the wrestler_info format with matches array" })
        return
      } else {
        throw new Error("Invalid format - expected wrestler_info object with matches array")
      }

      console.log("Final data to submit:", JSON.stringify(parsedData, null, 2))
      setIsSubmitting(true)

      const response = await fetch("/api/admin/submit-athlete-matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsedData),
      })

      const data = await response.json()
      console.log("API Response:", data)
      setResult(data)

      if (data.success) {
        setJsonData("")
        console.log("Upload successful, refreshing progress...")
        await loadUploadProgress()
      }
    } catch (error) {
      console.error("Submit error:", error)
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Invalid JSON format",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBulkSubmit = async () => {
    if (!bulkJsonData.trim()) {
      setBulkResult({ success: false, error: "Please enter bulk JSON data" })
      return
    }

    try {
      const parsedData = JSON.parse(bulkJsonData)

      if (!parsedData.wrestlers || !Array.isArray(parsedData.wrestlers)) {
        throw new Error("Invalid format - expected 'wrestlers' array")
      }

      setIsBulkSubmitting(true)

      const response = await fetch("/api/admin/bulk-match-upload/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsedData),
      })

      const data = await response.json()
      setBulkResult(data)

      if (data.success) {
        setBulkJsonData("")
        console.log("Bulk upload successful, refreshing progress...")
        await loadUploadProgress()
      }
    } catch (error) {
      setBulkResult({
        success: false,
        error: error instanceof Error ? error.message : "Invalid JSON format",
      })
    } finally {
      setIsBulkSubmitting(false)
    }
  }

  const handleClearRecords = async () => {
    if (!selectedAthlete) {
      setClearResult({ success: false, error: "Please select an athlete first" })
      return
    }

    const selectedAthleteData = athletes.find((a) => a.id === selectedAthlete)
    if (!selectedAthleteData) {
      setClearResult({ success: false, error: "Selected athlete not found" })
      return
    }

    const gradeToDelete = selectedGradeForClear === "all-grades" ? null : selectedGradeForClear
    const confirmMessage = gradeToDelete
      ? `Are you sure you want to clear all ${gradeToDelete} records for ${selectedAthleteData.name}?`
      : `Are you sure you want to clear ALL match records for ${selectedAthleteData.name}?`

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      setIsClearing(true)

      const response = await fetch("/api/admin/clear-athlete-records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          athleteId: selectedAthlete,
          athleteName: selectedAthleteData.name,
          grade: gradeToDelete, // null means clear all grades
        }),
      })

      const data = await response.json()
      setClearResult(data)

      if (data.success) {
        await loadUploadProgress()
      }
    } catch (error) {
      setClearResult({
        success: false,
        error: error instanceof Error ? error.message : "Failed to clear records",
      })
    } finally {
      setIsClearing(false)
    }
  }

  const loadSingleSample = () => {
    setJsonData(sampleSingleJson)
  }

  const loadBulkSample = () => {
    setBulkJsonData(sampleBulkJson)
  }

  const getAthleteProgress = (athleteId: string) => {
    return uploadProgress.find((p) => p.athleteId === athleteId)
  }

  const getAllHighSchoolYears = (graduationYear?: number) => {
    if (graduationYear) {
      return [
        {
          year: graduationYear - 3,
          grade: "Freshman",
          season: `${graduationYear - 4}-${(graduationYear - 3).toString().slice(-2)}`,
        },
        {
          year: graduationYear - 2,
          grade: "Sophomore",
          season: `${graduationYear - 3}-${(graduationYear - 2).toString().slice(-2)}`,
        },
        {
          year: graduationYear - 1,
          grade: "Junior",
          season: `${graduationYear - 2}-${(graduationYear - 1).toString().slice(-2)}`,
        },
        {
          year: graduationYear,
          grade: "Senior",
          season: `${graduationYear - 1}-${graduationYear.toString().slice(-2)}`,
        },
      ]
    }

    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth()
    const schoolYearOffset = currentMonth >= 8 ? 0 : -1

    return [
      {
        year: currentYear + schoolYearOffset - 3,
        grade: "Freshman",
        season: `${currentYear + schoolYearOffset - 4}-${(currentYear + schoolYearOffset - 3).toString().slice(-2)}`,
      },
      {
        year: currentYear + schoolYearOffset - 2,
        grade: "Sophomore",
        season: `${currentYear + schoolYearOffset - 3}-${(currentYear + schoolYearOffset - 2).toString().slice(-2)}`,
      },
      {
        year: currentYear + schoolYearOffset - 1,
        grade: "Junior",
        season: `${currentYear + schoolYearOffset - 2}-${(currentYear + schoolYearOffset - 1).toString().slice(-2)}`,
      },
      {
        year: currentYear + schoolYearOffset,
        grade: "Senior",
        season: `${currentYear + schoolYearOffset - 1}-${(currentYear + schoolYearOffset).toString().slice(-2)}`,
      },
    ]
  }

  const selectedAthleteData = athletes.find((a) => a.id === selectedAthlete)
  const athleteProgress = selectedAthlete ? getAthleteProgress(selectedAthlete) : null

  const parseRawTextToJson = (rawText: string) => {
    const lines = rawText.trim().split("\n")

    const matches: Match[] = []

    if (lines.length === 0) return matches

    // Check if this is the new format (has "Summary" column)
    const headerLine = lines[0].toLowerCase()
    const isNewFormat = headerLine.includes("summary")

    if (isNewFormat) {
      // New format: Date | Event | Weight | Summary
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const parts = line.split("\t")

        if (parts.length < 4) continue

        const [date, event, weight, summary] = parts

        // Skip "Bye" entries
        if (summary.toLowerCase().includes("bye")) continue

        // Parse the summary to extract match details
        // Format: "Athlete1 (School1) over Athlete2 (School2) (Result)"
        const overMatch = summary.match(/^(.+?)\s*\(([^)]+)\)\s+over\s+(.+?)\s*\(([^)]+)\)\s*(\([^)]+\))?$/)

        if (overMatch) {
          const [, winner, winnerSchool, loser, loserSchool, resultRaw] = overMatch
          const result = resultRaw ? resultRaw.replace(/[()]/g, "").trim() : ""

          // Skip matches against "Unknown" opponents
          if (loser.trim().toLowerCase() === "unknown") continue

          matches.push({
            date: date.trim(),
            winner: winner.trim(),
            winner_school: winnerSchool.trim(),
            loser: loser.trim(),
            loser_school: loserSchool.trim(),
            result: result,
            venue: event.trim(),
            weight: weight.trim(),
            opp_percent: null,
          })
        }
      }
    } else {
      // Old format: Date | Winner | Winner School | Loser | Loser School | Result | Venue | Weight | Opp%
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const parts = line.split("\t")

        if (parts.length < 8) continue

        const [date, winner, winner_school, loser, loser_school, result, venue, weight, opp_percent] = parts

        matches.push({
          date: date.trim(),
          winner: winner.trim(),
          winner_school: winner_school.trim(),
          loser: loser.trim(),
          loser_school: loser_school.trim(),
          result: result.trim(),
          venue: venue.trim(),
          weight: weight.trim(),
          opp_percent: opp_percent ? parseFloat(opp_percent.trim()) : null,
        })
      }
    }

    return matches
  }

  const handleRawTextParse = () => {
    if (!selectedAthlete || !rawTextData.trim()) {
      setParseResult({ success: false, error: "Please select athlete and enter raw text data" })
      return
    }

    const selectedAthleteData = athletes.find((a) => a.id === selectedAthlete)
    if (!selectedAthleteData) {
      setParseResult({ success: false, error: "Selected athlete not found" })
      return
    }

    const parsedMatches = parseRawTextToJson(rawTextData)

    if (parsedMatches.length === 0) {
      setParseResult({ success: false, error: "No valid matches were found. Please check the format." })
      return
    }

    const athleteNameLower = selectedAthleteData.name.trim().toLowerCase()
    const athleteParts = athleteNameLower.split(" ")
    const athleteFirstInitial = athleteParts[0]?.[0] || ""
    const athleteLastName = athleteParts[athleteParts.length - 1] || ""

    const convertedMatches: {
      date: string
      weight: number
      opponent: string
      opponent_school: string
      result: string
      venue: string
      win_loss: "W" | "L"
      opponent_percentage: string | null
    }[] = []

    let athleteSchool = ""

    parsedMatches.forEach((match) => {
      const winnerLower = match.winner.toLowerCase()
      const loserLower = match.loser.toLowerCase()

      const winnerParts = winnerLower.split(" ")
      const winnerFirstInitial = winnerParts[0]?.[0] || ""
      const winnerLastName = winnerParts[winnerParts.length - 1] || ""

      const loserParts = loserLower.split(" ")
      const loserFirstInitial = loserParts[0]?.[0] || ""
      const loserLastName = loserParts[loserParts.length - 1] || ""

      const isWinnerMatch =
        winnerLower === athleteNameLower ||
        (winnerFirstInitial === athleteFirstInitial && winnerLastName === athleteLastName)
      const isLoserMatch =
        loserLower === athleteNameLower || (loserFirstInitial === athleteFirstInitial && loserLastName === athleteLastName)

      if (!isWinnerMatch && !isLoserMatch) {
        return
      }

      const isWin = isWinnerMatch && !isLoserMatch
      const opponent = isWin ? match.loser : match.winner
      const opponentSchool = isWin ? match.loser_school : match.winner_school

      if (!athleteSchool) {
        athleteSchool = isWin ? match.winner_school : match.loser_school
      }

      convertedMatches.push({
        date: match.date.trim(),
        weight: Number.parseInt(match.weight) || 0,
        opponent: opponent.trim(),
        opponent_school: opponentSchool.trim(),
        result: match.result ? match.result.trim() : "",
        venue: match.venue.trim(),
        win_loss: isWin ? "W" : "L",
        opponent_percentage: match.opp_percent !== null ? match.opp_percent.toString() : null,
      })
    })

    if (convertedMatches.length === 0) {
      setParseResult({
        success: false,
        error:
          "Could not match any bouts to the selected athlete. Please verify the athlete's name matches the data in the summary column.",
      })
      return
    }

    const firstName = selectedAthleteData.name.split(" ")[0] || ""
    const lastName = selectedAthleteData.name.split(" ").slice(1).join(" ") || ""

    const wins = convertedMatches.filter((m) => m.win_loss === "W").length
    const losses = convertedMatches.filter((m) => m.win_loss === "L").length
    const pins = convertedMatches.filter(
      (m) => m.win_loss === "W" && m.result.toLowerCase().includes("fall"),
    ).length
    const techFalls = convertedMatches.filter(
      (m) => m.win_loss === "W" && (m.result.toLowerCase().includes("tf") || m.result.toLowerCase().includes("tech")),
    ).length
    const majorDecisions = convertedMatches.filter(
      (m) => m.win_loss === "W" && m.result.toLowerCase().includes("major"),
    ).length
    const decisions = convertedMatches.filter(
      (m) =>
        m.win_loss === "W" &&
        (m.result.toLowerCase().includes("dec") || m.result.toLowerCase().includes("sv")),
    ).length
    const forfeits = convertedMatches.filter(
      (m) => m.win_loss === "W" && m.result.toLowerCase().includes("for"),
    ).length

    const dates = convertedMatches
      .map((m) => {
        const parts = m.date.split(/[-/]/)
        if (parts.length !== 3) return null
        const month = Number.parseInt(parts[0])
        const day = Number.parseInt(parts[1])
        const year = Number.parseInt(parts[2])
        const fullYear = year < 100 ? (year > 50 ? 1900 + year : 2000 + year) : year
        return { month, day, year: fullYear }
      })
      .filter(Boolean) as { month: number; day: number; year: number }[]

    const years = dates.map((d) => d.year)
    const minYear = Math.min(...years)
    const maxYear = Math.max(...years)

    let season = ""
    if (Number.isFinite(minYear) && Number.isFinite(maxYear)) {
      season = minYear === maxYear ? `${minYear - 1}-${minYear.toString().slice(-2)}` : `${minYear}-${maxYear.toString().slice(-2)}`
    }

    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1
    const seasonStartYear = season ? Number.parseInt(season.split("-")[0]) : currentYear

    const currentSchoolYear = currentMonth >= 8 ? currentYear : currentYear - 1
    const yearsAgo = currentSchoolYear - seasonStartYear

    let inferredGrade = "Unknown"
    if (yearsAgo === 0) inferredGrade = "Senior"
    else if (yearsAgo === 1) inferredGrade = "Junior"
    else if (yearsAgo === 2) inferredGrade = "Sophomore"
    else if (yearsAgo === 3) inferredGrade = "Freshman"

    const totalMatches = wins + losses
    const pinPercentage = totalMatches > 0 ? Number(((pins / totalMatches) * 100).toFixed(1)) : 0
    const tfPercentage = totalMatches > 0 ? Number(((techFalls / totalMatches) * 100).toFixed(1)) : 0
    const finishingPercentage =
      totalMatches > 0 ? Number((((pins + techFalls) / totalMatches) * 100).toFixed(1)) : 0

    const jsonPayload = {
      wrestler_info: {
        first_name: firstName,
        last_name: lastName,
        season: season || "Unknown",
        grade: inferredGrade,
        high_school: athleteSchool || "Unknown",
      },
      season_summary: {
        total_matches: totalMatches,
        wins,
        losses,
        pins,
        tech_falls: techFalls,
        decisions,
        major_decisions: majorDecisions,
        forfeits_won: forfeits,
        pin_percentage: pinPercentage,
        tf_percentage: tfPercentage,
        finishing_percentage: finishingPercentage,
      },
      matches: convertedMatches,
    }

    setJsonData(JSON.stringify(jsonPayload, null, 2))
    setParseResult({
      success: true,
      message: `Successfully parsed ${convertedMatches.length} matches. JSON has been loaded into the Single Athlete Upload tab.`,
    })
  }

  const handleClearRawData = () => {
    if (!rawTextData.trim() && !parseResult) {
      return
    }

    if (confirm("Are you sure you want to clear all raw data and parsed results?")) {
      setRawTextData("")
      setParseResult(null)
      setJsonData("")
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center">
          <p>Loading athletes and data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Wrestling Match Manager</h1>
        <p className="text-gray-600">Upload match data for wrestlers - Single athlete or bulk upload all 4 years</p>

        {loadingError && (
          <Alert className="mt-4 border-red-500 bg-red-50">
            <AlertDescription>
              <div className="font-semibold text-red-700 mb-2">⚠️ Loading Error</div>
              <p className="text-red-700">{loadingError}</p>
            </AlertDescription>
          </Alert>
        )}

        <Alert className="mt-4 border-orange-500 bg-orange-50">
          <AlertDescription>
            <div className="font-semibold text-orange-700 mb-2">⚠️ OVERWRITE WARNING</div>
            <p className="text-orange-700">
              <strong>Uploading data will REPLACE all existing matches</strong> for the same wrestler and season.
            </p>
            <p className="text-orange-600 text-sm mt-1">
              Bulk upload will process multiple athletes and all their years at once.
            </p>
          </AlertDescription>
        </Alert>

        <div className="mt-4 text-sm text-gray-600">
          <p>Athletes loaded: {athletes.length}</p>
          <p>High schools loaded: {highSchools.length}</p>
          <p>Progress records: {uploadProgress.length}</p>
          <p>Selected athlete: {selectedAthlete || "None"}</p>
          <p>Selected high school: {selectedHighSchool || "None"}</p>
          {debugInfo && (
            <details className="mt-2">
              <summary className="cursor-pointer text-blue-600">Debug Info (Click to expand)</summary>
              <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-64">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>

      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="single">Single Athlete Upload</TabsTrigger>
          <TabsTrigger value="raw">Raw Text Parser</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Upload (All 4 Years)</TabsTrigger>
        </TabsList>

        <TabsContent value="single">
          <Card>
            <CardHeader>
              <CardTitle>Upload Single Athlete Season</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="athlete">Select Athlete</Label>
                <Select value={selectedAthlete} onValueChange={setSelectedAthlete}>
                  <SelectTrigger>
                    <SelectValue placeholder={athletes.length > 0 ? "Choose an athlete..." : "Loading athletes..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {athletes.length > 0 ? (
                      athletes.map((athlete) => (
                        <SelectItem key={athlete.id} value={athlete.id}>
                          {athlete.name} (Class of {athlete.graduationyear})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No athletes found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="highSchool">Select High School (Optional)</Label>
                <Select value={selectedHighSchool} onValueChange={setSelectedHighSchool}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose high school (optional)..." />
                  </SelectTrigger>
                  <SelectContent>
                    {highSchools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAthleteData && (
                <Card className="bg-blue-50">
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-2">
                      {selectedAthleteData.name} - Upload Status (Class of {selectedAthleteData.graduationyear})
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {getAllHighSchoolYears(selectedAthleteData.graduationyear).map((yearInfo) => {
                        const yearData = athleteProgress?.years[yearInfo.year.toString()]
                        return (
                          <div
                            key={yearInfo.year}
                            className={`p-3 rounded-lg border ${
                              yearData?.uploaded
                                ? "bg-green-500 text-white border-green-600"
                                : "bg-gray-200 text-gray-700 border-gray-300"
                            }`}
                          >
                            <div className="font-semibold">{yearInfo.grade}</div>
                            <div className="text-sm">{yearInfo.season}</div>
                            <div className="text-xs mt-1">
                              {yearData?.uploaded ? `${yearData.matchCount} matches` : "Not uploaded"}
                            </div>
                            {yearData?.season && <div className="text-xs opacity-75">Uploaded: {yearData.season}</div>}
                            {yearData?.grade && <div className="text-xs opacity-75">Grade: {yearData.grade}</div>}
                          </div>
                        )
                      })}
                    </div>
                    {athleteProgress && (
                      <div className="text-sm text-gray-600 mt-3">
                        <p>Total matches across all years: {athleteProgress.totalMatches}</p>
                        <p>Match records found in database: {athleteProgress.matchesFound || 0}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {selectedAthleteData && (
                <Card className="bg-red-50 border-red-200">
                  <CardHeader>
                    <CardTitle className="text-red-700">Clear Match Records</CardTitle>
                    <p className="text-sm text-red-600">Safely remove match records for {selectedAthleteData.name}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="gradeForClear">Grade to Clear (Optional)</Label>
                      <Select value={selectedGradeForClear} onValueChange={setSelectedGradeForClear}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade to clear (or leave blank for all)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all-grades">All Grades</SelectItem>
                          <SelectItem value="Freshman">Freshman Only</SelectItem>
                          <SelectItem value="Sophomore">Sophomore Only</SelectItem>
                          <SelectItem value="Junior">Junior Only</SelectItem>
                          <SelectItem value="Senior">Senior Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button onClick={handleClearRecords} disabled={isClearing} variant="destructive" className="w-full">
                      {isClearing
                        ? "Clearing Records..."
                        : selectedGradeForClear && selectedGradeForClear !== "all-grades"
                          ? `Clear ${selectedGradeForClear} Records`
                          : "Clear All Records"}
                    </Button>

                    {clearResult && (
                      <Alert className={clearResult.success ? "border-green-500" : "border-red-500"}>
                        <AlertDescription>
                          {clearResult.success ? (
                            <div>
                              <p className="font-semibold text-green-700">✅ Records Cleared!</p>
                              <p>Removed {clearResult.deletedCount} match records</p>
                              <p className="text-sm text-gray-600">
                                {clearResult.grade ? `Grade: ${clearResult.grade}` : "All grades cleared"}
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="font-semibold text-red-700">❌ Error</p>
                              <p>{clearResult.error}</p>
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="jsonData">Single Season Data (JSON)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={loadSingleSample}>
                    Load Sample Data
                  </Button>
                </div>
                <Textarea
                  id="jsonData"
                  value={jsonData}
                  onChange={(e) => setJsonData(e.target.value)}
                  placeholder="Paste single season JSON data here..."
                  rows={15}
                  className="font-mono text-sm"
                />
              </div>

              <Button onClick={handleSingleSubmit} disabled={isSubmitting || !selectedAthlete} className="w-full">
                {isSubmitting ? "Submitting..." : "Submit Single Season Data"}
              </Button>

              {result && (
                <Alert className={result.success ? "border-green-500" : "border-red-500"}>
                  <AlertDescription>
                    {result.success ? (
                      <div>
                        <p className="font-semibold text-green-700">✅ Success!</p>
                        <p>
                          Submitted {result.count} matches for {result.athleteName} ({result.season})
                        </p>
                        <p className="text-sm text-gray-600 mt-1">Wrestler ID: {result.wrestlerId}</p>
                        <p className="text-xs text-blue-600 mt-1">Progress tiles should update automatically</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-red-700">❌ Error</p>
                        <p>{result.error}</p>
                        {result.details && (
                          <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto">{result.details}</pre>
                        )}
                        {result.code && <p className="text-xs text-red-600 mt-1">Error Code: {result.code}</p>}
                        {result.hint && <p className="text-xs text-red-600 mt-1">Hint: {result.hint}</p>}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="raw">
          <Card>
            <CardHeader>
              <CardTitle>Raw Text Parser</CardTitle>
              <p className="text-sm text-gray-600">
                Paste your raw match data (tab-separated format) and it will be automatically converted to JSON
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="athlete-raw">Select Athlete</Label>
                <Select value={selectedAthlete} onValueChange={setSelectedAthlete}>
                  <SelectTrigger>
                    <SelectValue placeholder={athletes.length > 0 ? "Choose an athlete..." : "Loading athletes..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {athletes.length > 0 ? (
                      athletes.map((athlete) => (
                        <SelectItem key={athlete.id} value={athlete.id}>
                          {athlete.name} (Class of {athlete.graduationyear})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No athletes found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="rawTextData">Raw Match Data (Tab-Separated)</Label>
                <p className="text-xs text-gray-500 mb-2">
                  Paste your data with summary line first, then match lines. Format: Date, Winner, School, Loser,
                  School, Result, Venue, Weight, Opp%
                </p>
                <Textarea
                  id="rawTextData"
                  value={rawTextData}
                  onChange={(e) => setRawTextData(e.target.value)}
                  placeholder="160	East Surry	Fr	2A	41	9	82.0%	99.7%	99.6%	0.0%	-0.0%	99.6%	33	73.3%	0

Date	Winner	School	Loser	School	Result	Venue	Wgt	Opp Adj
2-18-23	Andrew Meadows	East Surry	Dylan Polatty	Manteo	MD	NCHSAA State Championships	160	98.9%
..."
                  rows={20}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleRawTextParse} disabled={!selectedAthlete} className="flex-1">
                  Parse Raw Text to JSON
                </Button>
                <Button
                  onClick={handleClearRawData}
                  disabled={!rawTextData.trim() && !parseResult}
                  variant="destructive"
                  className="flex-shrink-0"
                >
                  Clear All Data
                </Button>
              </div>

              {parseResult && (
                <Alert className={parseResult.success ? "border-green-500" : "border-red-500"}>
                  <AlertDescription>
                    {parseResult.success ? (
                      <div>
                        <p className="font-semibold text-green-700">✅ Parsing Success!</p>
                        <p>{parseResult.message}</p>
                        <p className="text-sm text-blue-600 mt-2">
                          Switch to the "Single Athlete Upload" tab to review and submit the parsed data.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-red-700">❌ Parsing Error</p>
                        <p>{parseResult.error}</p>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Upload - Multiple Athletes, All 4 Years</CardTitle>
              <p className="text-sm text-gray-600">
                Upload multiple athletes with all their high school years (Freshman, Sophomore, Junior, Senior) at once
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="bulkJsonData">Bulk Upload Data (JSON)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={loadBulkSample}>
                    Load Sample Bulk Data
                  </Button>
                </div>
                <Textarea
                  id="bulkJsonData"
                  value={bulkJsonData}
                  onChange={(e) => setBulkJsonData(e.target.value)}
                  placeholder="Paste bulk JSON data with multiple wrestlers and all their years here..."
                  rows={25}
                  className="font-mono text-sm"
                />
              </div>

              <Button onClick={handleBulkSubmit} disabled={isBulkSubmitting} className="w-full">
                {isBulkSubmitting ? "Processing Bulk Upload..." : "Submit Bulk Data (All Athletes & Years)"}
              </Button>

              {bulkResult && (
                <Alert className={bulkResult.success ? "border-green-500" : "border-red-500"}>
                  <AlertDescription>
                    {bulkResult.success ? (
                      <div>
                        <p className="font-semibold text-green-700">✅ Bulk Upload Success!</p>
                        <p>Processed {bulkResult.imported} wrestlers</p>
                        {bulkResult.errors && bulkResult.errors.length > 0 && (
                          <div className="mt-2">
                            <p className="text-orange-600">Errors:</p>
                            <ul className="text-sm">
                              {bulkResult.errors.slice(0, 5).map((error: string, index: number) => (
                                <li key={index}>• {error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-red-700">❌ Bulk Upload Error</p>
                        <p>{bulkResult.error}</p>
                        {bulkResult.details && (
                          <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto">{bulkResult.details}</pre>
                        )}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
