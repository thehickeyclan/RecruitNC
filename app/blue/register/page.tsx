"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { formatPhoneInput, normalizePhoneForStorage } from "@/lib/phone-format"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

const NAVY = "#03154C"
const TSHIRT_SIZES = ["YS", "YM", "YL", "S", "M", "L", "XL", "2XL", "3XL"] as const
const GOLD = "#D3B574"

const WAIVER_TEXT = `WAIVER AND RELEASE OF LIABILITY

This Waiver and Release applies to all activities, practices, competitions, events, and related activities organized by NC Wrestling United ("NC United"), including those conducted at facilities owned or operated by The University of North Carolina at Chapel Hill or any other third party.

I, the undersigned parent or legal guardian of the minor participant, acknowledge and agree as follows:

Assumption of Risk
I understand that wrestling and related training activities are inherently dangerous contact activities. Risks include, but are not limited to: sprains, strains, fractures, dislocations; concussions and head injuries; paralysis or catastrophic injury; permanent disability; death; injuries resulting from contact with other participants; injuries arising from facility conditions or equipment; risks associated with travel to and from events.

I knowingly and voluntarily assume all risks, both known and unknown, even if arising from the negligence of the Released Parties.

Release of Liability
To the fullest extent permitted by North Carolina law, I release and forever discharge: NC Wrestling United; its officers, directors, employees, volunteers, and agents; The University of North Carolina at Chapel Hill; The University of North Carolina System; The State of North Carolina; their trustees, officers, employees, agents, and representatives (collectively, the "Released Parties") from any and all claims, demands, causes of action, damages, or liabilities arising out of or related to participation in NC United activities, including those caused by negligence.

Indemnification
I agree to indemnify and hold harmless the Released Parties from any claims arising from the participant's involvement in NC United activities.

Medical Authorization
I authorize NC United to obtain emergency medical treatment for the participant if necessary. I understand I am financially responsible for any resulting medical expenses.

Insurance
I understand NC United may carry insurance but that I am responsible for maintaining adequate personal medical insurance for the participant.

Media Release
I grant permission for photographs and video recordings of the participant to be used for promotional purposes.

Governing Law and Venue
This agreement shall be governed by the laws of the State of North Carolina. Any disputes shall be brought in a court of competent jurisdiction within North Carolina.

Severability
If any portion of this agreement is deemed invalid, the remaining provisions shall remain in full force and effect.

I acknowledge that I have read and understand this Waiver and Release of Liability and sign it voluntarily on behalf of myself and the minor participant.`

export default function BlueRegisterPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("invite")?.trim() || ""
  const { user, profile } = useAuth()

  const [validating, setValidating] = useState(!!token)
  const [valid, setValid] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const [parent, setParent] = useState({ email: "", password: "", firstName: "", lastName: "", phone: "" })
  const [athlete, setAthlete] = useState({ firstName: "", lastName: "", graduationYear: "", highSchool: "", weightClass: "" })
  const [promoCode, setPromoCode] = useState("")
  const [waiverAccepted, setWaiverAccepted] = useState(false)
  const [tshirtSize, setTshirtSize] = useState<string>("")
  const [emailRegistered, setEmailRegistered] = useState<boolean | null>(null)
  const [emailChecking, setEmailChecking] = useState(false)

  // Pre-fill parent from logged-in user so they don't have to re-enter email/password
  useEffect(() => {
    if (!user?.email) return
    setParent((p) => ({
      ...p,
      email: user.email ?? p.email,
      firstName: profile?.first_name || (user.user_metadata?.first_name as string) || p.firstName,
      lastName: profile?.last_name || (user.user_metadata?.last_name as string) || p.lastName,
      phone: profile?.cell_phone || (user.user_metadata?.cell_phone as string) || p.phone || "",
    }))
  }, [user?.id, user?.email, user?.user_metadata, profile?.first_name, profile?.last_name, profile?.cell_phone])

  useEffect(() => {
    if (!token) {
      setValidating(false)
      setValid(false)
      setError("Missing invite link.")
      return
    }
    let cancelled = false
    fetch(`/api/blue/invites/validate?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setValid(data.valid === true)
        if (data.email && !user?.email) setParent((p) => ({ ...p, email: data.email }))
        setError(data.error || null)
      })
      .catch(() => {
        if (!cancelled) setValid(false); setError("Could not validate link.")
      })
      .finally(() => { if (!cancelled) setValidating(false) })
    return () => { cancelled = true }
  }, [token, user?.email])

  const checkEmailRegistered = async (emailVal: string) => {
    const e = emailVal?.trim()?.toLowerCase()
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setEmailRegistered(null)
      return
    }
    setEmailChecking(true)
    setEmailRegistered(null)
    try {
      const r = await fetch(`/api/blue/check-email?email=${encodeURIComponent(e)}`)
      const data = await r.json()
      setEmailRegistered(data.registered === true)
    } catch {
      setEmailRegistered(null)
    } finally {
      setEmailChecking(false)
    }
  }

  const handleParentEmailBlur = () => {
    if (user) return
    checkEmailRegistered(parent.email)
  }

  const handleParentEmailChange = (value: string) => {
    setParent((p) => ({ ...p, email: value }))
    setEmailRegistered(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const gradYear = parseInt(athlete.graduationYear, 10)
    if (!Number.isFinite(gradYear)) {
      setError("Enter a valid graduation year.")
      return
    }
    if (!tshirtSize || !TSHIRT_SIZES.includes(tshirtSize as (typeof TSHIRT_SIZES)[number])) {
      setError("Please select a t-shirt size.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/blue/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          token,
          waiverAccepted,
          tshirtSize,
          promoCode: promoCode.trim() || undefined,
          parent: {
            email: parent.email,
            password: parent.password || undefined,
            firstName: parent.firstName,
            lastName: parent.lastName,
            phone: parent.phone ? normalizePhoneForStorage(parent.phone) : undefined,
          },
          athlete: {
            firstName: athlete.firstName,
            lastName: athlete.lastName,
            graduationYear: gradYear,
            highSchool: athlete.highSchool,
            weightClass: athlete.weightClass || undefined,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Registration failed.")
        setLoading(false)
        return
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }
      setSuccess(true)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-[#03154C]" />
          <p className="mt-4 text-gray-600">Checking invite link...</p>
        </div>
      </div>
    )
  }

  if (!valid || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-[#03154C]">Invalid or expired link</CardTitle>
            <CardDescription>{error || "This registration link is invalid or has already been used."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/blue">
              <Button variant="outline" className="w-full">Back to Blue program</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-lg mx-auto">
          <Card className="border-2 border-[#D3B574]">
            <CardHeader>
              <CardTitle className="text-[#03154C]">You’re in — welcome to NC United Blue</CardTitle>
              <CardDescription>
                Your athlete is signed up. You’re part of an exclusive group. Here’s what to do next:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-[#03154C]">Practices</p>
                <p className="text-gray-700">
                  UNC Fetzer Hall, 210 South Rd, Chapel Hill — <strong>Sundays 1:00–3:00 PM</strong>
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-[#03154C]">Stay connected</p>
                <p className="text-gray-700">
                  Join the <strong>NC United Blue GroupMe</strong> for updates and team chat:{" "}
                  <a
                    href="https://groupme.com/join_group/104706096/bU0Ncyo4"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#03154C] underline hover:no-underline"
                  >
                    Join NC United Blue on GroupMe
                  </a>
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-[#03154C]">RecruitNC profile</p>
                <p className="text-gray-700">
                  If your wrestler doesn’t have a full profile on RecruitNC yet, create one so coaches and colleges can find them.
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-[#03154C]">Calendar</p>
                <p className="text-gray-700">
                  Check the NC United calendar for sessions and events:{" "}
                  <a
                    href="https://calendar.ncwrestlingunited.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#03154C] underline hover:no-underline"
                  >
                    calendar.ncwrestlingunited.com
                  </a>
                </p>
              </div>
              <div className="border-t pt-4 flex flex-col gap-2">
                <Link href="/auth/signin">
                  <Button className="w-full bg-[#03154C] hover:bg-[#0a2571] text-white">Sign in to RecruitNC</Button>
                </Link>
                <Link href="/blue">
                  <Button variant="outline" className="w-full">Back to Blue program</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const signInUrl = token ? `/auth/signin?returnTo=${encodeURIComponent(`/blue/register?invite=${token}`)}` : "/auth/signin"

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#03154C]">NC United Blue — Registration</h1>
          <p className="text-gray-600 mt-1">
            {user ? "Fill in your wrestler’s info below." : "Enter your info, then your wrestler’s. Have an account? Sign in first — you’ll come back here."}
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Parent / guardian</CardTitle>
            <CardDescription>
              {user ? (
                <>Signed in as <strong>{user.email}</strong>. This account will manage Blue.</>
              ) : (
                <>Your account will manage this athlete’s Blue membership.</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {user ? (
                <>
                  <p className="text-sm text-gray-700">
                    Signed in as <strong>{user.email}</strong>. This account will manage Blue. We’ll use your saved name and phone.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="parentPhone">Phone (optional — update if needed)</Label>
                    <Input
                      id="parentPhone"
                      type="tel"
                      value={parent.phone}
                      onChange={(e) => setParent((p) => ({ ...p, phone: formatPhoneInput(e.target.value) }))}
                      placeholder="(555) 123-4567"
                      disabled={loading}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="parentFirstName">First name</Label>
                      <Input
                        id="parentFirstName"
                        value={parent.firstName}
                        onChange={(e) => setParent((p) => ({ ...p, firstName: e.target.value }))}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parentLastName">Last name</Label>
                      <Input
                        id="parentLastName"
                        value={parent.lastName}
                        onChange={(e) => setParent((p) => ({ ...p, lastName: e.target.value }))}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parentEmail">Email</Label>
                    <Input
                      id="parentEmail"
                      type="email"
                      value={parent.email}
                      onChange={(e) => handleParentEmailChange(e.target.value)}
                      onBlur={handleParentEmailBlur}
                      required
                      disabled={loading}
                    />
                    {emailChecking && <p className="text-xs text-gray-500">Checking...</p>}
                    {!emailChecking && emailRegistered === true && (
                      <div className="rounded-md border border-[#03154C]/30 bg-[#03154C]/5 p-3 text-sm text-[#03154C]">
                        <p className="font-medium">This email is already registered.</p>
                        <p className="mt-1">Please sign in first — you’ll return here to finish registration.</p>
                        <Link href={signInUrl}>
                          <Button type="button" variant="outline" size="sm" className="mt-2 border-[#03154C] text-[#03154C] hover:bg-[#03154C]/10">
                            Sign in
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parentPassword">Password</Label>
                    <Input
                      id="parentPassword"
                      type="password"
                      value={parent.password}
                      onChange={(e) => setParent((p) => ({ ...p, password: e.target.value }))}
                      placeholder="Min 8 characters"
                      disabled={loading}
                      minLength={8}
                    />
                    <p className="text-xs text-gray-500">
                      Have a RecruitNC account? <Link href={signInUrl} className="text-[#03154C] font-medium hover:underline">Sign in first</Link> — you’ll return to this page.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parentPhone">Phone (optional)</Label>
                    <Input
                      id="parentPhone"
                      type="tel"
                      value={parent.phone}
                      onChange={(e) => setParent((p) => ({ ...p, phone: formatPhoneInput(e.target.value) }))}
                      placeholder="(555) 123-4567"
                      disabled={loading}
                    />
                  </div>
                </>
              )}

              <div className="border-t pt-6">
                  <CardTitle className="text-lg mb-2">Athlete (your wrestler)</CardTitle>
                  <CardDescription className="mb-4">Enter their info. If they already have a RecruitNC profile we will link to it — no duplicate profiles.</CardDescription>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="athleteFirstName">First name</Label>
                      <Input
                        id="athleteFirstName"
                        value={athlete.firstName}
                        onChange={(e) => setAthlete((a) => ({ ...a, firstName: e.target.value }))}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="athleteLastName">Last name</Label>
                      <Input
                        id="athleteLastName"
                        value={athlete.lastName}
                        onChange={(e) => setAthlete((a) => ({ ...a, lastName: e.target.value }))}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="graduationYear">Graduation year</Label>
                      <Input
                        id="graduationYear"
                        type="number"
                        min={2024}
                        max={2035}
                        value={athlete.graduationYear}
                        onChange={(e) => setAthlete((a) => ({ ...a, graduationYear: e.target.value }))}
                        required
                        disabled={loading}
                        placeholder="e.g. 2028"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weightClass">Weight class (optional)</Label>
                      <Input
                        id="weightClass"
                        value={athlete.weightClass}
                        onChange={(e) => setAthlete((a) => ({ ...a, weightClass: e.target.value }))}
                        disabled={loading}
                        placeholder="e.g. 132"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="highSchool">High school</Label>
                    <Input
                      id="highSchool"
                      value={athlete.highSchool}
                      onChange={(e) => setAthlete((a) => ({ ...a, highSchool: e.target.value }))}
                      required
                      disabled={loading}
                      placeholder="School name"
                    />
                  </div>
                </div>

              <div className="border-t pt-6 space-y-2">
                <Label>T-shirt size (required)</Label>
                <Select value={tshirtSize} onValueChange={setTshirtSize} disabled={loading}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {TSHIRT_SIZES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-6 space-y-2">
                <Label htmlFor="promoCode">Scholarship / promo code (optional)</Label>
                <Input
                  id="promoCode"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="e.g. BLUE50"
                  disabled={loading}
                />
              </div>

              <div className="border-t pt-6 space-y-3">
                <CardTitle className="text-lg">Waiver and Release of Liability</CardTitle>
                <div className="max-h-[220px] overflow-y-auto rounded-md border border-input bg-muted/30 p-4 text-sm whitespace-pre-wrap">
                  {WAIVER_TEXT}
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="waiver"
                    checked={waiverAccepted}
                    onCheckedChange={(c) => setWaiverAccepted(c === true)}
                    disabled={loading}
                  />
                  <Label htmlFor="waiver" className="text-sm leading-tight cursor-pointer">
                    I have read and understand this Waiver and Release of Liability and sign it voluntarily on behalf of myself and the minor participant.
                  </Label>
                </div>
              </div>

              {error && (
                <div className="space-y-2">
                  <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">{error}</div>
                  {(error.includes("already registered") || error.includes("Sign in") || error.includes("not signed in")) && token && (
                    <Link href={signInUrl}>
                      <Button type="button" variant="outline" className="w-full border-[#03154C] text-[#03154C] hover:bg-[#03154C]/10">
                        Sign in, then return here
                      </Button>
                    </Link>
                  )}
                </div>
              )}
              {!user && !parent.password && (
                <p className="text-sm text-gray-500">Enter a password above, or sign in to use your existing account.</p>
              )}
              {!user && emailRegistered === true && (
                <p className="text-sm text-amber-700">Sign in above to use your existing account, then submit.</p>
              )}
              <Button
                type="submit"
                className="w-full bg-[#03154C] hover:bg-[#0a2571] text-white"
                disabled={loading || !waiverAccepted || !tshirtSize || (!user && !parent.password) || (!user && emailRegistered === true)}
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</> : "Complete registration"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/blue" className="hover:underline">Back to Blue program</Link>
        </p>
      </div>
    </div>
  )
}
