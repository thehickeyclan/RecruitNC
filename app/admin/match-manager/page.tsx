"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
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
  const searchParams = useSearchParams()
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [highSchools, setHighSchools] = useState<HighSchool[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState<string>("")
  const [selectedHighSchool, setSelectedHighSchool] = useState<string>("")
  const [jsonData, setJsonData] = useState("")
  const [bulkJsonData, setBulkJsonData] = useState("")
  const [rawTextData, setRawTextData] = useState("")
  const [rawTextFormat, setRawTextFormat] = useState<"rank" | "track">("rank")
  const [rankwrestlerUrl, setRankwrestlerUrl] = useState("")
  const [isRankSyncing, setIsRankSyncing] = useState(false)
  const [rankSyncResult, setRankSyncResult] = useState<any>(null)
  const [deduplicateMatches, setDeduplicateMatches] = useState(true)
  const [useRenderedBrowserSync, setUseRenderedBrowserSync] = useState(true)
  const [syncAllRankSeasons, setSyncAllRankSeasons] = useState(false)
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

  useEffect(() => {
    const aid = searchParams.get("athlete")?.trim()
    if (!aid || athletes.length === 0) return
    if (athletes.some((a) => a.id === aid)) {
      setSelectedAthlete(aid)
    }
  }, [searchParams, athletes])

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

  const handleRankWrestlerSync = async () => {
    if (!selectedAthlete) {
      setRankSyncResult({ success: false, error: "Please select an athlete first." })
      return
    }
    if (!rankwrestlerUrl.trim()) {
      setRankSyncResult({ success: false, error: "Please enter the RankWrestler athlete/season URL." })
      return
    }

    try {
      setIsRankSyncing(true)
      setRankSyncResult(null)

      const response = await fetch("/api/admin/rankwrestler/sync-athlete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: selectedAthlete,
          rankwrestlerUrl: rankwrestlerUrl.trim(),
          deduplicate: deduplicateMatches,
          renderedBrowser: useRenderedBrowserSync,
          syncAllSeasons: syncAllRankSeasons,
        }),
      })
      const data = await response.json()
      setRankSyncResult(data)

      if (data.success) {
        await loadUploadProgress()
      }
    } catch (error) {
      setRankSyncResult({
        success: false,
        error: error instanceof Error ? error.message : "RankWrestler sync failed.",
      })
    } finally {
      setIsRankSyncing(false)
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

  const parseTrackFormat = (lines: string[]): Match[] => {
    const matches: Match[] = []
    const nonEmpty = lines.map((l) => l.trim()).filter((l) => l.length > 0)

    const tryParseSummary = (summary: string): Match | null => {
      if (!summary || summary.toLowerCase().includes("bye")) return null
      if (summary.toLowerCase().includes("unknown") && summary.toLowerCase().includes("for")) return null
      const overMatch = summary.match(
        /(?:.+\s-\s)?(.+?)\s*\(([^)]+)\)\s+over\s+(.+?)\s*\(([^)]+)\)\s*(?:\(([^)]+)\))?\s*$/
      )
      if (!overMatch) return null
      const [, winner, winnerSchool, loser, loserSchool, resultRaw] = overMatch
      const result = resultRaw ? resultRaw.replace(/[()]/g, "").trim() : ""
      if (loser.trim().toLowerCase() === "unknown") return null
      return { winner: winner.trim(), winnerSchool: winnerSchool.trim(), loser: loser.trim(), loserSchool: loserSchool.trim(), result }
    }

    // 1) Tab-separated: one line per match with Date\tEvent\tWeight\tSummary
    const headerLine = (nonEmpty[0] ?? "").toLowerCase()
    const hasHeader = headerLine.includes("date") && (headerLine.includes("summary") || headerLine.includes("event"))
    const startIdx = hasHeader ? 1 : 0

    for (let i = startIdx; i < nonEmpty.length; i++) {
      const line = nonEmpty[i] ?? ""
      const parts = line.split(/\t/)
      if (parts.length >= 4) {
        const [date, event, weight, summary] = parts.map((p) => p.trim())
        const parsed = tryParseSummary(summary)
        if (parsed) {
          const weightClean = weight ? weight.replace(/^\d*A\s+/i, "").trim() : weight
          matches.push({
            date: date || "",
            winner: parsed.winner,
            winner_school: parsed.winnerSchool,
            loser: parsed.loser,
            loser_school: parsed.loserSchool,
            result: parsed.result,
            venue: event || "",
            weight: weightClean || weight || "",
            opp_percent: null,
          })
        }
      }
    }

    // 2) Line-by-line: 4 lines per match (Date, Event, Weight, Summary) when paste has no tabs
    if (matches.length === 0 && nonEmpty.length >= 4) {
      const lineStart = (nonEmpty[0] ?? "").toLowerCase() === "date" ? 4 : 0
      for (let i = lineStart; i < nonEmpty.length - 3; i++) {
        const summary = nonEmpty[i + 3] ?? ""
        if (!summary.includes(" over ")) continue
        const parsed = tryParseSummary(summary)
        if (parsed) {
          const date = nonEmpty[i] ?? ""
          const event = nonEmpty[i + 1] ?? ""
          const weight = nonEmpty[i + 2] ?? ""
          const weightClean = weight ? weight.replace(/^\d*A\s+/i, "").trim() : weight
          matches.push({
            date,
            winner: parsed.winner,
            winner_school: parsed.winnerSchool,
            loser: parsed.loser,
            loser_school: parsed.loserSchool,
            result: parsed.result,
            venue: event,
            weight: weightClean || weight,
            opp_percent: null,
          })
          i += 3 // advance past this match's 4 lines
        }
      }
    }

    return matches
  }

  const parseRawTextToJson = (rawText: string, format: "rank" | "track" = "rank") => {
    // Normalize line endings and trim; then for multi-line format we use dense lines (no blanks)
    const allLines = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n")

    const matches: Match[] = []

    if (allLines.length === 0) return matches

    // Track format: tab-separated Date, Event, Weight, Summary (from Trackwrestling, etc.)
    if (format === "track") {
      return parseTrackFormat(allLines)
    }

    // Rank format: Win/Loss-first blocks, date-first blocks, or tab-separated
    const denseLines = allLines.map((l) => l.trim()).filter((l) => l.length > 0)
    const firstLine = (denseLines[0] ?? "").trim().toLowerCase()
    const looksLikeDate = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test((denseLines[0] ?? "").trim())
    const isWinLossFirst = firstLine === "win" || firstLine === "loss"
    const isDateFirstRank = looksLikeDate && denseLines.length >= 8 && (denseLines[9]?.toLowerCase() === "win" || denseLines[9]?.toLowerCase() === "loss" || denseLines[7]?.toLowerCase() === "win" || denseLines[7]?.toLowerCase() === "loss")

    if (isDateFirstRank) {
      // Rank date-first: Date, Percent|Forfeit, Opponent|Weight, • School|•, Weight|Event, •|•, Event|Method, •|Win/Loss, Method|, Win/Loss (10 lines regular, 8 forfeit)
      const lines = denseLines
      let i = 0
      while (i < lines.length) {
        const date = (lines[i] ?? "").trim()
        if (!/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(date)) {
          i++
          continue
        }
        const second = (lines[i + 1] ?? "").trim()
        const isForfeit = second.toLowerCase() === "forfeit"
        let isWin: boolean
        let opponent = ""
        let opponentSchool = ""
        let weight = ""
        let venue = ""
        let method = ""
        let oppPercent: number | null = null
        let advance: number

        if (isForfeit) {
          const winLoss = (lines[i + 7] ?? "").toLowerCase().trim()
          if (winLoss !== "win" && winLoss !== "loss") {
            i++
            continue
          }
          isWin = winLoss === "win"
          weight = (lines[i + 2] ?? "").replace(/\s*lbs\s*$/i, "").trim()
          venue = (lines[i + 4] ?? "").trim()
          method = (lines[i + 6] ?? "").trim() || "For."
          opponent = "Forfeit"
          advance = 8
        } else {
          const winLoss = (lines[i + 9] ?? "").toLowerCase().trim()
          if (winLoss !== "win" && winLoss !== "loss") {
            i++
            continue
          }
          isWin = winLoss === "win"
          const percentStr = (lines[i + 1] ?? "").trim()
          opponent = (lines[i + 2] ?? "").trim()
          const schoolLine = (lines[i + 3] ?? "").trim()
          opponentSchool = schoolLine.replace(/^[•·\-]\s*/, "").trim()
          weight = (lines[i + 4] ?? "").replace(/\s*lbs\s*$/i, "").trim()
          venue = (lines[i + 6] ?? "").trim()
          method = (lines[i + 8] ?? "").trim()
          const percentMatch = percentStr.match(/^[\d.]+$/)
          if (percentMatch) oppPercent = parseFloat(percentStr)
          advance = 10
        }

        if (!venue) {
          i++
          continue
        }

        if (isWin) {
          matches.push({
            date,
            winner: "",
            winner_school: "",
            loser: opponent,
            loser_school: opponentSchool,
            result: method,
            venue,
            weight,
            opp_percent: oppPercent,
          })
        } else {
          matches.push({
            date,
            winner: opponent,
            winner_school: opponentSchool,
            loser: "",
            loser_school: "",
            result: method,
            venue,
            weight,
            opp_percent: oppPercent,
          })
        }
        i += advance
      }
    } else if (isWinLossFirst) {
      // Multi-line format (Win/Loss first): Each match spans 10 lines (or 8 for forfeit)
      const lines = denseLines
      // Win/Loss, Date, Percentage|Forfeit, Opponent|Forfeit, • School, Weight, •, Event, •, Method
      let i = 0
      while (i < lines.length) {
        const resultLine = lines[i] ?? ""
        if (resultLine.toLowerCase() !== "win" && resultLine.toLowerCase() !== "loss") {
          i++
          continue
        }

        const isWin = resultLine.toLowerCase() === "win"
        const date = (lines[i + 1] ?? "").trim()
        const percentageOrForfeit = (lines[i + 2] ?? "").trim()
        const opponentOrForfeit = (lines[i + 3] ?? "").trim()

        // Must have valid date (mm/dd/yyyy)
        if (!/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(date)) {
          i++
          continue
        }

        const isForfeit =
          opponentOrForfeit.toLowerCase() === "forfeit" || percentageOrForfeit.toLowerCase() === "forfeit"

        let opponent = ""
        let opponentSchool = ""
        let weight = ""
        let venue = ""
        let method = ""
        let oppPercent: number | null = null
        let advance: number

        if (isForfeit) {
          if (i + 8 > lines.length) {
            i++
            continue
          }
          opponent = "Forfeit"
          opponentSchool = ""
          weight = (lines[i + 3] ?? "").replace(/\s*lbs\s*$/i, "").trim()
          venue = (lines[i + 5] ?? "").trim()
          method = (lines[i + 7] ?? "").trim() || "For."
          advance = 8
        } else if (/^[\d.]+$/.test(percentageOrForfeit)) {
          if (i + 10 > lines.length) {
            i++
            continue
          }
          opponent = opponentOrForfeit.trim()
          const schoolLine = (lines[i + 4] ?? "").trim()
          opponentSchool = schoolLine.replace(/^[•·\-]\s*/, "").trim()
          weight = (lines[i + 5] ?? "").replace(/\s*lbs\s*$/i, "").trim()
          venue = (lines[i + 7] ?? "").trim()
          method = (lines[i + 9] ?? "").trim()
          oppPercent = parseFloat(percentageOrForfeit)
          advance = 10
        } else {
          if (i + 9 > lines.length) {
            i++
            continue
          }
          // 9-line format (no percentage): Opponent at i+2, School at i+3
          opponent = percentageOrForfeit.trim()
          const schoolLine = opponentOrForfeit.trim()
          opponentSchool = schoolLine.replace(/^[•·\-]\s*/, "").trim()
          weight = (lines[i + 4] ?? "").replace(/\s*lbs\s*$/i, "").trim()
          venue = (lines[i + 6] ?? "").trim()
          method = (lines[i + 8] ?? "").trim()
          advance = 9
        }

        // Venue must be non-empty and not a bullet
        if (!venue || venue === "•" || venue === "·" || /^[\d.]+$/.test(venue)) {
          i++
          continue
        }

        // Determine winner and loser based on result
        if (isWin) {
          // Athlete won, opponent lost
          matches.push({
            date: date,
            winner: "", // Will be filled in later based on selected athlete
            winner_school: "", // Will be filled in later
            loser: opponent,
            loser_school: opponentSchool,
            result: method,
            venue: venue,
            weight: weight,
            opp_percent: oppPercent,
          })
        } else {
          // Athlete lost, opponent won
          matches.push({
            date: date,
            winner: opponent,
            winner_school: opponentSchool,
            loser: "", // Will be filled in later based on selected athlete
            loser_school: "", // Will be filled in later
            result: method,
            venue: venue,
            weight: weight,
            opp_percent: oppPercent,
          })
        }

        i += advance
      }
    } else {
      // Tab-separated formats: use original line array
      const lines = allLines
      const headerLine = (lines[0] ?? "").toLowerCase()
      const isNewFormat = headerLine.includes("summary")

      if (isNewFormat) {
        // New format: Date | Event | Weight | Summary
        for (let i = 1; i < lines.length; i++) {
          const line = (lines[i] ?? "").trim()
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
          const line = (lines[i] ?? "").trim()
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

    const parsedMatches = parseRawTextToJson(rawTextData, rawTextFormat)

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
      // Check if this is the new multi-line format where winner/loser might be empty
      // (indicating the selected athlete)
      const isNewFormat = match.winner === "" || match.loser === ""
      
      let isWin = false
      let opponent = ""
      let opponentSchool = ""
      
      if (isNewFormat) {
        // In new format: empty winner means athlete won, empty loser means athlete lost
        if (match.winner === "") {
          // Athlete won
          isWin = true
          opponent = match.loser
          opponentSchool = match.loser_school
        } else {
          // Athlete lost
          isWin = false
          opponent = match.winner
          opponentSchool = match.winner_school
        }
      } else {
        // Old format: match athlete name against winner/loser
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

        isWin = isWinnerMatch && !isLoserMatch
        opponent = isWin ? match.loser : match.winner
        opponentSchool = isWin ? match.loser_school : match.winner_school

        if (!athleteSchool) {
          athleteSchool = isWin ? match.winner_school : match.loser_school
        }
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

    // Deduplicate (optional): Rank exports sometimes list the same bout twice. When enabled,
    // merge duplicates by date+opponent+W/L+result+venue. Disable to count all entries (raw).
    const matchCountBeforeDedup = convertedMatches.length
    let matchCountAfterDedup = matchCountBeforeDedup
    let finalMatches: typeof convertedMatches
    if (deduplicateMatches) {
      const seen = new Set<string>()
      const deduped: typeof convertedMatches = []
      for (const m of convertedMatches) {
        const r = (m.result ?? "").trim().toLowerCase()
        const v = (m.venue ?? "").trim().toLowerCase()
        const key = `${m.date}|${m.opponent.trim().toLowerCase()}|${m.win_loss}|${r}|${v}`
        if (seen.has(key)) continue
        seen.add(key)
        deduped.push(m)
      }
      matchCountAfterDedup = deduped.length
      finalMatches = deduped
    } else {
      finalMatches = convertedMatches
    }

    const firstName = selectedAthleteData.name.split(" ")[0] || ""
    const lastName = selectedAthleteData.name.split(" ").slice(1).join(" ") || ""

    const wins = finalMatches.filter((m) => m.win_loss === "W").length
    const losses = finalMatches.filter((m) => m.win_loss === "L").length
    const pins = finalMatches.filter(
      (m) => m.win_loss === "W" && m.result.toLowerCase().includes("fall"),
    ).length
    const techFalls = finalMatches.filter(
      (m) => m.win_loss === "W" && (m.result.toLowerCase().includes("tf") || m.result.toLowerCase().includes("tech")),
    ).length
    const majorDecisions = finalMatches.filter(
      (m) => m.win_loss === "W" && m.result.toLowerCase().includes("major"),
    ).length
    const decisions = finalMatches.filter(
      (m) =>
        m.win_loss === "W" &&
        (m.result.toLowerCase().includes("dec") || m.result.toLowerCase().includes("sv")),
    ).length
    const forfeits = finalMatches.filter(
      (m) =>
        m.win_loss === "W" &&
        (m.opponent.toLowerCase() === "forfeit" ||
          (m.result && /^(for|for\.|forf\.?|forfeit|ff\.?)$/i.test(m.result.trim()))),
    ).length

    const dates = finalMatches
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
    const minYear = years.length ? Math.min(...years) : NaN
    const maxYear = years.length ? Math.max(...years) : NaN

    // Season can be from a single calendar year (e.g. all Dec 2022) or span two years
    let season = ""
    if (Number.isFinite(minYear) && Number.isFinite(maxYear)) {
      if (minYear === maxYear) {
        // All matches in one calendar year: use month to pick correct season
        // Aug–Dec => season Y-(Y+1); Jan–Jul => season (Y-1)-Y
        const hasLateYear = dates.some((d) => d.month >= 8)
        season = hasLateYear
          ? `${minYear}-${(minYear + 1).toString().slice(-2)}`
          : `${minYear - 1}-${minYear.toString().slice(-2)}`
      } else {
        season = `${minYear}-${maxYear.toString().slice(-2)}`
      }
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

    // Use selected high school as fallback if athlete school not found in matches
    let finalAthleteSchool = athleteSchool
    if (!finalAthleteSchool && selectedHighSchool) {
      const selectedSchoolData = highSchools.find((hs) => hs.id === selectedHighSchool)
      if (selectedSchoolData) {
        finalAthleteSchool = selectedSchoolData.name
      }
    }

    const jsonPayload = {
      wrestler_info: {
        first_name: firstName,
        last_name: lastName,
        season: season || "Unknown",
        grade: inferredGrade,
        high_school: finalAthleteSchool || "Unknown",
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
      matches: finalMatches,
    }

    setJsonData(JSON.stringify(jsonPayload, null, 2))
    const dedupNote =
      matchCountBeforeDedup > matchCountAfterDedup
        ? ` (${matchCountBeforeDedup - matchCountAfterDedup} duplicate bouts removed from Rank export)`
        : ""
    setParseResult({
      success: true,
      message: `Successfully parsed ${matchCountAfterDedup} matches${dedupNote}. JSON has been loaded into the Single Athlete Upload tab.`,
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
        <TabsList className="grid w-full grid-cols-2 gap-1 sm:grid-cols-4">
          <TabsTrigger value="single">Single Athlete Upload</TabsTrigger>
          <TabsTrigger value="sync">RankWrestler Sync</TabsTrigger>
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

        <TabsContent value="sync">
          <Card>
            <CardHeader>
              <CardTitle>Sync RankWrestler Matches</CardTitle>
              <p className="text-sm text-gray-600">
                Select an athlete, paste the RankWrestler athlete/season URL, and sync that season directly into the
                profile match format. This replaces the existing record for the same athlete and season.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-blue-500 bg-blue-50">
                <AlertDescription>
                  <div className="font-semibold text-blue-800">How this works</div>
                  <p className="mt-1 text-sm text-blue-700">
                    Browser automation opens RankWrestler, uses the private <code>RANKWRESTLER_COOKIE</code> or{" "}
                    <code>RANKWRESTLER_EMAIL</code>/<code>RANKWRESTLER_PASSWORD</code>, waits for Match History to
                    render, parses the bouts, deduplicates if enabled, and writes the season to the same{" "}
                    <code>matches</code> table used by athlete profiles.
                  </p>
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="athlete-sync">Select Athlete</Label>
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
                <Label htmlFor="rankwrestlerUrl">RankWrestler URL</Label>
                <input
                  id="rankwrestlerUrl"
                  type="url"
                  value={rankwrestlerUrl}
                  onChange={(e) => setRankwrestlerUrl(e.target.value)}
                  placeholder="https://www.rankwrestlers.com/wrestler/..."
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Use the athlete/season page that shows the match list you would normally copy.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rankRenderedBrowserSync"
                  checked={useRenderedBrowserSync}
                  onChange={(e) => {
                    setUseRenderedBrowserSync(e.target.checked)
                    if (!e.target.checked) setSyncAllRankSeasons(false)
                  }}
                  className="h-4 w-4 rounded"
                />
                <Label htmlFor="rankRenderedBrowserSync" className="cursor-pointer font-normal">
                  Use browser login automation (recommended)
                </Label>
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="rankSyncAllSeasons"
                  checked={syncAllRankSeasons}
                  onChange={(e) => {
                    setSyncAllRankSeasons(e.target.checked)
                    if (e.target.checked) setUseRenderedBrowserSync(true)
                  }}
                  className="mt-1 h-4 w-4 rounded"
                />
                <div>
                  <Label htmlFor="rankSyncAllSeasons" className="cursor-pointer font-normal">
                    Sync all visible RankWrestler seasons
                  </Label>
                  <p className="text-xs text-gray-500">
                    Browser automation will try direct season URLs, linked prior-season profiles, and RankWrestler
                    archive search when a current profile is not linked backward.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rankSyncDeduplicate"
                  checked={deduplicateMatches}
                  onChange={(e) => setDeduplicateMatches(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <Label htmlFor="rankSyncDeduplicate" className="cursor-pointer font-normal">
                  Deduplicate matches to match RankWrestler season record
                </Label>
              </div>

              <Button
                onClick={handleRankWrestlerSync}
                disabled={isRankSyncing || !selectedAthlete || !rankwrestlerUrl.trim()}
                className="w-full"
              >
                {isRankSyncing
                  ? syncAllRankSeasons
                    ? "Syncing all RankWrestler seasons..."
                    : "Syncing RankWrestler..."
                  : syncAllRankSeasons
                    ? "Sync All Visible Seasons from RankWrestler"
                    : "Sync Selected Athlete from RankWrestler"}
              </Button>

              {rankSyncResult && (
                <Alert className={rankSyncResult.success ? "border-green-500" : "border-red-500"}>
                  <AlertDescription>
                    {rankSyncResult.success ? (
                      <div>
                        <p className="font-semibold text-green-700">✅ RankWrestler Sync Complete</p>
                        <p>{rankSyncResult.message}</p>
                        <div className="mt-2 text-sm text-gray-600">
                          {Array.isArray(rankSyncResult.syncedSeasons) ? (
                            <div className="mt-2 overflow-hidden rounded-md border border-green-200">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-green-50 text-green-900">
                                  <tr>
                                    <th className="px-2 py-1">Season</th>
                                    <th className="px-2 py-1">Grade</th>
                                    <th className="px-2 py-1">Record</th>
                                    <th className="px-2 py-1">Saved</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rankSyncResult.syncedSeasons.map((season: any) => (
                                    <tr key={season.season} className="border-t border-green-100">
                                      <td className="px-2 py-1 font-medium">{season.season}</td>
                                      <td className="px-2 py-1">{season.grade}</td>
                                      <td className="px-2 py-1">
                                        {season.wins}-{season.losses}
                                      </td>
                                      <td className="px-2 py-1">{season.dedupedMatches ?? season.totalMatches} bouts</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <>
                              <p>Season: {rankSyncResult.season}</p>
                              <p>Grade: {rankSyncResult.grade}</p>
                            </>
                          )}
                          {typeof rankSyncResult.renderedBrowser === "boolean" && (
                            <p>Mode: {rankSyncResult.renderedBrowser ? "Browser automation" : "Server fetch"}</p>
                          )}
                          {rankSyncResult.parsedSource && <p>Source parsed: {rankSyncResult.parsedSource}</p>}
                          {rankSyncResult.failedSeasons?.length > 0 && (
                            <p className="text-amber-700">
                              {rankSyncResult.failedSeasons.length} visible season
                              {rankSyncResult.failedSeasons.length === 1 ? "" : "s"} could not be saved.
                            </p>
                          )}
                          {rankSyncResult.skippedSeasons?.length > 0 && (
                            <p className="text-amber-700">
                              {rankSyncResult.skippedSeasons.length} visible season label
                              {rankSyncResult.skippedSeasons.length === 1 ? "" : "s"} skipped as duplicate/no match season.
                            </p>
                          )}
                          {rankSyncResult.diagnostics && (
                            <p>
                              {Array.isArray(rankSyncResult.syncedSeasons)
                                ? `Detected ${rankSyncResult.diagnostics.renderedSeasonCount ?? rankSyncResult.syncedSeasons.length} rendered season page${(rankSyncResult.diagnostics.renderedSeasonCount ?? rankSyncResult.syncedSeasons.length) === 1 ? "" : "s"}.`
                                : `Parsed ${rankSyncResult.diagnostics.parsedMatches} bouts; saved ${
                                    rankSyncResult.diagnostics.dedupedMatches
                                  }${
                                    rankSyncResult.diagnostics.duplicatesRemoved > 0
                                      ? ` (${rankSyncResult.diagnostics.duplicatesRemoved} duplicates removed)`
                                      : ""
                                  }`}
                            </p>
                          )}
                          {Array.isArray(rankSyncResult.diagnostics?.discoveredSeasonTargets) &&
                            rankSyncResult.diagnostics.discoveredSeasonTargets.length > 0 && (
                              <details className="mt-2 rounded-md bg-green-50 p-2 text-xs text-green-900">
                                <summary className="cursor-pointer font-semibold">Discovered RankWrestler season controls</summary>
                                <ul className="mt-1 list-disc space-y-1 pl-5">
                                  {rankSyncResult.diagnostics.discoveredSeasonTargets.map((target: any, index: number) => (
                                    <li key={`${target.label}-${index}`}>
                                      {target.label}
                                      {target.href ? ` → ${target.href}` : ""}
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            )}
                          {Array.isArray(rankSyncResult.diagnostics?.seasonDebugSteps) &&
                            rankSyncResult.diagnostics.seasonDebugSteps.length > 0 && (
                              <details className="mt-2 rounded-md bg-blue-50 p-2 text-xs text-blue-950">
                                <summary className="cursor-pointer font-semibold">RankWrestler sync trace</summary>
                                <ol className="mt-1 list-decimal space-y-2 pl-5">
                                  {rankSyncResult.diagnostics.seasonDebugSteps.map((step: any, index: number) => (
                                    <li key={`rank-trace-${index}`}>
                                      <div>
                                        <span className="font-semibold">{step.step}</span>
                                        {step.label ? ` · ${step.label}` : ""}
                                        {typeof step.ok === "boolean" ? ` · ${step.ok ? "ok" : "not ok"}` : ""}
                                      </div>
                                      <div>Rendered: {step.renderedSeason || "unknown"}</div>
                                      {step.url && <div className="break-all">URL: {step.url}</div>}
                                      {Array.isArray(step.visibleSeasonLabels) && step.visibleSeasonLabels.length > 0 && (
                                        <div>Visible labels: {step.visibleSeasonLabels.join(", ")}</div>
                                      )}
                                      {step.error && <div className="text-red-700">Error: {step.error}</div>}
                                      {step.preview && <div className="mt-1 line-clamp-3 text-blue-800">{step.preview}</div>}
                                    </li>
                                  ))}
                                </ol>
                              </details>
                            )}
                          {(rankSyncResult.failedSeasons?.length > 0 || rankSyncResult.skippedSeasons?.length > 0) && (
                            <details className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-900">
                              <summary className="cursor-pointer font-semibold">Skipped / failed season details</summary>
                              <ul className="mt-1 list-disc space-y-1 pl-5">
                                {rankSyncResult.skippedSeasons?.map((season: any, index: number) => (
                                  <li key={`skipped-${index}`}>
                                    Skipped {season.seasonLabel || season.season}: {season.reason}
                                  </li>
                                ))}
                                {rankSyncResult.failedSeasons?.map((season: any, index: number) => (
                                  <li key={`failed-${index}`}>
                                    Failed {season.seasonLabel || season.season}: {season.error}
                                  </li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-red-700">❌ RankWrestler Sync Not Complete</p>
                        <p>{rankSyncResult.error}</p>
                        {rankSyncResult.hint && <p className="mt-2 text-sm text-red-700">{rankSyncResult.hint}</p>}
                        {rankSyncResult.diagnostics && (
                          <details className="mt-3 rounded-md bg-gray-50 p-3 text-xs text-gray-700">
                            <summary className="cursor-pointer font-semibold">Fetched page diagnostics</summary>
                            <div className="mt-2 space-y-1">
                              <p>Title: {rankSyncResult.diagnostics.title || "None detected"}</p>
                              {rankSyncResult.diagnostics.finalUrl && <p>Final URL: {rankSyncResult.diagnostics.finalUrl}</p>}
                              <p>Visible text length: {rankSyncResult.diagnostics.textLength}</p>
                              <p>HTML length: {rankSyncResult.diagnostics.htmlLength}</p>
                              {typeof rankSyncResult.diagnostics.usedCookie === "boolean" && (
                                <p>Used cookie: {rankSyncResult.diagnostics.usedCookie ? "Yes" : "No"}</p>
                              )}
                              {typeof rankSyncResult.diagnostics.usedLogin === "boolean" && (
                                <p>Used login: {rankSyncResult.diagnostics.usedLogin ? "Yes" : "No"}</p>
                              )}
                              {typeof rankSyncResult.diagnostics.matchHistoryFound === "boolean" && (
                                <p>Match History found: {rankSyncResult.diagnostics.matchHistoryFound ? "Yes" : "No"}</p>
                              )}
                              {typeof rankSyncResult.diagnostics.textCandidateCount === "number" && (
                                <p>
                                  Text candidates: {rankSyncResult.diagnostics.textCandidateCount}
                                  {Array.isArray(rankSyncResult.diagnostics.textCandidateSources)
                                    ? ` (${rankSyncResult.diagnostics.textCandidateSources.join(", ")})`
                                    : ""}
                                </p>
                              )}
                              <p>Looks like login: {rankSyncResult.diagnostics.looksLikeLogin ? "Yes" : "No"}</p>
                              <p>Looks like app shell: {rankSyncResult.diagnostics.looksLikeClientAppShell ? "Yes" : "No"}</p>
                              <p>Has match words: {rankSyncResult.diagnostics.hasMatchWords ? "Yes" : "No"}</p>
                              {rankSyncResult.diagnostics.preview && (
                                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-white p-2">
                                  {rankSyncResult.diagnostics.preview}
                                </pre>
                              )}
                            </div>
                          </details>
                        )}
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
                Paste your raw match data (tab-separated format) and it will be automatically converted to JSON.
                You can also paste the visible text from a rendered RankWrestler profile Match History page. Matches in a
                single calendar year (e.g. all Dec 2022) are supported — season is inferred from the dates.
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
                <Label>Data Format</Label>
                <div className="flex gap-4 mt-1 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="rawFormat"
                      checked={rawTextFormat === "rank"}
                      onChange={() => setRawTextFormat("rank")}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">Rank</span>
                    <span className="text-xs text-gray-500">— Win/Loss blocks with date, opponent, school, venue, method</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="rawFormat"
                      checked={rawTextFormat === "track"}
                      onChange={() => setRawTextFormat("track")}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">Track</span>
                    <span className="text-xs text-gray-500">— Tab: Date, Event, Weight, Summary (e.g. from Trackwrestling)</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="deduplicateMatches"
                  checked={deduplicateMatches}
                  onChange={(e) => setDeduplicateMatches(e.target.checked)}
                  className="rounded h-4 w-4"
                />
                <Label htmlFor="deduplicateMatches" className="cursor-pointer font-normal">
                  Match Rank (deduplicate) — merge export duplicates to match Rank&apos;s record
                </Label>
              </div>
              <p className="text-xs text-gray-500 -mt-2 ml-6">
                Uncheck for Raw (no deduplication) — count every entry
              </p>

              <div>
                <Label htmlFor="rawTextData">Raw Match Data</Label>
                <p className="text-xs text-gray-500 mb-2">
                  {rawTextFormat === "rank"
                    ? "Paste Win/Loss blocks or tab-separated: Date, Winner, School, Loser, School, Result, Venue, Weight, Opp%"
                    : "Paste tab-separated: Date, Event, Weight, Summary (e.g. Champ. Round 2 - Athlete (School) over Opponent (School) (Dec 9-4))"}
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
