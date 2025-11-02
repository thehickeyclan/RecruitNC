"use client"
import { useState } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FlipVerticalIcon, Trophy } from "lucide-react"
import { normalizeAthlete } from "@/lib/professional-athlete"

interface SimpleAthleteCardProps {
  athlete: {
    id: string | number
    name: string
    highschool?: string
    college?: string
    division?: string
    graduationyear?: number
    weightclass?: string
    photoUrl?: string
    achievements?: string[]
  }
}

export function SimpleWorkingCard(props: any) {
  const candidate = props?.athlete ?? props?.data ?? props
  const athlete = normalizeAthlete(candidate)

  const [isFlipped, setIsFlipped] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  // Use a working image or fallback
  const imageUrl = imageError ? "/wrestler-silhouette.png" : athlete.photoUrl || "/wrestler-silhouette.png"

  return (
    <div className="relative h-[500px] w-full perspective-1000">
      <div
        className={`relative h-full w-full transition-transform duration-700 transform-style-preserve-3d ${
          isFlipped ? "rotate-y-180" : ""
        }`}
      >
        {/* Front of card */}
        <div className="absolute inset-0 backface-hidden">
          <Card className="h-full overflow-hidden">
            {/* Image section */}
            <div className="relative h-[300px] bg-gray-100">
              <Image
                src={imageUrl || "/placeholder.svg"}
                alt={athlete.name}
                fill
                className="object-cover"
                onError={() => setImageError(true)}
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

            {/* Flip button */}
            <button
              onClick={handleFlip}
              className="absolute bottom-4 right-4 bg-white rounded-full p-2 shadow-md hover:shadow-lg transition-shadow"
            >
              <FlipVerticalIcon className="h-4 w-4" />
            </button>
          </Card>
        </div>

        {/* Back of card */}
        <div className="absolute inset-0 backface-hidden rotate-y-180">
          <Card className="h-full">
            <CardContent className="p-6 h-full flex flex-col">
              <h3 className="text-lg font-bold mb-4">{athlete.name}</h3>

              <div className="mb-4">
                <h4 className="font-semibold mb-2">Commitment Details</h4>
                <p className="text-sm">{athlete.college || "College"}</p>
                <p className="text-sm text-gray-600">{athlete.division || "Division"}</p>
              </div>

              {athlete.achievements && athlete.achievements.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Achievements</h4>
                  <ul className="space-y-1">
                    {athlete.achievements.slice(0, 3).map((achievement, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <Trophy className="h-3 w-3 text-amber-500" />
                        {achievement}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={handleFlip}
                className="absolute bottom-4 right-4 bg-white rounded-full p-2 shadow-md hover:shadow-lg transition-shadow"
              >
                <FlipVerticalIcon className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default SimpleWorkingCard
