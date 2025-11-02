"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { getAthletesWithoutImages, updateAthleteImage } from "@/lib/image-update-service"
import { BlobImageUpload } from "@/components/blob-image-upload"

export default function AthleteImagesPage() {
  const [athletes, setAthletes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAthlete, setSelectedAthlete] = useState<any>(null)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    async function loadAthletes() {
      setLoading(true)
      const data = await getAthletesWithoutImages()
      setAthletes(data)
      setLoading(false)
    }

    loadAthletes()
  }, [])

  const handleImageUploaded = async (url: string) => {
    if (!selectedAthlete) return

    try {
      const success = await updateAthleteImage(selectedAthlete.id, url)

      if (success) {
        setSuccessMessage(`Successfully updated image for ${selectedAthlete.name}`)
        // Remove athlete from list
        setAthletes(athletes.filter((a) => a.id !== selectedAthlete.id))
        setSelectedAthlete(null)

        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(""), 3000)
      } else {
        setErrorMessage(`Failed to update image for ${selectedAthlete.name}`)

        // Clear error message after 3 seconds
        setTimeout(() => setErrorMessage(""), 3000)
      }
    } catch (error) {
      console.error("Error updating athlete image:", error)
      setErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Athlete Image Management</h1>

      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{errorMessage}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Athletes Missing Images</h2>

          {loading ? (
            <p>Loading athletes...</p>
          ) : athletes.length === 0 ? (
            <p>No athletes missing images!</p>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <ul className="space-y-2">
                {athletes.map((athlete) => (
                  <li
                    key={athlete.id}
                    className={`p-2 rounded cursor-pointer ${
                      selectedAthlete?.id === athlete.id ? "bg-blue-100" : "hover:bg-gray-100"
                    }`}
                    onClick={() => setSelectedAthlete(athlete)}
                  >
                    <div className="font-medium">{athlete.name}</div>
                    <div className="text-sm text-gray-600">
                      {athlete.highschool} → {athlete.college}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Upload Image</h2>

          {selectedAthlete ? (
            <div>
              <div className="mb-4">
                <h3 className="font-medium">Selected Athlete:</h3>
                <p>
                  {selectedAthlete.name} - {selectedAthlete.highschool} → {selectedAthlete.college}
                </p>
              </div>

              <BlobImageUpload
                onImageUploaded={handleImageUploaded}
                folder="athlete-images"
                buttonText="Upload Commitment Photo"
                className="w-full"
              />

              <div className="mt-4">
                <Button variant="outline" onClick={() => setSelectedAthlete(null)} className="mt-2">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p>Select an athlete from the list to upload their image.</p>
          )}
        </div>
      </div>

      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold mb-4">Instructions</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Select an athlete from the list on the left</li>
          <li>Click "Choose File" to select an image from your computer</li>
          <li>Click "Upload Commitment Photo" to upload the image</li>
          <li>The image will be automatically associated with the selected athlete</li>
          <li>Once uploaded, the athlete will be removed from the list</li>
        </ol>
      </div>
    </div>
  )
}
