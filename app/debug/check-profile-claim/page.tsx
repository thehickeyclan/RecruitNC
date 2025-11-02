"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Search, User, CheckCircle, XCircle, Clock, Eye, Edit } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import AthleteImage from "@/components/athlete-image"

interface AthleteData {
  id: string
  name: string
  college?: string
  highschool?: string
  graduationyear?: number
  weightclass?: string
  gender?: string
  commitmentdate?: string
  photourl?: string
  claimed_by_user_id?: string
  claimed_at?: string
  profile_verified?: boolean
}

function getClaimStatusInfo(athlete: AthleteData, currentUserId?: string) {
  if (!athlete.claimed_by_user_id) {
    return {
      icon: XCircle,
      color: "text-gray-500",
      text: "Unclaimed",
      bgColor: "bg-gray-100",
      variant: "secondary" as const,
    }
  }

  const isClaimedByCurrentUser = athlete.claimed_by_user_id === currentUserId

  if (athlete.profile_verified) {
    return {
      icon: CheckCircle,
      color: "text-green-600",
      text: isClaimedByCurrentUser ? "Claimed & Verified" : "Verified by Other",
      bgColor: "bg-green-100",
      variant: "default" as const,
    }
  }

  return {
    icon: Clock,
    color: isClaimedByCurrentUser ? "text-blue-600" : "text-orange-600",
    text: isClaimedByCurrentUser ? "Claimed (Unverified)" : "Claimed by Other",
    bgColor: isClaimedByCurrentUser ? "bg-blue-100" : "bg-orange-100",
    variant: "secondary" as const,
  }
}

function formatDate(dateString?: string) {
  if (!dateString) return "Never"
  return new Date(dateString).toLocaleDateString()
}

export default function CheckProfileClaimPage() {
  const [searchQuery, setSearchQuery] = useState("Liam Hickey")
  const [searchResults, setSearchResults] = useState<AthleteData[]>([])
  const [userClaimedProfiles, setUserClaimedProfiles] = useState<AthleteData[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showUserProfiles, setShowUserProfiles] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search term",
        variant: "destructive",
      })
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/debug/check-profile-claim?q=${encodeURIComponent(searchQuery)}`)

      if (!response.ok) {
        throw new Error("Search failed")
      }

      const data = await response.json()
      setSearchResults(data.athletes || [])

      if (data.athletes?.length === 0) {
        toast({
          title: "No Results",
          description: "No athletes found matching your search",
        })
      }
    } catch (error) {
      console.error("Search error:", error)
      toast({
        title: "Error",
        description: "Failed to search athletes",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }

  const handleShowUserProfiles = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to view your claimed profiles",
        variant: "destructive",
      })
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/debug/check-profile-claim?userId=${user.id}`)

      if (!response.ok) {
        throw new Error("Failed to fetch user profiles")
      }

      const data = await response.json()
      setUserClaimedProfiles(data.userClaimedProfiles || [])
      setShowUserProfiles(true)

      if (data.userClaimedProfiles?.length === 0) {
        toast({
          title: "No Claimed Profiles",
          description: "You haven't claimed any athlete profiles yet",
        })
      }
    } catch (error) {
      console.error("Error fetching user profiles:", error)
      toast({
        title: "Error",
        description: "Failed to load your claimed profiles",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Profile Claim Checker</h1>
          <p className="text-gray-600">Check if athlete profiles have been claimed and verified</p>
        </div>

        {/* Search Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Athletes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter athlete name, college, or high school..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* User Actions */}
        <div className="flex gap-2 mb-6">
          <Button onClick={handleShowUserProfiles} variant="outline" disabled={isSearching || !user}>
            <User className="h-4 w-4 mr-2" />
            Show My Claimed Profiles
          </Button>
          <Button
            onClick={() => {
              setShowUserProfiles(false)
              setSearchResults([])
            }}
            variant="outline"
          >
            Clear Results
          </Button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Search Results ({searchResults.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {searchResults.map((athlete) => {
                  const status = getClaimStatusInfo(athlete, user?.id)
                  const StatusIcon = status.icon

                  return (
                    <div key={athlete.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <AthleteImage
                          photoUrl={athlete.photourl}
                          name={athlete.name}
                          size="md"
                          alt={`${athlete.name} photo`}
                        />
                        <div>
                          <h3 className="font-semibold text-lg">{athlete.name}</h3>
                          <div className="text-sm text-gray-600 space-y-1">
                            {athlete.college && <p>College: {athlete.college}</p>}
                            {athlete.highschool && <p>High School: {athlete.highschool}</p>}
                            <p>
                              {athlete.graduationyear} • {athlete.weightclass} • {athlete.gender}
                            </p>
                            {athlete.claimed_at && <p>Claimed: {formatDate(athlete.claimed_at)}</p>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={status.variant} className={`${status.bgColor} ${status.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.text}
                        </Badge>
                        <div className="flex gap-1">
                          <Link href={`/athletes/${athlete.id}`}>
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3" />
                            </Button>
                          </Link>
                          <Link href={`/admin/athletes/edit/${athlete.id}`}>
                            <Button size="sm" variant="outline">
                              <Edit className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Claimed Profiles */}
        {showUserProfiles && (
          <Card>
            <CardHeader>
              <CardTitle>Your Claimed Profiles ({userClaimedProfiles.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {userClaimedProfiles.length === 0 ? (
                <p className="text-gray-600 text-center py-8">You haven't claimed any athlete profiles yet.</p>
              ) : (
                <div className="space-y-4">
                  {userClaimedProfiles.map((athlete) => {
                    const status = getClaimStatusInfo(athlete, user?.id)
                    const StatusIcon = status.icon

                    return (
                      <div key={athlete.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <AthleteImage
                            photoUrl={athlete.photourl}
                            name={athlete.name}
                            size="md"
                            alt={`${athlete.name} photo`}
                          />
                          <div>
                            <h3 className="font-semibold text-lg">{athlete.name}</h3>
                            <div className="text-sm text-gray-600 space-y-1">
                              {athlete.college && <p>College: {athlete.college}</p>}
                              {athlete.highschool && <p>High School: {athlete.highschool}</p>}
                              <p>
                                {athlete.graduationyear} • {athlete.weightclass} • {athlete.gender}
                              </p>
                              <p>Claimed: {formatDate(athlete.claimed_at)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={status.variant} className={`${status.bgColor} ${status.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.text}
                          </Badge>
                          <div className="flex gap-1">
                            <Link href={`/athletes/${athlete.id}`}>
                              <Button size="sm" variant="outline">
                                <Eye className="h-3 w-3" />
                              </Button>
                            </Link>
                            <Link href={`/admin/athletes/edit/${athlete.id}`}>
                              <Button size="sm" variant="outline">
                                <Edit className="h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Authentication Status */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Authentication Status</p>
                <p className="text-xs text-gray-600">{user ? `Logged in as: ${user.email}` : "Not logged in"}</p>
              </div>
              <Badge variant={user ? "default" : "secondary"}>{user ? "Authenticated" : "Not Authenticated"}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
