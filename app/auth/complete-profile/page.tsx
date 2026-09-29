"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/**
 * The one question the Google button cannot ask on the way in.
 *
 * Signing in with Google takes a single tap and tells us nothing about who tapped. Putting the
 * profile picker in front of that tap would spend the only advantage the button has, so it is
 * asked here instead — once, immediately afterwards, for brand-new accounts only.
 */
const PROFILE_TYPES = new Set(["athlete", "parent", "college-coach", "hs-club-coach", "referee", "fan"])

function CompleteProfileForm() {
  const params = useSearchParams()
  const requestedNext = params.get("next")
  /*
   * The sign-up wizard asks "who are you?" before Google, and passes the answer here as `type`.
   * With it, this screen only asks for what Google could not supply - and nothing at all for the
   * roles that need nothing more, which submit themselves.
   */
  const presetType = PROFILE_TYPES.has(params.get("type") ?? "") ? (params.get("type") as string) : ""
  const [profileType, setProfileType] = useState(presetType)
  const [cellPhone, setCellPhone] = useState("")
  const [institution, setInstitution] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCollegeCoach = profileType === "college-coach"
  const needsPhone = profileType === "athlete" || profileType === "parent" || isCollegeCoach
  const needsNothingMore = Boolean(presetType) && !needsPhone && !isCollegeCoach

  const safeNext =
    requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : null

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)
    if (!profileType) return setError("Choose what brings you here.")
    if (needsPhone && cellPhone.replace(/\D/g, "").length < 10) return setError("Enter a 10-digit cell number.")
    if (isCollegeCoach && !institution.trim()) return setError("Enter your college.")

    setSaving(true)
    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileType, cellPhone, institution }),
      })
      const data = await res.json().catch(() => ({}))
      // Already has a role: somebody signing back in through the wizard. Nothing to ask; carry on.
      if (res.status === 409) {
        window.location.href = safeNext || "/"
        return
      }
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not save that.")

      // The server decides where a college coach lands (the rankings); everyone else goes where
      // they were headed.
      window.location.href = data.redirectTo && data.redirectTo !== "/" ? data.redirectTo : safeNext || "/"
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that.")
      setSaving(false)
    }
  }

  const autoSubmitted = useRef(false)
  useEffect(() => {
    if (!needsNothingMore || autoSubmitted.current) return
    autoSubmitted.current = true
    void submit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsNothingMore])

  if (needsNothingMore && !error) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Setting up your account…</div>
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-gray-50 px-4 pt-20 md:items-center md:pt-0">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{presetType ? "Almost done" : "One quick question"}</CardTitle>
          <CardDescription>
            {presetType
              ? "You're signed in with Google. Just this, and you're set."
              : "You're signed in. Tell us what brings you to RecruitNC so we show you the right things."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {presetType ? null : (
            <div className="space-y-2">
              <Label>I am a</Label>
              <Select value={profileType} onValueChange={setProfileType} disabled={saving}>
                <SelectTrigger aria-label="Profile type">
                  <SelectValue placeholder="Select one" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="athlete">Athlete</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="college-coach">College Coach</SelectItem>
                  <SelectItem value="hs-club-coach">High School/Club Coach</SelectItem>
                  <SelectItem value="referee">Referee</SelectItem>
                  <SelectItem value="fan">Fan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            )}

            {needsPhone ? (
              <div className="space-y-2">
                <Label htmlFor="cellPhone">
                  Cell phone <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="cellPhone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+1 555 555 5555"
                  value={cellPhone}
                  onChange={(e) => setCellPhone(e.target.value)}
                  disabled={saving}
                />
              </div>
            ) : null}

            {isCollegeCoach ? (
              <div className="space-y-2">
                <Label htmlFor="institution">College</Label>
                <Input
                  id="institution"
                  placeholder="NC State University"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  disabled={saving}
                />
              </div>
            ) : null}

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Saving…" : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={null}>
      <CompleteProfileForm />
    </Suspense>
  )
}
