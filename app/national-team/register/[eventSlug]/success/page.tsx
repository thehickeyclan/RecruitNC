"use client"

import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, MessageCircle, LayoutDashboard, Hotel, Shirt } from "lucide-react"
import { getEventName, getRosterLabel } from "@/lib/national-team-events"
import { HardLink } from "@/components/hard-link"

const NHSCA_2026_SLUGS = ["nhsca-2026", "nhsca-duals-2026"]

const GEAR_DEADLINE = "Sunday, March 15"

export default function NationalTeamRegisterSuccessPage() {
  const params = useParams()
  const eventSlug = typeof params?.eventSlug === "string" ? params.eventSlug : ""
  const eventName = getEventName(eventSlug) || "this event"
  const rosterLabel = getRosterLabel(eventSlug)
  const isNhsca2026 = NHSCA_2026_SLUGS.includes(eventSlug)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <Card className="border-green-200 overflow-hidden">
          <CardHeader className="bg-gradient-to-br from-[#002147] to-[#003366] text-white pb-8">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-12 w-12 shrink-0 text-[#D3B574]" />
              <div>
                <CardTitle className="text-xl sm:text-2xl text-white">You&apos;re part of something special</CardTitle>
                <CardDescription className="text-blue-100 mt-1">
                  Thank you for registering for {eventName}. The opportunity to compete on the best all-NC team in history is an incredible opportunity.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <p className="text-sm text-gray-700">
              Your payment was successful. You&apos;re on the <strong>{rosterLabel} roster</strong>. Here&apos;s what to do next:
            </p>

            <div className="space-y-4">
              <div className="flex gap-3 rounded-lg border border-[#003366]/15 bg-[#003366]/5 p-4">
                <LayoutDashboard className="h-5 w-5 shrink-0 text-[#003366] mt-0.5" />
                <div>
                  <p className="font-medium text-[#002147]">Team Hub</p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Rosters, schedule, coaches, gear orders, and updates — all in one place.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg border border-[#003366]/15 bg-[#003366]/5 p-4">
                <MessageCircle className="h-5 w-5 shrink-0 text-[#003366] mt-0.5" />
                <div>
                  <p className="font-medium text-[#002147]">Chat</p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    We&apos;ll communicate and engage via the Community chat. Open it from the Hub.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-semibold text-gray-900 mb-3">Your next steps</p>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <Hotel className="h-4 w-4 shrink-0 text-[#003366] mt-0.5" />
                  <span><strong>Book a hotel.</strong> Hotel details coming soon; we&apos;ll share info in the Hub and via chat.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shirt className="h-4 w-4 shrink-0 text-[#003366] mt-0.5" />
                  <span><strong>Submit your gear sizes</strong> (Singlet, Shorts, Shirt) in the Team Hub — no later than {GEAR_DEADLINE}.</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button asChild className="w-full bg-[#003366] hover:bg-[#003366]/90" size="lg">
                <HardLink href="/national-team/hub">
                  {isNhsca2026 ? "Go to NHSCA 2026 Team Hub" : "Go to Team Hub"}
                </HardLink>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <a href="/national-team">Back to National Team</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
