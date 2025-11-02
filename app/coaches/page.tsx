"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, MapPin, Users, Trophy, Mail, ExternalLink } from "lucide-react"
import Link from "next/link"

interface Coach {
  id: string
  full_name: string
  institution: string
  coaching_position: string
  years_experience: number
  division: string
  location: string
  bio: string
  achievements: string[]
  contact_email: string
  contact_phone: string
  website: string
  social_media: {
    twitter?: string
    instagram?: string
    linkedin?: string
  }
  recruiting_focus: string[]
  program_highlights: string[]
  verified: boolean
  created_at: string
}

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDivision, setSelectedDivision] = useState<string>("all")
  const [selectedPosition, setSelectedPosition] = useState<string>("all")

  useEffect(() => {
    fetchCoaches()
  }, [])

  const fetchCoaches = async () => {
    try {
      const response = await fetch("/api/coaches/public")
      if (response.ok) {
        const data = await response.json()
        setCoaches(data.coaches || [])
      }
    } catch (error) {
      console.error("Error fetching coaches:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCoaches = coaches.filter((coach) => {
    const matchesSearch =
      !searchTerm ||
      coach.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coach.institution.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coach.location?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesDivision = selectedDivision === "all" || coach.division === selectedDivision

    const matchesPosition = selectedPosition === "all" || coach.coaching_position === selectedPosition

    return matchesSearch && matchesDivision && matchesPosition
  })

  const divisions = [...new Set(coaches.map((c) => c.division).filter(Boolean))].sort()
  const positions = [...new Set(coaches.map((c) => c.coaching_position).filter(Boolean))].sort()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading coaches...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">College Wrestling Coaches</h1>
          <p className="text-xl opacity-90">Connect with verified college wrestling coaches across North Carolina</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Search and Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Find Coaches
            </CardTitle>
            <CardDescription>Search and filter college wrestling coaches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search coaches or schools..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                <SelectTrigger>
                  <SelectValue placeholder="All Divisions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {divisions.map((division) => (
                    <SelectItem key={division} value={division}>
                      {division}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                <SelectTrigger>
                  <SelectValue placeholder="All Positions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  {positions.map((position) => (
                    <SelectItem key={position} value={position}>
                      {position.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Coaches</p>
                  <p className="text-2xl font-bold">{coaches.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Trophy className="w-5 h-5 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Verified</p>
                  <p className="text-2xl font-bold">{coaches.filter((c) => c.verified).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Head Coaches</p>
                  <p className="text-2xl font-bold">
                    {coaches.filter((c) => c.coaching_position === "head-coach").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Divisions</p>
                  <p className="text-2xl font-bold">{divisions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coaches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCoaches.map((coach) => (
            <CoachCard key={coach.id} coach={coach} />
          ))}
        </div>

        {filteredCoaches.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Coaches Found</h3>
              <p className="text-muted-foreground">Try adjusting your search criteria</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function CoachCard({ coach }: { coach: Coach }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {coach.full_name}
              {coach.verified && (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Verified
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="font-medium">{coach.institution}</CardDescription>
            <p className="text-sm text-muted-foreground">
              {coach.coaching_position.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>{coach.location}</span>
        </div>

        {coach.division && (
          <Badge variant="outline" className="w-fit">
            {coach.division}
          </Badge>
        )}

        {coach.years_experience && (
          <p className="text-sm">
            <span className="font-medium">Experience:</span> {coach.years_experience} years
          </p>
        )}

        {coach.bio && <p className="text-sm text-muted-foreground line-clamp-3">{coach.bio}</p>}

        {coach.recruiting_focus && coach.recruiting_focus.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Recruiting Focus:</p>
            <div className="flex flex-wrap gap-1">
              {coach.recruiting_focus.slice(0, 3).map((focus, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {focus}
                </Badge>
              ))}
              {coach.recruiting_focus.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{coach.recruiting_focus.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-2">
            {coach.contact_email && (
              <Button size="sm" variant="outline" asChild>
                <a href={`mailto:${coach.contact_email}`}>
                  <Mail className="w-4 h-4" />
                </a>
              </Button>
            )}
            {coach.website && (
              <Button size="sm" variant="outline" asChild>
                <a href={coach.website} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            )}
          </div>
          <Button size="sm" asChild>
            <Link href={`/coaches/${coach.id}`}>View Profile</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
