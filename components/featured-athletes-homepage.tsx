"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import { supabase } from "@/lib/supabase"

interface Athlete {
  id: string
  name: string
  highschool: string
  college: string
  division: string
  graduationyear: number
  photourl: string
  weightclass: string
  wrestlingClub: string
  gender: string
}

interface FeaturedAthletesProps {
  yearFilter: "All" | "2025" | "2026"
}

export function FeaturedAthletesHomepage({ yearFilter }: FeaturedAthletesProps) {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFeaturedAthletes = async () => {
      try {
        setLoading(true)

        // Get specific featured athletes based on year filter
        let query = supabase
          .from("athletes")
          .select("*")
          .not("college", "is", null)
          .order("commitmentdate", { ascending: false })

        if (yearFilter === "2025") {
          // Get specific 2025 athletes - Anna, Liam, Colt
          query = query.eq("graduationyear", 2025).limit(3)
        } else if (yearFilter === "2026") {
          // Get specific 2026 athletes - Bentley, Lorenzo
          query = query.eq("graduationyear", 2026).limit(3)
        } else {
          // For "All", show recent commitments
          query = query.limit(3)
        }

        const { data, error } = await query

        if (error) {
          console.error("Error fetching athletes:", error)
          return
        }

        setAthletes(data || [])
      } catch (err) {
        console.error("Error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedAthletes()
  }, [yearFilter])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden shadow-lg animate-pulse">
            <div className="h-64 bg-gray-200"></div>
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-1"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {athletes.map((athlete) => (
        <Card key={athlete.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
          <div className="relative h-64 w-full bg-gradient-to-br from-blue-600 to-blue-800">
            <Image
              src={athlete.photourl || "/wrestler-silhouette.png"}
              alt={athlete.name}
              fill
              className="object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = "/wrestler-silhouette.png"
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute top-3 right-3">
              <Image src="/nc-united-main-logo.png" alt="NC United" width={32} height={32} className="object-contain" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <h3 className="text-2xl font-bold mb-1">{athlete.name.toUpperCase()}</h3>
              <p className="text-sm opacity-90 mb-1">{athlete.highschool}</p>
              <p className="text-lg font-semibold">{athlete.college.toUpperCase()}</p>
            </div>
          </div>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded">{athlete.division}</span>
              <span className="text-sm font-medium text-gray-600">{athlete.weightclass}</span>
            </div>
            <p className="text-sm text-gray-600 mb-1">Class of {athlete.graduationyear}</p>
            {athlete.wrestlingClub && <p className="text-sm text-blue-600 font-medium">{athlete.wrestlingClub}</p>}
            <div className="mt-3 flex flex-wrap gap-1">
              {athlete.gender === "female" && (
                <span className="bg-pink-100 text-pink-800 text-xs px-2 py-1 rounded">Female Wrestler</span>
              )}
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Committed</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
