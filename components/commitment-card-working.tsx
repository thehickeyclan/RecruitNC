"use client"

import React, { useState } from "react"
import Link from "next/link"
import { SmartLogo } from "./smart-logo"

interface Athlete {
  id: string
  name: string
  first_name?: string
  last_name?: string
  class_year?: string
  graduation_year?: string
  college?: string
  highschool?: string
  high_school?: string
  wrestlingclub?: string
  wrestling_club?: string
  club?: string
  weight_class?: string
  commitment_date?: string
  division?: string
  image_url?: string
  athlete_image?: string
}

interface CommitmentCardProps {
  athlete: Athlete
}

export function CommitmentCardWorking({ athlete }: CommitmentCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't flip if clicking on the profile link
    const target = e.target as HTMLElement
    if (target.closest('a[href]')) {
      return
    }
    
    e.preventDefault()
    e.stopPropagation()
    setIsFlipped(!isFlipped)
  }

  const handleProfileClick = (e: React.MouseEvent) => {
    // Stop propagation so card doesn't flip when clicking profile link
    e.stopPropagation()
  }

  const athleteName = athlete.name || `${athlete.first_name || ''} ${athlete.last_name || ''}`.trim()
  const classYear = athlete.class_year || athlete.graduation_year
  const highSchool = athlete.highschool || athlete.high_school
  const wrestlingClub = athlete.wrestlingclub || athlete.wrestling_club || athlete.club
  const imageUrl = athlete.image_url || athlete.athlete_image

  return (
    <div className="relative w-80 h-96 perspective-1000 cursor-pointer" onClick={handleCardClick}>
      <div className={`relative w-full h-full transition-transform duration-500 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        
        {/* FRONT OF CARD */}
        <div className="absolute inset-0 w-full h-full backface-hidden bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="relative h-32 bg-gradient-to-br from-blue-600 to-blue-800">
            {imageUrl && (
              <img
                src={imageUrl || "/placeholder.svg"}
                alt={athleteName}
                className="absolute inset-0 w-full h-full object-cover opacity-20"
              />
            )}
            <div className="absolute inset-0 bg-black bg-opacity-20"></div>
            <div className="relative p-4 text-white">
              <h3 className="text-xl font-bold">{athleteName}</h3>
              {classYear && <p className="text-blue-100">Class of {classYear}</p>}
            </div>
            
            {/* Flip Button */}
            <div className="absolute top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-full transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* College Commitment */}
          <div className="p-4">
            <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
              College Commitment
            </h4>
            
            {athlete.college && (
              <div className="flex items-center space-x-3 mb-4">
                <SmartLogo
                  entityName={athlete.college}
                  entityType="college"
                  fallbackSrc="/generic-college-logo.png"
                  alt={`${athlete.college} logo`}
                  width={48}
                  height={48}
                  className="rounded"
                />
                <div>
                  <h5 className="font-bold text-lg text-gray-900">{athlete.college}</h5>
                  {athlete.division && (
                    <p className="text-sm text-gray-600">{athlete.division}</p>
                  )}
                  {athlete.weight_class && (
                    <p className="text-sm text-gray-600">Weight Class: {athlete.weight_class}</p>
                  )}
                  {athlete.commitment_date && (
                    <p className="text-sm text-gray-600">Committed: {athlete.commitment_date}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BACK OF CARD */}
        <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{athleteName}</h3>
                {classYear && <p className="text-gray-600">Class of {classYear}</p>}
              </div>
              
              {/* Back Button */}
              <div className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-full transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </div>
            </div>

            {/* College Commitment */}
            {athlete.college && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  College Commitment
                </h4>
                <div className="flex items-center space-x-3">
                  <SmartLogo
                    entityName={athlete.college}
                    entityType="college"
                    fallbackSrc="/generic-college-logo.png"
                    alt={`${athlete.college} logo`}
                    width={40}
                    height={40}
                    className="rounded"
                  />
                  <div>
                    <h5 className="font-bold text-gray-900">{athlete.college}</h5>
                    {athlete.division && (
                      <p className="text-sm text-gray-600">{athlete.division}</p>
                    )}
                    {athlete.weight_class && (
                      <p className="text-sm text-gray-600">Weight Class: {athlete.weight_class}</p>
                    )}
                    {athlete.commitment_date && (
                      <p className="text-sm text-gray-600">Committed: {athlete.commitment_date}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Athlete Info */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                Athlete Info
              </h4>
              
              {/* High School */}
              {highSchool && (
                <div className="flex items-center space-x-3 mb-3">
                  <SmartLogo
                    entityName={highSchool}
                    entityType="highschool"
                    fallbackSrc="/high-school-logo.png"
                    alt={`${highSchool} logo`}
                    width={32}
                    height={32}
                    className="rounded"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{highSchool}</p>
                    <p className="text-sm text-gray-600">High School</p>
                  </div>
                </div>
              )}

              {/* Wrestling Club */}
              {wrestlingClub && wrestlingClub !== "Unknown" && wrestlingClub !== "" && (
                <div className="flex items-center space-x-3">
                  <SmartLogo
                    entityName={wrestlingClub}
                    entityType="club"
                    fallbackSrc="/wrestling-club-logo.png"
                    alt={`${wrestlingClub} logo`}
                    width={32}
                    height={32}
                    className="rounded"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{wrestlingClub}</p>
                    <p className="text-sm text-gray-600">Wrestling Club</p>
                  </div>
                </div>
              )}
            </div>

            {/* View Profile Link - At Bottom */}
            <div className="mt-auto">
              <Link 
                href={`/athletes/${athlete.id}`}
                onClick={handleProfileClick}
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-3 px-4 rounded-lg font-medium transition-colors"
              >
                View Full Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
