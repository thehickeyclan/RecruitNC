"use client"

import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock } from "lucide-react"
import { getEventName } from "@/lib/national-team-events"

export default function NationalTeamComingSoonPage() {
  const searchParams = useSearchParams()
  const eventSlug = searchParams?.get("event") ?? ""
  const eventName = eventSlug ? getEventName(eventSlug) : "This event"

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <Card className="border-[#003366]/20 overflow-hidden">
          <CardHeader className="bg-[#003366]/5 pb-6">
            <div className="flex items-center gap-3 text-[#003366]">
              <Clock className="h-10 w-10 shrink-0" />
              <div>
                <CardTitle className="text-xl">Coming soon</CardTitle>
                <CardDescription className="text-gray-600 mt-0.5">
                  {eventName} — team hub and registration will be available here.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-gray-600">
              We&apos;re setting up the hub for this event. Check back later or visit the National Team page for updates.
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full bg-[#003366] hover:bg-[#003366]/90">
                <a href="/national-team">National Team overview</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
