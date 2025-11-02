"use client"

import { useState, useEffect } from "react"
import { ProductionCommitmentCard } from "@/components/production-commitment-card"
import { CommitmentCard } from "@/components/commitment-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function CardComparison() {
  const [athletes, setAthletes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewCards, setShowNewCards] = useState(true)

  useEffect(() => {
    loadAthletes()
  }, [])

  const loadAthletes = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/athletes")
      const data = await response.json()

      // Get first 6 athletes for comparison
      const testAthletes = (data.athletes || []).slice(0, 6)
      setAthletes(testAthletes)
    } catch (error) {
      console.error("Error loading athletes:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading card comparison...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Card Design Comparison</h1>
              <p className="text-gray-600 mt-1">Compare new production cards with existing cards</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowNewCards(true)} variant={showNewCards ? "default" : "outline"}>
                New Cards
              </Button>
              <Button onClick={() => setShowNewCards(false)} variant={!showNewCards ? "default" : "outline"}>
                Current Cards
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Info */}
      <div className="container mx-auto px-4 py-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={showNewCards ? "default" : "secondary"}>
                  {showNewCards ? "New Production Cards" : "Current Cards"}
                </Badge>
                <span className="text-sm text-gray-600">Showing {athletes.length} athletes</span>
              </div>
              <Button onClick={loadAthletes} variant="outline" size="sm">
                Refresh Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards Grid */}
      <div className="container mx-auto px-4 pb-8">
        {athletes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {athletes.map((athlete) => (
              <div key={athlete.id} className="flex justify-center">
                {showNewCards ? <ProductionCommitmentCard athlete={athlete} /> : <CommitmentCard athlete={athlete} />}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🤼</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Athletes Found</h3>
            <p className="text-gray-500">No athlete data available for comparison.</p>
          </div>
        )}
      </div>

      {/* Comparison Notes */}
      <div className="container mx-auto px-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle>Comparison Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-green-600 mb-2">✅ New Production Cards</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Modern gradient hero section</li>
                  <li>• Better logo loading with fallbacks</li>
                  <li>• Improved loading states</li>
                  <li>• Cleaner typography hierarchy</li>
                  <li>• Better mobile responsiveness</li>
                  <li>• Proper error handling</li>
                  <li>• Division badges with colors</li>
                  <li>• Weight class display</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-600 mb-2">📋 Current Cards</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Existing flip card design</li>
                  <li>• Current logo system</li>
                  <li>• Established styling</li>
                  <li>• Working functionality</li>
                  <li>• User familiarity</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
