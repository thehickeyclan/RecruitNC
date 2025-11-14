"use client"

import { useState, useEffect } from "react"
import { AlertCircle } from "lucide-react"
import { ProfessionalCommitmentCard } from "./professional-commitment-card"

// Static sample data to prevent loading flickers
const SAMPLE_ATHLETES = [
  {
    id: "1",
    name: "John Doe",
    graduationyear: 2025,
    highschool: "Central High",
    college: "State University",
    division: "NCAA D1",
    commitmentdate: "2023-05-15",
    achievements: ["State Champion", "All-American"],
    imageurl: "/wrestler-silhouette.png",
    weightClass: "157 lbs",
  },
  {
    id: "2",
    name: "Jane Smith",
    graduationyear: 2026,
    highschool: "Western High",
    college: "Tech University",
    division: "NCAA D2",
    commitmentdate: "2023-06-20",
    achievements: ["Regional Champion"],
    imageurl: "/wrestler-silhouette.png",
    weightClass: "133 lbs",
  },
  {
    id: "3",
    name: "Mike Johnson",
    graduationyear: 2025,
    highschool: "Eastern High",
    college: "University College",
    division: "NCAA D1",
    commitmentdate: "2023-04-10",
    achievements: ["National Qualifier"],
    imageurl: "/wrestler-silhouette.png",
    weightClass: "184 lbs",
  },
  {
    id: "4",
    name: "Sarah Williams",
    graduationyear: 2026,
    highschool: "Northern High",
    college: "State College",
    division: "NCAA D3",
    commitmentdate: "2023-07-05",
    achievements: ["Conference Champion"],
    imageurl: "/wrestler-silhouette.png",
    weightClass: "125 lbs",
  },
  {
    id: "5",
    name: "David Brown",
    graduationyear: 2025,
    highschool: "Southern High",
    college: "Tech State",
    division: "NAIA",
    commitmentdate: "2023-03-22",
    achievements: ["State Runner-up"],
    imageurl: "/wrestler-silhouette.png",
    weightClass: "197 lbs",
  },
  {
    id: "6",
    name: "Emily Davis",
    graduationyear: 2026,
    highschool: "Western Academy",
    college: "University Tech",
    division: "NCAA D2",
    commitmentdate: "2023-08-15",
    achievements: ["Regional Finalist"],
    imageurl: "/wrestler-silhouette.png",
    weightClass: "141 lbs",
  },
]

export function StableAthletesList() {
  // Start with sample data to prevent loading flicker
  const [athletes, setAthletes] = useState(SAMPLE_ATHLETES)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<"sample" | "api">("sample")

  // Only try to load real data after initial render
  useEffect(() => {
    let isMounted = true

    const fetchRealData = async () => {
      try {
        setLoading(true)

        // Add a delay to ensure UI is stable before fetching
        await new Promise((resolve) => setTimeout(resolve, 500))

        const response = await fetch("/api/athletes", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch athletes: ${response.status}`)
        }

        const data = await response.json()

        // Only update state if component is still mounted
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            setAthletes(data)
            setDataSource("api")
          }
          setError(null)
        }
      } catch (err) {
        console.error("Error fetching athletes:", err)
        if (isMounted) {
          setError("Could not load live data. Showing sample athletes instead.")
          // Keep using sample data on error
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchRealData()

    return () => {
      isMounted = false
    }
  }, [])

  if (error) {
    return (
      <div>
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <p className="text-amber-800 text-sm">{error}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {athletes.map((athlete) => (
            <div key={athlete.id} className="h-full">
              <ProfessionalCommitmentCard athlete={athlete} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {athletes.map((athlete) => (
        <div key={athlete.id} className="h-full">
          <ProfessionalCommitmentCard athlete={athlete} />
          {dataSource === "sample" && <div className="mt-1 text-xs text-gray-500 text-center">Sample data</div>}
        </div>
      ))}
    </div>
  )
}
