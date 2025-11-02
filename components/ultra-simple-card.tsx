"use client"
import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthlete } from "@/lib/professional-athlete"

interface UltraSimpleCardProps {
  athlete: {
    id: string | number
    name: string
    highschool?: string
    college?: string
    division?: string
    graduationyear?: number
    weightclass?: string
    photoUrl?: string
  }
}

export function UltraSimpleCard(props: any) {
  const candidate = props?.athlete ?? props?.data ?? props
  const athlete = normalizeAthlete(candidate)

  const [imageSrc, setImageSrc] = useState<string>("/wrestler-silhouette.png")
  const [imageLoaded, setImageLoaded] = useState(false)
  const [loadAttempts, setLoadAttempts] = useState(0)

  // List of fallback images to try
  const fallbackImages = ["/wrestler-silhouette.png", "/diverse-wrestlers.png", "/wrestler-profile.png"]

  useEffect(() => {
    console.log(`Initial image source for ${athlete.name}:`, athlete.photoUrl || "none")

    // Try the athlete's photo URL first if it exists
    if (athlete.photoUrl) {
      setImageSrc(athlete.photoUrl)
    } else {
      console.log(`No photoUrl for ${athlete.name}, using fallback`)
      setImageSrc(fallbackImages[0])
    }
  }, [athlete])

  const handleImageError = () => {
    console.error(`Image failed to load for ${athlete.name}:`, imageSrc)

    // Try the next fallback image
    const nextAttempt = loadAttempts + 1
    setLoadAttempts(nextAttempt)

    if (nextAttempt < fallbackImages.length) {
      console.log(`Trying fallback image ${nextAttempt} for ${athlete.name}:`, fallbackImages[nextAttempt])
      setImageSrc(fallbackImages[nextAttempt])
    } else {
      // If all fallbacks fail, use a placeholder
      console.log(`All fallbacks failed for ${athlete.name}, using placeholder`)
      setImageSrc(`/placeholder.svg?height=300&width=300&text=${encodeURIComponent(athlete.name)}`)
    }
  }

  const handleImageLoad = () => {
    console.log(`Image loaded successfully for ${athlete.name}:`, imageSrc)
    setImageLoaded(true)
  }

  return (
    <ProfessionalCommitmentCard athlete={athlete}>
      <Card className="overflow-hidden">
        {/* Debug info */}
        <div className="bg-blue-100 p-2 text-xs">
          <p>Image path: {imageSrc}</p>
          <p>Status: {imageLoaded ? "Loaded" : "Loading..."}</p>
          <p>Attempts: {loadAttempts}</p>
        </div>

        {/* Image section */}
        <div className="relative h-[300px] bg-gray-100">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
              <p className="text-gray-500">Loading image...</p>
            </div>
          )}

          <Image
            src={imageSrc || "/placeholder.svg"}
            alt={athlete.name}
            fill
            className="object-cover"
            onError={handleImageError}
            onLoad={handleImageLoad}
            priority
          />
        </div>

        {/* Content section */}
        <CardContent className="p-4">
          <h3 className="text-lg font-bold mb-2">{athlete.name}</h3>
          <p className="text-sm text-gray-600 mb-1">{athlete.highschool || "High School"}</p>
          <p className="text-sm text-gray-600 mb-2">{athlete.college || "College"}</p>

          <div className="flex flex-wrap gap-2">
            {athlete.division && <Badge variant="secondary">{athlete.division}</Badge>}
            {athlete.graduationyear && <Badge variant="outline">Class of {athlete.graduationyear}</Badge>}
            {athlete.weightclass && <Badge variant="outline">{athlete.weightclass} lbs</Badge>}
          </div>
        </CardContent>
      </Card>
    </ProfessionalCommitmentCard>
  )
}

export default UltraSimpleCard
