"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, RefreshCw } from "lucide-react"

export default function FixAthleteLogosPage() {
  const [loading, setLoading] = useState(false)
  const [checkResults, setCheckResults] = useState<any>(null)
  const [fixResults, setFixResults] = useState<any>(null)

  const checkLogos = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/check-athlete-logos")
      const data = await response.json()
      setCheckResults(data)
    } catch (error) {
      console.error("Error checking logos:", error)
    } finally {
      setLoading(false)
    }
  }

  const fixMissingLogos = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/fix-missing-athlete-logos", {
        method: "POST",
      })
      const data = await response.json()
      setFixResults(data)

      // Refresh the check after fixing
      if (data.success) {
        setTimeout(() => {
          checkLogos()
        }, 1000)
      }
    } catch (error) {
      console.error("Error fixing logos:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Fix Athlete Logos</h1>
        <p className="text-gray-600">
          Check and fix missing logos for Colt Campbell (App State), Liam Hickey (Cardinal Gibbons), etc.
        </p>
      </div>

      <div className="flex gap-4 mb-6">
        <Button onClick={checkLogos} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Check Current Status
        </Button>

        <Button onClick={fixMissingLogos} disabled={loading}>
          {loading ? "Fixing..." : "Fix Missing Logos"}
        </Button>
      </div>

      {/* Check Results */}
      {checkResults && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Current Logo Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {checkResults.results?.map((result: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <h3 className="font-bold text-lg mb-2">{result.athlete_name}</h3>

                  {result.found === false ? (
                    <p className="text-red-600">Athlete not found in database</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* College */}
                      <div className="flex items-center gap-2">
                        {result.college_logo_exists ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium">College</p>
                          <p className="text-sm text-gray-600">{result.college || "N/A"}</p>
                        </div>
                      </div>

                      {/* High School */}
                      <div className="flex items-center gap-2">
                        {result.high_school_logo_exists ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium">High School</p>
                          <p className="text-sm text-gray-600">{result.high_school || "N/A"}</p>
                        </div>
                      </div>

                      {/* Club */}
                      <div className="flex items-center gap-2">
                        {result.club_logo_exists ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium">Club</p>
                          <p className="text-sm text-gray-600">{result.club || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Raw Data for Debugging */}
                  {result.raw_data && (
                    <details className="mt-2">
                      <summary className="text-sm text-gray-500 cursor-pointer">Raw Data</summary>
                      <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(result.raw_data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fix Results */}
      {fixResults && (
        <Card>
          <CardHeader>
            <CardTitle>Fix Results</CardTitle>
          </CardHeader>
          <CardContent>
            {fixResults.success ? (
              <div className="space-y-2">
                <p className="text-green-600 font-medium">✅ Logo mappings processed successfully!</p>
                <div className="space-y-1">
                  {fixResults.results?.map((result: any, index: number) => (
                    <div key={index} className="text-sm">
                      <span className={result.success ? "text-green-600" : "text-red-600"}>
                        {result.success ? "✅" : "❌"}
                      </span>
                      <span className="ml-2">
                        {result.action} {result.entity_type} "{result.entity_name}"
                        {result.error && ` - Error: ${result.error}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-red-600">❌ Error: {fixResults.error}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
