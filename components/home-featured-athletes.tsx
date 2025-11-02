"use client"

import { useState, useEffect } from "react"
import { ProfessionalCommitmentCard } from "./professional-commitment-card"

interface Athlete {
  id: string
  name: string
  graduationyear?: number
  graduationYear?: number
  weightclass?: string
  weightClass?: string
  weight_class?: string
  highschool?: string
  highSchool?: string
  high_school?: string
  wrestlingClub?: string
  wrestlingclub?: string
  wrestling_club?: string
  club?: string
  college?: string
  division?: string
  gender?: string
  commitmentdate?: string
  commitmentDate?: string
  commitment_date?: string
  photourl?: string
  photoUrl?: string
  image_url?: string
  achievements?: string[] | string
  location?: string
  ncUnitedTeam?: string
}

export function HomeFeaturedAthletes() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFeaturedAthletes = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/featured-athletes")

        if (!response.ok) {
          throw new Error("Failed to fetch featured athletes")
        }

        const data = await response.json()

        // Take only the first 4 athletes for the homepage
        const featuredAthletes = data.slice(0, 4)
        setAthletes(featuredAthletes)
        setError(null)
      } catch (err) {
        console.error("Error fetching featured athletes:", err)
        setError("Failed to load featured athletes")

        // Fallback to hardcoded featured athletes if API fails
        const fallbackAthletes: Athlete[] = [
          {
            id: "liam-hickey",
            name: "Liam Hickey",
            graduationyear: 2025,
            weightclass: "165",
            highschool: "Cardinal Gibbons",
            club: "RAW",
            college: "UNC Chapel Hill",
            division: "NCAA D1",
            gender: "Male",
            photoUrl: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/athlete/liam-hickey-1746040496978.png",
            location: "Raleigh, NC",
          },
          {
            id: "colt-campbell",
            name: "Colt Campbell",
            graduationyear: 2025,
            weightclass: "157",
            highschool: "Hough High School",
            club: "Combat",
            college: "Campbell University",
            division: "NCAA D1",
            gender: "Male",
            photoUrl: "/wrestler-Colt-Campbell.png",
            location: "Cornelius, NC",
          },
          {
            id: "anna-ockerman",
            name: "Anna Ockerman",
            graduationyear: 2026,
            weightclass: "120",
            highschool: "Laney High School",
            club: "RAW",
            college: "Appalachian State",
            division: "NCAA D1",
            gender: "Female",
            photoUrl: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/athlete/anna-ockerman-1746893349014.png",
            location: "Wilmington, NC",
          },
          {
            id: "lorenzo-alston",
            name: "Lorenzo Alston",
            graduationyear: 2025,
            weightclass: "174",
            highschool: "Jack Britt High School",
            club: "Darkhorse",
            college: "NC State",
            division: "NCAA D1",
            gender: "Male",
            photoUrl: "/wrestler-lorenzo-alston.png",
            location: "Fayetteville, NC",
          },
        ]
        setAthletes(fallbackAthletes)
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedAthletes()
  }, [])

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-br from-blue-50 to-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Featured Commitments</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Celebrating North Carolina's top wrestling talent and their college commitments
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[500px] bg-gray-200 animate-pulse rounded-xl"></div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (error && athletes.length === 0) {
    return (
      <section className="py-16 bg-gradient-to-br from-blue-50 to-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Featured Commitments</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 bg-gradient-to-br from-blue-50 to-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Featured Commitments</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Celebrating North Carolina's top wrestling talent and their college commitments
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {athletes.map((athlete) => (
            <ProfessionalCommitmentCard key={athlete.id} athlete={athlete} />
          ))}
        </div>

        {athletes.length > 0 && (
          <div className="text-center mt-12">
            <a
              href="/athletes"
              className="inline-flex items-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              View All Athletes
              <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        )}
      </div>
    </section>
  )
}
