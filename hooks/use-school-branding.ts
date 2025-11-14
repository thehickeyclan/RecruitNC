"use client"

import { useEffect, useState } from "react"

interface SchoolBranding {
  id: string
  name: string
  logo_url: string | null
  banner_url: string | null
  primary_color: string | null
  secondary_color: string | null
}

export function useSchoolBranding(schoolId: string | undefined | null) {
  const [branding, setBranding] = useState<SchoolBranding | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!schoolId) {
      setIsLoading(false)
      return
    }

    const fetchBranding = async () => {
      try {
        const response = await fetch(`/api/schools/${schoolId}/branding`)
        if (response.ok) {
          const data = await response.json()
          setBranding(data.school)
        }
      } catch (error) {
        console.error("[v0] Error fetching school branding:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBranding()
  }, [schoolId])

  return { branding, isLoading }
}
