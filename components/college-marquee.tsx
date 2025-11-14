"use client"

import { useRef, useState, useEffect } from "react"
import { ClientOnly } from "@/components/client-only"
import Image from "next/image"

// Priority order for college logos
const PRIORITY_COLLEGES = [
  "Appalachian State",
  "NC State",
  "UNC",
  "Gardner Webb",
  "Ohio University",
  "Roanoke",
  "Greensboro",
  "Lander",
  "Montreat",
]

export function CollegeMarquee() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [collegeLogos, setCollegeLogos] = useState<Array<{ name: string; url: string }>>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch all college logos directly from the database
  useEffect(() => {
    const fetchCollegeLogos = async () => {
      setIsLoading(true)
      try {
        // Get all logo mappings for colleges ONLY
        const response = await fetch(`/api/logo-mappings?category=college`)

        if (response.ok) {
          const data = await response.json()

          // Create array with name and url - ensure we only include college logos
          const logos = data
            .filter(
              (mapping: any) => mapping.logo_url && mapping.entity_name && mapping.entity_type === "college", // Explicitly filter for colleges only
            )
            .map((mapping: any) => ({
              name: mapping.entity_name,
              url: mapping.logo_url,
            }))

          // Sort logos based on priority
          logos.sort((a: any, b: any) => {
            const indexA = PRIORITY_COLLEGES.indexOf(a.name)
            const indexB = PRIORITY_COLLEGES.indexOf(b.name)

            // If both are in priority list, sort by priority
            if (indexA >= 0 && indexB >= 0) {
              return indexA - indexB
            }

            // If only a is in priority list, a comes first
            if (indexA >= 0) {
              return -1
            }

            // If only b is in priority list, b comes first
            if (indexB >= 0) {
              return 1
            }

            // If neither is in priority list, sort alphabetically
            return a.name.localeCompare(b.name)
          })

          setCollegeLogos(logos)
        } else {
          console.error("Failed to fetch college logos")
        }
      } catch (error) {
        console.error("Error fetching college logos:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCollegeLogos()
  }, [])

  // If no logos or still loading, show a placeholder
  if (isLoading || collegeLogos.length === 0) {
    return (
      <div className="w-full bg-gray-50 py-8">
        <h2 className="text-center text-xl font-semibold">Colleges with NC Wrestling Commits</h2>
        <div className="flex h-24 items-center justify-center">
          {isLoading ? "Loading logos..." : "No college logos available"}
        </div>
      </div>
    )
  }

  // Duplicate the logos array to ensure continuous scrolling
  const displayLogos = [...collegeLogos, ...collegeLogos]

  return (
    <div className="w-full overflow-hidden bg-gray-50 py-8">
      <h2 className="mb-4 text-center text-2xl font-bold">Colleges with Class of 2025 and 2026 Commits</h2>
      <ClientOnly>
        <div className="relative" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
          <style jsx global>{`
            @keyframes marquee {
              0% {
                transform: translateX(0);
              }
              100% {
                transform: translateX(-50%);
              }
            }
          `}</style>
          <div
            ref={containerRef}
            className="flex items-center gap-12"
            style={{
              animation: isHovered ? "none" : "marquee 60s linear infinite", // Slowed down from 30s to 60s
              width: "fit-content",
            }}
          >
            {displayLogos.map((logo, index) => (
              <div key={index} className="flex-shrink-0">
                <div className="relative h-24 w-36">
                  <Image
                    src={logo.url || "/placeholder.svg"}
                    alt={`${logo.name} logo`}
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </ClientOnly>
    </div>
  )
}
