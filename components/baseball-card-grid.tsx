"use client"

import { useEffect, useState } from "react"
import { BaseballCardStyle } from "./baseball-card-style"
import type { Athlete } from "@/types/athlete"

export function BaseballCardGrid() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAthletes() {
      try {
        const response = await fetch("/api/athletes")
        if (response.ok) {
          const data = await response.json()
          setAthletes(data.slice(0, 12)) // Show first 12 athletes
        }
      } catch (error) {
        console.error("Error fetching athletes:", error)
        // Use sample data if API fails
        setAthletes([
          {
            id: "1",
            name: "Liam Hickey",
            highschool: "Cardinal Gibbons High School",
            college: "UNC Chapel Hill",
            graduationyear: "2025",
            weightclass: "165",
            division: "NCAA DI",
            achievements: ["State Champion", "Regional Champion", "All-Conference", "Team Captain"],
            photoUrl: "/wrestler-liam-hickey.png",
          },
          {
            id: "2",
            name: "Colt Campbell",
            highschool: "Cary High School",
            college: "NC State",
            graduationyear: "2025",
            weightclass: "174",
            division: "NCAA DI",
            achievements: ["State Qualifier", "Conference Champion", "Team MVP"],
            photoUrl: "/wrestler-Colt-Campbell.png",
          },
          {
            id: "3",
            name: "Lorenzo Alston",
            highschool: "Hough High School",
            college: "Appalachian State",
            graduationyear: "2025",
            weightclass: "157",
            division: "NCAA DI",
            achievements: ["Regional Champion", "State Qualifier", "All-Conference"],
            photoUrl: "/wrestler-lorenzo-alston.png",
          },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchAthletes()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-[600px] bg-gray-200 animate-pulse rounded-xl"></div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {athletes.map((athlete) => (
        <BaseballCardStyle key={athlete.id} athlete={athlete} />
      ))}
    </div>
  )
}
