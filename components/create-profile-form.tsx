"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PublicImageUpload } from "@/components/public-image-upload"
import { AlertCircle, CheckCircle, GraduationCap, Instagram, Link2, Phone, School, User } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { getCurrentSigningClass } from "@/lib/commit-class-year"
import { ACADEMIC_MAJOR_OPTIONS, ACADEMIC_MAJOR_OTHER, resolveAcademicMajor } from "@/lib/academic-majors"

const HS_WEIGHT_CLASSES = {
  Male: [
    { value: "106", label: "106 lbs" },
    { value: "113", label: "113 lbs" },
    { value: "120", label: "120 lbs" },
    { value: "126", label: "126 lbs" },
    { value: "132", label: "132 lbs" },
    { value: "138", label: "138 lbs" },
    { value: "144", label: "144 lbs" },
    { value: "150", label: "150 lbs" },
    { value: "157", label: "157 lbs" },
    { value: "165", label: "165 lbs" },
    { value: "175", label: "175 lbs" },
    { value: "190", label: "190 lbs" },
    { value: "215", label: "215 lbs" },
    { value: "285", label: "285 lbs" },
  ],
  Female: [
    { value: "100", label: "100 lbs" },
    { value: "107", label: "107 lbs" },
    { value: "114", label: "114 lbs" },
    { value: "120", label: "120 lbs" },
    { value: "126", label: "126 lbs" },
    { value: "132", label: "132 lbs" },
    { value: "138", label: "138 lbs" },
    { value: "145", label: "145 lbs" },
    { value: "152", label: "152 lbs" },
    { value: "165", label: "165 lbs" },
    { value: "185", label: "185 lbs" },
    { value: "235", label: "235 lbs" },
  ],
}

/** Last year's class through four ahead — everyone still in high school, plus a recent grad. */
const GRADUATION_YEARS = Array.from({ length: 6 }, (_, i) => getCurrentSigningClass() - 1 + i)

const FIELD =
  "border-rnc-line bg-rnc-ink text-white placeholder:text-white/30 focus-visible:ring-rnc-gold focus-visible:ring-offset-0"

function Section({
  title,
  icon,
  note,
  children,
}: {
  title: string
  icon: React.ReactNode
  note?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-sm border border-rnc-line bg-rnc-surface/70 p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-rnc-gold">
        {icon}
        {title}
      </h2>
      {note ? <p className="mt-1.5 text-sm leading-6 text-white/50">{note}</p> : null}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

interface ProfileFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  gender: string
  graduationYear: string
  weightClass: string
  highSchool: string
  wrestlingClub: string
  academicGpa: string
  academicSat: string
  academicAct: string
  academicMajor: string
  academicMajorOther: string
  highlightVideoUrl: string
  instagram: string
  twitter: string
  bio: string
  photoUrl: string
}

/**
 * The profile form itself, with no auth in it — the page decides who may see it.
 * Split out so the markup can be rendered and reviewed without a signed-in session.
 */
export function CreateProfileForm({ accountEmail }: { accountEmail: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: "",
    lastName: "",
    email: accountEmail,
    phone: "",
    gender: "",
    graduationYear: "",
    weightClass: "",
    highSchool: "",
    wrestlingClub: "",
    academicGpa: "",
    academicSat: "",
    academicAct: "",
    academicMajor: "",
    academicMajorOther: "",
    highlightVideoUrl: "",
    instagram: "",
    twitter: "",
    bio: "",
    photoUrl: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [prefilledFromRankings, setPrefilledFromRankings] = useState(false)
  const [existingCandidate, setExistingCandidate] = useState<{
    athleteId: string
    athleteName: string
    highschool: string
    graduationYear: number
  } | null>(null)
  const [forceCreate, setForceCreate] = useState(false)

  // Auth resolves after first render, so the email arrives late.
  useEffect(() => {
    if (accountEmail) setFormData((prev) => (prev.email ? prev : { ...prev, email: accountEmail }))
  }, [accountEmail])

  // Pre-fill from rankings "New profile" link (e.g. Class of 2028)
  useEffect(() => {
    if (prefilledFromRankings) return
    const firstName = searchParams.get("firstName")?.trim()
    const lastName = searchParams.get("lastName")?.trim()
    const highSchool = searchParams.get("highSchool")?.trim()
    const graduationYear = searchParams.get("graduationYear")?.trim()
    if (firstName || lastName || highSchool || graduationYear) {
      setFormData((prev) => ({
        ...prev,
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(highSchool && { highSchool }),
        ...(graduationYear && { graduationYear }),
      }))
      setPrefilledFromRankings(true)
    }
  }, [searchParams, prefilledFromRankings])

  const handleChange = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  function buildPayload(force: boolean): Record<string, unknown> {
    const rankParam = searchParams.get("rank")
    const prospectRanking =
      rankParam != null && rankParam !== "" ? Math.min(30, Math.max(1, Number.parseInt(rankParam, 10))) : undefined

    const payload: Record<string, unknown> = {
      ...formData,
      academicInterest: resolveAcademicMajor(formData.academicMajor, formData.academicMajorOther),
      forceCreate: force ? true : undefined,
    }
    if (Number.isFinite(prospectRanking)) payload.prospect_ranking = prospectRanking
    return payload
  }

  async function createProfile(force: boolean) {
    setIsSubmitting(true)
    setError("")
    try {
      const response = await fetch("/api/profile/create-athlete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(force)),
      })

      const data = await response.json()
      if (response.ok && data.confirmRequired && data.athleteId) {
        setExistingCandidate({
          athleteId: data.athleteId,
          athleteName: data.athleteName || `${formData.firstName} ${formData.lastName}`,
          highschool: data.highschool || formData.highSchool || "",
          graduationYear: data.graduationYear ?? Number.parseInt(String(formData.graduationYear), 10),
        })
        setError("")
        return
      }
      if (response.ok && data.athleteId) {
        setForceCreate(false)
        window.location.href = `/view-profile?id=${encodeURIComponent(data.athleteId)}`
        return
      }
      if (response.ok) {
        setSuccess(true)
      } else {
        setError(
          data.details ? `${data.error || "Failed to create profile"}: ${data.details}` : data.error || "Failed to create profile",
        )
      }
    } catch {
      setError("An error occurred while creating your profile")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createProfile(forceCreate)
  }

  const handleClaimExisting = async () => {
    if (!existingCandidate) return
    setIsSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/profile/claim-existing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId: existingCandidate.athleteId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to link profile")
      setExistingCandidate(null)
      window.location.href = `/view-profile?id=${encodeURIComponent(data.athleteId)}`
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not link profile")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateNewAnyway = async () => {
    setExistingCandidate(null)
    setForceCreate(true)
    await createProfile(true)
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rnc-ink p-4 text-white">
        <div className="w-full max-w-2xl rounded-sm border border-rnc-line bg-rnc-surface p-8 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-400" />
          <h1 className="mt-4 text-3xl font-black">Your profile is live</h1>
          <p className="mt-2 leading-7 text-white/65">
            Add your achievements and tournament results from your profile page — that is where coaches look first.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => router.push("/profile")}
              variant="outline"
              className="rounded-sm border-rnc-line bg-transparent text-white hover:bg-white/10"
            >
              View my account
            </Button>
            <Button onClick={() => router.push("/prospects/all")} className="rounded-sm bg-rnc-red text-white hover:bg-rnc-red-hover">
              Browse all profiles
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (existingCandidate) {
    return (
      <>
        <div className="flex min-h-screen items-center justify-center bg-rnc-ink p-4 text-white">
          <div className="w-full max-w-2xl rounded-sm border border-rnc-gold/40 bg-rnc-surface p-6">
            <h1 className="text-2xl font-black text-rnc-gold">We found an existing profile</h1>
            <p className="mt-2 text-white/70">
              Is this you? Linking to it keeps your rankings and results in one place.
            </p>
            {error ? (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="mt-4 rounded-sm border border-rnc-line bg-rnc-ink p-4">
              <p className="font-bold text-white">
                {existingCandidate.athleteName}
                {existingCandidate.highschool && ` · ${existingCandidate.highschool}`}
                {` · Class of ${existingCandidate.graduationYear}`}
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                onClick={handleClaimExisting}
                disabled={isSubmitting}
                className="rounded-sm bg-rnc-red text-white hover:bg-rnc-red-hover"
              >
                {isSubmitting ? "Linking…" : "Yes, this is me"}
              </Button>
              <Button
                variant="outline"
                onClick={handleCreateNewAnyway}
                disabled={isSubmitting}
                className="rounded-sm border-rnc-line bg-transparent text-white hover:bg-white/10"
              >
                No, create a new profile
              </Button>
            </div>
          </div>
        </div>
      </>
    )
  }

  const weightClassOptions = formData.gender
    ? HS_WEIGHT_CLASSES[formData.gender as keyof typeof HS_WEIGHT_CLASSES] || []
    : []

  return (
      <div className="min-h-screen bg-rnc-ink text-white">
        <header className="border-b border-rnc-line bg-rnc-raised">
          <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
            <h1 className="text-4xl font-black leading-[1.05] sm:text-5xl">
              Create your <span className="text-rnc-gold">athlete profile</span>
            </h1>
            <p className="mt-3 max-w-xl leading-7 text-white/65">
              College coaches search RecruitNC by class, weight, GPA and test scores. The more of this you fill in, the
              more searches you turn up in.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          {error ? (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Section title="Athlete" icon={<User className="h-3.5 w-3.5" />}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="firstName" className="text-white/80">
                    First name *
                  </Label>
                  <Input
                    id="firstName"
                    className={`mt-1.5 ${FIELD}`}
                    value={formData.firstName}
                    onChange={(e) => handleChange("firstName", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-white/80">
                    Last name *
                  </Label>
                  <Input
                    id="lastName"
                    className={`mt-1.5 ${FIELD}`}
                    value={formData.lastName}
                    onChange={(e) => handleChange("lastName", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label className="text-white/80">Gender *</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleChange("gender", value)}>
                    <SelectTrigger className={`mt-1.5 w-full ${FIELD}`}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white/80">Graduation year *</Label>
                  <Select
                    value={formData.graduationYear}
                    onValueChange={(value) => handleChange("graduationYear", value)}
                  >
                    <SelectTrigger className={`mt-1.5 w-full ${FIELD}`}>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADUATION_YEARS.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          Class of {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-white/80">Weight class *</Label>
                  <Select
                    value={formData.weightClass}
                    onValueChange={(value) => handleChange("weightClass", value)}
                    disabled={!formData.gender}
                  >
                    <SelectTrigger className={`mt-1.5 w-full ${FIELD}`}>
                      <SelectValue placeholder={formData.gender ? "Select weight class" : "Select gender first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {weightClassOptions.map((wc) => (
                        <SelectItem key={wc.value} value={wc.value}>
                          {wc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Section>

            <Section title="School & club" icon={<School className="h-3.5 w-3.5" />}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="highSchool" className="text-white/80">
                    High school *
                  </Label>
                  <Input
                    id="highSchool"
                    className={`mt-1.5 ${FIELD}`}
                    value={formData.highSchool}
                    onChange={(e) => handleChange("highSchool", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="wrestlingClub" className="text-white/80">
                    Wrestling club
                  </Label>
                  <Input
                    id="wrestlingClub"
                    className={`mt-1.5 ${FIELD}`}
                    value={formData.wrestlingClub}
                    onChange={(e) => handleChange("wrestlingClub", e.target.value)}
                    placeholder="e.g. Darkhorse, RAW"
                  />
                </div>
              </div>
            </Section>

            <Section
              title="Contact"
              icon={<Phone className="h-3.5 w-3.5" />}
              note="Your number is how college coaches reach you. It is never shown publicly — only verified coaches and RecruitNC staff can see it."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="email" className="text-white/80">
                    Email
                  </Label>
                  <Input id="email" type="email" value={formData.email} disabled className={`mt-1.5 ${FIELD} opacity-60`} />
                  <p className="mt-1 text-xs text-white/35">Using your account email</p>
                </div>
                <div>
                  <Label htmlFor="phone" className="text-white/80">
                    Cell number *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    className={`mt-1.5 ${FIELD}`}
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>
              </div>
            </Section>

            <Section
              title="Academics"
              icon={<GraduationCap className="h-3.5 w-3.5" />}
              note="Coaches filter by GPA and test scores, and academic fit is often the first conversation. Leave anything blank you don't have yet — you can add it later."
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="academicGpa" className="text-white/80">
                    GPA
                  </Label>
                  <Input
                    id="academicGpa"
                    type="number"
                    step="0.01"
                    min="0"
                    max="5"
                    className={`mt-1.5 ${FIELD}`}
                    value={formData.academicGpa}
                    onChange={(e) => handleChange("academicGpa", e.target.value)}
                    placeholder="3.60"
                  />
                </div>
                <div>
                  <Label htmlFor="academicSat" className="text-white/80">
                    SAT
                  </Label>
                  <Input
                    id="academicSat"
                    type="number"
                    min="400"
                    max="1600"
                    className={`mt-1.5 ${FIELD}`}
                    value={formData.academicSat}
                    onChange={(e) => handleChange("academicSat", e.target.value)}
                    placeholder="1200"
                  />
                </div>
                <div>
                  <Label htmlFor="academicAct" className="text-white/80">
                    ACT
                  </Label>
                  <Input
                    id="academicAct"
                    type="number"
                    min="1"
                    max="36"
                    className={`mt-1.5 ${FIELD}`}
                    value={formData.academicAct}
                    onChange={(e) => handleChange("academicAct", e.target.value)}
                    placeholder="26"
                  />
                </div>
              </div>
              <div>
                <Label className="text-white/80">Major you want to study</Label>
                <Select value={formData.academicMajor} onValueChange={(value) => handleChange("academicMajor", value)}>
                  <SelectTrigger className={`mt-1.5 w-full ${FIELD}`}>
                    <SelectValue placeholder="Select a major (or Undecided)" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACADEMIC_MAJOR_OPTIONS.map((major) => (
                      <SelectItem key={major} value={major}>
                        {major}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.academicMajor === ACADEMIC_MAJOR_OTHER ? (
                  <Input
                    className={`mt-2 ${FIELD}`}
                    value={formData.academicMajorOther}
                    onChange={(e) => handleChange("academicMajorOther", e.target.value)}
                    placeholder="Which major?"
                  />
                ) : null}
              </div>
            </Section>

            <Section
              title="Photo, film & socials"
              icon={<Link2 className="h-3.5 w-3.5" />}
              note="Film is the single thing coaches ask for most. A highlight reel or a full match both work."
            >
              {/* The uploader is shared with light-themed admin pages, so its own greys are
                  retargeted here rather than changed at the source. */}
              <div className="max-w-sm">
                <PublicImageUpload
                  className="border-rnc-line bg-rnc-ink text-white [&_.bg-gray-100]:bg-rnc-surface [&_.border-gray-200]:border-rnc-line [&_.text-gray-400]:text-white/30 [&_.text-gray-500]:text-white/40 [&_.text-muted-foreground]:text-white/45"
                  athleteId="temp-profile"
                  athleteName={`${formData.firstName} ${formData.lastName}`.trim() || "New Athlete"}
                  onUploadComplete={(url) => handleChange("photoUrl", url)}
                />
              </div>
              <div>
                <Label htmlFor="highlightVideoUrl" className="text-white/80">
                  Highlight video
                </Label>
                <Input
                  id="highlightVideoUrl"
                  className={`mt-1.5 ${FIELD}`}
                  value={formData.highlightVideoUrl}
                  onChange={(e) => handleChange("highlightVideoUrl", e.target.value)}
                  placeholder="YouTube, Hudl or Flo link"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="instagram" className="flex items-center gap-1.5 text-white/80">
                    <Instagram className="h-3.5 w-3.5 text-rnc-gold" />
                    Instagram
                  </Label>
                  <Input
                    id="instagram"
                    className={`mt-1.5 ${FIELD}`}
                    value={formData.instagram}
                    onChange={(e) => handleChange("instagram", e.target.value)}
                    placeholder="@yourhandle"
                  />
                </div>
                <div>
                  <Label htmlFor="twitter" className="text-white/80">
                    X (Twitter)
                  </Label>
                  <Input
                    id="twitter"
                    className={`mt-1.5 ${FIELD}`}
                    value={formData.twitter}
                    onChange={(e) => handleChange("twitter", e.target.value)}
                    placeholder="@yourhandle"
                  />
                </div>
              </div>
            </Section>

            <Section title="About you" icon={<User className="h-3.5 w-3.5" />}>
              <div>
                <Label htmlFor="bio" className="text-white/80">
                  Short bio
                </Label>
                <Textarea
                  id="bio"
                  className={`mt-1.5 ${FIELD}`}
                  value={formData.bio}
                  onChange={(e) => handleChange("bio", e.target.value)}
                  placeholder="Your wrestling journey, your style, what you're looking for in a program…"
                  rows={4}
                />
              </div>
            </Section>

            <div className="rounded-sm border border-rnc-gold/25 bg-rnc-gold/5 p-5">
              <h3 className="text-sm font-bold text-rnc-gold">What happens next</h3>
              <ul className="mt-2 space-y-1.5 text-sm leading-6 text-white/65">
                <li>· Your profile goes live straight away and you land on it.</li>
                {/* Achievements are one-per-entry on the profile. A single box here produced one
                    long blob of text that nothing could read back as individual placings. */}
                <li>· Add your achievements and tournament results there — one at a time, so they show properly.</li>
                <li>· Everything on this page stays editable from your profile.</li>
              </ul>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-sm bg-rnc-red py-6 text-base font-bold text-white hover:bg-rnc-red-hover sm:w-auto sm:px-10"
            >
              {isSubmitting ? "Creating…" : "Create profile & go live"}
            </Button>
          </form>
        </div>
      </div>
  )
}
