"use client"

import { Suspense, useState } from "react"
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
function CompleteProfileForm() {
  const params = useSearchParams()
  const requestedNext = params.get("next")
  const [profileType, setProfileType] = useState("")
  const [cellPhone, setCellPhone] = useState("")
  const [institution, setInstitution] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCollegeCoach = profileType === "college-coach"
  const needsPhone = profileType === "athlete" || profileType === "parent"

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!profileType) return setError("Choose what brings you here.")
    if (needsPhone && !cellPhone.trim()) return setError("A cell number is required for athlete and parent accounts.")

    setSaving(true)
    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileType, cellPhone, institution }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not save that.")

      // The server decides where this lands: an approved coach goes to the dashboard, one
      // waiting on a human goes to the pending page, everyone else goes where they were headed.
      const safeNext =
        requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : null
      window.location.href = data.redirectTo && data.redirectTo !== "/" ? data.redirectTo : safeNext || "/"
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that.")
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-gray-50 px-4 pt-20 md:items-center md:pt-0">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>One quick question</CardTitle>
          <CardDescription>
            You&apos;re signed in. Tell us what brings you to RecruitNC so we show you the right things.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
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
                <Label htmlFor="institution">School</Label>
                <Input
                  id="institution"
                  placeholder="NC State University"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  Coaches signing in from a <span className="font-semibold">.edu</span> address are approved
                  immediately. Any other address is reviewed by an admin first.
                </p>
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
