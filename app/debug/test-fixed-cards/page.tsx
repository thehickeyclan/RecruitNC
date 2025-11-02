"use client"

import { useEffect, useState } from "react"
import { FixedCommitmentCard } from "@/components/fixed-commitment-card"

export default function TestFixedCards() {
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAthletes() {
      try {
        const response = await fetch("/api/athletes?limit=6")
        const data = await response.json()
        setAthletes(data.athletes || [])
      } catch (error) {
        console.error("Error fetching athletes:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAthletes()
  }, [])

  if (loading) {
    return <div className="container mx-auto p-8">Loading...</div>
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Fixed Commitment Cards Test</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {athletes.map((athlete) => (
          <FixedCommitmentCard key={athlete.id} athlete={athlete} />
        ))}
      </div>
    </div>
  )
}
