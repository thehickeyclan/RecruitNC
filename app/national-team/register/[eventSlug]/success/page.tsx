"use client"

import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"
import { getEventName } from "@/lib/national-team-events"

const NHSCA_2026_SLUGS = ["nhsca-2026", "nhsca-duals-2026"]

export default function NationalTeamRegisterSuccessPage() {
  const params = useParams()
  const eventSlug = typeof params?.eventSlug === "string" ? params.eventSlug : ""
  const eventName = getEventName(eventSlug) || "this event"
  const isNhsca2026 = NHSCA_2026_SLUGS.includes(eventSlug)
  const hubButtonLabel = isNhsca2026 ? "Go To NHSCA 2026 Team Page" : "Go to team hub"

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <Card className="border-green-200">
          <CardHeader>
            <div className="flex items-center gap-3 text-green-700">
              <CheckCircle2 className="h-10 w-10 shrink-0" />
              <div>
                <CardTitle>Registration complete</CardTitle>
                <CardDescription>Thank you for registering for {eventName}.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Your payment was successful. You’re on the roster. Use the team hub for the roster, schedule, apparel info, and team updates.
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full bg-[#003366] hover:bg-[#003366]/90">
                <a href="/national-team/hub">{hubButtonLabel}</a>
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
