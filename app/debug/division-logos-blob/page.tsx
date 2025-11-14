"use client"

import { useState, useEffect } from "react"
import { NCAADivisionBadge } from "@/components/ncaa-division-badge"
import { createClient } from "@/lib/supabase"
import Image from "next/image"

export default function DivisionLogosDebugPage() {
  const [logoUrls, setLogoUrls] = useState<{ [key: string]: string | null }>({})
  const [loading, setLoading] = useState(true)

  const divisions = [
    "NCAA Division I",
    "NCAA Division II",
    "NCAA Division III",
    "NCAA D1",
    "NCAA D2",
    "NCAA D3",
    "NAIA",
    "JUCO",
  ]

  const sizes = ["sm", "md", "lg"] as const

  // Fetch all logo URLs from the database
  useEffect(() => {
    const fetchLogoUrls = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.from("division_logos").select("name, url")

        if (error) {
          console.error("Error fetching logo URLs:", error)
          setLoading(false)
          return
        }

        const urls: { [key: string]: string } = {}
        data?.forEach((item) => {
          urls[item.name] = item.url
        })

        setLogoUrls(urls)
      } catch (err) {
        console.error("Error in fetchLogoUrls:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchLogoUrls()
  }, [])

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Division Logos Debug (Blob Storage)</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Stored Logo URLs</h2>

        {loading ? (
          <div className="text-center py-4">Loading logo data...</div>
        ) : Object.keys(logoUrls).length === 0 ? (
          <div className="text-center py-4 text-amber-600">
            No logos found in the database. Please upload logos first.
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(logoUrls).map(([name, url]) => (
              <div key={name} className="flex items-center gap-2 border-b pb-2">
                <span className="font-semibold w-32">{name}:</span>
                {url ? (
                  <>
                    <div className="border p-1 bg-gray-50">
                      <Image
                        src={url || "/placeholder.svg"}
                        alt={name}
                        width={60}
                        height={30}
                        className="object-contain"
                      />
                    </div>
                    <span className="text-xs text-gray-500 break-all">{url}</span>
                  </>
                ) : (
                  <span className="text-red-500">No URL found</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Division Badges</h2>

        <div className="space-y-8">
          {sizes.map((size) => (
            <div key={size} className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3">Size: {size}</h3>
              <div className="flex flex-wrap gap-4">
                {divisions.map((division) => (
                  <div key={division} className="flex flex-col items-center">
                    <NCAADivisionBadge division={division} size={size} debug={true} />
                    <span className="text-xs text-gray-500 mt-1">{division}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
