"use client"

import { useParams } from "next/navigation"
import { useState, FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Lock, ArrowRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { getEventSlugForApi, getEventName, getKnownEventUrlSlugs } from "@/lib/national-team-events"

const WEIGHT_CLASSES = ["106", "113", "120", "126", "132", "138", "145", "152", "160", "170", "182", "195", "220", "285"]
const GRAD_YEARS = ["2026", "2027", "2028", "2029", "2030"]

const NHSCA_2026_EVENT_DETAILS = {
  title: "27th Annual National Duals",
  when: "Memorial Day Weekend · May 23–25, 2026",
  venue: "Virginia Beach Sports Center",
  tagline: "The Largest and Most Competitive Duals Event in the Country",
  weightNote: "3 lb. allowance – 106, 113, 120, 126, 132, 138, 145, 152, 160, 170, 182, 195, 220, 285",
  gradeNote: "Grade levels based on 2025–26 School Year.",
}

const NHSCA_2026_COST = {
  amount: 250,
  dueDate: "Sunday, March 14, 2026",
}

export default function NationalTeamRegisterEventPage() {
  const params = useParams()
  const urlSlug = typeof params.eventSlug === "string" ? params.eventSlug : ""
  const eventSlug = getEventSlugForApi(urlSlug)
  const eventName = getEventName(urlSlug)
  const knownSlugs = getKnownEventUrlSlugs()
  const isUnknownEvent = !urlSlug || !knownSlugs.includes(urlSlug)

  const [step, setStep] = useState<"code" | "form">("code")
  const [code, setCode] = useState("")
  const [codeError, setCodeError] = useState("")
  const [validating, setValidating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  const [athlete_first_name, setAthleteFirstName] = useState("")
  const [athlete_last_name, setAthleteLastName] = useState("")
  const [athlete_email, setAthleteEmail] = useState("")
  const [athlete_phone, setAthletePhone] = useState("")
  const [parent_email, setParentEmail] = useState("")
  const [parent_name, setParentName] = useState("")
  const [high_school, setHighSchool] = useState("")
  const [club_team, setClubTeam] = useState("")
  const [graduation_year, setGraduationYear] = useState("")
  const [weight_class, setWeightClass] = useState("")

  const handleValidateCode = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) {
      setCodeError("Please enter your invite code.")
      return
    }
    setCodeError("")
    setValidating(true)
    try {
      const res = await fetch("/api/national-team/validate-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, eventSlug }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.valid) {
        setStep("form")
      } else {
        setCodeError(data.error || "Invalid or expired invite code.")
      }
    } catch {
      setCodeError("Could not validate code. Please try again.")
    } finally {
      setValidating(false)
    }
  }

  const handleSubmitForm = async (e: FormEvent) => {
    e.preventDefault()
    setFormError("")
    if (!athlete_first_name.trim() || !athlete_last_name.trim() || !athlete_email.trim()) {
      setFormError("Athlete first name, last name, and email are required.")
      return
    }
    if (!parent_email.trim()) {
      setFormError("Parent email is required.")
      return
    }
    if (!high_school.trim() || !graduation_year || !weight_class) {
      setFormError("High school, graduation year, and weight class are required.")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/national-team/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          eventSlug,
          returnUrlSlug: urlSlug,
          athlete_first_name: athlete_first_name.trim(),
          athlete_last_name: athlete_last_name.trim(),
          athlete_email: athlete_email.trim(),
          athlete_phone: athlete_phone.trim() || null,
          parent_email: parent_email.trim(),
          parent_name: parent_name.trim() || null,
          high_school: high_school.trim(),
          club_team: club_team.trim() || null,
          graduation_year: graduation_year.trim(),
          primary_weight: weight_class.trim(),
          secondary_weight: null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }
      setFormError(data.error || "Something went wrong. Please try again.")
    } catch {
      setFormError("Could not submit. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const cancelled = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("cancelled") === "1"

  if (!urlSlug || isUnknownEvent) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">{urlSlug ? "This event is not available." : "Invalid registration link."}</p>
          <a href="/national-team" className="text-[#003366] hover:underline mt-2 inline-block">Back to National Team</a>
        </div>
      </div>
    )
  }

  const isNhsca2026 = urlSlug === "nhsca-2026" || urlSlug === "nhsca-duals-2026"

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-6 text-center">
          {isNhsca2026 && (
            <div className="flex justify-center mb-4">
              <Image
                src="/images/nhsca-logo.png"
                alt="NHSCA"
                width={160}
                height={56}
                className="object-contain"
                priority
              />
            </div>
          )}
          <h1 className="text-2xl font-bold text-[#003366]">{eventName} – Registration</h1>
          <p className="text-gray-600 mt-1">Invite-only. Enter your code to continue.</p>
          <Link href="/national-team" className="text-sm text-[#003366] hover:underline mt-2 inline-block">
            ← Back to National Team
          </Link>
        </div>

        {isNhsca2026 && (
          <>
            <Card className="mb-6 border-[#003366]/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-[#003366]">{NHSCA_2026_EVENT_DETAILS.title}</CardTitle>
                <CardDescription className="text-base font-medium text-gray-700 mt-1">
                  {NHSCA_2026_EVENT_DETAILS.when}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-700">
                <p className="font-medium">{NHSCA_2026_EVENT_DETAILS.venue}</p>
                <p className="italic text-gray-600">{NHSCA_2026_EVENT_DETAILS.tagline}</p>
                <p><strong>Weight classes:</strong> {NHSCA_2026_EVENT_DETAILS.weightNote}</p>
                <p>{NHSCA_2026_EVENT_DETAILS.gradeNote}</p>
              </CardContent>
            </Card>
            <Card className="mb-6 border-[#D3B574]/50 bg-[#003366]/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Cost and what’s included</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="font-semibold text-[#003366] text-base">${NHSCA_2026_COST.amount} — one-time payment at checkout</p>
                <div>
                  <p className="font-medium text-gray-800 mb-1">This cost includes:</p>
                  <ul className="list-disc list-inside text-gray-700 space-y-0.5">
                    <li>Team registration fee</li>
                    <li>Apparel: singlets, shirt, and shorts</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-gray-800 mb-1">This cost does <strong>not</strong> include:</p>
                  <ul className="list-disc list-inside text-gray-700 space-y-0.5">
                    <li>Travel</li>
                    <li>Hotel</li>
                  </ul>
                </div>
                <p className="text-amber-800 font-medium pt-1">Payment due: {NHSCA_2026_COST.dueDate}</p>
              </CardContent>
            </Card>
          </>
        )}

        {cancelled && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <p className="text-amber-800">Checkout was cancelled. You can complete registration below when ready.</p>
            </CardContent>
          </Card>
        )}

        {step === "code" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-[#003366]" />
                Enter your invite code
              </CardTitle>
              <CardDescription>
                You need an invite code from the event organizer to register. Enter it below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleValidateCode} className="space-y-4">
                <div>
                  <Label htmlFor="code">Invite code</Label>
                  <Input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. NHSCA2026-ABC123"
                    className="mt-1 font-mono"
                    autoComplete="off"
                    disabled={validating}
                  />
                  {codeError && <p className="text-sm text-red-600 mt-1">{codeError}</p>}
                </div>
                <Button type="submit" disabled={validating} className="w-full bg-[#003366] hover:bg-[#003366]/90">
                  {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  <span className="ml-2">{validating ? "Checking…" : "Continue"}</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "form" && (
          <Card>
            <CardHeader>
              <CardTitle>Event registration</CardTitle>
              <CardDescription>
                You’re signing up for {eventName} (invite-only). Enter athlete and parent info; you’ll pay the registration + apparel bundle on the next step.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitForm} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="athlete_first_name">Athlete first name *</Label>
                    <Input id="athlete_first_name" value={athlete_first_name} onChange={(e) => setAthleteFirstName(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="athlete_last_name">Athlete last name *</Label>
                    <Input id="athlete_last_name" value={athlete_last_name} onChange={(e) => setAthleteLastName(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="athlete_email">Athlete email *</Label>
                  <Input id="athlete_email" type="email" value={athlete_email} onChange={(e) => setAthleteEmail(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="athlete_phone">Athlete phone</Label>
                  <Input id="athlete_phone" type="tel" value={athlete_phone} onChange={(e) => setAthletePhone(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="parent_email">Parent/guardian email *</Label>
                  <Input id="parent_email" type="email" value={parent_email} onChange={(e) => setParentEmail(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="parent_name">Parent/guardian name</Label>
                  <Input id="parent_name" value={parent_name} onChange={(e) => setParentName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="high_school">High school *</Label>
                  <Input id="high_school" value={high_school} onChange={(e) => setHighSchool(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="club_team">Club team</Label>
                  <Input id="club_team" value={club_team} onChange={(e) => setClubTeam(e.target.value)} placeholder="Optional" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Graduation year *</Label>
                    <Select value={graduation_year} onValueChange={setGraduationYear} required>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {GRAD_YEARS.map((y) => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Weight class *</Label>
                    <Select value={weight_class} onValueChange={setWeightClass} required>
                      <SelectTrigger><SelectValue placeholder="Select agreed weight" /></SelectTrigger>
                      <SelectContent>
                        {WEIGHT_CLASSES.map((w) => (
                          <SelectItem key={w} value={w}>{w} lbs</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  <strong>Weights are +3 lbs.</strong> The team is registered for early weigh-ins. Select the weight class you agreed to.
                </p>
                {formError && <p className="text-sm text-red-600">{formError}</p>}
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setStep("code")} disabled={submitting}>
                    Back
                  </Button>
                  <Button type="submit" disabled={submitting} className="flex-1 bg-[#003366] hover:bg-[#003366]/90">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    <span className="ml-2">{submitting ? "Redirecting to payment…" : "Continue to payment"}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
