"use client"

import Image from "next/image"
import { useSchoolBranding } from "@/hooks/use-school-branding"

interface SchoolBrandedHeaderProps {
  schoolId?: string | null
  schoolName?: string
  subtitle?: string
}

export function SchoolBrandedHeader({ schoolId, schoolName, subtitle }: SchoolBrandedHeaderProps) {
  const { branding, isLoading } = useSchoolBranding(schoolId)

  if (isLoading) {
    return (
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="animate-pulse flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-800 rounded-lg" />
            <div className="flex-1">
              <div className="h-8 bg-gray-800 rounded w-48 mb-2" />
              <div className="h-4 bg-gray-800 rounded w-32" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // If no branding found, show default header
  if (!branding) {
    return (
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div>
            <h1 className="text-3xl font-bold text-white">{schoolName || "Recruiting Portal"}</h1>
            {subtitle && <p className="text-gray-400">{subtitle}</p>}
          </div>
        </div>
      </div>
    )
  }

  // Show branded header with school colors and logo
  return (
    <div
      className="border-b border-gray-800"
      style={{
        background: branding.primary_color
          ? `linear-gradient(135deg, ${branding.primary_color} 0%, ${branding.secondary_color || branding.primary_color} 100%)`
          : "#1f2937",
      }}
    >
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4">
          {branding.logo_url && (
            <div className="relative w-16 h-16 bg-white rounded-lg p-2 flex-shrink-0">
              <Image
                src={branding.logo_url || "/placeholder.svg"}
                alt={`${branding.name} logo`}
                fill
                className="object-contain p-1"
              />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white">{branding.name}</h1>
            <p className="text-white/90">{subtitle || "Recruiting Portal"}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
