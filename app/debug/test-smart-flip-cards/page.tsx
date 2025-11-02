"use client"

import { useState, useEffect } from "react"
import { SmartFlipCard } from "@/components/smart-flip-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function TestSmartFlipCards() {
  const [athletes, setAthletes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showMatchInfo, setShowMatchInfo] = useState(true)

  useEffect(() => {
    const fetchAthletes = async () => {
      try {
        const response = await fetch("/api/athletes?limit=6")
        const data = await response.json()
        if (data.success) {
          setAthletes(data.athletes)
        }
      } catch (error) {
        console.error("Failed to fetch athletes:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAthletes()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading athletes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>🃏 Smart Flip Cards Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Switch id="show-match-info" checked={showMatchInfo} onCheckedChange={setShowMatchInfo} />
            <Label htmlFor="show-match-info">Show match confidence scores</Label>
          </div>
          <p className="text-sm text-gray-600">
            Click on any card to flip it and see the club logo on the back. The logos are matched using smart AI
            matching with confidence scores.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {athletes.map((athlete) => (
          <SmartFlipCard key={athlete.id} athlete={athlete} showMatchInfo={showMatchInfo} />
        ))}
      </div>

      {athletes.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No athletes found to display.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
