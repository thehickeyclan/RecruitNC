"use client"

import { BrandText } from "@/components/recruiting/brand-name"
import { CoachProgramField } from "@/components/recruiting/coach-program-field"
import type { CoachProgram } from "@/lib/recruiting/coach-program"
import type React from "react"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AlertCircle, ChevronLeft, ChevronRight, Flag, GraduationCap, Heart, Shield, Trophy, Users } from "lucide-react"

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"
import { EMPTY_CONSENT, SignupConsent, type ConsentState } from "@/components/auth/signup-consent"
import { cellNotice, checkConsent } from "@/lib/legal/consent"
import { suggestEmailFix } from "@/lib/email-typo"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CollegeField } from "@/components/auth/college-field"
import { Label } from "@/components/ui/label"

function authIntentForPath(path: string | null) {
  const target = path || ""

  // From the Insider page: the free account first, then Insider's checkout (Matt, 29 Oct 2026).
  if (target.startsWith("/membership")) {
    return {
      badge: "STEP 1: FREE ACCOUNT",
      title: "Create your free RecruitNC account, then start Insider",
      description: "Make the account, then choose Insider: every published ranking, and which colleges viewed your profile.",
      bullets: ["Every published class ranking", "Which college programs viewed your profile", "Cancel anytime"],
    }
  }

  if (target.startsWith("/public-rankings") || target.startsWith("/rankings") || target.startsWith("/admin/rankings")) {
    return {
      badge: "RANKINGS ACCESS",
      title: "Create your free account for RecruitNC rankings",
      description:
        "Rankings are an account feature so RecruitNC can protect the work, personalize your view, and keep future premium access tied to your profile.",
      bullets: ["View RecruitNC prospect rankings", "Track ranked athletes and updates", "Use ranking tools tied to your account"],
    }
  }

  if (target.includes("submit-profile") || target.includes("create-profile") || target.includes("/edit") || target.includes("claim") || target.startsWith("/athletes/")) {
    return {
      badge: "PROFILE ACCESS",
      title: "Create your free account to manage profiles",
      description:
        "Create, claim, or edit an athlete profile with protected recruiting details and profile activity tied to the right account.",
      bullets: ["Claim or create an athlete profile", "Update results, school, bio, and recruiting info", "See profile-view analytics when connected"],
    }
  }

  if (target.startsWith("/calendar")) {
    return {
      badge: "EVENT ACCESS",
      title: "Create your free account for RecruitNC events",
      description:
        "Public schedules are easy to browse, but account access lets you manage registrations, reminders, and event-specific tools.",
      bullets: ["Access event registrations", "Manage reminders and account-specific actions", "Use NC United calendar tools"],
    }
  }

  if (target.startsWith("/tournament-of-champions")) {
    return {
      badge: "TOC ACCESS",
      title: "Create your free account for TOC actions",
      description:
        "The Tournament of Champions page is public, but protected actions like confirmations, payments, nominations, and personalized tools require an account.",
      bullets: ["Confirm or manage invite-related actions", "Access protected TOC forms and tools", "Keep Tournament of Champions updates tied to your account"],
    }
  }

  if (target.startsWith("/admin")) {
    return {
      badge: "ADMIN ACCESS",
      title: "Create your free account",
      description:
        "Admin areas are limited to approved RecruitNC operators and event staff. Create an account only if you’ve been asked to help with a protected workflow.",
      bullets: ["Request access through an approved account", "Keep changes tied to the signed-in user", "Use protected RecruitNC workflows after approval"],
    }
  }

  return {
    badge: "100% FREE • NO CREDIT CARD REQUIRED",
    title: "Create Your Free RecruitNC Account",
    description:
      "Rankings, profile management, recruiting tools, and account-specific activity live behind a free account.",
    bullets: ["Create, claim, and update athlete profiles", "View rankings plus profile analytics and activity", "Data Dawg, wallet, Blue, messaging, and alerts"],
  }
}

type Role = "athlete" | "parent" | "college-coach" | "hs-club-coach" | "referee" | "fan"

/**
 * Step one. Every role is a card and one must be picked: the old form made this an optional
 * dropdown halfway down the page, so coaches signed up as nobody and never got access.
 */
const ROLES: Array<{ value: Role; title: string; blurb: string; icon: typeof Trophy }> = [
  { value: "athlete", title: "Athlete", blurb: "Claim and manage your wrestling profile", icon: Trophy },
  { value: "parent", title: "Parent", blurb: "Manage your wrestler's profile and recruiting", icon: Users },
  { value: "college-coach", title: "College coach", blurb: "Free rankings and athlete profiles, instantly", icon: GraduationCap },
  { value: "hs-club-coach", title: "High school or club coach", blurb: "Follow your wrestlers and events", icon: Shield },
  { value: "referee", title: "Referee", blurb: "Officials and event staff", icon: Flag },
  { value: "fan", title: "Fan", blurb: "Follow commitments, rankings and results", icon: Heart },
]

const isRole = (value: string | null): value is Role => ROLES.some((r) => r.value === value)

function track(event: string, returnTo: string | null, extra: Record<string, unknown> = {}) {
  void fetch("/api/track-funnel-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({ event, path: "/auth/signup", target: returnTo || null, source: "signup_page", ...extra }),
  }).catch(() => {})
}

/**
 * Sign-up as a two-step wizard: who are you, then only the fields that role needs.
 *
 * College coaches are created by /api/auth/coach-signup - already confirmed, let straight in,
 * reviewed by staff afterwards - and signed in on the spot. Everyone else goes through
 * /api/auth/signup and confirms their email as before. Google sits on step two and carries the
 * role with it, so /auth/complete-profile only asks what Google cannot supply.
 *
 * `?type=college-coach` opens straight on the coach step; /auth/coach-signup redirects here with it.
 */
function SignUpWizard() {
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo")
  const authIntent = authIntentForPath(returnTo)
  const presetType = searchParams.get("type")

  const [profileType, setProfileType] = useState<Role | null>(isRole(presetType) ? presetType : null)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [cellPhone, setCellPhone] = useState("")
  const [consent, setConsent] = useState<ConsentState>(EMPTY_CONSENT)
  const [accountExists, setAccountExists] = useState(false)
  /*
   * The form is long on a phone and the confirmation short, so it opened at the bottom (Matt, 31 Oct
   * 2026). Scrolled after it renders, and "instant": a smooth scroll is cut off by the re-render.
   */
  useEffect(() => {
    if (success) window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
  }, [success])
  const [college, setCollege] = useState("")
  const [program, setProgram] = useState<CoachProgram | null>(null)
  const [website, setWebsite] = useState("")

  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState("")
  const [resendMessage, setResendMessage] = useState("")
  const [success, setSuccess] = useState(false)

  // "Did you mean gmail.com?" - a mistyped domain is an account that can never be confirmed.
  const emailFix = suggestEmailFix(email)

  const isCollegeCoach = profileType === "college-coach"
  const roleNeedsPhone = profileType === "athlete" || profileType === "parent" || isCollegeCoach
  const role = ROLES.find((r) => r.value === profileType) ?? null

  useEffect(() => {
    track("signup_started", returnTo)
  }, [returnTo])

  const pickRole = (value: Role) => {
    setProfileType(value)
    setError("")
    track("signup_role_chosen", returnTo, { role: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setAccountExists(false)
    if (!profileType) return
    if (roleNeedsPhone && cellPhone.replace(/\D/g, "").length < 10) {
      setError("Enter a 10-digit cell number.")
      return
    }
    if (isCollegeCoach && !college.trim()) {
      setError("Enter your college.")
      return
    }
    if (isCollegeCoach && !program) {
      setError("Choose the program you coach: men's, women's or both.")
      return
    }
    if (emailFix) {
      setError(`Check your email address. Did you mean ${emailFix}?`)
      return
    }
    const agreed = checkConsent(consent, profileType, isCollegeCoach ? "coach" : "email")
    if (!agreed.ok) {
      setError(agreed.error)
      return
    }
    setLoading(true)
    track("signup_submitted", returnTo, { role: profileType })

    try {
      if (isCollegeCoach) {
        const res = await fetch("/api/auth/coach-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, lastName, email, cellPhone, college, program, password, website, consent }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Something went wrong. Please try again.")
        track("signup_completed", returnTo, { role: profileType })

        // No email step for coaches: sign in with the password they just chose and go.
        const signIn = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email: email.trim(), password }),
        })
        /*
         * First run gets a signpost. A coach arrives wanting North Carolina wrestlers and lands on
         * a rankings table, which teaches them that is all this is; the modal names the other two
         * places and the scouting report. The flag rides on the destination so it survives a
         * returnTo, and the modal strips it on dismissal.
         */
        const landing =
          returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/my-recruits"
        const destination = `${landing}${landing.includes("?") ? "&" : "?"}welcome=coach`
        window.location.replace(signIn.ok ? destination : `/auth/signin?returnTo=${encodeURIComponent(destination)}`)
        return
      }

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
          email: email.trim(),
          password,
          cellPhone: cellPhone.trim() || undefined,
          profileType,
          returnTo: returnTo || undefined,
          website,
          consent,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if ((data as { code?: string })?.code === "exists") setAccountExists(true)
        throw new Error((data as { error?: string; message?: string })?.error || (data as { message?: string })?.message || `An error occurred during sign up (${res.status})`)
      }
      track("signup_completed", returnTo, { role: profileType })
      track("verification_email_sent", returnTo)
      setSuccess(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred during sign up. Please try again."
      track("signup_error", returnTo, { message })
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setResending(true)
    setResendMessage("")
    try {
      track("verification_resend_requested", returnTo)
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), returnTo: returnTo || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      setResendMessage(res.ok ? "Verification email resent. Check inbox, spam, or promotions." : data.error || "Could not resend verification email.")
    } catch {
      setResendMessage("Could not resend verification email. Please try again.")
    } finally {
      setResending(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-start pt-20 md:items-center md:pt-0 justify-center profile-surface bg-[#0A1628] px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Account created — one last step</CardTitle>
            <CardDescription>
              We sent a verification link to <span className="font-semibold">{email}</span>. <BrandText text="Tap that link to activate your free RecruitNC account." />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Claiming a profile needs a verified email. You can keep browsing while you check your inbox.
              </p>
              <p className="text-sm text-muted-foreground">
                If you don&apos;t see the email within a minute, check spam, junk, promotions, or school/work email filters.
              </p>
              {resendMessage ? <p className="text-sm text-[#D3B574]">{resendMessage}</p> : null}
              <Button className="w-full" onClick={handleResendVerification} disabled={resending}>
                {resending ? "Sending..." : "Resend verification email"}
              </Button>
              <Button
                className="w-full bg-transparent"
                variant="outline"
                onClick={() => window.location.href = `/auth/signin${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
              >
                I verified — go to sign in
              </Button>
              <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2">
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/" target="_top" rel="noopener"><BrandText text="Browse RecruitNC" /></Link>
                </Button>
                <Button asChild variant="ghost" className="ncu-only w-full">
                  <Link href="/news/united-ascent" target="_top" rel="noopener">United Ascent News</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-start justify-center profile-surface bg-[#0A1628] px-4 pb-8 pt-8 md:items-center md:pt-0">
      <div className="w-full max-w-xl space-y-5">
        <div className="text-center">
          <Badge className="mb-3 bg-[#D3B574] px-3 py-1 text-xs font-bold text-white">{authIntent.badge}</Badge>
          <h1 className="text-2xl font-bold text-white md:text-3xl"><BrandText text={authIntent.title} /></h1>
        </div>

        <Card className="w-full shadow-lg">
          {!role ? (
            <>
              <CardHeader>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 1 of 2</p>
                <CardTitle>Who are you?</CardTitle>
                <CardDescription>We&apos;ll only ask for what you need.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {ROLES.map(({ value, title, blurb, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => pickRole(value)}
                    className="flex w-full items-center gap-4 rounded-lg border border-border bg-[#0A1628] p-4 text-left transition-colors hover:border-[#D3B574] hover:bg-white/5"
                  >
                    <Icon className="h-6 w-6 flex-shrink-0 text-white" aria-hidden />
                    <span className="flex-1">
                      <span className="block font-semibold text-white">{title}</span>
                      <span className="block text-sm text-muted-foreground">{blurb}</span>
                    </span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden />
                  </button>
                ))}
                <p className="pt-3 text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    href={`/auth/signin${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
                    className="text-[#D3B574] hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <button
                  type="button"
                  onClick={() => {
                    setProfileType(null)
                    setError("")
                  }}
                  className="mb-1 inline-flex w-fit items-center gap-1 text-sm text-[#D3B574] hover:underline"
                  disabled={loading}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden /> Change
                </button>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 2 of 2 · {role.title}</p>
                <CardTitle>{isCollegeCoach ? "Get your free coach access" : "Create your account"}</CardTitle>
                <CardDescription>
                  {isCollegeCoach
                    ? "No email to confirm. You'll go straight to your Coach Home."
                    : "We'll email you a link to confirm your address."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {error}
                      {accountExists ? (
                        <>
                          {" "}
                          <a
                            href={`/auth/signin${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
                            className="font-bold underline underline-offset-2"
                          >
                            Sign in
                          </a>
                        </>
                      ) : null}
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First name</Label>
                      <Input id="firstName" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required disabled={loading} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last name</Label>
                      <Input id="lastName" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} required disabled={loading} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
                    {emailFix ? (
                      <button type="button" onClick={() => setEmail(emailFix)} className="text-left text-sm text-amber-700 underline">
                        Did you mean {emailFix}?
                      </button>
                    ) : null}
                  </div>

                  {roleNeedsPhone ? (
                    <div className="space-y-2">
                      <Label htmlFor="cellPhone">Cell</Label>
                      <Input id="cellPhone" type="tel" inputMode="tel" autoComplete="tel" value={cellPhone} onChange={(e) => setCellPhone(e.target.value)} required disabled={loading} />
                      <p className="text-xs leading-5 text-muted-foreground">{cellNotice(isCollegeCoach ? "college-coach" : profileType)}</p>
                    </div>
                  ) : null}

                  {isCollegeCoach ? (
                    <CollegeField value={college} onChange={setCollege} disabled={loading} />
                  ) : null}

                  {isCollegeCoach ? <CoachProgramField value={program} onChange={setProgram} disabled={loading} /> : null}

                  <div className="space-y-2">
                    <Label htmlFor="password">Create a password</Label>
                    <Input id="password" type="password" autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} />
                  </div>

                  {/* Honeypot: hidden from people, filled in by bots. Coach sign-up checks it. */}
                  <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                    <label htmlFor="website">Website</label>
                    <input id="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </div>

                  <SignupConsent role={profileType} value={consent} onChange={setConsent} disabled={loading} />

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating your account…" : isCollegeCoach ? "Get access" : "Create account"}
                  </Button>
                  {isCollegeCoach ? (
                    <p className="text-xs leading-5 text-muted-foreground">
                      Families see that your program viewed their wrestler&apos;s profile, never which coach.{" "}
                      <a href="/privacy#coach-views" className="underline">Privacy</a>
                    </p>
                  ) : null}
                </form>

                {/* Coaches owe us a cell and a college, which Google does not have; /auth/complete-profile
                    asks for just those afterwards. */}
                <div className="mt-5">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">or</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <GoogleSignInButton returnTo={returnTo} profileType={profileType} label="Sign up with Google" />
                  <p className="mt-2 text-center text-xs text-muted-foreground">With Google, you agree to the Terms and Privacy Policy on the next step.</p>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpWizard />
    </Suspense>
  )
}
