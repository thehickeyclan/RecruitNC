"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

interface AthleteData {
  id: string
  name: string
  wrestling_club?: string
  wrestlingclub?: string
  club?: string
  wrestlingClub?: string
}

interface LogoMappingData {
  id: string
  entity_name: string
  entity_type: string
  logo_url: string
  aliases?: string
}

interface DiagnosticResult {
  athleteData: AthleteData | null
  logoMappings: LogoMappingData[]
  exactMatch: LogoMappingData | null
  partialMatches: LogoMappingData[]
  logoUrlTest: {
    url: string
    status: 'loading' | 'success' | 'error'
    error?: string
  } | null
  smartMatchResult: any
}

export default function OBXLogoDebugPage() {
  const [result, setResult] = useState<DiagnosticResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [testImageUrl, setTestImageUrl] = useState<string>("")
  const [imageTestResult, setImageTestResult] = useState<'loading' | 'success' | 'error' | null>(null)

  const runDiagnostic = async () => {
    setLoading(true)
    setResult(null)

    try {
      // 1. Find Everest Ouellette's data
      console.log("🔍 Step 1: Finding Everest Ouellette...")
      const athleteResponse = await fetch("/api/athletes?search=Everest Ouellette&limit=5")
      const athleteData = await athleteResponse.json()
      
      const everest = athleteData.athletes?.find((a: any) => 
        a.name?.toLowerCase().includes("everest") && a.name?.toLowerCase().includes("ouellette")
      ) || null

      console.log("👤 Everest's data:", everest)

      // 2. Get all club logo mappings
      console.log("🔍 Step 2: Getting all club logo mappings...")
      const mappingsResponse = await fetch("/api/logo-mappings?entityType=club")
      const mappingsData = await mappingsResponse.json()
      const clubMappings = mappingsData.mappings || []

      console.log("🏢 Found", clubMappings.length, "club mappings")

      // 3. Look for OBX matches
      console.log("🔍 Step 3: Looking for OBX matches...")
      const obxMappings = clubMappings.filter((mapping: LogoMappingData) => 
        mapping.entity_name.toLowerCase().includes("obx") ||
        mapping.entity_name.toLowerCase().includes("wrestling factory") ||
        mapping.entity_name.toLowerCase().includes("outer banks")
      )

      console.log("🎯 OBX-related mappings:", obxMappings)

      // 4. Find exact match for what Everest has
      let exactMatch = null
      let clubName = ""
      
      if (everest) {
        clubName = everest.wrestling_club || everest.wrestlingclub || everest.club || everest.wrestlingClub || ""
        console.log("🏷️ Everest's club name:", clubName)
        
        if (clubName) {
          exactMatch = clubMappings.find((mapping: LogoMappingData) => 
            mapping.entity_name.toLowerCase() === clubName.toLowerCase()
          ) || null
        }
      }

      console.log("✅ Exact match found:", exactMatch)

      // 5. Find partial matches
      const partialMatches = clubName ? clubMappings.filter((mapping: LogoMappingData) => 
        mapping.entity_name.toLowerCase().includes(clubName.toLowerCase()) ||
        clubName.toLowerCase().includes(mapping.entity_name.toLowerCase())
      ).filter((m: LogoMappingData) => m.id !== exactMatch?.id) : []

      console.log("🔍 Partial matches:", partialMatches)

      // 6. Test logo URL if we have an exact match
      let logoUrlTest = null
      if (exactMatch?.logo_url) {
        logoUrlTest = {
          url: exactMatch.logo_url,
          status: 'loading' as const
        }

        try {
          const testResponse = await fetch(exactMatch.logo_url, { method: 'HEAD' })
          logoUrlTest.status = testResponse.ok ? 'success' : 'error'
          if (!testResponse.ok) {
            logoUrlTest.error = `HTTP ${testResponse.status}: ${testResponse.statusText}`
          }
        } catch (error) {
          logoUrlTest.status = 'error'
          logoUrlTest.error = error instanceof Error ? error.message : 'Unknown error'
        }
      }

      // 7. Test smart matching API
      let smartMatchResult = null
      if (clubName) {
        try {
          const smartResponse = await fetch(`/api/logo-mappings/by-entity/club/${encodeURIComponent(clubName)}`)
          smartMatchResult = await smartResponse.json()
        } catch (error) {
          smartMatchResult = { error: error instanceof Error ? error.message : 'Smart match failed' }
        }
      }

      setResult({
        athleteData: everest,
        logoMappings: obxMappings,
        exactMatch,
        partialMatches,
        logoUrlTest,
        smartMatchResult
      })

    } catch (error) {
      console.error("❌ Diagnostic failed:", error)
      setResult({
        athleteData: null,
        logoMappings: [],
        exactMatch: null,
        partialMatches: [],
        logoUrlTest: null,
        smartMatchResult: { error: error instanceof Error ? error.message : 'Unknown error' }
      })
    } finally {
      setLoading(false)
    }
  }

  const testImageLoad = (url: string) => {
    setTestImageUrl(url)
    setImageTestResult('loading')
  }

  const handleImageLoad = () => {
    setImageTestResult('success')
  }

  const handleImageError = () => {
    setImageTestResult('error')
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-red-600">🔍 OBX Wrestling Factory Logo Debug</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Diagnostic Tool</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={runDiagnostic} disabled={loading} className="w-full">
            {loading ? "Running Diagnostic..." : "🚀 Run OBX Logo Diagnostic"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6">
          {/* Step 1: Athlete Data */}
          <Card>
            <CardHeader>
              <CardTitle>📋 Step 1: Everest Ouellette's Data</CardTitle>
            </CardHeader>
            <CardContent>
              {result.athleteData ? (
                <div className="space-y-2">
                  <p><strong>Name:</strong> {result.athleteData.name}</p>
                  <p><strong>ID:</strong> {result.athleteData.id}</p>
                  <p><strong>wrestling_club:</strong> {result.athleteData.wrestling_club || "❌ NULL"}</p>
                  <p><strong>wrestlingclub:</strong> {result.athleteData.wrestlingclub || "❌ NULL"}</p>
                  <p><strong>club:</strong> {result.athleteData.club || "❌ NULL"}</p>
                  <p><strong>wrestlingClub:</strong> {result.athleteData.wrestlingClub || "❌ NULL"}</p>
                  
                  <div className="mt-4 p-3 bg-blue-50 rounded">
                    <strong>🎯 Active Club Name:</strong> {
                      result.athleteData.wrestling_club || 
                      result.athleteData.wrestlingclub || 
                      result.athleteData.club || 
                      result.athleteData.wrestlingClub || 
                      "❌ NO CLUB NAME FOUND"
                    }
                  </div>
                </div>
              ) : (
                <p className="text-red-600">❌ Everest Ouellette not found in database</p>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Logo Mappings */}
          <Card>
            <CardHeader>
              <CardTitle>🏢 Step 2: OBX-Related Logo Mappings</CardTitle>
            </CardHeader>
            <CardContent>
              {result.logoMappings.length > 0 ? (
                <div className="space-y-4">
                  {result.logoMappings.map((mapping) => (
                    <div key={mapping.id} className="border rounded p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p><strong>Entity Name:</strong> {mapping.entity_name}</p>
                          <p><strong>Logo URL:</strong> {mapping.logo_url}</p>
                          {mapping.aliases && <p><strong>Aliases:</strong> {mapping.aliases}</p>}
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => testImageLoad(mapping.logo_url)}
                          variant="outline"
                        >
                          Test Image
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-red-600">❌ No OBX-related logo mappings found</p>
              )}
            </CardContent>
          </Card>

          {/* Step 3: Exact Match */}
          <Card>
            <CardHeader>
              <CardTitle>🎯 Step 3: Exact Match Result</CardTitle>
            </CardHeader>
            <CardContent>
              {result.exactMatch ? (
                <div className="space-y-2 p-3 bg-green-50 rounded">
                  <p><strong>✅ EXACT MATCH FOUND!</strong></p>
                  <p><strong>Entity Name:</strong> {result.exactMatch.entity_name}</p>
                  <p><strong>Logo URL:</strong> {result.exactMatch.logo_url}</p>
                  {result.exactMatch.aliases && <p><strong>Aliases:</strong> {result.exactMatch.aliases}</p>}
                  
                  {result.logoUrlTest && (
                    <div className="mt-3">
                      <Badge variant={result.logoUrlTest.status === 'success' ? 'default' : 'destructive'}>
                        URL Test: {result.logoUrlTest.status}
                      </Badge>
                      {result.logoUrlTest.error && (
                        <p className="text-red-600 text-sm mt-1">Error: {result.logoUrlTest.error}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-red-50 rounded">
                  <p className="text-red-600"><strong>❌ NO EXACT MATCH FOUND</strong></p>
                  <p className="text-sm mt-2">This means the club name in Everest's record doesn't exactly match any entity_name in logo_mappings table.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 4: Partial Matches */}
          <Card>
            <CardHeader>
              <CardTitle>🔍 Step 4: Partial Matches</CardTitle>
            </CardHeader>
            <CardContent>
              {result.partialMatches.length > 0 ? (
                <div className="space-y-2">
                  {result.partialMatches.map((match) => (
                    <div key={match.id} className="border rounded p-2">
                      <p><strong>Entity:</strong> {match.entity_name}</p>
                      <p><strong>URL:</strong> {match.logo_url}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No partial matches found</p>
              )}
            </CardContent>
          </Card>

          {/* Step 5: Smart Match API Test */}
          <Card>
            <CardHeader>
              <CardTitle>🤖 Step 5: Smart Match API Result</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(result.smartMatchResult, null, 2)}
              </pre>
            </CardContent>
          </Card>

          {/* Image Test Section */}
          {testImageUrl && (
            <Card>
              <CardHeader>
                <CardTitle>🖼️ Image Load Test</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3"><strong>Testing URL:</strong> {testImageUrl}</p>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 border rounded flex items-center justify-center">
                    {imageTestResult === 'loading' && <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>}
                    {imageTestResult === 'success' && <span className="text-green-600">✅</span>}
                    {imageTestResult === 'error' && <span className="text-red-600">❌</span>}
                    
                    <Image
                      src={testImageUrl || "/placeholder.svg"}
                      alt="Logo test"
                      width={64}
                      height={64}
                      className="object-contain"
                      onLoad={handleImageLoad}
                      onError={handleImageError}
                      style={{ display: 'none' }}
                    />
                  </div>
                  
                  <div>
                    <Badge variant={
                      imageTestResult === 'success' ? 'default' : 
                      imageTestResult === 'error' ? 'destructive' : 
                      'secondary'
                    }>
                      {imageTestResult === 'loading' ? 'Testing...' : 
                       imageTestResult === 'success' ? 'Image Loads Successfully' :
                       imageTestResult === 'error' ? 'Image Failed to Load' : 'Not Tested'}
                    </Badge>
                  </div>
                </div>
                
                {imageTestResult === 'success' && (
                  <div className="mt-4">
                    <p className="text-green-600 font-medium">✅ Image loads successfully!</p>
                    <Image
                      src={testImageUrl || "/placeholder.svg"}
                      alt="Logo preview"
                      width={100}
                      height={100}
                      className="object-contain border rounded mt-2"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
