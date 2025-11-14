"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle, Upload, Users, Database, FileText, Loader2 } from "lucide-react"

interface YearData {
  year: string
  grade: string
  jsonData: string
  processed: boolean
  matchCount: number
}

interface Athlete {
  id: string
  name: string
  highschool: string
}

interface ProfileMatch {
  athlete_id: string
  name: string
  school: string
  confidence: number
}

export default function SingleAthleteUploadPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [highSchools, setHighSchools] = useState<string[]>([])
  const [selectedAthleteId, setSelectedAthleteId] = useState("")
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [yearData, setYearData] = useState<YearData[]>([
    { year: "Freshman", grade: "9", jsonData: "", processed: false, matchCount: 0 },
    { year: "Sophomore", grade: "10", jsonData: "", processed: false, matchCount: 0 },
    { year: "Junior", grade: "11", jsonData: "", processed: false, matchCount: 0 },
    { year: "Senior", grade: "12", jsonData: "", processed: false, matchCount: 0 },
  ])
  const [isProcessing, setIsProcessing] = useState(false)
  const [step, setStep] = useState<"setup" | "upload" | "review" | "confirm">("setup")
  const [results, setResults] = useState<any>(null)

  // Load athletes and high schools on component mount
  useEffect(() => {
    loadSystemData()
  }, [])

  const loadSystemData = async () => {
    setLoadingData(true)
    try {
      const response = await fetch("/api/admin/single-athlete-upload/system-data")
      const data = await response.json()

      if (data.athletes) {
        setAthletes(data.athletes)
      }
      if (data.highSchools) {
        setHighSchools(data.highSchools)
      }
    } catch (error) {
      console.error("Error loading system data:", error)
    } finally {
      setLoadingData(false)
    }
  }

  const handleAthleteSelect = (athleteId: string) => {
    setSelectedAthleteId(athleteId)
    const athlete = athletes.find((a) => a.id === athleteId)
    setSelectedAthlete(athlete || null)
  }

  const updateYearData = (index: number, field: keyof YearData, value: string) => {
    const updated = [...yearData]
    updated[index] = { ...updated[index], [field]: value }

    // If updating jsonData, immediately try to parse and count matches
    if (field === "jsonData" && value.trim()) {
      try {
        const parsed = JSON.parse(value)
        // Handle the specific JSON structure from your data
        const matches = parsed.matches || []
        updated[index].matchCount = matches.length
        updated[index].processed = true
      } catch (error) {
        updated[index].processed = false
        updated[index].matchCount = 0
      }
    } else if (field === "jsonData" && !value.trim()) {
      updated[index].processed = false
      updated[index].matchCount = 0
    }

    setYearData(updated)
  }

  const analyzeData = () => {
    const updated = [...yearData]
    updated.forEach((year) => {
      if (year.jsonData.trim()) {
        try {
          const parsed = JSON.parse(year.jsonData)
          // Handle the specific JSON structure from your data
          const matches = parsed.matches || []
          year.matchCount = matches.length
          year.processed = true
        } catch (error) {
          year.processed = false
          year.matchCount = 0
        }
      }
    })
    setYearData(updated)
    setStep("upload")
  }

  const proceedToReview = () => {
    // Since we're using exact athlete from system, no need to search for profile match
    setStep("review")
  }

  const executeUpload = async () => {
    if (!selectedAthlete) {
      alert("No athlete selected")
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch("/api/admin/single-athlete-upload/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: selectedAthlete.id,
          athleteName: selectedAthlete.name,
          athleteSchool: selectedAthlete.highschool,
          yearData: yearData.filter((y) => y.jsonData.trim()),
        }),
      })

      const result = await response.json()
      setResults(result)
      setStep("confirm")
    } catch (error) {
      console.error("Error uploading data:", error)
      alert("Error uploading match data")
    } finally {
      setIsProcessing(false)
    }
  }

  const resetForm = () => {
    setSelectedAthleteId("")
    setSelectedAthlete(null)
    setYearData([
      { year: "Freshman", grade: "9", jsonData: "", processed: false, matchCount: 0 },
      { year: "Sophomore", grade: "10", jsonData: "", processed: false, matchCount: 0 },
      { year: "Junior", grade: "11", jsonData: "", processed: false, matchCount: 0 },
      { year: "Senior", grade: "12", jsonData: "", processed: false, matchCount: 0 },
    ])
    setResults(null)
    setStep("setup")
  }

  if (loadingData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin mr-2" />
          <span>Loading system data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Single Athlete Match Upload</h1>
        <p className="text-gray-600">Upload match data for one wrestler across all 4 years</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center mb-8 space-x-4">
        <div className={`flex items-center space-x-2 ${step === "setup" ? "text-blue-600" : "text-gray-400"}`}>
          <FileText size={20} />
          <span>Setup</span>
        </div>
        <div className="w-8 h-px bg-gray-300"></div>
        <div className={`flex items-center space-x-2 ${step === "upload" ? "text-blue-600" : "text-gray-400"}`}>
          <Upload size={20} />
          <span>Upload Data</span>
        </div>
        <div className="w-8 h-px bg-gray-300"></div>
        <div className={`flex items-center space-x-2 ${step === "review" ? "text-blue-600" : "text-gray-400"}`}>
          <Users size={20} />
          <span>Review</span>
        </div>
        <div className="w-8 h-px bg-gray-300"></div>
        <div className={`flex items-center space-x-2 ${step === "confirm" ? "text-blue-600" : "text-gray-400"}`}>
          <Database size={20} />
          <span>Confirm</span>
        </div>
      </div>

      {step === "setup" && (
        <Card>
          <CardHeader>
            <CardTitle>Select Athlete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Select Athlete from System</label>
              <Select value={selectedAthleteId} onValueChange={handleAthleteSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an athlete..." />
                </SelectTrigger>
                <SelectContent>
                  {athletes.map((athlete) => (
                    <SelectItem key={athlete.id} value={athlete.id}>
                      {athlete.name} - {athlete.highschool}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedAthlete && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">Selected Athlete:</h3>
                <p>
                  <strong>Name:</strong> {selectedAthlete.name}
                </p>
                <p>
                  <strong>High School:</strong> {selectedAthlete.highschool}
                </p>
                <p className="text-sm text-gray-600 mt-2">ID: {selectedAthlete.id}</p>
              </div>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Select an existing athlete from the system to ensure perfect data alignment. If the athlete is not in
                the list, they need to be added to the system first.
              </AlertDescription>
            </Alert>

            <Button onClick={analyzeData} disabled={!selectedAthlete} className="w-full">
              Continue to Data Upload
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "upload" && selectedAthlete && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Match Data by Year</CardTitle>
              <p className="text-sm text-gray-600">Upload JSON files for {selectedAthlete.name} - one for each year</p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {yearData.map((year, index) => (
                  <div key={year.year} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">
                        {year.year} Year (Grade {year.grade})
                      </h3>
                      {year.processed && year.matchCount > 0 && (
                        <Badge className="bg-green-100 text-green-800">{year.matchCount} matches</Badge>
                      )}
                      {year.jsonData.trim() && year.matchCount === 0 && (
                        <Badge className="bg-yellow-100 text-yellow-800">No matches found</Badge>
                      )}
                    </div>
                    <Textarea
                      value={year.jsonData}
                      onChange={(e) => updateYearData(index, "jsonData", e.target.value)}
                      placeholder={`Paste ${year.year} year JSON data here...`}
                      className="min-h-[150px] font-mono text-sm"
                    />
                  </div>
                ))}
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You can upload data for any combination of years. If a year shows "0 matches" or "No matches found",
                  either the JSON data is empty or the format is different than expected.
                </AlertDescription>
              </Alert>

              <div className="mt-6 flex space-x-4">
                <Button onClick={() => setStep("setup")} variant="outline">
                  Back
                </Button>
                <Button onClick={proceedToReview} disabled={yearData.every((y) => y.matchCount === 0)}>
                  Review & Upload
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "review" && selectedAthlete && (
        <Card>
          <CardHeader>
            <CardTitle>Review Upload Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Uploading Data For:</h3>
              <p>
                <strong>Name:</strong> {selectedAthlete.name}
              </p>
              <p>
                <strong>School:</strong> {selectedAthlete.highschool}
              </p>
              <p>
                <strong>Athlete ID:</strong> {selectedAthlete.id}
              </p>
              <p>
                <strong>Years with Data:</strong> {yearData.filter((y) => y.jsonData.trim() && y.matchCount > 0).length}{" "}
                of 4
              </p>
              <p>
                <strong>Total Matches:</strong> {yearData.reduce((sum, y) => sum + y.matchCount, 0)}
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="text-green-600" size={20} />
                <h3 className="font-semibold text-green-800">Perfect Profile Match</h3>
              </div>
              <p>Using exact athlete profile from system - no matching required!</p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Data Summary by Year:</h4>
              {yearData.map((year) => (
                <div key={year.year} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                  <span>
                    {year.year} (Grade {year.grade})
                  </span>
                  {year.matchCount > 0 ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {year.matchCount} matches
                    </Badge>
                  ) : year.jsonData.trim() ? (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      No matches found
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                      No data
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {yearData.some((y) => y.jsonData.trim() && y.matchCount === 0) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Some years show "No matches found" - this could mean the JSON format is different or the data is
                  empty. Only years with valid match data will be uploaded.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex space-x-4">
              <Button onClick={() => setStep("upload")} variant="outline">
                Back to Upload
              </Button>
              <Button onClick={executeUpload} disabled={isProcessing || yearData.every((y) => y.matchCount === 0)}>
                {isProcessing ? "Uploading..." : "Confirm & Upload All Data"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "confirm" && results && selectedAthlete && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="text-green-600" />
              <span>Upload Complete</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Successfully uploaded match data for {selectedAthlete.name}. {results.totalMatches} total matches
                  across {results.yearsUploaded} years.
                </AlertDescription>
              </Alert>

              {results.details && (
                <div className="space-y-2">
                  <h4 className="font-medium">Upload Details:</h4>
                  {results.details.map((detail: any, index: number) => (
                    <div key={index} className="text-sm flex items-center space-x-2">
                      <span className={detail.success ? "text-green-600" : "text-red-600"}>
                        {detail.success ? "✓" : "✗"}
                      </span>
                      <span>
                        {detail.year} - {detail.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <Button onClick={resetForm} className="w-full">
                Upload Another Athlete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
