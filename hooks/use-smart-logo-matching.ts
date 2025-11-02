"use client"

import { useState, useEffect } from "react"

interface LogoMatchInfo {
  confidence: number
  matchType: "exact" | "fuzzy" | "alias" | "fallback"
  originalQuery: string
  matchedName: string
}

interface UseSmartLogoMatchingResult {
  logoUrl: string | null
  isLoading: boolean
  error: string | null
  matchInfo: LogoMatchInfo | null
}

export function useSmartLogoMatching(
  entityName: string | null | undefined,
  entityType: "club" | "highschool" | "college",
): UseSmartLogoMatchingResult {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [matchInfo, setMatchInfo] = useState<LogoMatchInfo | null>(null)

  useEffect(() => {
    if (!entityName || entityName.trim() === "" || entityName === "Unknown" || entityName === "Uncommitted") {
      setLogoUrl(null)
      setIsLoading(false)
      setError(null)
      setMatchInfo(null)
      return
    }

    const fetchLogo = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/logo-mappings/smart-match", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            entityName: entityName.trim(),
            entityType,
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        if (data.success && data.logoUrl) {
          setLogoUrl(data.logoUrl)
          setMatchInfo(data.matchInfo || null)
        } else {
          setLogoUrl(null)
          setError(data.error || "No logo found")
        }
      } catch (err) {
        console.error("Error fetching smart logo:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch logo")
        setLogoUrl(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLogo()
  }, [entityName, entityType])

  return {
    logoUrl,
    isLoading,
    error,
    matchInfo,
  }
}
