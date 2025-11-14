"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { DivisionPill } from "./division-pill"
import type { Athlete } from "@/types/athlete"

export function CommitmentTable() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()

  // Ensure athletes is always an array
  const safeAthletes = Array.isArray(athletes) ? athletes : []

  useEffect(() => {
    async function fetchAthletes() {
      setLoading(true)
      try {
        // Get the year filter from URL params
        const yearFilter = searchParams.get("year")

        // Build the API URL with filters
        let url = "/api/athletes"
        const params = new URLSearchParams()

        // Add search query if it exists
        const query = searchParams.get("query")
        if (query) {
          params.set("query", query)
        }

        // Add year filter if it exists
        if (yearFilter && yearFilter !== "all") {
          params.set("year", yearFilter)
        }

        // Add any other filters
        const division = searchParams.get("division")
        if (division) {
          params.set("division", division)
        }

        // Append params to URL if any exist
        if (params.toString()) {
          url += `?${params.toString()}`
        }

        const response = await fetch(url)
        if (!response.ok) {
          throw new Error("Failed to fetch athletes")
        }
        const data = await response.json()

        // Ensure data is an array before setting
        if (Array.isArray(data)) {
          setAthletes(data)
        } else {
          console.error("API returned non-array data:", data)
          setAthletes([])
        }
      } catch (error) {
        console.error("Error fetching athletes:", error)
        setAthletes([]) // Ensure it's always an array on error
      } finally {
        setLoading(false)
      }
    }

    fetchAthletes()
  }, [searchParams])

  if (loading) {
    return (
      <div className="rounded-md border">
        <div className="h-24 bg-gray-100 animate-pulse" />
      </div>
    )
  }

  if (safeAthletes.length === 0 && !loading) {
    return (
      <div className="text-center py-10">
        <h3 className="text-xl font-medium">No athletes found</h3>
        <p className="text-gray-500 mt-2">Try adjusting your search or filters</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <div className="relative w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
              <th className="h-12 px-4 text-left align-middle font-medium">Name</th>
              <th className="h-12 px-4 text-left align-middle font-medium">High School</th>
              <th className="h-12 px-4 text-left align-middle font-medium">College</th>
              <th className="h-12 px-4 text-left align-middle font-medium">Division</th>
              <th className="h-12 px-4 text-left align-middle font-medium">Graduation Year</th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {safeAthletes.map((athlete) => (
              <tr
                key={athlete.id}
                className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
              >
                <td className="p-4 align-middle">
                  <Link href={`/athletes/${athlete.id}`} className="font-medium text-blue-600 hover:underline">
                    {athlete.name}
                  </Link>
                </td>
                <td className="p-4 align-middle">{athlete.highschool || athlete.highSchool}</td>
                <td className="p-4 align-middle">{athlete.college}</td>
                <td className="p-4 align-middle">
                  <DivisionPill division={athlete.division} />
                </td>
                <td className="p-4 align-middle">{athlete.graduationyear || athlete.graduationYear}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
