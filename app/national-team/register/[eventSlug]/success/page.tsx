"use client"

import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { getEventName } from "@/lib/national-team-events"

export default function NationalTeamRegisterSuccessPage() {
  const params = useParams()
  const eventSlug = typeof params?.eventSlug === "string" ? params.eventSlug : ""
  const eventName = getEventName(eventSlug) || "this event"

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
              Your payment was successful. You’re on the roster. Event details and team hub access will be shared by the event organizer.
            </p>
            <Button asChild className="w-full bg-[#003366] hover:bg-[#003366]/90">
              <a href="/national-team">Back to National Team</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
