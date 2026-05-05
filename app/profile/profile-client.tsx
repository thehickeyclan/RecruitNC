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
import { Progress } from "@/components/ui/progress"
import { normalizePhoneForStorage, formatPhoneInput } from "@/lib/phone-format"
import { Loader2, User, Mail, Phone, MapPin, Calendar, Trophy, CreditCard, Bell, MessageCircle, Upload, X, Users, Coins } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NcUnitedBlueSection, type ParentBlueMembership } from "@/components/profile/nc-united-blue-section"
import { ProfileFamilyTab } from "@/components/profile/profile-family-tab"
import { ProfileFundraiseTab } from "@/components/profile/profile-fundraise-tab"
import type { ProfileSpartanSupportersAthletePayload } from "@/app/api/profile/spartan-fundraising-supporters/route"
import { HardLink } from "@/components/hard-link"

const ATHLETE_COMPLETENESS_LABELS: Record<string, string> = {
  bio: "Bio",
  achievements: "Achievements",
  academic: "Academic info",
  highlightVideo: "Highlight video",
  photo: "Photo",
  contact: "Contact info (phone, email, or Instagram)",
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
  notify_sms_new_messages?: boolean
  notify_email_new_messages?: boolean
  headshot_url?: string | null
}

export function ProfileClient() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [blueMemberships, setBlueMemberships] = useState<ParentBlueMembership[]>([])
  const [blueLoading, setBlueLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState<string | null>(null)
  const [blueBillingPortalError, setBlueBillingPortalError] = useState("")
  const [linkedAthletes, setLinkedAthletes] = useState<
    { id: string; name: string; profileVerified: boolean; updatedAt: string | null; claimedByUserId: string | null }[]
  >([])
  const [linkedLoading, setLinkedLoading] = useState(true)
  const [athleteCompleteness, setAthleteCompleteness] = useState<Record<string, { percent: number; completed: string[]; missing: string[] }>>({})
  const [completenessLoading, setCompletenessLoading] = useState(false)
  const [athleteSearchQuery, setAthleteSearchQuery] = useState("")
  const [athleteSearchResults, setAthleteSearchResults] = useState<{ id: string; name: string; highschool: string | null; graduationyear: number | null; alreadyLinked: boolean }[]>([])
  const [athleteSearchLoading, setAthleteSearchLoading] = useState(false)
  const [linkAthleteLoading, setLinkAthleteLoading] = useState<string | null>(null)
  const [headshotUploading, setHeadshotUploading] = useState(false)
  const [eventHubs, setEventHubs] = useState<{ id: string; slug: string; name: string; href: string }[]>([])
  const [eventHubsLoading, setEventHubsLoading] = useState(true)
  const [spartanFundraising, setSpartanFundraising] = useState<{
    athletes: {
      athleteId: string
      name: string
      fundraisingCode: string | null
      totalCents: number
      giftCount: number
      raceSignupCount: number
      codeUnavailable?: boolean
      reimbursementsPaidCents: number
      netAfterReimbursementsCents: number
    }[]
  } | null>(null)
  const [spartanFundraisingLoading, setSpartanFundraisingLoading] = useState(true)
  const [supporterContacts, setSupporterContacts] = useState<ProfileSpartanSupportersAthletePayload[] | null>(null)
  const [supporterLookbackDays, setSupporterLookbackDays] = useState<number | null>(null)
  const [supporterContactsLoading, setSupporterContactsLoading] = useState(true)

  useEffect(() => {
    console.log("[v0] ProfileClient useEffect:", { authLoading, isAuthenticated, user: !!user })
    if (!authLoading && isAuthenticated) {
      console.log("[v0] Fetching profile from API")
      fetchProfile()
      fetchBlueMemberships()
      fetchLinkedAthletes()
      fetchEventHubs()
      void fetchSpartanFundraisingTotals()
      void fetchSpartanSupporterContacts()
    } else if (!authLoading && !isAuthenticated) {
      setIsLoading(false)
      setBlueLoading(false)
      setLinkedLoading(false)
      setEventHubsLoading(false)
      setSpartanFundraisingLoading(false)
      setSupporterContacts(null)
      setSupporterLookbackDays(null)
      setSupporterContactsLoading(false)
    }
  }, [authLoading, isAuthenticated])

  const fetchEventHubs = async () => {
    setEventHubsLoading(true)
    try {
      const res = await fetch("/api/communities/hubs", { credentials: "include" })
      const data = await res.json().catch(() => ({}))
      setEventHubs(data.hubs ?? [])
    } catch {
      setEventHubs([])
    } finally {
      setEventHubsLoading(false)
    }
  }

  const fetchSpartanSupporterContacts = async () => {
    setSupporterContactsLoading(true)
    try {
      const res = await fetch("/api/profile/spartan-fundraising-supporters", {
        credentials: "include",
        cache: "no-store",
      })
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          athletes?: ProfileSpartanSupportersAthletePayload[]
          lookbackDays?: number
        }
        setSupporterContacts(data.athletes ?? [])
        setSupporterLookbackDays(typeof data.lookbackDays === "number" ? data.lookbackDays : null)
      } else {
        setSupporterContacts(null)
        setSupporterLookbackDays(null)
      }
    } catch {
      setSupporterContacts(null)
      setSupporterLookbackDays(null)
    } finally {
      setSupporterContactsLoading(false)
    }
  }

  const fetchSpartanFundraisingTotals = async () => {
    setSpartanFundraisingLoading(true)
    try {
      const res = await fetch("/api/profile/spartan-fundraising-totals", {
        credentials: "include",
        cache: "no-store",
      })
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          athletes?: {
            athleteId: string
            name: string
            fundraisingCode: string | null
            totalCents: number
            giftCount?: number
            raceSignupCount?: number
            codeUnavailable?: boolean
            reimbursementsPaidCents?: number
            netAfterReimbursementsCents?: number
            guildAllocationsCents?: number
          }[]
        }
        setSpartanFundraising({ athletes: data.athletes ?? [] })
      } else {
        setSpartanFundraising({ athletes: [] })
      }
    } catch {
      setSpartanFundraising({ athletes: [] })
    } finally {
      setSpartanFundraisingLoading(false)
    }
  }

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
      void fetchSpartanFundraisingTotals()
      void fetchSpartanSupporterContacts()
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
        setBlueMemberships((data.memberships ?? []) as ParentBlueMembership[])
      }
      await fetch("/api/blue/resume-check", { method: "POST", credentials: "include" }).catch(() => {})
    } catch {
      setBlueMemberships([])
    } finally {
      setBlueLoading(false)
    }
  }

  const openBillingPortal = async (customerId: string) => {
    setPortalLoading(customerId)
    setBlueBillingPortalError("")
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
      setBlueBillingPortalError(data.error || "Could not open billing portal")
    } catch {
      setBlueBillingPortalError("Could not open billing portal")
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
          notify_sms_new_messages: profile.notify_sms_new_messages,
          notify_email_new_messages: profile.notify_email_new_messages,
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

  const handleHeadshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB")
      return
    }
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }
    setHeadshotUploading(true)
    setError("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/profile/headshot-upload", { method: "POST", credentials: "include", body: formData })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Upload failed")
      setProfile({ ...profile, headshot_url: data.url })
      setSuccess("Profile photo updated.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo")
    } finally {
      setHeadshotUploading(false)
      e.target.value = ""
    }
  }

  const handleRemoveHeadshot = async () => {
    if (!profile) return
    setHeadshotUploading(true)
    setError("")
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ headshot_url: null }),
      })
      if (!res.ok) throw new Error("Failed to remove photo")
      setProfile({ ...profile, headshot_url: null })
      setSuccess("Profile photo removed.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove photo")
    } finally {
      setHeadshotUploading(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100/90 via-white to-[#003366]/[0.04] flex items-center justify-center">
        <div className="flex items-center gap-2 text-[#03154C]">
          <Loader2 className="h-6 w-6 animate-spin text-[#003366]" />
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
    <div className="min-h-screen bg-gradient-to-b from-slate-100/90 via-white to-[#003366]/[0.04]">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <div className="mb-8 rounded-2xl border border-[#003366]/10 bg-white/60 px-5 py-6 shadow-sm shadow-[#003366]/5 backdrop-blur-sm sm:px-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#B31B1B]">RecruitNC</p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[#03154C]">My profile</h1>
              <p className="text-slate-600 text-sm sm:text-base mt-1.5 max-w-2xl">
                Account, family &amp; athletes, fundraising, and NC United Blue — all in one place.
              </p>
            </div>
            <div className="hidden h-12 w-1 shrink-0 rounded-full bg-gradient-to-b from-[#03154C] via-[#B31B1B] to-[#CBAF5D] sm:block" aria-hidden />
          </div>
        </div>

        <Tabs defaultValue="account" className="w-full space-y-6">
          <TabsList className="mb-0 grid w-full grid-cols-2 sm:grid-cols-4 gap-2 rounded-2xl border border-[#003366]/12 bg-gradient-to-b from-white to-slate-50/90 p-2 h-auto shadow-md shadow-[#003366]/5">
            <TabsTrigger
              value="account"
              className="rounded-xl py-2.5 px-2 text-xs sm:text-sm font-semibold text-slate-600 transition-all data-[state=active]:bg-[#03154C] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:hover:bg-white/70"
            >
              <span className="inline-flex items-center justify-center gap-1.5 min-w-0">
                <User className="h-4 w-4 shrink-0" />
                <span>Account</span>
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="family"
              title="Family and athletes"
              className="rounded-xl py-2.5 px-2 text-xs sm:text-sm font-semibold text-slate-600 transition-all data-[state=active]:bg-[#03154C] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:hover:bg-white/70"
            >
              <span className="inline-flex items-center justify-center gap-1.5 min-w-0">
                <Users className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline truncate">Family &amp; athletes</span>
                <span className="sm:hidden">Family</span>
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="fundraise"
              className="rounded-xl py-2.5 px-2 text-xs sm:text-sm font-semibold text-slate-600 transition-all data-[state=active]:bg-[#03154C] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:hover:bg-white/70"
            >
              <span className="inline-flex items-center justify-center gap-1.5 min-w-0">
                <Coins className="h-4 w-4 shrink-0" />
                <span>Fundraise</span>
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="blue"
              className="rounded-xl py-2.5 px-2 text-xs sm:text-sm font-semibold text-slate-600 transition-all data-[state=active]:bg-[#03154C] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:hover:bg-white/70"
            >
              <span className="inline-flex items-center justify-center gap-1.5 min-w-0">
                <CreditCard className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">NC United Blue</span>
                <span className="sm:hidden">Blue</span>
              </span>
            </TabsTrigger>
          </TabsList>

        <TabsContent value="account" className="mt-0 space-y-6 focus-visible:outline-none">
            <Card className="border-[#003366]/10 shadow-md shadow-[#003366]/5 overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-[#03154C] via-[#B31B1B] to-[#CBAF5D]" aria-hidden />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#03154C]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#03154C] text-[#CBAF5D]">
                    <User className="h-4 w-4" />
                  </span>
                  Profile information
                </CardTitle>
                <CardDescription className="text-slate-600">Update your personal information and contact details</CardDescription>
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

                {/* Profile photo (headshot) — used in Community/messaging avatar */}
                <div className="mb-6 pb-6 border-b">
                  <Label className="text-sm font-medium">Profile photo</Label>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-3">Shown next to your name in Community and messaging.</p>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20 rounded-full border-2 border-gray-200">
                      <AvatarImage src={profile.headshot_url ?? undefined} alt="Profile" />
                      <AvatarFallback className="bg-gray-200 text-gray-600 text-xl">
                        {(profile.name || profile.email || "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-2">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={headshotUploading}
                          onChange={handleHeadshotUpload}
                        />
                        <Button type="button" variant="outline" size="sm" className="pointer-events-none" asChild>
                          <span>
                            {headshotUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                            {headshotUploading ? "Uploading…" : "Upload headshot"}
                          </span>
                        </Button>
                      </label>
                      {profile.headshot_url && (
                        <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" disabled={headshotUploading} onClick={handleRemoveHeadshot}>
                          <X className="h-4 w-4 mr-2" />
                          Remove photo
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6 pt-2">
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

                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-[#03154C] hover:bg-[#0a2a6e] text-white shadow-md"
                  >
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

            {/* Notification preferences — messaging (SMS & email) */}
            <Card className="border-[#003366]/10 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#03154C]">
                  <span className="text-[#003366]">
                    <Bell className="h-5 w-5" />
                  </span>
                  Message notifications
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Get notified when someone messages you in RecruitNC Messages. Save your profile after changing these.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 font-medium">
                      <MessageCircle className="h-4 w-4 text-[#003366]" />
                      Text me when I get new messages
                    </div>
                    <p className="text-xs text-muted-foreground">
                      SMS to your cell number above when you get a new message in a thread.
                    </p>
                  </div>
                  <Switch
                    checked={!!profile.notify_sms_new_messages}
                    onCheckedChange={(checked) => profile && setProfile({ ...profile, notify_sms_new_messages: checked })}
                  />
                </div>
                {!profile.cell_phone?.trim() && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    Add your cell phone in Profile Information above so we can send you texts.
                  </p>
                )}
                <div className="flex items-center justify-between gap-4 pt-2 border-t">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 font-medium">
                      <Mail className="h-4 w-4 text-[#003366]" />
                      Email me when I get new messages
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Email to your sign-in address when you get a new message in a thread.
                    </p>
                  </div>
                  <Switch
                    checked={!!profile.notify_email_new_messages}
                    onCheckedChange={(checked) => profile && setProfile({ ...profile, notify_email_new_messages: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#003366]/10 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#03154C]">
                  <Calendar className="h-5 w-5 text-[#003366]" />
                  Account details
                </CardTitle>
                <CardDescription className="text-slate-600">Your sign-in and membership summary</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Role</p>
                  <p className="capitalize">{profile.role || "User"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Member since</p>
                  <p>{new Date(profile.created_at).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#003366]/10 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#03154C]">
                  <Trophy className="h-5 w-5 text-[#CBAF5D]" />
                  Quick actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start sm:max-w-md border-[#003366]/20 text-[#03154C] hover:bg-[#003366]/5"
                >
                  <a href="/submit-commitment">Submit new commitment</a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start sm:max-w-md border-[#003366]/20 text-[#03154C] hover:bg-[#003366]/5"
                >
                  <a href="/request-edit">Request profile edit</a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start sm:max-w-md border-[#003366]/20 text-[#03154C] hover:bg-[#003366]/5"
                >
                  <a href="/athletes">Browse athletes</a>
                </Button>
              </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="family" className="mt-0 space-y-0 focus-visible:outline-none">
            <ProfileFamilyTab
              profile={profile}
              blueLoading={blueLoading}
              blueMembershipsLength={blueMemberships.length}
              linkedAthletes={linkedAthletes}
              linkedLoading={linkedLoading}
              athleteSearchQuery={athleteSearchQuery}
              setAthleteSearchQuery={setAthleteSearchQuery}
              athleteSearchResults={athleteSearchResults}
              athleteSearchLoading={athleteSearchLoading}
              linkAthleteLoading={linkAthleteLoading}
              linkAthlete={linkAthlete}
              athleteCompleteness={athleteCompleteness}
              completenessLoading={completenessLoading}
              eventHubs={eventHubs}
              eventHubsLoading={eventHubsLoading}
            />
        </TabsContent>

        <TabsContent value="fundraise" className="mt-0 space-y-0 focus-visible:outline-none">
          <ProfileFundraiseTab
            spartanFundraising={spartanFundraising}
            spartanFundraisingLoading={spartanFundraisingLoading}
            supporterContactsLoading={supporterContactsLoading}
            supporterContacts={supporterContacts}
            supporterLookbackDays={supporterLookbackDays}
            linkedLoading={linkedLoading}
            linkedCount={linkedAthletes.length}
            linkedAthletes={linkedAthletes}
            onSpartanTotalsRefresh={() => {
              void fetchSpartanFundraisingTotals()
              void fetchSpartanSupporterContacts()
            }}
          />
        </TabsContent>

        <TabsContent value="blue" className="mt-0 space-y-6 focus-visible:outline-none">
                {blueLoading || blueMemberships.length > 0 ? (
                  <NcUnitedBlueSection
                    memberships={blueMemberships}
                    loading={blueLoading}
                    portalLoading={portalLoading}
                    onOpenBillingPortal={openBillingPortal}
                    onRefresh={fetchBlueMemberships}
                    billingPortalError={blueBillingPortalError || undefined}
                  />
                ) : (
                  <Card className="border-[#003366]/12 border-dashed bg-white/90 shadow-md overflow-hidden">
                    <div className="h-1 w-full bg-gradient-to-r from-[#03154C] via-[#B31B1B] to-[#CBAF5D]" aria-hidden />
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-[#03154C]">
                        <CreditCard className="h-5 w-5 text-[#003366]" />
                        NC United Blue
                      </CardTitle>
                      <CardDescription className="text-slate-600">
                        Training, apparel, and member benefits — billed separately when you join.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-slate-600">
                        You don&apos;t have an active Blue membership on this account yet. Parents who join can manage billing here.
                      </p>
                      <HardLink
                        href="/blue"
                        className="inline-flex h-10 items-center justify-center rounded-lg border-2 border-[#03154C] bg-[#03154C] px-4 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#0a2a6e]"
                      >
                        Learn about NC United Blue
                      </HardLink>
                    </CardContent>
                  </Card>
                )}
        </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
