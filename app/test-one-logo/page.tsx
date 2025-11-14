"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

export default function TestOneLogo() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLogo() {
      try {
        console.log("🔍 Fetching UNC Chapel Hill logo...")
        const response = await fetch("/api/logo-mappings/college/UNC%20Chapel%20Hill")
        console.log("📡 Response status:", response.status)

        if (response.ok) {
          const data = await response.json()
          console.log("📡 Response data:", data)

          if (data.success && data.logo_url) {
            console.log("✅ Got logo URL:", data.logo_url)
            setLogoUrl(data.logo_url)
          } else {
            setError("No logo found in response")
          }
        } else {
          setError(`HTTP ${response.status}`)
        }
      } catch (err) {
        console.error("❌ Error:", err)
        setError("Failed to fetch")
      } finally {
        setLoading(false)
      }
    }

    fetchLogo()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test One Logo: UNC Chapel Hill</h1>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      {logoUrl && (
        <div>
          <p className="mb-2">✅ Logo URL: {logoUrl}</p>
          <Image
            src={logoUrl || "/placeholder.svg"}
            alt="UNC Chapel Hill logo"
            width={64}
            height={64}
            className="border"
          />
        </div>
      )}

      {!loading && !logoUrl && (
        <div>
          <p className="mb-2">❌ No logo found, using fallback:</p>
          <Image
            src="/UNC_Chapel_Hill_Logo.png"
            alt="UNC Chapel Hill fallback logo"
            width={64}
            height={64}
            className="border"
          />
        </div>
      )}
    </div>
  )
}
