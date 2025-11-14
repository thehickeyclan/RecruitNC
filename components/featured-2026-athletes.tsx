"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { ProfessionalCommitmentCard } from "./professional-commitment-card"
import type { Athlete } from "@/types/athlete"
import { normalizeAthlete } from "@/lib/professional-athlete"

export function FeaturedTwoTwentySixAthletes() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAthletes() {
      try {
        setLoading(true)

        // Get Bentley Sly and Lorenzo Alston specifically
        const { data, error } = await supabase
          .from("athletes")
          .select("*")
          .in("name", ["Bentley Sly", "Lorenzo Alston"])
          .limit(3)

        if (error) {
          throw error
        }

        if (data) {
          setAthletes(data as Athlete[])
        }
      } catch (error) {
        console.error("Error fetching featured athletes:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAthletes()
  }, [])

  if (loading) {
    return <div className="text-center py-8">Loading featured athletes...</div>
  }

  if (athletes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No featured athletes found.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {athletes.map((athlete) => (
        <ProfessionalCommitmentCard key={athlete.id} athlete={normalizeAthlete(athlete)} />
      ))}
      {athletes.length < 3 && (
        <div className="flex items-center justify-center p-6 border border-dashed border-gray-300 rounded-lg">
          <Link href="/athletes" className="text-blue-600 hover:underline">
            View more commitments
          </Link>
        </div>
      )}
    </div>
  )
}
