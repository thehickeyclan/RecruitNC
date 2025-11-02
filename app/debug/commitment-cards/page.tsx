"use client"

import { useState, useEffect } from "react"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { supabase } from "@/lib/supabase"
import { normalizeAthleteList } from "@/lib/professional-athlete"
import type { Athlete } from "@/types/athlete"

export default function CommitmentCardsDebugPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAthletes() {
      try {
        setLoading(true)
        // First try to get Liam Hickey and Hayden Litten specifically
        const { data: specificAthletes, error: specificError } = await supabase
          .from("athletes")
          .select("*")
          .or("name.ilike.%Liam Hickey%,name.ilike.%Hayden Litten%")
          .limit(10)

        if (specificError) {
          throw specificError
        }

        if (specificAthletes && specificAthletes.length > 0) {
          setAthletes(specificAthletes)
        } else {
          // If we couldn't find those specific athletes, get any athletes
          const { data, error } = await supabase.from("athletes").select("*").order("name").limit(10)

          if (error) {
            throw error
          }

          setAthletes(data || [])
        }
      } catch (err) {
        console.error("Error fetching athletes:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")

        setAthletes([
          {
            id: "1",
            name: "Hayden Litten",
            high_school: "McDowell High School",
            college: "Appalachian State",
            division: "NCAA D1",
            weight_class: "157",
            graduation_year: 2024,
            commitment_date: "2023-11-15",
            image_url: "/wrestler-profile.png",
            commitmentPhotoUrl: "/wrestler-profile.png",
            achievements: ["State Champion 2023", "All-American 2022", "Regional Champion"],
            club: "NC United Wrestling",
            ncUnitedTeam: "Blue",
            instagram: "hayden_wrestler",
            gender: "Male",
          },
          {
            id: "2",
            name: "Liam Hickey",
            high_school: "Cardinal Gibbons",
            college: "UNC Chapel Hill",
            division: "NCAA D1",
            weight_class: "165",
            graduation_year: 2024,
            commitment_date: "2023-10-20",
            image_url: "/diverse-wrestlers.png",
            commitmentPhotoUrl: "/diverse-wrestlers.png",
            achievements: ["State Runner-up 2023", "Conference Champion", "100+ Career Wins"],
            club: "Team Cary Wrestling",
            ncUnitedTeam: "Gold",
            instagram: "liam_wrestler",
            gender: "Male",
          },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchAthletes()
  }, [])

  const normalizedAthletes = normalizeAthleteList(athletes as any)

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Commitment Cards Debug</h1>

      {loading ? (
        <p>Loading athletes...</p>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">Error: {error}</div>
      ) : (
        <div>
          <p className="mb-4">Found {normalizedAthletes.length} athletes</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {normalizedAthletes.map((athlete, index) => (
              <div key={athlete.id} className="h-[500px]">
                <ProfessionalCommitmentCard athlete={athlete} forceRender={true} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
