"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PublicImageUpload } from "@/components/public-image-upload"
import { Loader2, User, Mail, Phone, MapPin, Calendar, Trophy, Camera } from "lucide-react"

interface UserProfile {
  id: string
  name: string
  email: string
  cell_phone?: string
  role?: string
  location?: string
  bio?: string
  created_at: string
  athlete_id?: string
  athlete_name?: string
}

export function ProfileClient() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    console.log("[v0] ProfileClient useEffect:", { authLoading, isAuthenticated, user: !!user })
    if (!authLoading && isAuthenticated) {
      console.log("[v0] Fetching profile from API")
      fetchProfile()
    } else if (!authLoading && !isAuthenticated) {
      console.log("[v0] Not authenticated, stopping loading")
      setIsLoading(false)
    }
  }, [authLoading, isAuthenticated])

  const fetchProfile = async () => {
    try {
      console.log("[v0] ProfileClient fetchProfile called")
      setIsLoading(true)
      const response = await fetch("/api/profile")

      console.log("[v0] Profile API response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Profile data received:", !!data)
        setProfile(data)
      } else {
        const errorText = await response.text()
        console.error("[v0] Profile API error:", errorText)
        setError("Failed to load profile")
      }
    } catch (error) {
      console.error("[v0] Error fetching profile:", error)
      setError("An error occurred while loading your profile")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    try {
      setIsSaving(true)
      setError("")
      setSuccess("")

      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: profile.name,
          cell_phone: profile.cell_phone,
          location: profile.location,
          bio: profile.bio,
        }),
      })

      if (response.ok) {
        setSuccess("Profile updated successfully!")
      } else {
        const data = await response.json()
        setError(data.error || "Failed to update profile")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      setError("An error occurred while updating your profile")
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    if (profile) {
      setProfile({ ...profile, [field]: value })
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading your profile...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please sign in to view your profile</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/auth/signin">Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>We couldn't find your profile information</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchProfile} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your account information and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Profile Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>Update your personal information and contact details</CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="mb-6 border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">{success}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSave} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={profile.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <Input id="email" value={profile.email} disabled className="bg-gray-50" />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Email cannot be changed here</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cell_phone">Cell Phone</Label>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <Input
                          id="cell_phone"
                          type="tel"
                          value={profile.cell_phone || ""}
                          onChange={(e) => handleInputChange("cell_phone", e.target.value)}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <Input
                          id="location"
                          value={profile.location || ""}
                          onChange={(e) => handleInputChange("location", e.target.value)}
                          placeholder="City, State"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={profile.bio || ""}
                      onChange={(e) => handleInputChange("bio", e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={4}
                    />
                  </div>

                  <Button type="submit" disabled={isSaving} className="w-full">
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Account Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Role</p>
                  <p className="capitalize">{profile.role || "User"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Member Since</p>
                  <p>{new Date(profile.created_at).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>

            {/* Athlete Profile Upload - Only show if user has an associated athlete profile */}
            {profile.athlete_id && profile.athlete_name && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Your Athlete Photo
                  </CardTitle>
                  <CardDescription>Upload your own photo for your athlete profile</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <PublicImageUpload
                    athleteId={profile.athlete_id}
                    athleteName={profile.athlete_name}
                    onUploadComplete={(url) => {
                      console.log("Photo uploaded:", url)
                      // Optionally refresh or show success message
                    }}
                  />
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button asChild variant="default" size="sm">
                      <a href={`/unified-profile/${profile.athlete_id}`}>View {profile.athlete_name}&apos;s profile</a>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <a href={`/edit-profile/${profile.athlete_id}`}>Edit profile</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                  <a href="/submit-commitment">Submit New Commitment</a>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                  <a href="/request-edit">Request Profile Edit</a>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                  <a href="/athletes">Browse Athletes</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
