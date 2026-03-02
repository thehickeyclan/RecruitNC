"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
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
const PARENT_RELATIONSHIPS = ["Father", "Mother", "Guardian", "Other"] as const
const HIGHEST_ACHIEVEMENTS = ["All American", "State Champion", "State Placer", "State Qualifier", "None"] as const
/** Fallback if API fails — matches Blue page default. */
const BLUE_SHIRT_FALLBACK = "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/eNZzhlbUPjwSpRAahxEPt-Blue%20Team%20Photo.png"

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

  const [validating, setValidating] = useState(!!token)
  const [valid, setValid] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const [parent, setParent] = useState({ email: "", firstName: "", lastName: "", phone: "", relationship: "" })
  const [athlete, setAthlete] = useState({
    firstName: "",
    lastName: "",
    graduationYear: "",
    highSchool: "",
    wrestlingClub: "",
    weightClass: "",
    cellPhone: "",
    email: "",
    gpa: "",
    interestWrestlingCollege: false,
    highestAchievement: "",
  })
  const [promoCode, setPromoCode] = useState("")
  const [waiverAccepted, setWaiverAccepted] = useState(false)
  const [tshirtSize, setTshirtSize] = useState<string>("")
  const [blueShirtUrl, setBlueShirtUrl] = useState<string>(BLUE_SHIRT_FALLBACK)

  useEffect(() => {
    fetch("/api/blue/content")
      .then((r) => r.json())
      .then((data) => { if (data?.blue_shirt) setBlueShirtUrl(data.blue_shirt) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!token) {
      setValidating(false)
      setValid(true)
      return
    }
    let cancelled = false
    fetch(`/api/blue/invites/validate?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setValid(data.valid === true)
        if (data.email) setParent((p) => ({ ...p, email: data.email }))
        setError(data.error || null)
      })
      .catch(() => {
        if (!cancelled) setValid(false)
        setError("Could not validate link.")
      })
      .finally(() => {
        if (!cancelled) setValidating(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

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
    if (!parent.relationship) {
      setError("Please select your relationship to the athlete.")
      return
    }
    if (!parent.phone.trim()) {
      setError("Parent cell phone is required.")
      return
    }
    if (!athlete.wrestlingClub.trim()) {
      setError("Athlete club is required.")
      return
    }
    if (!athlete.cellPhone.trim()) {
      setError("Athlete cell phone is required.")
      return
    }
    if (!athlete.email.trim()) {
      setError("Athlete email is required.")
      return
    }
    if (!athlete.gpa.trim()) {
      setError("Athlete GPA is required.")
      return
    }
    if (!athlete.highestAchievement) {
      setError("Please select highest level achievement.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/blue/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token || undefined,
          waiverAccepted,
          tshirtSize,
          promoCode: promoCode.trim() || undefined,
          parent: {
            email: parent.email,
            firstName: parent.firstName,
            lastName: parent.lastName,
            phone: parent.phone ? normalizePhoneForStorage(parent.phone) : undefined,
            relationship: parent.relationship || undefined,
          },
          athlete: {
            firstName: athlete.firstName,
            lastName: athlete.lastName,
            graduationYear: gradYear,
            highSchool: athlete.highSchool,
            wrestlingClub: athlete.wrestlingClub || undefined,
            weightClass: athlete.weightClass || undefined,
            cellPhone: athlete.cellPhone ? normalizePhoneForStorage(athlete.cellPhone) : undefined,
            email: athlete.email || undefined,
            gpa: athlete.gpa || undefined,
            interestWrestlingCollege: athlete.interestWrestlingCollege,
            highestAchievement: athlete.highestAchievement || undefined,
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

  if (!valid && token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-[#03154C]">Invalid or expired link</CardTitle>
            <CardDescription>{error || "This registration link is invalid or has already been used."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/blue/register">
              <Button variant="outline" className="w-full">Use main registration link</Button>
            </Link>
            <Link href="/blue" className="block mt-2">
              <Button variant="ghost" className="w-full">Back to Blue program</Button>
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
              <CardTitle className="text-[#03154C]">You're in — welcome to NC United Blue</CardTitle>
              <CardDescription>Your athlete is signed up. Complete payment to finish.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/blue">
                <Button className="w-full bg-[#03154C] hover:bg-[#0a2571] text-white">Back to Blue program</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#03154C]">NC United Blue — Registration</h1>
          <p className="text-gray-600 mt-1">Enter parent and athlete info below. No account required.</p>
          <p className="mt-3">
            <Link href="/blue" className="text-sm font-medium text-[#03154C] hover:text-[#0a2571] hover:underline">
              Learn more about the Blue program →
            </Link>
          </p>
        </div>

        <div className="mb-6 rounded-xl border-2 border-[#03154C]/20 bg-[#03154C]/5 p-4 text-center">
          <p className="font-semibold text-[#03154C]">$55/month</p>
          <p className="text-sm text-[#03154C]/90 mt-1">
            Joins NC&apos;s elite community: training with top wrestlers and college coaches, national competition, mentorship, and year-round development.
          </p>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border-2 border-[#D3B574]/50 bg-white">
          <div className="flex-shrink-0 w-full sm:w-[180px] overflow-hidden rounded-lg">
            <Image
              src={blueShirtUrl}
              alt="NC United Blue shirt — symbol of membership"
              width={180}
              height={200}
              className="h-auto w-full object-contain"
              unoptimized
            />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-[#03154C]">Your Blue shirt</p>
            <p className="text-sm text-gray-700 mt-1">
              After you complete registration and payment, stop by the <strong>NC United booth — Suite 109</strong> at the State Championships to pick up your Blue shirt and complete your check-in.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Parent / guardian</CardTitle>
            <CardDescription>Your contact info for this Blue membership.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  onChange={(e) => setParent((p) => ({ ...p, email: e.target.value }))}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentPhone">Cell phone</Label>
                <Input
                  id="parentPhone"
                  type="tel"
                  value={parent.phone}
                  onChange={(e) => setParent((p) => ({ ...p, phone: formatPhoneInput(e.target.value) }))}
                  placeholder="(555) 123-4567"
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentRelationship">Relationship to athlete</Label>
                <Select
                  value={parent.relationship}
                  onValueChange={(v) => setParent((p) => ({ ...p, relationship: v }))}
                  disabled={loading}
                >
                  <SelectTrigger id="parentRelationship" className="w-full">
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {PARENT_RELATIONSHIPS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-6">
                <CardTitle className="text-lg mb-2">Athlete (your wrestler)</CardTitle>
                <CardDescription className="mb-4">Wrestler info and t-shirt size.</CardDescription>
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
                <div className="space-y-2 mt-4">
                  <Label htmlFor="wrestlingClub">Club</Label>
                  <Input
                    id="wrestlingClub"
                    value={athlete.wrestlingClub}
                    onChange={(e) => setAthlete((a) => ({ ...a, wrestlingClub: e.target.value }))}
                    required
                    disabled={loading}
                    placeholder="Club name"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="athleteCellPhone">Athlete cell phone</Label>
                    <Input
                      id="athleteCellPhone"
                      type="tel"
                      value={athlete.cellPhone}
                      onChange={(e) => setAthlete((a) => ({ ...a, cellPhone: formatPhoneInput(e.target.value) }))}
                      placeholder="(555) 123-4567"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="athleteEmail">Athlete email</Label>
                    <Input
                      id="athleteEmail"
                      type="email"
                      value={athlete.email}
                      onChange={(e) => setAthlete((a) => ({ ...a, email: e.target.value }))}
                      required
                      disabled={loading}
                      placeholder="athlete@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <Label htmlFor="athleteGpa">GPA</Label>
                  <Input
                    id="athleteGpa"
                    value={athlete.gpa}
                    onChange={(e) => setAthlete((a) => ({ ...a, gpa: e.target.value }))}
                    required
                    disabled={loading}
                    placeholder="e.g. 3.5"
                  />
                </div>
                <div className="space-y-2 mt-4">
                  <Label>Highest level achievement</Label>
                  <Select
                    value={athlete.highestAchievement}
                    onValueChange={(v) => setAthlete((a) => ({ ...a, highestAchievement: v }))}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select highest achievement" />
                    </SelectTrigger>
                    <SelectContent>
                      {HIGHEST_ACHIEVEMENTS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-start gap-3 mt-4">
                  <Checkbox
                    id="interestCollege"
                    checked={athlete.interestWrestlingCollege}
                    onCheckedChange={(c) => setAthlete((a) => ({ ...a, interestWrestlingCollege: c === true }))}
                    disabled={loading}
                  />
                  <Label htmlFor="interestCollege" className="text-sm leading-tight cursor-pointer">
                    Interested in wrestling in college?
                  </Label>
                </div>
                <div className="space-y-2 mt-4">
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
              </div>

              <div className="border-t pt-6 space-y-2">
                <Label htmlFor="promoCode">Scholarship / promo code (optional)</Label>
                <Input
                  id="promoCode"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
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
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">{error}</div>
              )}

              <Button
                type="submit"
                className="w-full bg-[#03154C] hover:bg-[#0a2571] text-white"
                disabled={loading || !waiverAccepted || !tshirtSize}
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</> : "Continue to payment"}
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
