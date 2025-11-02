"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, User, School, Trophy, AlertCircle, CheckCircle, XCircle } from "lucide-react"

interface AthleteData {
  id: string
  name: string
  high_school?: string
  college?: string
  club?: string
  [key: string]: any
}

interface LogoMapping {
  id: string
  entity_name: string
  entity_type: string
  logo_url: string
  created_at: string
}

interface LogoLookupResult {
  entity: string
  type: string
  found: boolean
  logo_url?: string
  variations_tried: string[]
  exact_match?: boolean
}

export default function ColtLogoDebug() {
  const [athleteData, setAthleteData] = useState<AthleteData | null>(null)
  const [logoMappings, setLogoMappings] = useState<LogoMapping[]>([])
  const [logoLookups, setLogoLookups] = useState<LogoLookupResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Load Colt Campbell's data
      console.log("Loading Colt Campbell's data...")
      const athleteResponse = await fetch("/api/debug/find-colt-campbell")
      const athleteResult = await athleteResponse.json()
      if (athleteResult.success && athleteResult.athlete) {
        setAthleteData(athleteResult.athlete)
        console.log("Colt's data:", athleteResult.athlete)
      } else {
        setError("Could not find Colt Campbell in database")
        return
      }

      // Load all logo mappings
      console.log("Loading logo mappings...")
      const logosResponse = await fetch("/api/logo-mappings-simple")
      const logosResult = await logosResponse.json()
      if (logosResult.success) {
        setLogoMappings(logosResult.data || [])
        console.log("Logo mappings:", logosResult.data?.length || 0)
      }

      // Test logo lookups for Colt's entities
      const athlete = athleteResult.athlete
      const lookupResults: LogoLookupResult[] = []

      // Test high school lookup
      if (athlete.high_school) {
        console.log("Testing high school lookup for:", athlete.high_school)
        const hsResponse = await fetch(`/api/logo-mappings/highschool/${encodeURIComponent(athlete.high_school)}`)
        const hsResult = await hsResponse.json()

        lookupResults.push({
          entity: athlete.high_school,
          type: "highschool",
          found: hsResult.success && hsResult.logo_url,
          logo_url: hsResult.logo_url,
          variations_tried: hsResult.variations_tried || [],
          exact_match: hsResult.exact_match,
        })
      }

      // Test college lookup
      if (athlete.college) {
        console.log("Testing college lookup for:", athlete.college)
        const collegeResponse = await fetch(`/api/logo-mappings/college/${encodeURIComponent(athlete.college)}`)
        const collegeResult = await collegeResponse.json()

        lookupResults.push({
          entity: athlete.college,
          type: "college",
          found: collegeResult.success && collegeResult.logo_url,
          logo_url: collegeResult.logo_url,
          variations_tried: collegeResult.variations_tried || [],
          exact_match: collegeResult.exact_match,
        })
      }

      // Test club lookup
      if (athlete.club) {
        console.log("Testing club lookup for:", athlete.club)
        const clubResponse = await fetch(`/api/logo-mappings/club/${encodeURIComponent(athlete.club)}`)
        const clubResult = await clubResponse.json()

        lookupResults.push({
          entity: athlete.club,
          type: "club",
          found: clubResult.success && clubResult.logo_url,
          logo_url: clubResult.logo_url,
          variations_tried: clubResult.variations_tried || [],
          exact_match: clubResult.exact_match,
        })
      }

      setLogoLookups(lookupResults)
    } catch (error) {
      console.error("Error loading data:", error)
      setError("Failed to load debug data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin mr-2" />
          <span>Loading Colt Campbell debug data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Find specific logo mappings
  const hickoryRidgeLogos = logoMappings.filter(
    (logo) => logo.entity_name.toLowerCase().includes("hickory ridge") && logo.entity_type === "highschool",
  )

  const appStateLogos = logoMappings.filter(
    (logo) =>
      (logo.entity_name.toLowerCase().includes("appalachian") ||
        logo.entity_name.toLowerCase().includes("app state")) &&
      logo.entity_type === "college",
  )

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Colt Campbell Logo Debug</h1>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Athlete Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Athlete Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          {athleteData ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Name</label>
                  <p className="font-semibold">{athleteData.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">High School</label>
                  <p className="font-semibold">{athleteData.high_school || "Not set"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">College</label>
                  <p className="font-semibold">{athleteData.college || "Not set"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Club</label>
                  <p className="font-semibold">{athleteData.club || "Not set"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">ID</label>
                  <p className="font-mono text-sm">{athleteData.id}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No athlete data found</p>
          )}
        </CardContent>
      </Card>

      {/* Logo Lookup Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            Logo Lookup Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {logoLookups.map((lookup, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold">{lookup.entity}</h4>
                    <Badge variant="outline" className="capitalize">
                      {lookup.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {lookup.found ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className={lookup.found ? "text-green-600" : "text-red-600"}>
                      {lookup.found ? "Found" : "Not Found"}
                    </span>
                  </div>
                </div>

                {lookup.found && lookup.logo_url && (
                  <div className="mb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={lookup.logo_url || "/placeholder.svg"}
                        alt={lookup.entity}
                        className="w-12 h-12 object-contain border rounded"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = "/placeholder.svg?height=48&width=48&text=Error"
                        }}
                      />
                      <div>
                        <p className="text-sm font-medium">Logo URL:</p>
                        <p className="text-xs text-gray-500 break-all">{lookup.logo_url}</p>
                        {lookup.exact_match && (
                          <Badge variant="outline" className="text-green-600 border-green-600 mt-1">
                            Exact Match
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium mb-2">Variations Tried:</p>
                  <div className="flex flex-wrap gap-1">
                    {lookup.variations_tried.map((variation, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {variation}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hickory Ridge Logos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Hickory Ridge High School Logos
            <Badge variant="outline">{hickoryRidgeLogos.length} found</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hickoryRidgeLogos.length > 0 ? (
            <div className="space-y-3">
              {hickoryRidgeLogos.map((logo) => (
                <div key={logo.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <img
                    src={logo.logo_url || "/placeholder.svg"}
                    alt={logo.entity_name}
                    className="w-12 h-12 object-contain border rounded"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg?height=48&width=48&text=Error"
                    }}
                  />
                  <div className="flex-1">
                    <p className="font-semibold">{logo.entity_name}</p>
                    <p className="text-sm text-gray-500">ID: {logo.id}</p>
                    <p className="text-xs text-gray-400 break-all">{logo.logo_url}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Created: {new Date(logo.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No Hickory Ridge logos found in database</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* App State Logos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Appalachian State Logos
            <Badge variant="outline">{appStateLogos.length} found</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {appStateLogos.length > 0 ? (
            <div className="space-y-3">
              {appStateLogos.map((logo) => (
                <div key={logo.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <img
                    src={logo.logo_url || "/placeholder.svg"}
                    alt={logo.entity_name}
                    className="w-12 h-12 object-contain border rounded"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg?height=48&width=48&text=Error"
                    }}
                  />
                  <div className="flex-1">
                    <p className="font-semibold">{logo.entity_name}</p>
                    <p className="text-sm text-gray-500">ID: {logo.id}</p>
                    <p className="text-xs text-gray-400 break-all">{logo.logo_url}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Created: {new Date(logo.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {appStateLogos.length > 1 && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Multiple logos detected!</span>
                  </div>
                  <p className="text-sm text-orange-700 mt-1">
                    Having multiple logos for the same entity can cause confusion. Consider using the deduplication
                    feature.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No Appalachian State logos found in database</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Logo Mappings Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Logo Mappings Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {logoMappings.filter((l) => l.entity_type === "college").length}
              </p>
              <p className="text-sm text-blue-700">College Logos</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {logoMappings.filter((l) => l.entity_type === "highschool").length}
              </p>
              <p className="text-sm text-green-700">High School Logos</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {logoMappings.filter((l) => l.entity_type === "club").length}
              </p>
              <p className="text-sm text-purple-700">Club Logos</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
