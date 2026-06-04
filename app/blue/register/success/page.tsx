"use client"

import { HardLink } from "@/components/hard-link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreditCard, Calendar, Users, CheckCircle2, ExternalLink } from "lucide-react"

export default function BlueRegisterSuccessPage() {
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
              <p className="font-semibold text-[#03154C] text-lg">Set up your athlete&apos;s recruiting profile</p>
              <p className="text-sm text-gray-700">
                College coaches search RecruitNC for NC wrestlers. Sign in and complete your athlete&apos;s profile — GPA,
                weight, highlights, and contact info.
              </p>
              <HardLink href="/profile">
                <Button className="w-full sm:w-auto bg-[#03154C] hover:bg-[#0a2571] text-white">
                  Open Profile — recruiting setup
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
                UNC Fetzer Hall, 210 South Rd, Chapel Hill — <strong>Sundays 1:00–3:00 PM</strong>
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
