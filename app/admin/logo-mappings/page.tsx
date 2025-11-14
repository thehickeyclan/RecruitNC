"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import { Button } from "@/components/ui/button"

type LogoMapping = {
  id: string
  entity_name: string
  entity_type: string
  logo_url: string
  created_at: string
}

export default function LogoMappingsAdmin() {
  const [logoMappings, setLogoMappings] = useState<LogoMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string>("all")

  // Form state
  const [newEntityName, setNewEntityName] = useState("")
  const [newEntityType, setNewEntityType] = useState("highschool")
  const [newLogoUrl, setNewLogoUrl] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchLogoMappings()
  }, [selectedType])

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    if (!newEntityName || !newEntityType || !newLogoUrl) {
      setFormError("All fields are required")
      return
    }

    try {
      const { data, error } = await supabase
        .from("logo_mappings")
        .upsert(
          {
            entity_name: newEntityName,
            entity_type: newEntityType,
            logo_url: newLogoUrl,
          },
          {
            onConflict: "entity_name,entity_type",
          },
        )
        .select()

      if (error) {
        throw error
      }

      setFormSuccess("Logo mapping added successfully!")
      setNewEntityName("")
      setNewLogoUrl("")
      fetchLogoMappings()
    } catch (err) {
      console.error("Error adding logo mapping:", err)
      setFormError(err instanceof Error ? err.message : "An unknown error occurred")
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase.from("logo_mappings").delete().eq("id", id)

      if (error) {
        throw error
      }

      fetchLogoMappings()
    } catch (err) {
      console.error("Error deleting logo mapping:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Logo Mappings Admin</h1>

      {/* Add new logo mapping form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Add New Logo Mapping</h2>

        {formError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{formError}</div>
        )}

        {formSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {formSuccess}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Entity Name:</label>
            <input
              type="text"
              value={newEntityName}
              onChange={(e) => setNewEntityName(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g. Cardinal Gibbons"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Entity Type:</label>
            <select
              value={newEntityType}
              onChange={(e) => setNewEntityType(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="highschool">High School</option>
              <option value="college">College</option>
              <option value="club">Wrestling Club</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Logo URL:</label>
            <input
              type="text"
              value={newLogoUrl}
              onChange={(e) => setNewLogoUrl(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="https://example.com/logo.png"
            />
          </div>

          <Button type="submit">Add Logo Mapping</Button>
        </form>
      </div>

      {/* Filter */}
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

      {/* Logo mappings list */}
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
                <div className="bg-gray-100 p-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold">{mapping.entity_name}</h3>
                    <p className="text-sm text-gray-600">Type: {mapping.entity_type}</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(mapping.id)}>
                    Delete
                  </Button>
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
