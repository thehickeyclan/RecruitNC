"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface CollegeWithLogo {
  name: string
  logo: string
  division?: string
  conference?: string
  location?: string
  source: "mock" | "database" | "public"
}

export default function CollegeLogosListPage() {
  const [colleges, setColleges] = useState<CollegeWithLogo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCollegeLogos() {
      setLoading(true)

      // Colleges from mock data with confirmed logos
      const mockColleges: CollegeWithLogo[] = [
        {
          name: "NC State",
          logo: "/wolfpack-logo.png",
          division: "NCAA D1",
          conference: "ACC",
          location: "Raleigh, NC",
          source: "mock",
        },
        {
          name: "UNC Chapel Hill",
          logo: "/UNC_Chapel_Hill_Logo.png",
          division: "NCAA D1",
          conference: "ACC",
          location: "Chapel Hill, NC",
          source: "mock",
        },
        {
          name: "Appalachian State",
          logo: "/appalachian-state-mountains.png",
          division: "NCAA D1",
          conference: "SoCon",
          location: "Boone, NC",
          source: "mock",
        },
        {
          name: "Campbell University",
          logo: "/campbell-university-seal.png",
          division: "NCAA D1",
          conference: "SoCon",
          location: "Buies Creek, NC",
          source: "mock",
        },
        {
          name: "Queens University",
          logo: "/queens-university-shield.png",
          division: "NCAA D2",
          conference: "SAC",
          location: "Charlotte, NC",
          source: "mock",
        },
        {
          name: "Belmont Abbey",
          logo: "/belmont-abbey-architectural-detail.png",
          division: "NCAA D2",
          conference: "Conference Carolinas",
          location: "Belmont, NC",
          source: "mock",
        },
        {
          name: "UNC Pembroke",
          logo: "/unc-pembroke-seal.png",
          division: "NCAA D2",
          conference: "Conference Carolinas",
          location: "Pembroke, NC",
          source: "mock",
        },
        {
          name: "Greensboro College",
          logo: "/Greensboro-College-Seal.png",
          division: "NCAA D3",
          conference: "USA South",
          location: "Greensboro, NC",
          source: "mock",
        },
      ]

      // Check for additional colleges in logo_mappings table
      try {
        const { data: logoMappings, error } = await supabase
          .from("logo_mappings")
          .select("entity_name, logo_url, entity_type")
          .eq("entity_type", "college")

        if (!error && logoMappings) {
          const databaseColleges: CollegeWithLogo[] = logoMappings.map((mapping) => ({
            name: mapping.entity_name,
            logo: mapping.logo_url,
            source: "database" as const,
          }))

          // Combine and deduplicate
          const allColleges = [...mockColleges]

          databaseColleges.forEach((dbCollege) => {
            if (!allColleges.find((college) => college.name.toLowerCase() === dbCollege.name.toLowerCase())) {
              allColleges.push(dbCollege)
            }
          })

          setColleges(allColleges.sort((a, b) => a.name.localeCompare(b.name)))
        } else {
          setColleges(mockColleges.sort((a, b) => a.name.localeCompare(b.name)))
        }
      } catch (error) {
        console.error("Error fetching logo mappings:", error)
        setColleges(mockColleges.sort((a, b) => a.name.localeCompare(b.name)))
      }

      setLoading(false)
    }

    fetchCollegeLogos()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">College Logos</h1>
        <p>Loading college logos...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">College Logos in NC Wrestling Portal</h1>
        <p className="text-gray-600 mb-4">Found {colleges.length} colleges with logos in our system</p>

        <div className="flex gap-2 mb-6">
          <Badge variant="outline">Mock Data: {colleges.filter((c) => c.source === "mock").length}</Badge>
          <Badge variant="outline">Database: {colleges.filter((c) => c.source === "database").length}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {colleges.map((college, index) => (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{college.name}</CardTitle>
                <Badge variant={college.source === "mock" ? "default" : "secondary"}>{college.source}</Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {/* Logo Display */}
                <div className="flex justify-center">
                  <div className="relative w-32 h-32 bg-gray-50 rounded-lg border flex items-center justify-center">
                    <Image
                      src={college.logo || "/placeholder.svg"}
                      alt={`${college.name} logo`}
                      width={120}
                      height={120}
                      className="object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/generic-college-logo.png"
                        target.classList.add("opacity-50")
                      }}
                    />
                  </div>
                </div>

                {/* College Details */}
                <div className="space-y-2 text-sm">
                  {college.division && (
                    <div className="flex justify-between">
                      <span className="font-medium">Division:</span>
                      <span>{college.division}</span>
                    </div>
                  )}

                  {college.conference && (
                    <div className="flex justify-between">
                      <span className="font-medium">Conference:</span>
                      <span>{college.conference}</span>
                    </div>
                  )}

                  {college.location && (
                    <div className="flex justify-between">
                      <span className="font-medium">Location:</span>
                      <span>{college.location}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t">
                    <span className="font-medium">Logo Path:</span>
                    <p className="text-xs text-gray-500 break-all mt-1">{college.logo}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {colleges.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No college logos found in the system.</p>
        </div>
      )}
    </div>
  )
}
