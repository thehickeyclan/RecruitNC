"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { ProfessionalCommitmentCard } from "./professional-commitment-card"
import { normalizeAthlete } from "@/lib/professional-athlete"

interface Athlete {
  id: string
  name: string
  graduation_year?: number
  graduationyear?: number
  weight_class?: string
  weightclass?: string
  high_school?: string
  highschool?: string
  college: string
  image_url?: string
  photourl?: string
  achievements: string[]
  created_at: string
}

async function getRecentCommitments(): Promise<Athlete[]> {
  try {
    const { data, error } = await supabase
      .from("athletes")
      .select(`
        id,
        name,
        graduation_year,
        graduationyear,
        weight_class,
        weightclass,
        high_school,
        highschool,
        college,
        image_url,
        photourl,
        achievements,
        created_at
      `)
      .not("college", "is", null)
      .not("college", "eq", "")
      .order("created_at", { ascending: false })
      .limit(8)

    if (error) {
      console.error("Recent commitments error:", error)
      return []
    }

    return (data || []).map((athlete) => ({
      ...athlete,
      id: athlete.id?.toString() || "",
      graduation_year: athlete.graduation_year || athlete.graduationyear,
      weight_class: athlete.weight_class || athlete.weightclass,
      high_school: athlete.high_school || athlete.highschool,
      image_url: athlete.image_url || athlete.photourl,
      achievements: Array.isArray(athlete.achievements)
        ? athlete.achievements
        : typeof athlete.achievements === "string"
          ? athlete.achievements
              .split(",")
              .map((a) => a.trim())
              .filter(Boolean)
          : [],
    }))
  } catch (error) {
    console.error("Recent commitments fetch error:", error)
    return []
  }
}

export function CommitmentsSection() {
  const [commitments, setCommitments] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCommitments = async () => {
      const data = await getRecentCommitments()
      setCommitments(data)
      setLoading(false)
    }

    fetchCommitments()
  }, [])

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Loading recent commitments...</p>
      </div>
    )
  }

  if (!commitments || commitments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No recent commitments available.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {commitments.map((athlete) => (
        <ProfessionalCommitmentCard key={athlete.id} athlete={normalizeAthlete(athlete)} />
      ))}
    </div>
  )
}
