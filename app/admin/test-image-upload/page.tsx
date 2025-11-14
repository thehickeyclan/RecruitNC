"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import AthleteImageUpload from "@/components/athlete-image-upload"
import { createClient } from "@/lib/supabase/client"

export default function TestImageUploadPage() {
  const [athletes, setAthletes] = useState<any[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAthletes = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.from("athletes").select("id, name, photourl").order("name").limit(10)

        if (error) throw error
        setAthletes(data || [])
        if (data && data.length > 0) {
          setSelectedAthlete(data[0])
        }
      } catch (error) {
        console.error("Error fetching athletes:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAthletes()
  }, [])

  const refreshAthlete = async () => {
    if (!selectedAthlete) return

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("athletes")
        .select("id, name, photourl")
        .eq("id", selectedAthlete.id)
        .single()

      if (error) throw error
      if (data) {
        setSelectedAthlete(data)
      }
    } catch (error) {
      console.error("Error refreshing athlete:", error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Test Image Upload</h1>

      <div className="mb-6">
        <label htmlFor="athlete-select" className="block text-sm font-medium mb-2">
          Select Athlete
        </label>
        <select
          id="athlete-select"
          className="w-full p-2 border rounded"
          value={selectedAthlete?.id || ""}
          onChange={(e) => {
            const selected = athletes.find((a) => a.id === e.target.value)
            setSelectedAthlete(selected || null)
          }}
        >
          {athletes.map((athlete) => (
            <option key={athlete.id} value={athlete.id}>
              {athlete.name}
            </option>
          ))}
        </select>
      </div>

      {selectedAthlete && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Upload Image for {selectedAthlete.name}</h2>
            <Button onClick={refreshAthlete} variant="outline" size="sm">
              Refresh
            </Button>
          </div>

          <div className="bg-gray-50 p-4 rounded-md mb-4">
            <p className="text-sm font-medium">Current Image URL:</p>
            <p className="text-sm break-all bg-gray-100 p-2 rounded">{selectedAthlete.photourl || "No image set"}</p>
          </div>

          <AthleteImageUpload
            athleteId={selectedAthlete.id}
            athleteName={selectedAthlete.name}
            currentPhotoUrl={selectedAthlete.photourl}
          />
        </div>
      )}

      <div className="mt-8 bg-blue-50 border border-blue-200 p-4 rounded-md">
        <h3 className="font-semibold text-blue-800 mb-2">Debug Information</h3>
        <p className="text-sm text-blue-700">
          This page allows you to test the image upload functionality. Select an athlete from the dropdown and upload an
          image. The image will be uploaded to Vercel Blob and the athlete's record will be updated with the new image
          URL.
        </p>
        <p className="text-sm text-blue-700 mt-2">
          Use the Refresh button to check if the athlete's record was updated correctly.
        </p>
      </div>
    </div>
  )
}
