"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import type { Athlete } from "@/types/athlete"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertCircle, Clock } from 'lucide-react'

export function CommitmentGrid({ division }: { division?: string | null }) {
const [athletes, setAthletes] = useState<Athlete[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)
const [isRateLimited, setIsRateLimited] = useState(false)
const [retryAfter, setRetryAfter] = useState(0)
const searchParams = useSearchParams()
const router = useRouter()

// Function to fetch athletes with retry capability
const fetchAthletes = async (retryCount = 0) => {
  setLoading(true)
  setError(null)
  setIsRateLimited(false)

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

    // Add division filter if it exists (either from props or URL)
    const divisionFilter = division || searchParams.get("division")
    if (divisionFilter && divisionFilter !== "all") {
      params.set("division", divisionFilter)
    }

    // Add timestamp to prevent caching
    params.set("_t", Date.now().toString())

    // Append params to URL if any exist
    if (params.toString()) {
      url += `?${params.toString()}`
    }

    console.log("Fetching athletes from:", url)

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    })

    // Handle rate limiting specifically
    if (response.status === 429) {
      console.log("Rate limited by API")
      setIsRateLimited(true)

      // Get retry-after header if available
      const retryAfterHeader = response.headers.get("retry-after")
      const waitTime = retryAfterHeader ? Number.parseInt(retryAfterHeader) : 30
      setRetryAfter(waitTime)

      throw new Error("Too many requests. Please wait a moment and try again.")
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API error (${response.status}):`, errorText)
      throw new Error(`Server error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    // Check if the response is an error object
    if (data && data.error) {
      throw new Error(data.error)
    }

    console.log(`Fetched ${data.length} athletes successfully`)
    setAthletes(Array.isArray(data) ? data : [])
  } catch (error) {
    console.error("Error fetching athletes:", error)

    // Don't retry if rate limited
    if (isRateLimited) {
      setError(`Rate limit exceeded. Please wait a moment before trying again.`)
      return
    }

    // If we haven't retried too many times, try again with exponential backoff
    if (retryCount < 2) {
      console.log(`Retrying (${retryCount + 1}/2) after ${Math.pow(2, retryCount) * 1000}ms...`)
      setTimeout(() => fetchAthletes(retryCount + 1), Math.pow(2, retryCount) * 1000)
      return
    }

    setError(`Failed to load athletes: ${error instanceof Error ? error.message : "Unknown error"}`)
  } finally {
    setLoading(false)
  }
}

useEffect(() => {
  fetchAthletes()
}, [searchParams, division])

// For testing - add some mock data if needed
const addMockData = () => {
  const mockAthletes = [
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
    },
  ]
  setAthletes(mockAthletes as any)
  setError(null)
  setLoading(false)
}

if (loading) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="h-[450px]">
          <CardContent className="p-0 h-full">
            <div className="animate-pulse flex flex-col h-full">
              <div className="bg-gray-200 h-64 w-full"></div>
              <div className="p-4 space-y-4 flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

if (isRateLimited) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
      <Clock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-amber-800">Rate Limit Exceeded</h3>
      <p className="mt-2 text-amber-700">
        We've received too many requests. Please wait a moment before trying again.
      </p>
      <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          variant="outline"
          onClick={() => fetchAthletes()}
          className="flex items-center gap-2 bg-white text-amber-700 border-amber-300 hover:bg-amber-50"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
        <Button
          variant="outline"
          onClick={addMockData}
          className="bg-white text-blue-700 border-blue-300 hover:bg-blue-50"
        >
          Show Sample Data
        </Button>
      </div>
    </div>
  )
}

if (error) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
      <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-red-800">Error Loading Athletes</h3>
      <p className="mt-2 text-red-700">{error}</p>
      <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
        <Button variant="outline" onClick={() => fetchAthletes()} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/")}
          className="bg-white text-red-700 border-red-300 hover:bg-red-50"
        >
          Return to Home
        </Button>
        <Button
          variant="outline"
          onClick={addMockData}
          className="bg-white text-blue-700 border-blue-300 hover:bg-blue-50"
        >
          Show Sample Data
        </Button>
      </div>
    </div>
  )
}

if (athletes.length === 0) {
  return (
    <div className="text-center py-10 border rounded-lg">
      <h3 className="text-xl font-medium">No athletes found</h3>
      <p className="text-gray-500 mt-2">Try adjusting your search or filters</p>
      <Button variant="outline" onClick={() => router.push("/athletes")} className="mt-4">
        Clear Filters
      </Button>
    </div>
  )
}

return (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {athletes.map((athlete) => (
      <div key={athlete.id} className="h-full">
        <ProfessionalCommitmentCard athlete={athlete as any} />
      </div>
    ))}
  </div>
)
}
