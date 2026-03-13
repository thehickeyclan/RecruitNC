"use client"

import { useParams, useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, MessageCircle, Hotel, Shirt, LayoutDashboard, User } from "lucide-react"
import { getEventName, getRosterLabel } from "@/lib/national-team-events"
import { HardLink } from "@/components/hard-link"

const NHSCA_2026_SLUGS = ["nhsca-2026", "nhsca-duals-2026"]

const GEAR_DEADLINE = "Sunday, March 15"

export default function NationalTeamRegisterSuccessPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const eventSlug = typeof params?.eventSlug === "string" ? params.eventSlug : ""
  const eventName = getEventName(eventSlug) || "this event"
  const rosterLabel = getRosterLabel(eventSlug)
  const isNhsca2026 = NHSCA_2026_SLUGS.includes(eventSlug)
  const sessionId = searchParams.get("session_id")?.trim() ?? ""
  const linkAttempted = useRef(false)

  // Tie registration to current user so they have hub access (navbar, profile Event hubs)
  useEffect(() => {
    if (!sessionId || !user?.id || linkAttempted.current) return
    linkAttempted.current = true
    fetch("/api/national-team/registrations/link-from-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ session_id: sessionId }),
    }).catch(() => {})
  }, [sessionId, user?.id])

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
                  Thank you for registering for {eventName}. Your spot on the roster is confirmed and your account is linked — you have full access to the team hub.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <p className="text-sm text-gray-700">
              Payment successful. You&apos;re on the <strong>{rosterLabel} roster</strong>. Use the hub below to update gear sizes, join the team chat, and see key links.
            </p>

            <div className="rounded-lg bg-[#003366]/10 border border-[#003366]/20 p-4">
              <p className="text-sm font-semibold text-[#002147] mb-2 flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                Your team hub
              </p>
              <p className="text-sm text-gray-700 mb-4">
                The hub is your one place for roster, gear sizes, GroupMe, and updates. You can open it from the button below or anytime from <strong>My Profile → Event hubs</strong>.
              </p>
              <div className="flex flex-col gap-2">
                <Button asChild className="w-full bg-[#003366] hover:bg-[#003366]/90" size="lg">
                  <HardLink href="/national-team/hub">
                    {isNhsca2026 ? "Open NHSCA 2026 Team Hub" : "Open Team Hub"}
                  </HardLink>
                </Button>
                <Button asChild variant="outline" className="w-full" size="sm">
                  <a href="/profile" className="inline-flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Go to My Profile (Event hubs)
                  </a>
                </Button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-semibold text-gray-900 mb-3">What to do now</p>
              <ol className="space-y-3 text-sm text-gray-700 list-decimal list-inside">
                <li className="flex items-start gap-2">
                  <Shirt className="h-4 w-4 shrink-0 text-[#003366] mt-0.5" />
                  <span><strong>Update gear sizes</strong> on the hub (Singlet, Shorts, Shirt) — no later than {GEAR_DEADLINE}.</span>
                </li>
                <li className="flex items-start gap-2">
                  <MessageCircle className="h-4 w-4 shrink-0 text-[#003366] mt-0.5" />
                  <span><strong>Join the team channel</strong> — open the hub and use the GroupMe link to say hello.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Hotel className="h-4 w-4 shrink-0 text-[#003366] mt-0.5" />
                  <span><strong>Book travel</strong> — hotel details will be shared in the hub and team chat.</span>
                </li>
              </ol>
            </div>

            <div className="flex flex-col gap-2 pt-2">
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
