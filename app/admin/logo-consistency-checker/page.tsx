"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, RefreshCw, Zap } from "lucide-react"

interface LogoCheck {
  type: string
  entity_name: string
  logo_found: boolean
  logo_url: string | null
  exact_match: string | null
}

interface AthleteResult {
  athlete_name: string
  found: boolean
  college: string
  high_school: string
  club: string
  logo_checks: LogoCheck[]
  college_logo_exists: boolean
  high_school_logo_exists: boolean
  club_logo_exists: boolean
  raw_data?: any
}

interface CheckResults {
  success: boolean
  results: AthleteResult[]
  total_logo_mappings: number
  all_logo_mappings: Array<{
    entity_name: string
    entity_type: string
    logo_url: string
  }>
}

export default function LogoConsistencyChecker() {
  const [loading, setLoading] = useState(false)
  const [checkResults, setCheckResults] = useState<CheckResults | null>(null)
  const [standardizeResults, setStandardizeResults] = useState<any>(null)

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

  const standardizeLogos = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/standardize-logo-mappings", {
        method: "POST",
      })
      const data = await response.json()
      setStandardizeResults(data)

      // Refresh the check after standardizing
      if (data.success) {
        setTimeout(() => {
          checkLogos()
        }, 1000)
      }
    } catch (error) {
      console.error("Error standardizing logos:", error)
    } finally {
      setLoading(false)
    }
  }

  const getLogoStatusColor = (found: boolean) => {
    return found ? "text-green-600" : "text-red-600"
  }

  const getLogoStatusIcon = (found: boolean) => {
    return found ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Logo Consistency Checker</h1>
        <p className="text-gray-600">
          Check why Anna Ockerman has all 3 logos but others are missing some. Let's find the inconsistencies!
        </p>
      </div>

      <div className="flex gap-4 mb-6">
        <Button onClick={checkLogos} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Check Logo Status
        </Button>

        <Button onClick={standardizeLogos} disabled={loading} className="bg-blue-600 text-white">
          <Zap className="h-4 w-4 mr-2" />
          Standardize All Logos
        </Button>
      </div>

      {/* Standardize Results */}
      {standardizeResults && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Standardization Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {standardizeResults.success ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{standardizeResults.summary?.inserted || 0}</div>
                    <div className="text-sm text-gray-600">Inserted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{standardizeResults.summary?.updated || 0}</div>
                    <div className="text-sm text-gray-600">Updated</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">{standardizeResults.summary?.skipped || 0}</div>
                    <div className="text-sm text-gray-600">Skipped</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {standardizeResults.summary?.still_missing || 0}
                    </div>
                    <div className="text-sm text-gray-600">Still Missing</div>
                  </div>
                </div>

                {standardizeResults.missing_logos && standardizeResults.missing_logos.length > 0 && (
                  <div>
                    <h3 className="font-bold text-lg mb-2 text-orange-600">Still Missing Logos:</h3>
                    <div className="space-y-2">
                      {standardizeResults.missing_logos.map((missing: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                          <div>
                            <span className="font-medium">{missing.entity_name}</span>
                            <Badge variant="outline" className="ml-2 capitalize">
                              {missing.entity_type}
                            </Badge>
                          </div>
                          <span className="text-sm text-gray-600">{missing.suggested_logo}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-red-600">❌ Error: {standardizeResults.error}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Check Results */}
      {checkResults && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Logo Status Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{checkResults.total_logo_mappings}</div>
                  <div className="text-sm text-gray-600">Total Logo Mappings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {
                      checkResults.results.filter(
                        (r) => r.college_logo_exists && r.high_school_logo_exists && r.club_logo_exists,
                      ).length
                    }
                  </div>
                  <div className="text-sm text-gray-600">Athletes with All 3 Logos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {
                      checkResults.results.filter(
                        (r) => !r.college_logo_exists || !r.high_school_logo_exists || !r.club_logo_exists,
                      ).length
                    }
                  </div>
                  <div className="text-sm text-gray-600">Athletes Missing Logos</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Individual Athlete Results */}
          <div className="space-y-4">
            {checkResults.results.map((result, index) => (
              <Card
                key={index}
                className={`${
                  result.college_logo_exists && result.high_school_logo_exists && result.club_logo_exists
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{result.athlete_name}</span>
                    <div className="flex gap-2">
                      {result.college_logo_exists && result.high_school_logo_exists && result.club_logo_exists ? (
                        <Badge className="bg-green-600 text-white">All Logos ✓</Badge>
                      ) : (
                        <Badge variant="destructive">Missing Logos</Badge>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.found === false ? (
                    <p className="text-red-600">❌ Athlete not found in database</p>
                  ) : (
                    <div className="space-y-4">
                      {/* Logo Status Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {result.logo_checks.map((check, checkIndex) => (
                          <div key={checkIndex} className="border rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              {getLogoStatusIcon(check.logo_found)}
                              <h3 className="font-bold capitalize">{check.type}</h3>
                            </div>
                            <p className="text-sm font-medium mb-1">{check.entity_name}</p>
                            {check.logo_found ? (
                              <div>
                                <p className="text-xs text-green-600 mb-1">✓ Logo found</p>
                                <p className="text-xs text-gray-500 break-all">{check.logo_url}</p>
                                {check.exact_match && check.exact_match !== check.entity_name && (
                                  <p className="text-xs text-blue-600 mt-1">Matched: "{check.exact_match}"</p>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-red-600">❌ No logo mapping found</p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Raw Data for Debugging */}
                      <details className="mt-4">
                        <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                          🔍 Show Raw Database Data
                        </summary>
                        <div className="mt-2 p-3 bg-gray-100 rounded text-xs">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <strong>College:</strong>
                              <pre className="mt-1 text-xs">{JSON.stringify(result.raw_data?.college, null, 2)}</pre>
                            </div>
                            <div>
                              <strong>High School:</strong>
                              <pre className="mt-1 text-xs">{JSON.stringify(result.raw_data?.highschool, null, 2)}</pre>
                            </div>
                            <div>
                              <strong>Wrestling Club:</strong>
                              <pre className="mt-1 text-xs">
                                {JSON.stringify(result.raw_data?.wrestlingClub, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </details>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* All Logo Mappings */}
          <Card>
            <CardHeader>
              <CardTitle>All Current Logo Mappings ({checkResults.all_logo_mappings.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  {checkResults.all_logo_mappings.map((logo, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {logo.entity_type}
                        </Badge>
                        <span className="font-medium">{logo.entity_name}</span>
                      </div>
                      <span className="text-xs text-gray-500 truncate max-w-xs">{logo.logo_url}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
