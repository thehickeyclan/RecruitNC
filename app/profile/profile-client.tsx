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
import { Progress } from "@/components/ui/progress"
import { normalizePhoneForStorage, formatPhoneInput } from "@/lib/phone-format"
import { Loader2, User, Mail, Phone, MapPin, Calendar, Trophy, Camera, CreditCard, ExternalLink, Users, CheckCircle, ArrowRight, Sparkles, Search, Link2 } from "lucide-react"

const ATHLETE_COMPLETENESS_LABELS: Record<string, string> = {
  bio: "Bio",
  achievements: "Achievements",
  academic: "Academic info",
  highlightVideo: "Highlight video",
  photo: "Photo",
}

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
  const [blueMemberships, setBlueMemberships] = useState<{ athleteId: string; athleteName: string; status: string; startedAt: string; stripeCustomerId: string | null }[]>([])
  const [blueLoading, setBlueLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState<string | null>(null)
  const [linkedAthletes, setLinkedAthletes] = useState<{ id: string; name: string; profileVerified: boolean; updatedAt: string | null }[]>([])
  const [linkedLoading, setLinkedLoading] = useState(true)
  const [athleteCompleteness, setAthleteCompleteness] = useState<Record<string, { percent: number; completed: string[]; missing: string[] }>>({})
  const [completenessLoading, setCompletenessLoading] = useState(false)
  const [athleteSearchQuery, setAthleteSearchQuery] = useState("")
  const [athleteSearchResults, setAthleteSearchResults] = useState<{ id: string; name: string; highschool: string | null; graduationyear: number | null; alreadyLinked: boolean }[]>([])
  const [athleteSearchLoading, setAthleteSearchLoading] = useState(false)
  const [linkAthleteLoading, setLinkAthleteLoading] = useState<string | null>(null)

  useEffect(() => {
    console.log("[v0] ProfileClient useEffect:", { authLoading, isAuthenticated, user: !!user })
    if (!authLoading && isAuthenticated) {
      console.log("[v0] Fetching profile from API")
      fetchProfile()
      fetchBlueMemberships()
      fetchLinkedAthletes()
    } else if (!authLoading && !isAuthenticated) {
      setIsLoading(false)
      setBlueLoading(false)
      setLinkedLoading(false)
    }
  }, [authLoading, isAuthenticated])

  useEffect(() => {
    if (!profile || linkedLoading) return
    const ids = [...new Set([profile.athlete_id, ...linkedAthletes.map((a) => a.id)].filter(Boolean) as string[])]
    if (ids.length > 0) fetchAthleteCompleteness(ids)
  }, [profile?.athlete_id, linkedLoading, linkedAthletes])

  useEffect(() => {
    if (athleteSearchQuery.trim().length < 2) {
      setAthleteSearchResults([])
      return
    }
    const t = setTimeout(async () => {
      setAthleteSearchLoading(true)
      try {
        const res = await fetch(`/api/profile/search-athletes?q=${encodeURIComponent(athleteSearchQuery.trim())}`, { credentials: "include" })
        const data = await res.json().catch(() => ({}))
        setAthleteSearchResults(data.athletes ?? [])
      } catch {
        setAthleteSearchResults([])
      } finally {
        setAthleteSearchLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [athleteSearchQuery])

  const linkAthlete = async (athleteId: string) => {
    setLinkAthleteLoading(athleteId)
    setError("")
    try {
      const res = await fetch("/api/profile/link-athlete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ athleteId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not link")
      setAthleteSearchQuery("")
      setAthleteSearchResults([])
      setSuccess(data.message ?? "Athlete linked.")
      fetchLinkedAthletes()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not link athlete")
    } finally {
      setLinkAthleteLoading(null)
    }
  }

  const fetchLinkedAthletes = async () => {
    setLinkedLoading(true)
    try {
      const res = await fetch("/api/profile/linked-athletes", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setLinkedAthletes(data.athletes ?? [])
      }
    } catch {
      setLinkedAthletes([])
    } finally {
      setLinkedLoading(false)
    }
  }

  const fetchAthleteCompleteness = async (athleteIds: string[]) => {
    if (athleteIds.length === 0) return
    setCompletenessLoading(true)
    try {
      const res = await fetch(`/api/profile/athlete-completeness?ids=${athleteIds.join(",")}`, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        const map: Record<string, { percent: number; completed: string[]; missing: string[] }> = {}
        for (const a of data.athletes ?? []) {
          map[a.id] = { percent: a.percent, completed: a.completed ?? [], missing: a.missing ?? [] }
        }
        setAthleteCompleteness(map)
      }
    } catch {
      setAthleteCompleteness({})
    } finally {
      setCompletenessLoading(false)
    }
  }

  const fetchBlueMemberships = async () => {
    setBlueLoading(true)
    try {
      const res = await fetch("/api/blue/my-memberships", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setBlueMemberships(data.memberships ?? [])
      }
    } catch {
      setBlueMemberships([])
    } finally {
      setBlueLoading(false)
    }
  }

  const openBillingPortal = async (customerId: string) => {
    setPortalLoading(customerId)
    try {
      const res = await fetch("/api/blue/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ customerId }),
      })
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
        return
      }
      setError(data.error || "Could not open billing portal")
    } catch {
      setError("Could not open billing portal")
    } finally {
      setPortalLoading(null)
    }
  }

  const fetchProfile = async () => {
    try {
      console.log("[v0] ProfileClient fetchProfile called")
      setIsLoading(true)
      setError("")
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      const response = await fetch("/api/profile", { credentials: "include", signal: controller.signal })
      clearTimeout(timeoutId)

      console.log("[v0] Profile API response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Profile data received:", !!data)
        setProfile({
          ...data,
          name: data.name ?? data.full_name ?? "",
        })
      } else {
        const errorText = await response.text()
        console.error("[v0] Profile API error:", response.status, errorText)
        if (response.status === 401) {
          setError("Session expired or not available. Please sign in again.")
        } else {
          setError("Failed to load profile")
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.error("[v0] Profile fetch timed out")
        setError("Request timed out. Check your connection and try again.")
      } else {
        console.error("[v0] Error fetching profile:", error)
        setError("An error occurred while loading your profile")
      }
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
          cell_phone: normalizePhoneForStorage(profile.cell_phone),
          location: profile.location,
          bio: profile.bio,
        }),
      })

      if (response.ok) {
        setSuccess("Profile updated successfully!")
        fetchProfile()
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
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col gap-2">
              <Button onClick={fetchProfile} className="w-full">
                Try Again
              </Button>
              {error?.toLowerCase().includes("session") && (
                <Button asChild variant="outline" className="w-full">
                  <a href="/auth/signin">Sign in again</a>
                </Button>
              )}
            </div>
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
                          onChange={(e) => handleInputChange("cell_phone", formatPhoneInput(e.target.value))}
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
            {/* What to do next — recommendations */}
            <Card className="border-amber-200/60 bg-amber-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-900">
                  <Sparkles className="h-5 w-5" />
                  What to do next
                </CardTitle>
                <CardDescription>Make your profile and athlete pages more engaging</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {!profile.cell_phone?.trim() && (
                  <p className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3 shrink-0 text-amber-600" />
                    <span>Add your cell phone above so coaches can reach you.</span>
                  </p>
                )}
                {!profile.bio?.trim() && (
                  <p className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3 shrink-0 text-amber-600" />
                    <span>Add a short bio to introduce yourself.</span>
                  </p>
                )}
                {!blueLoading && blueMemberships.length === 0 && (
                  <p className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3 shrink-0 text-amber-600" />
                    <a href="/blue" className="text-[#03154C] font-medium hover:underline">Interested in NC United Blue?</a> Learn more.
                  </p>
                )}
                {!linkedLoading && linkedAthletes.length > 0 && linkedAthletes.some((a) => !a.profileVerified) && (
                  <p className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3 shrink-0 text-amber-600" />
                    <span>Get your athlete&apos;s profile public so coaches can find them — use Request Profile Edit or Edit profile below.</span>
                  </p>
                )}
                {!linkedLoading && linkedAthletes.length > 0 && (
                  <p className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3 shrink-0 text-amber-600" />
                    <span>Keep achievements and stats up to date — edit athlete profile below.</span>
                  </p>
                )}
                {profile.cell_phone?.trim() && profile.bio?.trim() && (linkedAthletes.length === 0 || linkedAthletes.every((a) => a.profileVerified)) && (blueMemberships.length > 0 || linkedAthletes.length > 0) && (
                  <p className="text-gray-500">You&apos;re all set. Browse athletes or submit a commitment when ready.</p>
                )}
              </CardContent>
            </Card>

            {/* Link your athlete — search and link as parent */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Link your athlete
                </CardTitle>
                <CardDescription>Search for your wrestler to link them to your account. They’ll appear under Your athletes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search by name (e.g. Liam Hickey)"
                    value={athleteSearchQuery}
                    onChange={(e) => setAthleteSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                {athleteSearchLoading && <p className="text-xs text-gray-500">Searching…</p>}
                {!athleteSearchLoading && athleteSearchQuery.trim().length >= 2 && athleteSearchResults.length === 0 && (
                  <p className="text-xs text-gray-500">No athletes found. Try a different name.</p>
                )}
                {!athleteSearchLoading && athleteSearchResults.length > 0 && (
                  <ul className="space-y-2 max-h-48 overflow-y-auto rounded border bg-gray-50/50 p-2">
                    {athleteSearchResults.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                        <span>
                          <span className="font-medium text-gray-900">{a.name}</span>
                          {(a.highschool || a.graduationyear) && (
                            <span className="text-gray-500 ml-1">
                              {[a.highschool, a.graduationyear != null ? `’${String(a.graduationyear).slice(-2)}` : null].filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </span>
                        {a.alreadyLinked ? (
                          <span className="text-xs text-green-600 shrink-0">Linked</span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={linkAthleteLoading === a.id}
                            onClick={() => linkAthlete(a.id)}
                          >
                            {linkAthleteLoading === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Link"}
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Your athletes — linked kids with status and last edit */}
            {!linkedLoading && linkedAthletes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Your athletes
                  </CardTitle>
                  <CardDescription>Status and last update for linked profiles</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {linkedAthletes.map((a) => {
                    const comp = athleteCompleteness[a.id]
                    return (
                      <div key={a.id} className="rounded-lg border bg-gray-50/50 p-3">
                        <p className="font-medium text-gray-900">{a.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Public profile: {a.profileVerified ? <span className="text-green-600 inline-flex items-center gap-1"><CheckCircle className="h-3 w-3 shrink-0" /> Live</span> : "Not yet public"}
                        </p>
                        {a.updatedAt && (
                          <p className="text-xs text-gray-400">Last updated: {new Date(a.updatedAt).toLocaleDateString()}</p>
                        )}
                        {/* Profile completeness progress + what's missing / suggestions */}
                        {completenessLoading && !comp ? (
                          <p className="text-xs text-gray-400 mt-2">Loading profile completeness…</p>
                        ) : comp ? (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-600 mb-1">Profile completeness: {comp.percent}%</p>
                            <Progress value={comp.percent} className="h-2" />
                            {comp.missing.length > 0 ? (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-amber-800 mb-0.5">To reach 100%, add:</p>
                                <ul className="text-xs text-gray-600 space-y-0.5 list-disc list-inside">
                                  {comp.missing.map((m) => (
                                    <li key={m}>{ATHLETE_COMPLETENESS_LABELS[m] ?? m}</li>
                                  ))}
                                </ul>
                                <p className="text-xs text-gray-500 mt-1">Use &quot;Edit profile&quot; below to fill these in.</p>
                              </div>
                            ) : (
                              <p className="text-xs text-green-600 mt-1">All sections complete — bio, achievements, academics, highlight video, and photo are filled.</p>
                            )}
                          </div>
                        ) : null}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Button asChild variant="outline" size="sm">
                            <a href={`/view-profile?id=${encodeURIComponent(a.id)}`}>View</a>
                          </Button>
                          <Button asChild variant="outline" size="sm">
                            <a href={`/edit-profile/${a.id}`}>Edit profile</a>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}

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

            {/* NC United Blue memberships — only when user is payer for at least one */}
            {!blueLoading && blueMemberships.length > 0 && (
              <Card className="border-[#03154C]/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#03154C]">
                    <CreditCard className="h-5 w-5" />
                    NC United Blue
                  </CardTitle>
                  <CardDescription>Your Blue memberships and billing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {blueMemberships.map((m) => (
                    <div key={m.athleteId} className="rounded-lg border bg-gray-50/50 p-3">
                      <p className="font-medium text-gray-900">{m.athleteName}</p>
                      <p className="text-sm text-gray-500 capitalize">{m.status.replace("_", " ")}</p>
                      <p className="text-xs text-gray-400 mt-1">Since {new Date(m.startedAt).toLocaleDateString()}</p>
                      {m.stripeCustomerId && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full text-[#03154C] border-[#03154C]/30 hover:bg-[#03154C]/5"
                          onClick={() => openBillingPortal(m.stripeCustomerId!)}
                          disabled={!!portalLoading}
                        >
                          {portalLoading === m.stripeCustomerId ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ExternalLink className="h-3 w-3 mr-1" />
                          )}
                          Manage billing
                        </Button>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-gray-500">Update payment method, pause, or cancel in Stripe&apos;s secure portal.</p>
                </CardContent>
              </Card>
            )}

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
                  {/* Profile completeness for own athlete */}
                  {(() => {
                    const comp = athleteCompleteness[profile.athlete_id!]
                    return completenessLoading && !comp ? (
                      <p className="text-xs text-gray-400">Loading profile completeness…</p>
                    ) : comp ? (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Profile completeness: {comp.percent}%</p>
                        <Progress value={comp.percent} className="h-2" />
                        {comp.missing.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Full bar = Bio, Achievements, Academic info, Highlight video, Photo. Add: {comp.missing.map((m) => ATHLETE_COMPLETENESS_LABELS[m] ?? m).join(", ")}
                          </p>
                        )}
                      </div>
                    ) : null
                  })()}
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
                      <a href={`/view-profile?id=${encodeURIComponent(profile.athlete_id)}`}>View {profile.athlete_name}&apos;s profile</a>
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
