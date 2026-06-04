"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { formatPhoneForDisplay, formatPhoneInput, normalizePhoneForStorage } from "@/lib/phone-format"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { HardLink } from "@/components/hard-link"
import { useAuth } from "@/contexts/auth-context"
import {
  type BlueRegisterAthleteOption,
  type BlueRegisterContext,
} from "@/lib/blue-register-resolve"
import {
  NC_UNITED_LIABILITY_WAIVER_CHECKBOX_LABEL,
  NC_UNITED_LIABILITY_WAIVER_TEXT,
} from "@/lib/nc-united-liability-waiver"

const TSHIRT_SIZES = ["YS", "YM", "YL", "S", "M", "L", "XL", "2XL", "3XL"] as const
const BLUE_SHIRT_FALLBACK =
  "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/eNZzhlbUPjwSpRAahxEPt-Blue%20Team%20Photo.png"

type AthleteForm = {
  firstName: string
  lastName: string
  graduationYear: string
  highSchool: string
  wrestlingClub: string
  weightClass: string
  cellPhone: string
  email: string
  gpa: string
  highestAchievement: string
  interestWrestlingCollege: boolean
}

const emptyAthleteForm = (): AthleteForm => ({
  firstName: "",
  lastName: "",
  graduationYear: "",
  highSchool: "",
  wrestlingClub: "",
  weightClass: "",
  cellPhone: "",
  email: "",
  gpa: "",
  highestAchievement: "",
  interestWrestlingCollege: false,
})

function athleteToForm(a: BlueRegisterAthleteOption | null): AthleteForm {
  if (!a) return emptyAthleteForm()
  return {
    firstName: a.firstName,
    lastName: a.lastName,
    graduationYear: a.graduationYear ? String(a.graduationYear) : "",
    highSchool: a.highSchool,
    wrestlingClub: a.wrestlingClub,
    weightClass: a.weightClass,
    cellPhone: formatPhoneForDisplay(a.cellPhone),
    email: a.email,
    gpa: a.gpa,
    highestAchievement: a.highestAchievement || "",
    interestWrestlingCollege: false,
  }
}

export default function BlueRegisterPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("invite")?.trim() || ""
  const returnTo = token ? `/blue/register?invite=${encodeURIComponent(token)}` : "/blue/register"

  const { isAuthenticated, isLoading: authLoading, user } = useAuth()

  const [validating, setValidating] = useState(!!token)
  const [valid, setValid] = useState<boolean | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const [contextLoading, setContextLoading] = useState(false)
  const [context, setContext] = useState<BlueRegisterContext | null>(null)

  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("")
  const [parentPhone, setParentPhone] = useState("")
  const [parentFirstName, setParentFirstName] = useState("")
  const [parentLastName, setParentLastName] = useState("")
  const [athlete, setAthlete] = useState<AthleteForm>(emptyAthleteForm())

  const [promoCode, setPromoCode] = useState("")
  const [waiverAccepted, setWaiverAccepted] = useState(false)
  const [tshirtSize, setTshirtSize] = useState("")
  const [blueShirtUrl, setBlueShirtUrl] = useState(BLUE_SHIRT_FALLBACK)

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch("/api/blue/content")
      .then((r) => r.json())
      .then((data) => {
        if (data?.blue_shirt) setBlueShirtUrl(data.blue_shirt)
      })
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
        setInviteError(data.error || null)
      })
      .catch(() => {
        if (!cancelled) {
          setValid(false)
          setInviteError("Could not validate link.")
        }
      })
      .finally(() => {
        if (!cancelled) setValidating(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const loadContext = useCallback(async () => {
    setContextLoading(true)
    setError(null)
    try {
      const r = await fetch("/api/blue/register-context", { credentials: "include" })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error ?? "Could not load your profile.")
      }
      const data = (await r.json()) as BlueRegisterContext
      setContext(data)
      setParentFirstName(data.parent.firstName)
      setParentLastName(data.parent.lastName)
      setParentPhone(formatPhoneForDisplay(data.parent.phone))

      const eligible = data.athletes.filter((a) => !a.alreadyInBlue)
      if (eligible.length === 1) {
        setSelectedAthleteId(eligible[0].id)
        setAthlete(athleteToForm(eligible[0]))
      } else if (eligible.length === 0 && data.athletes.length === 0) {
        setSelectedAthleteId("")
        setAthlete(emptyAthleteForm())
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your profile.")
      setContext(null)
    } finally {
      setContextLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated && valid) void loadContext()
  }, [isAuthenticated, valid, loadContext])

  const selectedAthlete = useMemo(
    () => context?.athletes.find((a) => a.id === selectedAthleteId) ?? null,
    [context, selectedAthleteId],
  )

  const eligibleAthletes = useMemo(
    () => (context?.athletes ?? []).filter((a) => !a.alreadyInBlue),
    [context],
  )

  const parentMissing = context?.parentMissingFields ?? []
  const athleteMissing = useMemo(() => {
    if (selectedAthlete) return selectedAthlete.missingFields
    return [
      "firstName",
      "lastName",
      "graduationYear",
      "highSchool",
      "weightClass",
      "wrestlingClub",
      "cellPhone",
      "email",
      "gpa",
    ]
  }, [selectedAthlete])

  const needsAthletePicker = eligibleAthletes.length > 1
  const noLinkedAthletes = (context?.athletes.length ?? 0) === 0

  function onSelectAthlete(id: string) {
    setSelectedAthleteId(id)
    const row = eligibleAthletes.find((a) => a.id === id) ?? null
    setAthlete(athleteToForm(row))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!waiverAccepted) {
      setError("Accept the waiver to continue.")
      return
    }
    if (!tshirtSize) {
      setError("Select a t-shirt size.")
      return
    }

    const gradYear = parseInt(athlete.graduationYear, 10)
    if (athleteMissing.includes("graduationYear") && !Number.isFinite(gradYear)) {
      setError("Enter a valid graduation year.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/blue/signup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token || undefined,
          waiverAccepted,
          tshirtSize,
          promoCode: promoCode.trim() || undefined,
          athleteId: selectedAthleteId || undefined,
          parent: {
            firstName: parentMissing.includes("firstName") ? parentFirstName : undefined,
            lastName: parentMissing.includes("lastName") ? parentLastName : undefined,
            phone: parentMissing.includes("phone") ? normalizePhoneForStorage(parentPhone) : undefined,
          },
          athlete: {
            firstName: athleteMissing.includes("firstName") ? athlete.firstName : undefined,
            lastName: athleteMissing.includes("lastName") ? athlete.lastName : undefined,
            graduationYear: athleteMissing.includes("graduationYear") ? gradYear : undefined,
            highSchool: athleteMissing.includes("highSchool") ? athlete.highSchool : undefined,
            weightClass: athleteMissing.includes("weightClass") ? athlete.weightClass : undefined,
            wrestlingClub: athleteMissing.includes("wrestlingClub") ? athlete.wrestlingClub : undefined,
            cellPhone: athleteMissing.includes("cellPhone") ? normalizePhoneForStorage(athlete.cellPhone) : undefined,
            email: athleteMissing.includes("email") ? athlete.email : undefined,
            gpa: athleteMissing.includes("gpa") ? athlete.gpa : undefined,
            highestAchievement: athlete.highestAchievement || undefined,
            interestWrestlingCollege: athlete.interestWrestlingCollege,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Registration failed.")
        return
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }
      setError("No checkout URL returned. Please try again.")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (validating || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#03154C]" />
      </div>
    )
  }

  if (!valid && token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-[#03154C]">Invalid or expired link</CardTitle>
            <CardDescription>{inviteError || "This registration link is invalid or has already been used."}</CardDescription>
          </CardHeader>
          <CardContent>
            <HardLink href="/blue/register">
              <Button variant="outline" className="w-full">
                Use main registration link
              </Button>
            </HardLink>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-[#03154C]">Sign in to join Blue</CardTitle>
            <CardDescription>
              Use your RecruitNC account — we&apos;ll pull your info so you don&apos;t re-type it. Same login manages
              billing and your athlete&apos;s recruiting profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <HardLink href={`/auth/signin?returnTo=${encodeURIComponent(returnTo)}`}>
              <Button className="w-full bg-[#03154C] hover:bg-[#0a2571] text-white">Sign in</Button>
            </HardLink>
            <HardLink href={`/auth/signup?returnTo=${encodeURIComponent(returnTo)}`}>
              <Button variant="outline" className="w-full">
                Create free RecruitNC account
              </Button>
            </HardLink>
            <HardLink href="/blue" className="block text-center text-sm text-muted-foreground hover:underline">
              Back to Blue program
            </HardLink>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (contextLoading || !context) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-[#03154C]" />
          <p className="mt-4 text-gray-600">Loading your profile…</p>
        </div>
      </div>
    )
  }

  const parentLabel = [context.parent.firstName, context.parent.lastName].filter(Boolean).join(" ") || user?.email || "Parent"

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#03154C]">NC United Blue</h1>
          <p className="text-gray-600 mt-1">Signed in as {parentLabel}. We use your RecruitNC profile — only fill gaps below.</p>
          <p className="text-sm text-[#03154C]/80 mt-2">
            After joining, complete your athlete&apos;s{" "}
            <HardLink href="/profile" className="font-medium underline">
              RecruitNC recruiting profile
            </HardLink>{" "}
            so college coaches can find them.
          </p>
        </div>

        <div className="mb-6 rounded-xl border-2 border-[#03154C]/20 bg-[#03154C]/5 p-4 text-center">
          <p className="font-semibold text-[#03154C]">$55/month</p>
          <p className="text-sm text-[#03154C]/90 mt-1">Training, national competition, and year-round development.</p>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border-2 border-[#D3B574]/50 bg-white">
          <div className="flex-shrink-0 w-full sm:w-[140px] overflow-hidden rounded-lg">
            <Image src={blueShirtUrl} alt="NC United Blue shirt" width={140} height={160} className="h-auto w-full object-contain" unoptimized />
          </div>
          <p className="text-sm text-gray-700">
            Pick up your Blue shirt at your first practice — <strong>Sundays 1–3 PM</strong>, UNC Fetzer Hall.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <section className="rounded-lg bg-muted/40 p-4 text-sm space-y-1">
                <p className="font-semibold text-[#03154C]">Billing account</p>
                <p>{context.parent.email}</p>
                {!parentMissing.length ? (
                  <p className="text-muted-foreground">
                    {context.parent.firstName} {context.parent.lastName}
                    {context.parent.phone ? ` · ${formatPhoneForDisplay(context.parent.phone)}` : ""}
                  </p>
                ) : null}
              </section>

              {(parentMissing.includes("firstName") || parentMissing.includes("lastName")) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {parentMissing.includes("firstName") && (
                    <div className="space-y-2">
                      <Label htmlFor="parentFirstName">Your first name</Label>
                      <Input id="parentFirstName" value={parentFirstName} onChange={(e) => setParentFirstName(e.target.value)} required disabled={loading} />
                    </div>
                  )}
                  {parentMissing.includes("lastName") && (
                    <div className="space-y-2">
                      <Label htmlFor="parentLastName">Your last name</Label>
                      <Input id="parentLastName" value={parentLastName} onChange={(e) => setParentLastName(e.target.value)} required disabled={loading} />
                    </div>
                  )}
                </div>
              )}

              {parentMissing.includes("phone") && (
                <div className="space-y-2">
                  <Label htmlFor="parentPhone">Your cell phone</Label>
                  <Input
                    id="parentPhone"
                    type="tel"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(formatPhoneInput(e.target.value))}
                    required
                    disabled={loading}
                  />
                </div>
              )}

              <div className="border-t pt-6 space-y-4">
                <div>
                  <CardTitle className="text-lg">Wrestler</CardTitle>
                  <CardDescription>
                    {noLinkedAthletes
                      ? "Link your athlete on Profile first, or enter their info below."
                      : "Select your wrestler — we already have their RecruitNC profile."}
                  </CardDescription>
                </div>

                {needsAthletePicker && (
                  <div className="space-y-2">
                    <Label>Who is joining Blue?</Label>
                    <Select value={selectedAthleteId} onValueChange={onSelectAthlete} disabled={loading}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select wrestler" />
                      </SelectTrigger>
                      <SelectContent>
                        {eligibleAthletes.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {eligibleAthletes.length === 0 && context.athletes.length > 0 && (
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">
                    All linked wrestlers already have Blue.{" "}
                    <HardLink href="/profile" className="underline font-medium">
                      Profile
                    </HardLink>
                  </p>
                )}

                {selectedAthlete && athleteMissing.length === 0 && (
                  <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-md p-3">
                    <strong>{selectedAthlete.name}</strong> — profile complete. Choose shirt size and continue.
                  </p>
                )}

                {noLinkedAthletes && (
                  <p className="text-sm text-muted-foreground">
                    Tip:{" "}
                    <HardLink href="/profile" className="text-[#03154C] underline">
                      Add your athlete on Profile
                    </HardLink>{" "}
                    first next time — registration will be even faster.
                  </p>
                )}

                {(noLinkedAthletes || (selectedAthleteId && athleteMissing.length > 0)) && (
                  <div className="space-y-4">
                    {(athleteMissing.includes("firstName") || athleteMissing.includes("lastName")) && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {athleteMissing.includes("firstName") && (
                          <div className="space-y-2">
                            <Label>First name</Label>
                            <Input value={athlete.firstName} onChange={(e) => setAthlete((a) => ({ ...a, firstName: e.target.value }))} required disabled={loading} />
                          </div>
                        )}
                        {athleteMissing.includes("lastName") && (
                          <div className="space-y-2">
                            <Label>Last name</Label>
                            <Input value={athlete.lastName} onChange={(e) => setAthlete((a) => ({ ...a, lastName: e.target.value }))} required disabled={loading} />
                          </div>
                        )}
                      </div>
                    )}
                    {(athleteMissing.includes("graduationYear") || athleteMissing.includes("weightClass")) && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {athleteMissing.includes("graduationYear") && (
                          <div className="space-y-2">
                            <Label>Graduation year</Label>
                            <Input type="number" min={2024} max={2035} value={athlete.graduationYear} onChange={(e) => setAthlete((a) => ({ ...a, graduationYear: e.target.value }))} required disabled={loading} />
                          </div>
                        )}
                        {athleteMissing.includes("weightClass") && (
                          <div className="space-y-2">
                            <Label>Weight class</Label>
                            <Input value={athlete.weightClass} onChange={(e) => setAthlete((a) => ({ ...a, weightClass: e.target.value }))} required disabled={loading} />
                          </div>
                        )}
                      </div>
                    )}
                    {athleteMissing.includes("highSchool") && (
                      <div className="space-y-2">
                        <Label>High school</Label>
                        <Input value={athlete.highSchool} onChange={(e) => setAthlete((a) => ({ ...a, highSchool: e.target.value }))} required disabled={loading} />
                      </div>
                    )}
                    {athleteMissing.includes("wrestlingClub") && (
                      <div className="space-y-2">
                        <Label>Club</Label>
                        <Input value={athlete.wrestlingClub} onChange={(e) => setAthlete((a) => ({ ...a, wrestlingClub: e.target.value }))} required disabled={loading} />
                      </div>
                    )}
                    {(athleteMissing.includes("cellPhone") || athleteMissing.includes("email")) && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {athleteMissing.includes("cellPhone") && (
                          <div className="space-y-2">
                            <Label>Cell phone</Label>
                            <Input type="tel" value={athlete.cellPhone} onChange={(e) => setAthlete((a) => ({ ...a, cellPhone: formatPhoneInput(e.target.value) }))} required disabled={loading} />
                          </div>
                        )}
                        {athleteMissing.includes("email") && (
                          <div className="space-y-2">
                            <Label>Email</Label>
                            <Input type="email" value={athlete.email} onChange={(e) => setAthlete((a) => ({ ...a, email: e.target.value }))} required disabled={loading} />
                          </div>
                        )}
                      </div>
                    )}
                    {athleteMissing.includes("gpa") && (
                      <div className="space-y-2">
                        <Label>GPA</Label>
                        <Input value={athlete.gpa} onChange={(e) => setAthlete((a) => ({ ...a, gpa: e.target.value }))} required disabled={loading} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>T-shirt size</Label>
                <Select value={tshirtSize} onValueChange={setTshirtSize} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {TSHIRT_SIZES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="promoCode">Promo code (optional)</Label>
                <Input id="promoCode" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} disabled={loading} />
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="max-h-[180px] overflow-y-auto rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
                  {NC_UNITED_LIABILITY_WAIVER_TEXT}
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox id="waiver" checked={waiverAccepted} onCheckedChange={(c) => setWaiverAccepted(c === true)} disabled={loading} />
                  <Label htmlFor="waiver" className="text-sm leading-tight cursor-pointer">
                    {NC_UNITED_LIABILITY_WAIVER_CHECKBOX_LABEL}
                  </Label>
                </div>
              </div>

              {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">{error}</div>}

              <Button
                type="submit"
                className="w-full bg-[#03154C] hover:bg-[#0a2571] text-white"
                disabled={
                  loading ||
                  !waiverAccepted ||
                  !tshirtSize ||
                  (eligibleAthletes.length > 0 && !selectedAthleteId) ||
                  (context.athletes.length > 0 && eligibleAthletes.length === 0)
                }
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Continue…
                  </>
                ) : (
                  "Continue to payment"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
