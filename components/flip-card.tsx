"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import type { Athlete } from "@/types/athlete"
import { EntityLogo } from "@/components/entity-logo"
import { DivisionLogo } from "@/components/division-logo"
import { FlipVerticalIcon as Flip } from "lucide-react"

interface FlipCardProps {
  athlete: Athlete
}

export function FlipCard({ athlete }: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Get athlete data with fallbacks
  const athleteName = athlete.name || "Unknown Athlete"
  const highSchool = athlete.highschool || athlete.high_school || "Not specified"
  const wrestlingClub = athlete.wrestlingclub || athlete.wrestling_club || athlete.club || "Not specified"
  const weightClass = athlete.weightclass || athlete.weight_class || "Not specified"
  const graduationYear = athlete.graduationyear || athlete.graduation_year || 2025

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsFlipped(!isFlipped)
  }

  return (
    <div className="flip-card-container" style={{ perspective: "1000px", height: "500px" }}>
      <div
        className={`flip-card-inner ${isFlipped ? "flipped" : ""}`}
        style={{
          position: "relative",
          width: "100%",
          height: "500px",
          textAlign: "center",
          transition: "transform 0.6s",
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front of Card */}
        <div
          className="flip-card-front"
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            backfaceVisibility: "hidden",
            borderRadius: "12px",
            overflow: "hidden",
            cursor: "pointer",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
          }}
          onClick={handleFlip}
        >
          <div className="relative h-48 bg-gray-100">
            <img
              src={imageError ? "/wrestler-silhouette.png" : athlete.photourl || "/wrestler-silhouette.png"}
              alt={athleteName}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              onError={() => setImageError(true)}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
              <h3 className="text-white font-bold text-lg">{athleteName}</h3>
              <p className="text-white/90 text-sm">Class of {graduationYear}</p>
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <EntityLogo entityType="college" entityName={athlete.college || ""} size={32} />
              <div className="text-left">
                <p className="font-medium">{athlete.college}</p>
                <p className="text-xs text-gray-500">
                  Committed {athlete.commitmentdate ? new Date(athlete.commitmentdate).toLocaleDateString() : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <EntityLogo entityType="highschool" entityName={highSchool} size={32} />
              <div className="text-left">
                <p className="font-medium">{highSchool}</p>
                <p className="text-xs text-gray-500">{weightClass} Weight Class</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <EntityLogo entityType="wrestlingClub" entityName={wrestlingClub} size={32} />
              <div className="text-left">
                <p className="font-medium">{wrestlingClub}</p>
                <p className="text-xs text-gray-500">Wrestling Club</p>
              </div>
            </div>

            {/* Flip icon button */}
            <button
              onClick={handleFlip}
              className="absolute bottom-3 right-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full p-1.5 transition-colors"
              aria-label="Flip card to see more details"
            >
              <Flip className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Back of card */}
        <div
          className="flip-card-back"
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            backfaceVisibility: "hidden",
            borderRadius: "12px",
            overflow: "hidden",
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">{athleteName}</h3>
              <DivisionLogo division={divisionToShow} size={40} />
            </div>

            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700">College Commitment:</p>
              <p className="font-medium">{athlete.college}</p>
              <p className="text-xs text-gray-500">{divisionToShow || "—"}</p>
            </div>

            {athlete.achievements && athlete.achievements.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700">Achievements:</p>
                <ul className="text-sm list-disc pl-5 text-left">
                  {athlete.achievements.slice(0, 3).map((achievement, index) => (
                    <li key={index}>{achievement}</li>
                  ))}
                  {athlete.achievements.length > 3 && (
                    <li className="text-blue-600">+{athlete.achievements.length - 3} more</li>
                  )}
                </ul>
              </div>
            )}

            {athlete.bio && (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700">Bio:</p>
                <p className="text-sm text-gray-600 line-clamp-3 text-left">{athlete.bio}</p>
              </div>
            )}

            <div className="mt-auto">
              <Link
                href={`/athletes/${athlete.id}`}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center block mb-3"
              >
                View Full Profile & Match Data
              </Link>

              <div className="flex justify-between items-center">
                <div className="relative z-10">
                  <img src="https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/CqLaWvzmjRuOdctL8VovY-NC%20United.png" alt="North Carolina" style={{ height: "32px", width: "auto" }} />
                </div>

                {/* Flip back icon button */}
                <button
                  onClick={handleFlip}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full p-1.5 transition-colors relative z-10"
                  aria-label="Flip card back"
                >
                  <Flip className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
