"use client"

import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, MessageCircle, Hotel, Shirt } from "lucide-react"
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
              Your payment was successful. You&apos;re on the <strong>{rosterLabel} roster</strong>.
            </p>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-semibold text-gray-900 mb-3">What to do now</p>
              <ol className="space-y-3 text-sm text-gray-700 list-decimal list-inside">
                <li className="flex items-start gap-2">
                  <Shirt className="h-4 w-4 shrink-0 text-[#003366] mt-0.5" />
                  <span><strong>Update your gear sizes</strong> on the Hub page (Singlet, Shorts, Shirt) — no later than {GEAR_DEADLINE}.</span>
                </li>
                <li className="flex items-start gap-2">
                  <MessageCircle className="h-4 w-4 shrink-0 text-[#003366] mt-0.5" />
                  <span><strong>Say hello on the team channel</strong> — open Community from the Hub and join the event chat.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Hotel className="h-4 w-4 shrink-0 text-[#003366] mt-0.5" />
                  <span><strong>Book your travel</strong> — hotel details will be shared in the Hub and team chat.</span>
                </li>
              </ol>
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
