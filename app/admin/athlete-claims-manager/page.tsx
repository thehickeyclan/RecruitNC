"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Loader2,
  Users,
  CheckCircle,
  Clock,
  RefreshCw,
  GraduationCap,
  Camera,
  AlertTriangle,
  ExternalLink,
  UserCheck,
  Edit,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"
import Link from "next/link"

interface ClaimData {
  id: string
  name: string
  first_name: string
  last_name: string
  high_school: string
  college: string
  division: string
  weight_class: string
  graduation_year: number
  commitment_date: string
  photo_url: string
  achievements: string[]
  bio: string
  gender: string
  claimed_by_user_id: string
  claimed_at: string
  updated_at: string
  user_email: string
  is_verified: boolean
  profile_confirmed_at: string | null
  profile_confirmed_by: string | null
  has_pending_edits: boolean
  needs_photo: boolean
  is_class_2025: boolean
  commitment_ready: boolean
}

interface ClaimsStats {
  total: number
  pending: number
  verified: number
  class_2025: number
  needs_photo: number
  commitment_ready: number
}

export default function AthleteClaimsManager() {
  const [claims, setClaims] = useState<ClaimData[]>([])
  const [stats, setStats] = useState<ClaimsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("all")

  const supabase = createClient()

  const fetchClaims = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/admin/athlete-claims")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setClaims(data.claims || [])
      setStats(data.stats || null)
    } catch (err) {
      console.error("Error fetching claims:", err)
      setError("Failed to load athlete claims")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClaims()
  }, [])

  const getFilteredClaims = (filter: string) => {
    switch (filter) {
      case "pending":
        return claims.filter((claim) => !claim.is_verified)
      case "class-2025":
        return claims.filter((claim) => claim.is_class_2025)
      case "needs-photo":
        return claims.filter((claim) => claim.needs_photo)
      case "verified":
        return claims.filter((claim) => claim.is_verified)
      default:
        return claims
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set"
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading athlete claims...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">College Commitment Verification</h1>
        <p className="text-muted-foreground mt-2">
          Phase 1: Verify and approve Class 2025 college commitments with photos
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
          <Button variant="outline" size="sm" onClick={fetchClaims} className="mt-2 bg-transparent">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </Alert>
      )}

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Claims</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
                </div>
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Class 2025</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.class_2025}</p>
                </div>
                <GraduationCap className="h-6 w-6 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Need Photo</p>
                  <p className="text-2xl font-bold text-red-600">{stats.needs_photo}</p>
                </div>
                <Camera className="h-6 w-6 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ready</p>
                  <p className="text-2xl font-bold text-green-600">{stats.commitment_ready}</p>
                </div>
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Verified</p>
                  <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
                </div>
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabbed Claims View */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All Claims ({claims.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({stats?.pending || 0})</TabsTrigger>
          <TabsTrigger value="class-2025">Class 2025 ({stats?.class_2025 || 0})</TabsTrigger>
          <TabsTrigger value="needs-photo">Need Photo ({stats?.needs_photo || 0})</TabsTrigger>
          <TabsTrigger value="verified">Verified ({stats?.verified || 0})</TabsTrigger>
        </TabsList>

        {["all", "pending", "class-2025", "needs-photo", "verified"].map((tabValue) => (
          <TabsContent key={tabValue} value={tabValue} className="mt-6">
            <div className="grid gap-6">
              {getFilteredClaims(tabValue).length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No claims found for this filter.</p>
                  </CardContent>
                </Card>
              ) : (
                getFilteredClaims(tabValue).map((claim) => (
                  <Card
                    key={claim.id}
                    className={`${
                      claim.is_verified
                        ? "border-green-200 bg-green-50"
                        : claim.is_class_2025
                          ? "border-purple-200 bg-purple-50"
                          : "border-orange-200 bg-orange-50"
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          {/* Profile Photo */}
                          <div className="relative">
                            <Image
                              src={claim.photo_url || "/wrestler-silhouette.png"}
                              alt={claim.name}
                              width={80}
                              height={80}
                              className="rounded-lg object-cover"
                            />
                            {claim.needs_photo && (
                              <div className="absolute -top-2 -right-2">
                                <Badge variant="destructive" className="text-xs">
                                  <Camera className="h-3 w-3 mr-1" />
                                  Photo Needed
                                </Badge>
                              </div>
                            )}
                          </div>

                          <div>
                            <CardTitle className="text-xl">{claim.name}</CardTitle>
                            <CardDescription className="text-base">
                              {claim.high_school} → {claim.college || "College TBD"}
                            </CardDescription>
                            <div className="flex gap-2 mt-2">
                              {claim.is_class_2025 && (
                                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                  <GraduationCap className="h-3 w-3 mr-1" />
                                  Class 2025
                                </Badge>
                              )}
                              {claim.is_verified ? (
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Verified
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-orange-300 text-orange-700">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                              {claim.commitment_ready && (
                                <Badge variant="default" className="bg-blue-100 text-blue-800">
                                  Ready to Announce
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right text-sm text-muted-foreground">
                          <p>Claimed: {formatDate(claim.claimed_at)}</p>
                          <p>By: {claim.user_email}</p>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Commitment Info */}
                        <div>
                          <h4 className="font-semibold mb-3 text-lg">Commitment Details</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">College:</span>
                              <span className="font-medium">{claim.college || "Not specified"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Division:</span>
                              <span className="font-medium">{claim.division || "Not specified"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Weight Class:</span>
                              <span className="font-medium">{claim.weight_class || "Not specified"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Commitment Date:</span>
                              <span className="font-medium">{formatDate(claim.commitment_date)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Graduation Year:</span>
                              <span className="font-medium">{claim.graduation_year}</span>
                            </div>
                          </div>
                        </div>

                        {/* Achievements & Bio */}
                        <div>
                          <h4 className="font-semibold mb-3 text-lg">Achievements & Bio</h4>
                          {claim.achievements && claim.achievements.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm text-muted-foreground mb-1">Key Achievements:</p>
                              <div className="flex flex-wrap gap-1">
                                {claim.achievements.slice(0, 3).map((achievement, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {achievement}
                                  </Badge>
                                ))}
                                {claim.achievements.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{claim.achievements.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                          {claim.bio && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Bio:</p>
                              <p className="text-sm line-clamp-3">{claim.bio}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 mt-6 pt-4 border-t">
                        <Link href={`/athletes/${claim.id}`}>
                          <Button variant="outline" size="sm" className="bg-transparent">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Profile
                          </Button>
                        </Link>

                        <Link href={`/view-profile?id=${encodeURIComponent(claim.id)}`}>
                          <Button variant="outline" size="sm" className="bg-transparent">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Unified Profile
                          </Button>
                        </Link>

                        {claim.has_pending_edits && (
                          <Link href={`/admin/edit-requests?athlete=${claim.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-transparent border-orange-300 text-orange-700"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Review Edits
                            </Button>
                          </Link>
                        )}

                        {claim.needs_photo && (
                          <Link href={`/admin/athletes/upload-image/${claim.id}`}>
                            <Button variant="outline" size="sm" className="bg-transparent border-red-300 text-red-700">
                              <Camera className="h-4 w-4 mr-2" />
                              Upload Photo
                            </Button>
                          </Link>
                        )}

                        {!claim.is_verified && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              // TODO: Implement verification
                              console.log("Verify profile:", claim.id)
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Verify Profile
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
