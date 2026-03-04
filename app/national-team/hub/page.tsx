"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Calendar, Shirt, MessageCircle, Loader2, Lock } from "lucide-react"
import type { HubResponse, HubEvent } from "@/app/api/national-team/hub/route"
import { ThreadView } from "@/components/messaging/thread-view"

const PAYMENT_DUE = "Sunday, March 14, 2026"

export default function NationalTeamHubPage() {
  const { user } = useAuth()
  const [data, setData] = useState<HubResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/national-team/hub")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ allowed: false, reason: "no_access" }))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#003366]" />
      </div>
    )
  }

  if (!data?.allowed) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
        <Card className="max-w-md w-full border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Team hub
            </CardTitle>
            <CardDescription>
              {data?.reason === "signed_out"
                ? "Sign in with the same email you used to register to view the team hub."
                : "You don’t have access to the team hub. If you’ve already registered and paid, sign in with the parent email from your registration."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.reason === "signed_out" && (
              <Button asChild className="w-full bg-[#003366] hover:bg-[#003366]/90">
                <a href={`/auth/signin?returnTo=${encodeURIComponent("/national-team/hub")}`}>
                  Sign in
                </a>
              </Button>
            )}
            <Button asChild variant="outline" className="w-full">
              <a href="/national-team">Back to National Team</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const events = data.events ?? []

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-[#003366]">National Team Hub</h1>
          <Button asChild variant="outline" size="sm">
            <a href="/national-team">Back to National Team</a>
          </Button>
        </div>

        {/* Payment due — one line for all events */}
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-3">
            <p className="text-sm text-amber-800 font-medium">
              Payment due: {PAYMENT_DUE}
            </p>
          </CardContent>
        </Card>

        {events.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No events yet. After you register and pay, your event roster and details will appear here.
            </CardContent>
          </Card>
        ) : (
          events.map((event) => (
            <EventHubSection key={event.eventSlug} event={event} currentUserId={user?.id ?? ""} />
          ))
        )}

        {/* Placeholder sections (same for all; can be made event-specific later) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shirt className="h-5 w-5" />
              Apparel
            </CardTitle>
            <CardDescription>Photos and sizing for team gear</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Coming soon. The organizer will add apparel photos and details here.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule & agenda
            </CardTitle>
            <CardDescription>Time agenda by day</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Coming soon. Event schedule and daily agenda will appear here.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Coaches
            </CardTitle>
            <CardDescription>Coaches and bios</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Coming soon. Coach bios and contact info will be added here.</p>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

function EventHubSection({ event, currentUserId }: { event: HubEvent; currentUserId: string }) {
  const myRegs = event.myRegistrations ?? []
  const hasThread = !!event.threadId && !!currentUserId
  return (
    <Card>
      <CardHeader>
        <CardTitle>{event.eventName}</CardTitle>
        <CardDescription>Roster, your registration, and group chat</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {myRegs.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Your registration</h3>
            <div className="rounded-md border bg-gray-50/50 p-4 space-y-3">
              {myRegs.map((r) => (
                <div key={r.id} className="text-sm">
                  <p className="font-medium text-[#003366]">
                    {r.athlete_first_name} {r.athlete_last_name}
                  </p>
                  <p className="text-gray-600 mt-0.5">
                    Weight: {r.primary_weight} · School: {r.high_school || "—"} · Grad: {r.graduation_year}
                  </p>
                  <p className="text-gray-500 mt-0.5">Status: {r.status}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Roster ({event.roster.length})</h3>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Weight</th>
                  <th className="text-left p-2">School</th>
                  <th className="text-left p-2">Grad</th>
                </tr>
              </thead>
              <tbody>
                {event.roster.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">
                      {r.athlete_first_name} {r.athlete_last_name}
                    </td>
                    <td className="p-2">{r.primary_weight}</td>
                    <td className="p-2">{r.high_school || "—"}</td>
                    <td className="p-2">{r.graduation_year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {hasThread && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Group chat
            </h3>
            <div className="border rounded-lg overflow-hidden bg-white" style={{ minHeight: 280, maxHeight: 400 }}>
              <ThreadView
                threadId={event.threadId!}
                threadName={`${event.eventName} chat`}
                currentUserId={currentUserId}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              <a href="/messages" className="text-[#003366] hover:underline">Open in Messages</a> for full view
            </p>
          </div>
        )}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Payment status</h3>
          <p className="text-sm text-gray-600">All listed athletes are paid. Equipment due date and any balance will be shared by the organizer.</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Athlete cards (IG)</h3>
          <p className="text-sm text-gray-500">Individual cards for social announcements will be added here.</p>
        </div>
      </CardContent>
    </Card>
  )
}
