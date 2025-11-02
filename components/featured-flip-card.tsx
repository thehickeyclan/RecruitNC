"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import type { Athlete } from "@/types/athlete"
import { EntityLogo } from "@/components/entity-logo"
import { DivisionLogo } from "@/components/division-logo"
import { FileUp as Flip, ArrowRight } from "lucide-react"

interface FeaturedFlipCardProps {
  athlete: Athlete
  onAnimationComplete?: () => void
}

export function FeaturedFlipCard({ athlete, onAnimationComplete }: FeaturedFlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    const hasSeenAnimation = localStorage.getItem("hasSeenCardFlipAnimation") === "true"
    if (hasSeenAnimation) {
      setHasAnimated(true)
      return
    }

    const glowTimeout = setTimeout(() => {
      if (cardRef.current) {
        cardRef.current.classList.add("card-glow")
      }
    }, 2500)

    const flipTimeout = setTimeout(() => {
      setIsFlipped(true)
    }, 3000)

    const flipBackTimeout = setTimeout(() => {
      setIsFlipped(false)
      setShowTooltip(true)
      setHasAnimated(true)
      localStorage.setItem("hasSeenCardFlipAnimation", "true")
      if (onAnimationComplete) onAnimationComplete()
    }, 6000)

    const hideTooltipTimeout = setTimeout(() => {
      setShowTooltip(false)
    }, 10000)

    return () => {
      clearTimeout(glowTimeout)
      clearTimeout(flipTimeout)
      clearTimeout(flipBackTimeout)
      clearTimeout(hideTooltipTimeout)
    }
  }, [onAnimationComplete, isMounted])

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isMounted) return

    if (!hasAnimated) {
      setIsFlipped(!isFlipped)
      setHasAnimated(true)
      setShowTooltip(true)
      localStorage.setItem("hasSeenCardFlipAnimation", "true")
      if (onAnimationComplete) onAnimationComplete()

      setTimeout(() => {
        setShowTooltip(false)
      }, 4000)
      return
    }

    setIsFlipped(!isFlipped)
  }

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isMounted) return

    setIsFlipped(false)
    setHasAnimated(true)
    setShowTooltip(false)
    localStorage.setItem("hasSeenCardFlipAnimation", "true")
    if (onAnimationComplete) onAnimationComplete()
  }

  if (!isMounted) {
    return null
  }

  return (
    <div className="relative perspective-1000 w-full h-full">
      {!hasAnimated && (
        <button
          onClick={handleSkip}
          className="absolute top-2 right-2 z-50 bg-white/80 text-gray-600 rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-gray-200"
          aria-label="Skip animation"
        >
          ×
        </button>
      )}

      {showTooltip && (
        <div className="absolute -bottom-16 right-4 bg-black/80 text-white px-3 py-1.5 rounded-lg text-sm z-40 whitespace-nowrap">
          Use flip icon to see more details
          <div className="absolute -top-5 right-4 text-black/80">
            <ArrowRight className="w-5 h-5 rotate-45" />
          </div>
        </div>
      )}

      <div className="absolute -top-3 -left-3 bg-[#c8102e] text-white px-2 py-0.5 rounded-md text-xs font-medium z-30">
        Featured Athlete
      </div>

      <div
        ref={cardRef}
        className={`relative w-full h-full transition-transform duration-800 transform-style-3d ${
          isFlipped ? "rotate-y-180" : ""
        }`}
        role="region"
        aria-label={`Athlete card for ${athlete.name}`}
      >
        <div
          className={`absolute w-full h-full backface-hidden bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 ${
            !isFlipped ? "z-20" : "z-10"
          }`}
        >
          <div className="relative h-48 bg-gray-100">
            <img
              src={athlete.photourl || "/wrestler-silhouette.png"}
              alt={athlete.name}
              className="w-full h-full object-contain"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
              <h3 className="text-white font-bold text-lg">{athlete.name}</h3>
              <p className="text-white/90 text-sm">Class of {athlete.graduationyear}</p>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <EntityLogo entityType="college" entityName={athlete.college || ""} className="w-8 h-8" />
              <div>
                <p className="font-medium">{athlete.college}</p>
                <p className="text-xs text-gray-500">
                  Committed {new Date(athlete.commitmentdate).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <EntityLogo entityType="highschool" entityName={"Uwharrie Charter"} className="w-8 h-8" />
              <div>
                <p className="font-medium">Uwharrie Charter</p>
                <p className="text-xs text-gray-500">{athlete.weightclass} Weight Class</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <EntityLogo entityType="wrestlingClub" entityName={"RAW"} className="w-8 h-8" />
              <div>
                <p className="font-medium">RAW Wrestling</p>
                <p className="text-xs text-gray-500">North Carolina</p>
              </div>
            </div>

            <button
              onClick={handleFlip}
              className="absolute bottom-3 right-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full p-1.5 transition-colors animate-pulse-subtle"
              aria-label="Flip card to see more details"
            >
              <Flip className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          className={`absolute w-full h-full backface-hidden bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 rotate-y-180 ${
            isFlipped ? "z-20" : "z-10"
          }`}
        >
          <div className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">{athlete.name}</h3>
              <DivisionLogo division={athlete.division || ""} className="w-10 h-10" />
            </div>

            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700">College Commitment:</p>
              <p className="font-medium">{athlete.college}</p>
              <p className="text-xs text-gray-500">{athlete.division}</p>
            </div>

            {athlete.achievements && athlete.achievements.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700">Achievements:</p>
                <ul className="text-sm list-disc pl-5">
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
                <p className="text-sm text-gray-600 line-clamp-3">{athlete.bio}</p>
              </div>
            )}

            <div className="mt-auto flex justify-between items-center">
              <div className="relative z-10">
                <img src="/nc-united-blue-logo.png" alt="North Carolina" className="h-8 w-auto" />
              </div>

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
  )
}
