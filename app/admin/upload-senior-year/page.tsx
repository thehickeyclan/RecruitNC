"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle, Upload, FileText, Info } from "lucide-react"

export default function UploadSeniorYearPage() {
  const [jsonData, setJsonData] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [jsonValidation, setJsonValidation] = useState<{
    isValid: boolean
    matchCount: number
    record: string
  } | null>(null)
  const [uploadResult, setUploadResult] = useState<{
    success: boolean
    message: string
    matchCount?: number
  } | null>(null)

  // Validate JSON as user types
  const validateJson = (jsonString: string) => {
    if (!jsonString.trim()) {
      setJsonValidation(null)
      return
    }

    try {
      const parsed = JSON.parse(jsonString)
      const matchCount = parsed.matches?.length || 0
      const wins = parsed.season_summary?.wins || 0
      const losses = parsed.season_summary?.losses || 0

      setJsonValidation({
        isValid: true,
        matchCount,
        record: `${wins}-${losses}`,
      })
    } catch (error) {
      setJsonValidation({
        isValid: false,
        matchCount: 0,
        record: "Invalid JSON",
      })
    }
  }

  const handleJsonChange = (value: string) => {
    setJsonData(value)
    validateJson(value)
  }

  const validateAndUpload = async () => {
    if (!jsonData.trim()) {
      alert("Please paste the Senior year JSON data")
      return
    }

    if (!jsonValidation?.isValid) {
      alert("Please fix the JSON format before uploading")
      return
    }

    setIsUploading(true)
    setUploadResult(null)

    try {
      const parsedData = JSON.parse(jsonData)
      const matchCount = parsedData.matches?.length || 0

      if (matchCount === 0) {
        setUploadResult({
          success: false,
          message: "No matches found in JSON data",
        })
        setIsUploading(false)
        return
      }

      // Upload the data
      const response = await fetch("/api/admin/single-athlete-upload/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: "colt-campbell",
          athleteName: "Colt Campbell",
          athleteSchool: "Hickory Ridge",
          yearData: [
            {
              year: "Senior",
              grade: "12",
              jsonData: jsonData,
            },
          ],
        }),
      })

      const result = await response.json()

      if (result.successful > 0) {
        setUploadResult({
          success: true,
          message: `Successfully uploaded ${result.totalMatches} Senior year matches! (${parsedData.season_summary?.wins || 0}-${parsedData.season_summary?.losses || 0})`,
          matchCount: result.totalMatches,
        })
      } else {
        setUploadResult({
          success: false,
          message: result.details?.[0]?.message || "Upload failed",
        })
      }
    } catch (error) {
      console.error("Upload error:", error)
      setUploadResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      })
    }

    setIsUploading(false)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Upload Colt Campbell's Senior Year</h1>
        <p className="text-gray-600">Complete the match data upload with Senior year records</p>
      </div>

      <div className="grid gap-6">
        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Badge className="bg-green-100 text-green-800">✓ Freshman: 62 matches (48-14)</Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className="bg-green-100 text-green-800">✓ Sophomore: 65 matches (60-5)</Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className="bg-green-100 text-green-800">✓ Junior: 61 matches (61-0)</Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className="bg-yellow-100 text-yellow-800">⏳ Senior: Pending upload</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText size={20} />
              <span>Senior Year JSON Data</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Info className="text-blue-600 mt-0.5" size={16} />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Instructions:</p>
                    <p>1. Copy your complete Senior year JSON file (all 60 matches)</p>
                    <p>2. Paste it in the text area below</p>
                    <p>3. The system will validate the format automatically</p>
                    <p>4. Click upload when validation shows green</p>
                  </div>
                </div>
              </div>

              <Textarea
                value={jsonData}
                onChange={(e) => handleJsonChange(e.target.value)}
                placeholder="Paste your complete Senior year JSON data here..."
                className="min-h-[400px] font-mono text-sm"
              />

              {/* JSON Validation Status */}
              {jsonValidation && (
                <div className="flex items-center space-x-2">
                  {jsonValidation.isValid ? (
                    <>
                      <CheckCircle className="text-green-600" size={16} />
                      <span className="text-green-600 text-sm">
                        Valid JSON - {jsonValidation.matchCount} matches found ({jsonValidation.record})
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="text-red-600" size={16} />
                      <span className="text-red-600 text-sm">Invalid JSON format - please check for syntax errors</span>
                    </>
                  )}
                </div>
              )}

              <Button
                onClick={validateAndUpload}
                disabled={!jsonData.trim() || !jsonValidation?.isValid || isUploading}
                className="w-full"
              >
                <Upload className="mr-2" size={16} />
                {isUploading ? "Uploading..." : "Upload Senior Year Data"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {uploadResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {uploadResult.success ? (
                  <CheckCircle className="text-green-600" size={20} />
                ) : (
                  <AlertCircle className="text-red-600" size={20} />
                )}
                <span>Upload Result</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                {uploadResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertDescription>{uploadResult.message}</AlertDescription>
              </Alert>

              {uploadResult.success && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Complete Record Summary:</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Total Career Matches:</strong> {188 + (uploadResult.matchCount || 0)}
                    </div>
                    <div>
                      <strong>Years Completed:</strong> 4/4
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Expected Format Example */}
        <Card>
          <CardHeader>
            <CardTitle>Expected JSON Format</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-xs text-gray-700 overflow-x-auto">
                {`{
  "wrestler_info": {
    "first_name": "Colton",
    "last_name": "Campbell", 
    "season": "2024-25",
    "grade": "Senior",
    "high_school": "Hickory Ridge"
  },
  "season_summary": {
    "total_matches": 60,
    "wins": 60,
    "losses": 0,
    "pins": 43,
    "tech_falls": 12,
    ...
  },
  "matches": [
    {
      "date": "2024-11-16",
      "weight": 175,
      "opponent": "Dominic Blue",
      "opponent_school": "Union Pines",
      "result": "TF",
      "venue": "2024 Viking Invitational",
      "win_loss": "W",
      "opponent_percentage": "99.92%"
    },
    ...
  ]
}`}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Expected Senior Year Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Season:</strong> 2024-25 (Current)
              </p>
              <p>
                <strong>School:</strong> Hickory Ridge (transferred from Cary)
              </p>
              <p>
                <strong>Expected Record:</strong> 60-0 (Perfect season!)
              </p>
              <p>
                <strong>Expected Pins:</strong> 43 (71.67%)
              </p>
              <p>
                <strong>Expected Tech Falls:</strong> 12 (20.0%)
              </p>
              <p>
                <strong>Expected Finishing %:</strong> 91.67%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
