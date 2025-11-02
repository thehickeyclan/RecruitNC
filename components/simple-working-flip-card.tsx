"use client"
import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { FlipVerticalIcon as Flip } from "lucide-react"

interface SimpleWorkingFlipCardProps {
  athlete: {
    id: string
    name: string
    firstName?: string
    lastName?: string
    highschool?: string
    highSchool?: string
    college?: string
    division?: string
    weightclass?: string
    weightClass?: string
    graduationyear?: number
    graduationYear?: number
    commitmentdate?: string
    commitmentDate?: string
    photourl?: string
    photoUrl?: string
    commitmentPhotoUrl?: string
    achievements?: string[]
    bio?: string
    gender?: string
    weight?: number
    highSchoolLogoUrl?: string
    wrestlingClub?: string
    wrestlingclub?: string
    club?: string
    wrestlingClubLogoUrl?: string
    ncUnitedTeam?: string
    collegeLogoUrl?: string
    careerRecord?: string
    rankings?: any
    location?: string
    socialMedia?: any
    contactEmail?: string
    featured?: boolean
    instagram?: string
    wrestling_club?: string
    nc_united_team?: string
    graduation_year?: number
    weight_class?: string | number
    high_school?: string
    image_url?: string
    photo_url?: string
    commitment_date?: string
    college_division?: string
    social_media?: any
  }
}

export function SimpleWorkingFlipCard({ athlete }: SimpleWorkingFlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Simplified data mapping with null checks
  const data = {
    graduationYear: athlete.graduationYear || athlete.graduationyear || athlete.graduation_year || 2024,
    weightClass: athlete.weightClass || athlete.weightclass || athlete.weight_class || "Unknown",
    college: athlete.college || "",
    highSchool: athlete.highSchool || athlete.highschool || athlete.high_school || "",
    wrestlingClub: athlete.wrestlingClub || athlete.wrestlingclub || athlete.wrestling_club || athlete.club || "",
    division: athlete.division || athlete.college_division || "",
    imageUrl: athlete.photoUrl || athlete.photourl || athlete.image_url || athlete.photo_url || "",
    commitmentDate: athlete.commitmentDate || athlete.commitmentdate || athlete.commitment_date || "",
    instagram:
      athlete.instagram ||
      (athlete.socialMedia && athlete.socialMedia.instagram) ||
      (athlete.social_media && athlete.social_media.instagram) ||
      "",
  }

  const getAthleteImage = () => {
    if (imageError || !data.imageUrl) {
      return "/wrestler-silhouette.png"
    }
    return data.imageUrl
  }

  const formatCommitmentDate = (dateString: string) => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return dateString
    }
  }

  // Test navigation function
  const testNavigation = () => {
    const url = `/athletes/${athlete.id}`
    console.log("Testing navigation to:", url)
    console.log("Athlete object:", athlete)
    console.log("Athlete ID:", athlete.id)

    // Try multiple navigation methods
    try {
      // Method 1: window.location
      window.location.href = url
    } catch (error) {
      console.error("Navigation failed:", error)
      // Method 2: window.open as fallback
      try {
        window.open(url, "_self")
      } catch (fallbackError) {
        console.error("Fallback navigation also failed:", fallbackError)
        alert(`Navigation failed. URL was: ${url}`)
      }
    }
  }

  const handleAlertTest = () => {
    const url = `/athletes/${athlete.id}`
    console.log("Alert test button clicked")
    console.log("Athlete:", athlete)
    console.log("URL:", url)

    const confirmed = confirm(`Navigate to: ${url}?\n\nAthlete: ${athlete.name}\nID: ${athlete.id}`)
    if (confirmed) {
      window.location.href = url
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Simple Card without complex 3D transforms */}
      {!isFlipped ? (
        // Front of card
        <div className="relative h-[600px]">
          <Image
            src={getAthleteImage() || "/placeholder.svg"}
            alt={athlete.name || "Athlete"}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

          {/* Flip button */}
          <button
            onClick={() => setIsFlipped(true)}
            className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30 transition-all duration-200 border border-white/20"
            type="button"
          >
            <Flip className="w-6 h-6 text-white" />
          </button>

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
            <h1 className="text-4xl font-black uppercase tracking-wide mb-2 leading-none">
              {athlete.name || "Unknown Athlete"}
            </h1>
            {data.highSchool && <p className="text-lg font-medium mb-4 opacity-90">{data.highSchool}</p>}
            {data.college && (
              <h2 className="text-3xl font-black uppercase tracking-wider mb-2 leading-none">{data.college}</h2>
            )}
            <div className="mb-6">
              <span className="inline-block bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-lg uppercase tracking-wide">
                COMMITTED
              </span>
            </div>
          </div>
        </div>
      ) : (
        // Back of card
        <div className="h-[600px] p-6 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{athlete.name || "Unknown Athlete"}</h3>
              <p className="text-gray-600">Class of {data.graduationYear}</p>
            </div>
            <button
              onClick={() => setIsFlipped(false)}
              className="bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full p-2 transition-colors"
              type="button"
            >
              <Flip className="w-5 h-5" />
            </button>
          </div>

          {/* College info */}
          {data.college && (
            <div className="mb-6">
              <h4 className="text-lg font-bold text-gray-900 mb-3">College Commitment</h4>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xl font-bold text-gray-900">{data.college}</p>
                {data.division && <p className="text-gray-600">{data.division}</p>}
                <p className="text-sm text-gray-500">Weight Class: {data.weightClass} lbs</p>
                {data.commitmentDate && (
                  <p className="text-sm text-gray-500">Committed: {formatCommitmentDate(data.commitmentDate)}</p>
                )}
              </div>
            </div>
          )}

          {/* High School info */}
          {data.highSchool && (
            <div className="mb-6">
              <h4 className="text-lg font-bold text-gray-900 mb-3">High School</h4>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-semibold text-gray-900">{data.highSchool}</p>
              </div>
            </div>
          )}

          {/* Wrestling Club */}
          {data.wrestlingClub && data.wrestlingClub.trim() !== "" && (
            <div className="mb-6">
              <h4 className="text-lg font-bold text-gray-900 mb-3">Wrestling Club</h4>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-semibold text-gray-900">{data.wrestlingClub}</p>
              </div>
            </div>
          )}

          {/* Debug info */}
          <div className="mb-4 p-3 bg-yellow-100 rounded text-sm">
            <p>
              <strong>Debug Info:</strong>
            </p>
            <p>ID: {athlete.id || "No ID"}</p>
            <p>URL: /athletes/{athlete.id || "no-id"}</p>
            <p>Name: {athlete.name || "No name"}</p>
          </div>

          {/* Buttons - Multiple methods */}
          <div className="mt-auto space-y-3">
            {/* Method 1: Next.js Link */}
            <Link
              href={`/athletes/${athlete.id}`}
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors text-center no-underline"
            >
              Next.js Link Button
            </Link>

            {/* Method 2: Regular anchor */}
            <a
              href={`/athletes/${athlete.id}`}
              className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors text-center no-underline"
            >
              Regular Anchor Tag
            </a>

            {/* Method 3: Button with JavaScript navigation */}
            <button
              onClick={testNavigation}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              type="button"
            >
              JavaScript Navigation
            </button>

            {/* Method 4: Simple test button */}
            <button
              onClick={handleAlertTest}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              type="button"
            >
              Test Button with Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
