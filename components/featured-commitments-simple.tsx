"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EntityLogo } from "@/components/entity-logo"
import Link from "next/link"
import { Calendar, MapPin, Weight } from 'lucide-react'

interface Athlete {
  id: string
  name: string
  highschool: string
  college: string
  division: string
  weightclass: string
  commitmentdate: string
  graduation_year: number
  photourl?: string
  headshot_url?: string
}

interface FeaturedCommitmentsSimpleProps {
  athletes: Athlete[]
}

export function FeaturedCommitmentsSimple({ athletes }: FeaturedCommitmentsSimpleProps) {
  // Ensure athletes is always an array
  const safeAthletes = Array.isArray(athletes) ? athletes : []
  
  if (safeAthletes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No featured athletes available at this time.</p>
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {safeAthletes.slice(0, 6).map((athlete) => (
        <Link href={`/athletes/${athlete.id}`} key={athlete.id}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                  {athlete.headshot_url || athlete.photourl ? (
                    <img
                      src={athlete.headshot_url || athlete.photourl}
                      alt={athlete.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-red-400 flex items-center justify-center text-white font-bold">
                      {athlete.name?.charAt(0) || "?"}
                    </div>
                  )}
                </div>
                <div>
                  <CardTitle className="text-lg">{athlete.name || "Unknown Athlete"}</CardTitle>
                  <p className="text-sm text-gray-600">{athlete.highschool || "Unknown High School"}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <EntityLogo category="college" name={athlete.college || ""} size="sm" />
                  <span className="font-medium">{athlete.college || "Unknown College"}</span>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {athlete.division && (
                    <Badge variant="outline">{athlete.division}</Badge>
                  )}
                  {athlete.weightclass && (
                    <div className="flex items-center gap-1">
                      <Weight className="h-3 w-3" />
                      <span>{athlete.weightclass}</span>
                    </div>
                  )}
                </div>

                {athlete.commitmentdate && (
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>Committed {new Date(athlete.commitmentdate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
