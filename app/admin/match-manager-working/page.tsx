"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, CheckCircle, AlertCircle, Users } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface MatchData {
  wrestler_id: string
  wrestler_name: string
  season_year: number
  matches: Array<{
    date: string
    opponent: string
    opponent_school: string
    result: "W" | "L"
    decision_type: string
    score: string
    weight_class: string
    tournament?: string
    location?: string
  }>
  season_stats: {
    total_matches: number
    wins: number
    losses: number
    pins: number
    tech_falls: number
    major_decisions: number
    decisions: number
  }
}

export default function MatchManagerWorkingPage() {
  const [jsonData, setJsonData] = useState("")
  const [parsedData, setParsedData] = useState<MatchData[]>([])
  const [importStatus, setImportStatus] = useState<"idle" | "parsing" | "importing" | "success" | "error">("idle")
  const [importResults, setImportResults] = useState<{ success: number; errors: string[] }>({ success: 0, errors: [] })

  const handleParseJson = () => {
    try {
      setImportStatus("parsing")

      if (!jsonData.trim()) {
        throw new Error("Please enter JSON data")
      }

      const data = JSON.parse(jsonData)
      console.log("Parsed data:", data)

      // Handle both single object and array formats
      let wrestlerArray: any[]
      if (Array.isArray(data)) {
        wrestlerArray = data
      } else if (data && typeof data === "object") {
        // Single wrestler object - wrap in array
        wrestlerArray = [data]
      } else {
        throw new Error("Data must be a wrestler object or array of wrestler objects")
      }

      console.log("Wrestler array:", wrestlerArray)

      // Process each wrestler record
      const validatedData = wrestlerArray.map((wrestler, index) => {
        console.log(`Processing wrestler at index ${index}:`, wrestler)

        // Extract wrestler info
        const wrestlerInfo = wrestler.wrestler_info || {}
        const seasonSummary = wrestler.season_summary || {}
        const matches = wrestler.matches || []

        // Build full name
        const firstName = wrestlerInfo.first_name || ""
        const lastName = wrestlerInfo.last_name || ""
        const wrestlerName = `${firstName} ${lastName}`.trim()

        if (!wrestlerName) {
          throw new Error(`No wrestler name found at index ${index}`)
        }

        // Extract season year
        const season = wrestlerInfo.season || seasonSummary.season || new Date().getFullYear()
        const seasonYear =
          typeof season === "string" && season.includes("-")
            ? Number.parseInt(season.split("-")[0]) + 1 // "2021-22" becomes 2022
            : Number.parseInt(season.toString()) || new Date().getFullYear()

        // Generate wrestler ID
        const wrestlerId = `${firstName}_${lastName}_${season}`.replace(/\s+/g, "_")

        // Calculate stats from matches
        const wins = matches.filter((m: any) => m.win_loss === "W").length
        const losses = matches.filter((m: any) => m.win_loss === "L").length

        const validatedWrestler = {
          wrestler_id: wrestlerId,
          wrestler_name: wrestlerName,
          season_year: seasonYear,
          matches: matches.map((match: any) => ({
            date: match.date || "2024-01-01",
            opponent: match.opponent || "Unknown",
            opponent_school: match.opponent_school || "",
            result: match.win_loss || "L",
            decision_type: match.result || "Decision",
            score: match.score || "0-0",
            weight_class: match.weight || "157",
            tournament: match.venue || "",
            location: match.venue || "",
          })),
          season_stats: {
            total_matches: matches.length,
            wins: wins,
            losses: losses,
            pins: matches.filter((m: any) => (m.result || "").toLowerCase().includes("fall")).length,
            tech_falls: matches.filter((m: any) => (m.result || "").toLowerCase().includes("tech")).length,
            major_decisions: matches.filter((m: any) => (m.result || "").toLowerCase().includes("major")).length,
            decisions: matches.filter((m: any) => (m.result || "").toLowerCase().includes("dec")).length,
          },
        }

        console.log("Validated wrestler:", validatedWrestler)
        return validatedWrestler as MatchData
      })

      setParsedData(validatedData)
      setImportStatus("idle")
      setImportResults({ success: 0, errors: [] })
    } catch (error) {
      console.error("JSON parsing error:", error)
      setImportStatus("error")
      setImportResults({ success: 0, errors: [error instanceof Error ? error.message : "Invalid JSON format"] })
    }
  }

  const handleBulkImport = async () => {
    try {
      setImportStatus("importing")
      const response = await fetch("/api/admin/match-data/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wrestlers: parsedData }),
      })
      const result = await response.json()
      if (response.ok) {
        setImportStatus("success")
        setImportResults({ success: result.imported, errors: result.errors || [] })
      } else {
        throw new Error(result.error || "Import failed")
      }
    } catch (error) {
      setImportStatus("error")
      setImportResults({
        success: 0,
        errors: [error instanceof Error ? error.message : "Import failed"],
      })
    }
  }

  const sampleData = {
    wrestler_id: "uuid-here",
    wrestler_name: "John Smith",
    season_year: 2024,
    matches: [
      {
        date: "2024-01-15",
        opponent: "Mike Johnson",
        opponent_school: "West High School",
        result: "W",
        decision_type: "Pin",
        score: "Fall 2:34",
        weight_class: "157",
        tournament: "Regional Duals",
        location: "Charlotte, NC",
      },
    ],
    season_stats: {
      total_matches: 25,
      wins: 22,
      losses: 3,
      pins: 15,
      tech_falls: 4,
      major_decisions: 2,
      decisions: 1,
    },
  }

  const liamFormatSample = {
    wrestler_info: {
      first_name: "Liam",
      last_name: "Hickey",
      season: "2021-22",
      grade: "Freshman",
      high_school: "Cardinal Gibbons High School",
      id: "liam-hickey-123",
    },
    season_summary: {
      season_year: 2022,
      total_matches: 25,
      wins: 22,
      losses: 3,
    },
    matches: [
      {
        date: "2021-11-20",
        weight: "120",
        opponent: "Test Opponent",
        opponent_school: "Test School",
        result: "Fall",
        venue: "Test Tournament",
        win_loss: "W",
        opponent_percentage: "0.00%",
      },
    ],
  }

  const loadSampleData = () => {
    setJsonData(JSON.stringify([sampleData], null, 2))
  }

  const loadLiamFormatSample = () => {
    setJsonData(JSON.stringify(liamFormatSample, null, 2))
  }

  const debugData = () => {
    if (jsonData.trim()) {
      try {
        const parsed = JSON.parse(jsonData)
        console.log("Raw parsed data:", parsed)
        console.log("Data type:", typeof parsed)
        console.log("Is array:", Array.isArray(parsed))
        if (typeof parsed === "object" && parsed !== null) {
          console.log("Object keys:", Object.keys(parsed))
          if (parsed.wrestler_info) {
            console.log("Wrestler info keys:", Object.keys(parsed.wrestler_info))
            console.log("Wrestler info:", parsed.wrestler_info)
          }
        }
      } catch (e) {
        console.error("JSON parse error:", e)
      }
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Match Data Import (Working Version)</h1>
          <p className="text-gray-600">Bulk import RankWrestler match history data</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          {parsedData.length} wrestlers ready
        </Badge>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Import Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Standard Format:</h4>
            <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
              {JSON.stringify([sampleData], null, 2)}
            </pre>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">RankWrestler Format (first_name/last_name structure):</h4>
            <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
              {JSON.stringify(liamFormatSample, null, 2)}
            </pre>
          </div>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="font-semibold text-green-700">✅ Supported Name Fields:</h5>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>first_name + last_name (combined)</li>
                <li>wrestler_name, name, full_name</li>
                <li>Both single object and arrays</li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-blue-700">📝 Flexible Fields:</h5>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>season, season_year, year</li>
                <li>grade, high_school extraction</li>
                <li>Auto-generates missing IDs</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* JSON Input */}
      <Card>
        <CardHeader>
          <CardTitle>Paste JSON Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste your JSON data here... (supports first_name/last_name and other name formats)"
            value={jsonData}
            onChange={(e) => setJsonData(e.target.value)}
            rows={12}
            className="font-mono text-sm"
          />
          <div className="flex gap-2 flex-wrap">
            <Button onClick={loadSampleData} variant="outline">
              Load Standard Sample
            </Button>
            <Button onClick={loadLiamFormatSample} variant="outline">
              Load RankWrestler Sample
            </Button>
            <Button onClick={debugData} variant="outline">
              Debug Data
            </Button>
            <Button onClick={handleParseJson} disabled={!jsonData.trim() || importStatus === "parsing"}>
              <FileText className="h-4 w-4 mr-2" />
              {importStatus === "parsing" ? "Parsing..." : "Parse & Validate JSON"}
            </Button>
            {parsedData.length > 0 && (
              <Button
                onClick={handleBulkImport}
                disabled={importStatus === "importing"}
                className="bg-green-600 hover:bg-green-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                {importStatus === "importing" ? "Importing..." : `Import ${parsedData.length} Wrestlers`}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Parsed Data Preview */}
      {parsedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Parsed Data Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {parsedData.slice(0, 5).map((wrestler, index) => (
                <div key={index} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{wrestler.wrestler_name}</h4>
                      <p className="text-sm text-gray-600">
                        {wrestler.season_year} Season • {wrestler.matches.length} matches
                      </p>
                      <p className="text-xs text-gray-500">ID: {wrestler.wrestler_id}</p>
                    </div>
                    <Badge variant="outline">
                      {wrestler.season_stats?.wins || 0}W-{wrestler.season_stats?.losses || 0}L
                    </Badge>
                  </div>
                </div>
              ))}
              {parsedData.length > 5 && (
                <p className="text-sm text-gray-600 text-center">...and {parsedData.length - 5} more wrestlers</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importStatus === "success" && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>Successfully imported match data for {importResults.success} wrestlers!</AlertDescription>
        </Alert>
      )}

      {importStatus === "error" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div>
              <strong>Import failed:</strong>
              <ul className="list-disc list-inside mt-1">
                {importResults.errors.map((error, index) => (
                  <li key={index} className="text-sm">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
