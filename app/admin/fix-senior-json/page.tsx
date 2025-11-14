"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle, FileText, Wrench } from "lucide-react"

export default function FixSeniorJsonPage() {
  const [rawJson, setRawJson] = useState("")
  const [fixedJson, setFixedJson] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [parseResult, setParseResult] = useState<{
    success: boolean
    matchCount: number
    error?: string
  } | null>(null)

  const attemptJsonFix = () => {
    setIsProcessing(true)
    setParseResult(null)

    try {
      // First, try to parse as-is
      const jsonData = JSON.parse(rawJson)
      setFixedJson(JSON.stringify(jsonData, null, 2))
      setParseResult({
        success: true,
        matchCount: jsonData.matches?.length || 0,
      })
    } catch (error) {
      // If parsing fails, try common fixes
      const fixedData = rawJson

      // Common JSON fixes
      const fixes = [
        // Fix unterminated strings by finding unescaped quotes
        (text: string) => {
          // This is a simple approach - in practice you might need more sophisticated fixing
          return text.replace(/([^\\])"/g, '$1\\"').replace(/^"/, '"')
        },
        // Fix trailing commas
        (text: string) => text.replace(/,(\s*[}\]])/g, "$1"),
        // Fix missing commas
        (text: string) => text.replace(/}(\s*{)/g, "},$1"),
        // Fix single quotes to double quotes
        (text: string) => text.replace(/'/g, '"'),
      ]

      for (const fix of fixes) {
        try {
          const attemptedFix = fix(fixedData)
          const parsed = JSON.parse(attemptedFix)
          setFixedJson(JSON.stringify(parsed, null, 2))
          setParseResult({
            success: true,
            matchCount: parsed.matches?.length || 0,
          })
          setIsProcessing(false)
          return
        } catch (e) {
          // Continue to next fix
          continue
        }
      }

      // If all fixes failed, show the error
      setParseResult({
        success: false,
        matchCount: 0,
        error: error instanceof Error ? error.message : "Unknown parsing error",
      })
    }

    setIsProcessing(false)
  }

  const uploadFixedData = async () => {
    if (!fixedJson || !parseResult?.success) {
      alert("No valid JSON data to upload")
      return
    }

    try {
      const response = await fetch("/api/admin/single-athlete-upload/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: "colt-campbell-id", // You'll need to get this from the previous upload
          athleteName: "Colt Campbell",
          athleteSchool: "Cary High School", // Adjust as needed
          yearData: [
            {
              year: "Senior",
              grade: "12",
              jsonData: fixedJson,
            },
          ],
        }),
      })

      const result = await response.json()

      if (result.successful > 0) {
        alert(`Successfully uploaded ${result.totalMatches} Senior year matches!`)
      } else {
        alert(`Upload failed: ${result.details?.[0]?.message || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Upload error:", error)
      alert("Error uploading data")
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Fix Senior Year JSON</h1>
        <p className="text-gray-600">Tool to fix malformed JSON data and upload Colt Campbell's Senior year matches</p>
      </div>

      <div className="grid gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText size={20} />
              <span>Paste Senior Year JSON</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
              placeholder="Paste the Senior year JSON data here..."
              className="min-h-[200px] font-mono text-sm"
            />
            <div className="mt-4">
              <Button onClick={attemptJsonFix} disabled={!rawJson.trim() || isProcessing}>
                <Wrench className="mr-2" size={16} />
                {isProcessing ? "Fixing..." : "Fix & Validate JSON"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {parseResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {parseResult.success ? (
                  <CheckCircle className="text-green-600" size={20} />
                ) : (
                  <AlertCircle className="text-red-600" size={20} />
                )}
                <span>Validation Result</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {parseResult.success ? (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      JSON is valid! Found {parseResult.matchCount} matches in Senior year data.
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center space-x-4">
                    <Badge className="bg-green-100 text-green-800">{parseResult.matchCount} matches found</Badge>
                    <Button onClick={uploadFixedData}>Upload Senior Year Data</Button>
                  </div>

                  {fixedJson && (
                    <div>
                      <h4 className="font-medium mb-2">Fixed JSON (first 500 characters):</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                        {fixedJson.substring(0, 500)}...
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Could not fix JSON automatically. Error: {parseResult.error}
                    <br />
                    <br />
                    Try manually fixing the JSON around line 52, column 203 where the unterminated string error
                    occurred.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Manual Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Manual Fix Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p>
                <strong>The error "Unterminated string at line 52 column 203" means:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>There's a quote character that wasn't properly closed</li>
                <li>Look around line 52 in your JSON file</li>
                <li>Find any unescaped quotes within string values</li>
                <li>
                  Replace them with <code>\"</code> (escaped quotes)
                </li>
              </ul>

              <p>
                <strong>Common issues to look for:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  School names with apostrophes: <code>"St. Mary's"</code> → <code>"St. Mary\\'s"</code>
                </li>
                <li>
                  Wrestler names with quotes: <code>"John "Big" Smith"</code> → <code>"John \\"Big\\" Smith"</code>
                </li>
                <li>Missing closing quotes on string values</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
