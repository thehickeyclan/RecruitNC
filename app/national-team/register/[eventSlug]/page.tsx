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
import Image from "next/image"
import { getEventSlugForApi, getEventName, getKnownEventUrlSlugs } from "@/lib/national-team-events"
import {
  AAU_SCHOLASTIC_WEIGHT_CLASSES,
  NHSCA_INTEREST_WEIGHT_CLASSES,
  formatNationalTeamWeightLabel,
} from "@/lib/national-team-weight-classes"
import {
  AAU_SCHOLASTIC_DUALS_2026,
  AAU_SCHOLASTIC_OPERATIONS,
  AAU_SCHOLASTIC_TEAM_LABEL,
  AAU_SCHOLASTIC_WEIGHTS_DISPLAY,
} from "@/lib/aau-scholastic-duals-2026-content"
import {
  AauScholasticCheckoutItems,
  aauScholasticDefaultLineQuantities,
} from "@/components/national-team/aau-scholastic-checkout-items"
import {
  aauScholasticLineQuantitiesFromRecord,
  validateAauScholasticApparelSizes,
  aauScholasticLineSelectionsFromQuantities,
  type AauScholasticApparelSizesInput,
} from "@/lib/aau-scholastic-duals-2026-content"
import {
  aauPageClass,
  aauPanelClass,
  aauPanelDescClass,
  aauPanelHeaderClass,
  aauPanelTitleClass,
  aauPrimaryBtnClass,
  aauInputClass,
  aauFormLabelClass,
  aauAccentHeaderClass,
} from "@/components/national-team/aau-scholastic-theme"
import { scholasticLinkClass } from "@/components/national-team/scholastic-duals-section"
import {
  NcUnitedCodeAcknowledgment,
  NcUnitedCodeConductRequiredDialog,
  NC_UNITED_CODE_ACK_ID,
} from "@/components/national-team/nc-united-code-registration-note"
import { cn } from "@/lib/utils"

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
  const isAauRegistration = eventSlug === "aau-2026"
  const registerWeightClasses = isAauRegistration
    ? [...AAU_SCHOLASTIC_WEIGHT_CLASSES]
    : [...NHSCA_INTEREST_WEIGHT_CLASSES]
  const registerWeightLabelVariant = isAauRegistration ? "aau" : "nhsca"

  const [step, setStep] = useState<"code" | "form">(isAauRegistration ? "form" : "code")
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
  const [lineQuantities, setLineQuantities] = useState<Record<string, number>>(() => aauScholasticDefaultLineQuantities())
  const [apparelSizes, setApparelSizes] = useState<AauScholasticApparelSizesInput>({
    singletSize: "",
    shortsSize: "",
    longSleeveSize: "",
    teeSize: "",
  })
  const [itemsError, setItemsError] = useState("")
  const [sizesError, setSizesError] = useState("")
  const [codeOfConductAccepted, setCodeOfConductAccepted] = useState(false)
  const [codeConductDialogOpen, setCodeConductDialogOpen] = useState(false)
  const [codeAckHighlighted, setCodeAckHighlighted] = useState(false)

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
    if (!athlete_first_name.trim() || !athlete_last_name.trim()) {
      setFormError("Athlete first and last name are required.")
      return
    }
    if (!parent_email.trim()) {
      setFormError("Parent email is required.")
      return
    }
    if (isAauRegistration && !parent_name.trim()) {
      setFormError("Parent/guardian name is required.")
      return
    }
    if (!isAauRegistration) {
      if (!athlete_email.trim()) {
        setFormError("Athlete email is required.")
        return
      }
      if (!high_school.trim() || !graduation_year || !weight_class) {
        setFormError("High school, graduation year, and weight class are required.")
        return
      }
    }
    if (isAauRegistration && aauScholasticLineQuantitiesFromRecord(lineQuantities).length === 0) {
      setItemsError("Select at least one item to checkout.")
      return
    }
    if (isAauRegistration) {
      const selections = aauScholasticLineSelectionsFromQuantities(
        aauScholasticLineQuantitiesFromRecord(lineQuantities),
      )
      const apparelErr = validateAauScholasticApparelSizes(selections, apparelSizes)
      if (apparelErr) {
        setSizesError(apparelErr)
        return
      }
    }
    setSizesError("")
    setItemsError("")
    if (!codeOfConductAccepted) {
      setCodeConductDialogOpen(true)
      setCodeAckHighlighted(true)
      requestAnimationFrame(() => {
        document.getElementById(NC_UNITED_CODE_ACK_ID)?.scrollIntoView({ behavior: "smooth", block: "center" })
      })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/national-team/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isAauRegistration ? {} : { code: code.trim() }),
          eventSlug,
          returnUrlSlug: urlSlug,
          athlete_first_name: athlete_first_name.trim(),
          athlete_last_name: athlete_last_name.trim(),
          parent_email: parent_email.trim(),
          parent_name: parent_name.trim() || null,
          code_of_conduct_accepted: true,
          ...(isAauRegistration
            ? {
                selectedLines: aauScholasticLineQuantitiesFromRecord(lineQuantities),
                singlet_size: apparelSizes.singletSize,
                shorts_size: apparelSizes.shortsSize,
                long_sleeve_size: apparelSizes.longSleeveSize,
                tee_size: apparelSizes.teeSize,
              }
            : {
                athlete_email: athlete_email.trim(),
                athlete_phone: athlete_phone.trim() || null,
                high_school: high_school.trim(),
                club_team: club_team.trim() || null,
                graduation_year: graduation_year.trim(),
                primary_weight: weight_class.trim(),
                secondary_weight: null,
              }),
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

  const isNhsca2026 =
    urlSlug === "nhsca-2026" || urlSlug === "nhsca-duals-2026" || urlSlug === "nhsca-duals-2026-select"

  const pageShellClass = isAauRegistration ? aauPageClass : "min-h-screen bg-gray-50 text-gray-900"
  const pageInnerClass = isAauRegistration ? "max-w-xl mx-auto py-8 px-4 sm:px-6" : "max-w-xl mx-auto py-8 px-4"
  const pageTitleClass = isAauRegistration ? "text-2xl font-bold text-white" : "text-2xl font-bold text-[#003366]"
  const pageDescClass = isAauRegistration ? "text-white/70 mt-1" : "text-gray-600 mt-1"
  const backLinkClass = isAauRegistration
    ? cn("text-sm mt-2 inline-block min-h-[44px] leading-[44px]", scholasticLinkClass)
    : "text-sm text-[#003366] hover:underline mt-2 inline-block"

  return (
    <div className={pageShellClass}>
      <div className={pageInnerClass}>
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
          <h1 className={pageTitleClass}>{eventName} – Registration</h1>
          <p className={pageDescClass}>
            {isAauRegistration
              ? "Enter athlete and parent info, select items, and pay at Stripe checkout."
              : "Invite-only. Enter your code to continue."}
          </p>
          <a
            href={isAauRegistration ? "/national-team/scholastic-duals-2026" : "/national-team"}
            className={backLinkClass}
          >
            ← {isAauRegistration ? "Back to Scholastic Duals info" : "Back to National Team"}
          </a>
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

        {isAauRegistration && (
          <article className={cn(aauPanelClass, "mb-6")}>
            <header className={cn(aauPanelHeaderClass, aauAccentHeaderClass)}>
              <h2 className={aauPanelTitleClass}>{AAU_SCHOLASTIC_OPERATIONS.eventName}</h2>
              <p className={aauPanelDescClass}>
                {AAU_SCHOLASTIC_OPERATIONS.dates} — {AAU_SCHOLASTIC_OPERATIONS.datesDetail}
              </p>
            </header>
            <div className="p-4 sm:p-5 md:p-6 space-y-2 text-sm text-white/80">
              <p className="font-medium text-white">
                {AAU_SCHOLASTIC_DUALS_2026.venue}
                <br />
                {AAU_SCHOLASTIC_DUALS_2026.venueAddress}
              </p>
              <p className="italic text-white/60">{AAU_SCHOLASTIC_DUALS_2026.tagline}</p>
              <p>
                <strong className="text-white">Weight classes:</strong> {AAU_SCHOLASTIC_WEIGHTS_DISPLAY}
              </p>
              <p>
                <strong className="text-white">Allowance:</strong> +5 lbs (see certification rules on the{" "}
                <a href="/national-team/scholastic-duals-2026#weights" className={scholasticLinkClass}>
                  Scholastic Duals info page
                </a>
                )
              </p>
            </div>
          </article>
        )}

        {cancelled && (
          isAauRegistration ? (
            <div className="mb-6 rounded-2xl border border-[#B31B1B]/30 bg-[#B31B1B]/15 px-4 py-3 text-sm text-white/90">
              Checkout was cancelled. You can complete registration below when ready.
            </div>
          ) : (
            <Card className="mb-6 border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <p className="text-amber-800">Checkout was cancelled. You can complete registration below when ready.</p>
              </CardContent>
            </Card>
          )
        )}

        {!isAauRegistration && step === "code" && (
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
          isAauRegistration ? (
            <article className={aauPanelClass}>
              <header className={aauPanelHeaderClass}>
                <h2 className={aauPanelTitleClass}>Event registration</h2>
                <p className={aauPanelDescClass}>
                  Enter athlete and parent contact info, select what you need, then pay at Stripe checkout. School,
                  weight, and other roster details are pulled from RecruitNC when we match the athlete name.
                </p>
              </header>
              <div className="p-4 sm:p-5 md:p-6">
                <form onSubmit={handleSubmitForm} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="athlete_first_name" className={aauFormLabelClass}>Athlete first name *</Label>
                      <Input id="athlete_first_name" className={aauInputClass} value={athlete_first_name} onChange={(e) => setAthleteFirstName(e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor="athlete_last_name" className={aauFormLabelClass}>Athlete last name *</Label>
                      <Input id="athlete_last_name" className={aauInputClass} value={athlete_last_name} onChange={(e) => setAthleteLastName(e.target.value)} required />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="parent_name" className={aauFormLabelClass}>Parent/guardian name *</Label>
                    <Input id="parent_name" className={aauInputClass} value={parent_name} onChange={(e) => setParentName(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="parent_email" className={aauFormLabelClass}>Parent/guardian email *</Label>
                    <Input id="parent_email" type="email" className={aauInputClass} value={parent_email} onChange={(e) => setParentEmail(e.target.value)} required />
                  </div>
                  <p className="text-sm text-white/70">
                    Registering more than one athlete? Submit a separate registration for each wrestler.
                  </p>
                  <AauScholasticCheckoutItems
                    lineQuantities={lineQuantities}
                    onChange={setLineQuantities}
                    apparelSizes={apparelSizes}
                    onApparelSizesChange={setApparelSizes}
                    disabled={submitting}
                    error={itemsError || null}
                    sizesError={sizesError || null}
                    variant="dark"
                  />
                  {formError && <p className="text-sm text-red-400">{formError}</p>}
                  <NcUnitedCodeAcknowledgment
                    variant="dark"
                    checked={codeOfConductAccepted}
                    onCheckedChange={(value) => {
                      setCodeOfConductAccepted(value)
                      if (value) setCodeAckHighlighted(false)
                    }}
                    highlighted={codeAckHighlighted}
                    disabled={submitting}
                  />
                  <Button
                    type="submit"
                    disabled={submitting}
                    className={cn(aauPrimaryBtnClass, "w-full font-bold")}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    <span className="ml-2">{submitting ? "Redirecting to payment…" : "Continue to payment"}</span>
                  </Button>
                </form>
              </div>
            </article>
          ) : (
          <Card>
            <CardHeader>
              <CardTitle>Event registration</CardTitle>
              <CardDescription>
                {isAauRegistration
                  ? `Register for ${eventName}. Select the items you want, then pay securely at Stripe checkout.`
                  : `You’re signing up for ${eventName} (invite-only). Enter athlete and parent info; you’ll pay the registration + apparel bundle on the next step.`}
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
                      <SelectTrigger><SelectValue placeholder={isAauRegistration ? "Select weight" : "Select agreed weight"} /></SelectTrigger>
                      <SelectContent>
                        {registerWeightClasses.map((w) => (
                          <SelectItem key={w} value={w}>
                            {formatNationalTeamWeightLabel(w, registerWeightLabelVariant)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  <strong>Weights are {isAauRegistration ? "+5 lbs" : "+3 lbs"}.</strong>{" "}
                  {isAauRegistration
                    ? `Select the weight class your athlete is wrestling for ${AAU_SCHOLASTIC_TEAM_LABEL}.`
                    : "The team is registered for early weigh-ins. Select the weight class you agreed to."}
                </p>
                {isAauRegistration ? (
                  <AauScholasticCheckoutItems
                    lineQuantities={lineQuantities}
                    onChange={setLineQuantities}
                    apparelSizes={apparelSizes}
                    onApparelSizesChange={setApparelSizes}
                    disabled={submitting}
                    error={itemsError || null}
                    sizesError={sizesError || null}
                  />
                ) : null}
                {formError && <p className="text-sm text-red-600">{formError}</p>}
                <NcUnitedCodeAcknowledgment
                  checked={codeOfConductAccepted}
                  onCheckedChange={(value) => {
                    setCodeOfConductAccepted(value)
                    if (value) setCodeAckHighlighted(false)
                  }}
                  highlighted={codeAckHighlighted}
                  disabled={submitting}
                />
                <div className="flex gap-3 pt-2">
                  {!isAauRegistration ? (
                    <Button type="button" variant="outline" onClick={() => setStep("code")} disabled={submitting}>
                      Back
                    </Button>
                  ) : null}
                  <Button type="submit" disabled={submitting} className="flex-1 bg-[#003366] hover:bg-[#003366]/90">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    <span className="ml-2">{submitting ? "Redirecting to payment…" : "Continue to payment"}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          )
        )}
      </div>
      <NcUnitedCodeConductRequiredDialog open={codeConductDialogOpen} onOpenChange={setCodeConductDialogOpen} />
    </div>
  )
}
