"use client"
import { useState } from "react"
import Link from "next/link"

interface BulletproofFlipCardProps {
  athlete: {
    id: string
    name: string
    college?: string
    highSchool?: string
    high_school?: string
    division?: string
    weightClass?: string
    weight_class?: string
    graduationYear?: number
    graduation_year?: number
    commitmentDate?: string
    commitment_date?: string
    photoUrl?: string
    image_url?: string
    wrestlingClub?: string
    wrestling_club?: string
    club?: string
  }
}

export function BulletproofFlipCard({ athlete }: BulletproofFlipCardProps) {
  const [showBack, setShowBack] = useState(false)

  const handleFlip = () => {
    console.log("Flip button clicked, current state:", showBack)
    setShowBack(!showBack)
    console.log("New state will be:", !showBack)
  }

  // Clean data
  const name = athlete.name || "Unknown"
  const college = athlete.college || "Uncommitted"
  const highSchool = athlete.highSchool || athlete.high_school || "Unknown High School"
  const division = athlete.division || ""
  const weightClass = athlete.weightClass || athlete.weight_class || "Unknown"
  const graduationYear = athlete.graduationYear || athlete.graduation_year || 2024
  const wrestlingClub = athlete.wrestlingClub || athlete.wrestling_club || athlete.club || ""
  const imageUrl = athlete.photoUrl || athlete.image_url || "/wrestler-silhouette.png"

  return (
    <div className="w-full max-w-sm mx-auto">
      {!showBack ? (
        // FRONT OF CARD
        <div className="bg-white rounded-lg shadow-lg overflow-hidden h-96 relative">
          <img
            src={imageUrl || "/placeholder.svg"}
            alt={name}
            className="w-full h-48 object-cover"
            onError={(e) => {
              e.currentTarget.src = "/wrestler-silhouette.png"
            }}
          />

          <div className="absolute top-4 right-4">
            <button
              onClick={handleFlip}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
              type="button"
            >
              FLIP
            </button>
          </div>

          <div className="p-4">
            <h3 className="text-xl font-bold mb-2">{name}</h3>
            <p className="text-gray-600 mb-2">{highSchool}</p>
            <p className="text-lg font-semibold text-blue-600">{college}</p>
            <p className="text-sm text-gray-500">Class of {graduationYear}</p>
          </div>
        </div>
      ) : (
        // BACK OF CARD
        <div className="bg-white rounded-lg shadow-lg overflow-hidden h-96 p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">{name}</h3>
            <button
              onClick={handleFlip}
              className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
              type="button"
            >
              BACK
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-700">College</h4>
              <p className="text-lg">{college}</p>
              {division && <p className="text-sm text-gray-600">{division}</p>}
            </div>

            <div>
              <h4 className="font-semibold text-gray-700">High School</h4>
              <p>{highSchool}</p>
            </div>

            {wrestlingClub && (
              <div>
                <h4 className="font-semibold text-gray-700">Wrestling Club</h4>
                <p>{wrestlingClub}</p>
              </div>
            )}

            <div>
              <h4 className="font-semibold text-gray-700">Weight Class</h4>
              <p>{weightClass} lbs</p>
            </div>

            <div className="bg-yellow-100 p-2 rounded text-xs">
              <p>
                <strong>ID:</strong> {athlete.id}
              </p>
              <p>
                <strong>URL:</strong> /athletes/{athlete.id}
              </p>
            </div>

            <div className="space-y-2 mt-4">
              <Link
                href={`/athletes/${athlete.id}`}
                className="block w-full bg-blue-600 text-white text-center py-2 rounded hover:bg-blue-700"
              >
                View Profile (Link)
              </Link>

              <button
                onClick={() => {
                  console.log("Navigation button clicked")
                  window.location.href = `/athletes/${athlete.id}`
                }}
                className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
                type="button"
              >
                View Profile (Button)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
