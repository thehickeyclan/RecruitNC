"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import Image from "next/image"

type LogoMapping = {
  id: string
  entity_name: string
  entity_type: string
  logo_url: string
  created_at: string
}

export default function LogoDebugPage() {
  const [logoMappings, setLogoMappings] = useState<LogoMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string>("all")

  useEffect(() => {
    async function fetchLogoMappings() {
      try {
        setLoading(true)
        let query = supabase.from("logo_mappings").select("*")

        if (selectedType !== "all") {
          query = query.eq("entity_type", selectedType)
        }

        const { data, error } = await query.order("entity_type").order("entity_name")

        if (error) {
          throw error
        }

        setLogoMappings(data || [])
      } catch (err) {
        console.error("Error fetching logo mappings:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchLogoMappings()
  }, [selectedType])

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Logo Debug Page</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Filter by type:</label>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Types</option>
          <option value="college">College</option>
          <option value="highschool">High School</option>
          <option value="club">Wrestling Club</option>
        </select>
      </div>

      {loading ? (
        <p>Loading logo mappings...</p>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">Error: {error}</div>
      ) : (
        <div>
          <p className="mb-4">Found {logoMappings.length} logo mappings</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {logoMappings.map((mapping) => (
              <div key={mapping.id} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 p-4">
                  <h3 className="font-bold">{mapping.entity_name}</h3>
                  <p className="text-sm text-gray-600">Type: {mapping.entity_type}</p>
                </div>

                <div className="p-4 flex flex-col items-center">
                  <div className="relative w-40 h-40 bg-white rounded-lg border flex items-center justify-center mb-4">
                    <Image
                      src={mapping.logo_url || "/placeholder.svg"}
                      alt={`Logo for ${mapping.entity_name}`}
                      width={120}
                      height={120}
                      className="object-contain"
                      onError={(e) => {
                        // Show error state on image load failure
                        const target = e.target as HTMLImageElement
                        target.src = "/system-error-screen.png"
                        target.classList.add("border-red-500")
                      }}
                    />
                  </div>

                  <div className="w-full">
                    <p className="text-xs text-gray-500 break-all">{mapping.logo_url}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
