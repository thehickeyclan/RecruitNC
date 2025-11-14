"use client"

import type React from "react"
import { EntityLogo } from "@/components/entity-logo"

import type { Athlete } from "@/types/athlete"
import { PublicProfileLogos } from "@/components/public-profile-logos"

interface AthletePageClientProps {
  athlete: Athlete
}

const AthletePageClient: React.FC<AthletePageClientProps> = ({ athlete }) => {
  const commitmentDate = athlete.commitment_date || athlete.commitmentdate || athlete.commitmentDate

  const highSchool = athlete.high_school || athlete.highschool || athlete.HighSchool
  const club =
    athlete.club || athlete.wrestlingclub || athlete.wrestlingClub || athlete.wrestling_club || "Not specified"

  const isNCUnitedBlue =
    (athlete as any)?.nc_united_blue === true ||
    (athlete as any)?.ncUnitedBlue === true ||
    String(club || "")
      .toLowerCase()
      .includes("nc united blue") ||
    ["team", "program", "affiliation"]
      .map((k) => String((athlete as any)?.[k] || "").toLowerCase())
      .some((t) => t.includes("nc united blue"))

  return (
    <div className="space-y-4">
      <PublicProfileLogos athlete={athlete} className="mb-4" />
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <EntityLogo category="highschool" name={highSchool} size="sm" className="w-8 h-8" />
          <p className="text-lg text-gray-700">{highSchool}</p>

          {club && club !== "Not specified" && (
            <>
              <span className="text-gray-300">•</span>
              <div className="flex items-center gap-2">
                <EntityLogo category="club" name={club} size="sm" className="w-6 h-6" />
                <span className="text-sm text-gray-700">{club}</span>
              </div>
            </>
          )}

          {isNCUnitedBlue && (
            <>
              <span className="text-gray-300">•</span>
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                {"NC United Blue"}
              </span>
            </>
          )}
        </div>
        {/* existing content continues */}
        <a
          href={`/athletes/${athlete.id}/edit-request`}
          className="bg-[#B31B1B] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#981B1B] transition-colors"
        >
          Request Edit
        </a>
      </div>
    </div>
  )
}

export default AthletePageClient
