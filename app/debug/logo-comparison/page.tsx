"use client"

import { useState, useEffect } from "react"
import { EntityLogo } from "@/components/entity-logo"

export default function LogoComparison() {
  const [liamData, setLiamData] = useState<any>(null)

  useEffect(() => {
    fetch("/api/athletes/liam-hickey")
      .then((res) => res.json())
      .then((data) => setLiamData(data.athlete))
      .catch((err) => console.error(err))
  }, [])

  if (!liamData) return <div>Loading...</div>

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Logo Comparison - Profile vs Card</h1>

      <div className="bg-white p-6 rounded border">
        <h2 className="text-xl font-bold mb-4">Liam's Data</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <strong>College:</strong> "{liamData.college}"
          </div>
          <div>
            <strong>High School:</strong> "{liamData.high_school}"
          </div>
          <div>
            <strong>Club:</strong> "{liamData.club}"
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Profile Page Style */}
        <div className="bg-white p-6 rounded border">
          <h2 className="text-xl font-bold mb-4">Profile Page Style (Working)</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <EntityLogo category="college" name={liamData.college} size="md" className="w-8 h-8" />
              <span>{liamData.college}</span>
            </div>
            <div className="flex items-center gap-3">
              <EntityLogo category="highschool" name={liamData.high_school} size="sm" className="w-6 h-6" />
              <span>{liamData.high_school}</span>
            </div>
            <div className="flex items-center gap-3">
              <EntityLogo category="club" name={liamData.club} size="sm" className="w-6 h-6" />
              <span>{liamData.club}</span>
            </div>
          </div>
        </div>

        {/* Card Style */}
        <div className="bg-white p-6 rounded border">
          <h2 className="text-xl font-bold mb-4">Card Style (Not Working)</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <EntityLogo entityType="college" entityName={liamData.college} size={32} className="w-8 h-8" />
              <span>{liamData.college}</span>
            </div>
            <div className="flex items-center gap-3">
              <EntityLogo entityType="high_school" entityName={liamData.high_school} size={24} className="w-6 h-6" />
              <span>{liamData.high_school}</span>
            </div>
            <div className="flex items-center gap-3">
              <EntityLogo entityType="club" entityName={liamData.club} size={24} className="w-6 h-6" />
              <span>{liamData.club}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Direct API Tests */}
      <div className="bg-white p-6 rounded border">
        <h2 className="text-xl font-bold mb-4">Direct API Tests</h2>
        <div className="space-y-2 text-sm">
          <div>
            <a
              href="/api/logo-mappings/college/UNC%20Chapel%20Hill"
              target="_blank"
              className="text-blue-600 underline"
              rel="noreferrer"
            >
              /api/logo-mappings/college/UNC%20Chapel%20Hill
            </a>
          </div>
          <div>
            <a
              href="/api/logo-mappings/highschool/Cardinal%20Gibbons"
              target="_blank"
              className="text-blue-600 underline"
              rel="noreferrer"
            >
              /api/logo-mappings/highschool/Cardinal%20Gibbons
            </a>
          </div>
          <div>
            <a href="/api/logo-mappings/club/RAW" target="_blank" className="text-blue-600 underline" rel="noreferrer">
              /api/logo-mappings/club/RAW
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
