"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

interface SimpleLogoTestProps {
  entityType: string
  entityName: string
}

export function SimpleLogoTest({ entityType, entityName }: SimpleLogoTestProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLogo() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/logo-mappings/${entityType}/${encodeURIComponent(entityName)}`)
        const data = await response.json()

        if (data.success && data.logo_url) {
          setLogoUrl(data.logo_url)
        } else {
          setError("No logo found")
        }
      } catch (err) {
        setError("Failed to fetch logo")
      } finally {
        setLoading(false)
      }
    }

    fetchLogo()
  }, [entityType, entityName])

  if (loading) {
    return <div className="w-8 h-8 bg-gray-200 animate-pulse rounded"></div>
  }

  if (error) {
    return <div className="text-red-500 text-sm">{error}</div>
  }

  return (
    <div className="flex items-center space-x-2">
      {logoUrl && (
        <Image
          src={logoUrl || "/placeholder.svg"}
          alt={`${entityName} logo`}
          width={32}
          height={32}
          className="object-contain"
        />
      )}
      <span>{entityName}</span>
    </div>
  )
}
