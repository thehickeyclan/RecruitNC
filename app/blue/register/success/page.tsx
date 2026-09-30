"use client"

import { useEffect, useState } from "react"

import { HardLink } from "@/components/hard-link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreditCard, Calendar, Users, CheckCircle2, ExternalLink } from "lucide-react"

export default function BlueRegisterSuccessPage() {
  /*
   * Land them on the wrestler, not on their own settings.
   *
   * This pointed at /profile - the account page - so the first thing after paying was "go and
   * find your son's page somewhere". Registration has just resolved or created that athlete and
   * linked him to this account, so the page he needs is knowable: take the most recently touched
   * linked wrestler, which is the one that just came through.
   */
  const [athlete, setAthlete] = useState<{ id: string; name: string } | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch("/api/profile/linked-athletes", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        const rows: Array<{ id: string; name: string; updatedAt?: string | null }> = Array.isArray(data?.athletes)
          ? data.athletes
          : []
        if (!rows.length) return
        /* Registration just wrote to this row, so the most recently touched one is the new member. */
        const newest = [...rows].sort((a, b) =>
          String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")),
        )[0]!
        setAthlete({ id: String(newest.id), name: String(newest.name ?? "your wrestler") })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const firstName = athlete?.name.split(" ")[0] ?? null

  return (
    <div className="min-h-screen bg-[#0A1628] py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-2 border-[#D3B574]/40 bg-white shadow-xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-[#03154C] via-[#13294B] to-[#D3B574]" />
          <CardHeader>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <CardTitle className="text-[#03154C] text-2xl">You&apos;re in — welcome to NC United Blue</CardTitle>
                <CardDescription className="text-base mt-2">
                  Payment complete. Save this page — here&apos;s how to manage your membership and get started.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <section className="rounded-lg border-2 border-[#03154C]/15 bg-[#03154C]/5 p-4 space-y-3">
              <p className="font-semibold text-[#03154C] text-lg">
                {firstName ? `Finish ${firstName}'s profile` : "Finish your wrestler's profile"}
              </p>
              <p className="text-sm text-gray-700">
                College coaches search RecruitNC for North Carolina wrestlers. What you entered at
                registration is already on {firstName ? `${firstName}'s` : "his"} page &mdash; add the
                film, GPA and anything else a coach would want next.
              </p>
              <HardLink href={athlete ? `/view-profile?id=${encodeURIComponent(athlete.id)}` : "/profile"}>
                <Button className="w-full sm:w-auto bg-[#03154C] hover:bg-[#0a2571] text-white">
                  {firstName ? `Open ${firstName}'s profile` : "Open the profile"}
                </Button>
              </HardLink>
            </section>

            <section className="rounded-lg border-2 border-[#03154C]/15 bg-[#03154C]/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-[#03154C]">
                <CreditCard className="h-5 w-5" />
                <h2 className="font-semibold text-lg">Manage your subscription</h2>
              </div>
              <p className="text-sm text-gray-700">
                All billing is in your RecruitNC profile — same email you used to register.
              </p>
              <ul className="text-sm text-gray-700 space-y-1.5 list-disc pl-5">
                <li>View <strong>next bill date</strong> and payment history</li>
                <li>Update your card (Stripe secure billing portal)</li>
                <li><strong>Pause</strong> membership with a resume date</li>
                <li><strong>Cancel</strong> at end of billing period</li>
                <li>Retry a failed payment if needed</li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <HardLink href="/profile#nc-united-blue">
                  <Button className="w-full sm:w-auto bg-[#03154C] hover:bg-[#0a2571] text-white">
                    Open billing in Profile
                  </Button>
                </HardLink>
                <HardLink href="/blue/billing">
                  <Button variant="outline" className="w-full sm:w-auto border-[#03154C] text-[#03154C]">
                    Billing help page
                  </Button>
                </HardLink>
              </div>
              <p className="text-xs text-gray-500">
                Path: Sign in → Profile → scroll to <strong>NC United Blue</strong>. Check your email for a welcome message with the same links.
              </p>
            </section>

            <section className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-[#03154C] font-semibold">
                <Calendar className="h-4 w-4" />
                Practices
              </div>
              <p className="text-gray-700">
                Blue meets twice each month, with UNC serving as the primary Sunday home. Check the{" "}
                <HardLink href="/calendar" className="font-medium text-[#03154C] underline hover:no-underline">
                  NC United calendar
                </HardLink>{" "}
                for the exact date, time, and location of each practice.
              </p>
            </section>

            <section className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-[#03154C] font-semibold">
                <Users className="h-4 w-4" />
                Stay connected
              </div>
              <p className="text-gray-700">
                Join the NC United Blue GroupMe for updates and team chat:{" "}
                <a
                  href="https://groupme.com/join_group/104706096/bU0Ncyo4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#03154C] underline hover:no-underline inline-flex items-center gap-1"
                >
                  Join GroupMe <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </section>

            <section className="space-y-2 text-sm">
              <p className="font-semibold text-[#03154C]">RecruitNC recruiting profile</p>
              <p className="text-gray-700">
                Complete your wrestler&apos;s RecruitNC profile so college coaches can find them.
              </p>
              <HardLink href="/profile" className="text-[#03154C] underline hover:no-underline text-sm font-medium">
                Set up recruiting profile →
              </HardLink>
            </section>

            <div className="border-t pt-4 flex flex-col gap-2">
              <HardLink href="/auth/signin">
                <Button className="w-full bg-[#03154C] hover:bg-[#0a2571] text-white">Sign in to RecruitNC</Button>
              </HardLink>
              <HardLink href="/blue">
                <Button variant="outline" className="w-full">Back to Blue program</Button>
              </HardLink>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400">
          Questions about billing? Email{" "}
          <a href="mailto:info@ncwrestlingunited.com" className="text-[#D3B574] hover:underline">
            info@ncwrestlingunited.com
          </a>
        </p>
      </div>
    </div>
  )
}
