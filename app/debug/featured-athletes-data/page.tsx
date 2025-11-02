"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"

export default function FeaturedAthletesDataPage() {
  const [athletes, setAthletes] = useState<any[]>([])
  const [allAthletes, setAllAthletes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch featured athletes
        const featuredResponse = await fetch("/api/featured-athletes-real")
        const featuredData = await featuredResponse.json()
        setAthletes(featuredData.athletes || [])

        // Fetch all athletes to see what we have
        const allResponse = await fetch("/api/athletes")
        const allData = await allResponse.json()
        setAllAthletes(allData.athletes || [])
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Featured Athletes Data Debug</h1>

      <div className="grid gap-8">
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Featured Athletes (Liam, Colt, Xavier)</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">{JSON.stringify(athletes, null, 2)}</pre>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">All Athletes (First 10)</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(allAthletes.slice(0, 10), null, 2)}
          </pre>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Athletes with Images</h2>
          <div className="space-y-2">
            {allAthletes
              .filter((athlete) => athlete.photoUrl || athlete.photourl || athlete.photo_url || athlete.image_url)
              .slice(0, 10)
              .map((athlete, index) => (
                <div key={index} className="p-2 bg-gray-50 rounded">
                  <strong>{athlete.name}</strong> -{" "}
                  {athlete.photoUrl || athlete.photourl || athlete.photo_url || athlete.image_url}
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
