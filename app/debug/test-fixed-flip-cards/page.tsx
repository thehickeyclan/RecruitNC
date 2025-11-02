"use client"

import { useState, useEffect } from "react"
import { FixedProductionFlipCard } from "@/components/fixed-production-flip-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestFixedFlipCards() {
  const [athletes, setAthletes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    loadAthletes()
  }, [])

  const loadAthletes = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("Starting to load athletes...")

      const response = await fetch("/api/athletes")
      console.log("Response status:", response.status)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Raw API response:", data)

      setDebugInfo({
        responseKeys: Object.keys(data),
        athletesCount: data.athletes?.length || 0,
        firstAthlete: data.athletes?.[0] || null,
      })

      // Get first 6 athletes for testing
      const testAthletes = (data.athletes || []).slice(0, 6)
      console.log("Test athletes:", testAthletes)
      setAthletes(testAthletes)
    } catch (error) {
      console.error("Error loading athletes:", error)
      setError(error instanceof Error ? error.message : "Failed to load athletes")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-gray-900">Fixed Flip Cards with Working Logos</h1>
            <p className="text-gray-600 mt-1">Proper flip card design with working data fetching</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading athletes data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-gray-900">Fixed Flip Cards with Working Logos</h1>
            <p className="text-gray-600 mt-1">Proper flip card design with working data fetching</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-red-600">Error Loading Athletes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={loadAthletes}>Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Fixed Flip Cards with Working Logos</h1>
              <p className="text-gray-600 mt-1">Proper flip card design with working data fetching</p>
            </div>
            <Button onClick={loadAthletes} variant="outline">
              Refresh Data
            </Button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="container mx-auto px-4 py-4">
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">💡 Instructions:</span>
              <span>Click on any card to flip it and see more details. The logos should load properly now!</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debug Info */}
      {debugInfo && (
        <div className="container mx-auto px-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2">
                <p>
                  <strong>Response Keys:</strong> {debugInfo.responseKeys.join(", ")}
                </p>
                <p>
                  <strong>Athletes Count:</strong> {debugInfo.athletesCount}
                </p>
                <p>
                  <strong>Athletes Array Length:</strong> {athletes.length}
                </p>
                {debugInfo.firstAthlete && (
                  <div>
                    <p>
                      <strong>First Athlete:</strong>
                    </p>
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                      {JSON.stringify(debugInfo.firstAthlete, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cards Grid */}
      <div className="container mx-auto px-4 pb-8">
        {athletes.length > 0 ? (
          <>
            <p className="text-center mb-6 text-gray-600">Showing {athletes.length} athletes</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {athletes.map((athlete, index) => (
                <div key={athlete.id || index} className="flex justify-center">
                  <div className="w-full max-w-sm">
                    <FixedProductionFlipCard athlete={athlete} />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🤼</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Athletes Found</h3>
            <p className="text-gray-500">No athlete data available to display.</p>
            <Button onClick={loadAthletes} className="mt-4">
              Try Loading Again
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
