"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageCircle, Loader2, Lock, UserPlus } from "lucide-react"
import type { HubResponse, HubEvent } from "@/app/api/national-team/hub/route"
import { ThreadView } from "@/components/messaging/thread-view"
import { HubPresenceBubbles } from "@/components/hub-presence-bubbles"

const REG_PAGE_PATH = "/national-team/register/nhsca-2026"

export default function NationalTeamHubPage() {
  const { user, profile } = useAuth()
  const [data, setData] = useState<HubResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [regPageUrl, setRegPageUrl] = useState("")

  useEffect(() => {
    setRegPageUrl(typeof window !== "undefined" ? `${window.location.origin}${REG_PAGE_PATH}` : "")
  }, [])

  useEffect(() => {
    fetch("/api/national-team/hub", { credentials: "include" })
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
          <div>
            <h1 className="text-2xl font-bold text-[#003366]">National Team Hub</h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {data.isAdmin && (
                <p className="text-sm text-amber-700">Admin: you see the full list of event workspaces.</p>
              )}
              {user?.id && (
                <HubPresenceBubbles
                  channelId="hub"
                  currentUserId={user.id}
                  displayName={profile?.full_name ?? null}
                  email={user.email ?? null}
                />
              )}
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href="/national-team">Back to National Team</a>
          </Button>
        </div>

        {events.length === 0 ? (
          <>
            <Card className="border-[#003366]/20">
              <CardHeader>
                <CardTitle className="text-[#003366]">Your team hub</CardTitle>
                <CardDescription>
                  Once you register and pay for an event, this page will show your event roster, your registration details, and the team group chat — all in one place.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  If you have an invite to <strong>NHSCA Duals 2026</strong>, use your registration link to sign up. After payment, come back here to see the roster and team messaging.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild className="bg-[#003366] hover:bg-[#003366]/90">
                    <a href="/national-team/nhsca-2026">NHSCA 2026 event page</a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href={REG_PAGE_PATH}>Registration page</a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href="/national-team">National Team overview</a>
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Already registered? Sign in with the parent email from your registration so your events appear here.
                </p>
              </CardContent>
            </Card>

            {data.isAdmin && (
              <Card className="border-amber-300 bg-amber-50/50">
                <CardHeader>
                  <CardTitle className="text-amber-900 text-base">Send to families</CardTitle>
                  <CardDescription>
                    As admin you can share the registration page and create invite codes. Recipients need an invite code to register.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Registration page (copy and send)</p>
                    <p className="text-sm text-gray-600 font-mono bg-white border rounded px-2 py-1.5 break-all">
                      {regPageUrl || REG_PAGE_PATH}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" className="bg-[#003366] hover:bg-[#003366]/90">
                      <a href={REG_PAGE_PATH}>Open registration page</a>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <a href="/admin/national-team/invite-codes">Create invite codes</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          events.map((event) => (
            <EventHubSection key={event.eventSlug} event={event} currentUserId={user?.id ?? ""} />
          ))
        )}

        {/* Single “what’s coming” note instead of three placeholder cards */}
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="py-4">
            <p className="text-sm text-gray-600">
              <strong className="text-gray-700">Apparel, schedule, and coaches:</strong> The organizer will add photos, sizing, daily agenda, and coach bios here before the event.
            </p>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

function EventHubSection({ event, currentUserId }: { event: HubEvent; currentUserId: string }) {
  const myRegs = event.myRegistrations ?? []
  const hasThread = !!event.threadId && !!currentUserId
  const [addEmail, setAddEmail] = useState("")
  const [addLoading, setAddLoading] = useState(false)
  const [addMessage, setAddMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleAddMember = async () => {
    const email = addEmail.trim().toLowerCase()
    if (!email) return
    setAddMessage(null)
    setAddLoading(true)
    try {
      const res = await fetch(`/api/national-team/workspace/${encodeURIComponent(event.eventSlug)}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setAddMessage({ type: "success", text: "Added. They can now see this event and the group chat." })
        setAddEmail("")
      } else {
        setAddMessage({
          type: "error",
          text: data?.error ?? (res.status === 404 ? "No RecruitNC account found for that email. They need to sign up first." : "Could not add member."),
        })
      }
    } catch {
      setAddMessage({ type: "error", text: "Request failed. Try again." })
    } finally {
      setAddLoading(false)
    }
  }

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
          <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Add RecruitNC user
          </h3>
          <p className="text-xs text-gray-500 mb-2">
            Look up a user by the email they use to sign in. Only people with an <strong>active free RecruitNC account</strong> can be added — they’ll then see this event workspace and the group chat. Don’t have an account? <a href="/auth/signup" className="text-[#003366] hover:underline">Sign up free</a>.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <Input
              type="email"
              placeholder="RecruitNC sign-in email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
              className="max-w-xs"
              disabled={addLoading}
            />
            <Button onClick={handleAddMember} disabled={addLoading || !addEmail.trim()} size="sm" className="bg-[#003366] hover:bg-[#003366]/90">
              {addLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add to workspace"}
            </Button>
          </div>
          {addMessage && (
            <p className={`text-sm mt-2 ${addMessage.type === "success" ? "text-green-700" : "text-red-600"}`}>
              {addMessage.text}
            </p>
          )}
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Roster ({event.roster.length})</h3>
          <div className="border rounded-md overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[320px]">
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
          <div className="rounded-xl border-2 border-[#003366]/20 bg-white shadow-sm overflow-hidden">
            <div className="bg-[#003366]/5 px-4 py-3 border-b border-[#003366]/10">
              <h3 className="text-sm font-semibold text-[#002147] flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-[#003366]" />
                Group chat
              </h3>
              <p className="text-xs text-gray-600 mt-1.5">
                {event.eventSlug === "nhsca-duals-2026" || event.eventName.toLowerCase().includes("nhsca")
                  ? "This chat is a dedicated forum for communication on NHSCA Duals 2026."
                  : `This chat is a dedicated forum for communication on ${event.eventName}.`}
              </p>
            </div>
            <div className="flex flex-col h-[360px]">
              <ThreadView
                threadId={event.threadId!}
                threadName={`${event.eventName} chat`}
                currentUserId={currentUserId}
              />
            </div>
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50">
              <a href="/messages" className="text-xs text-[#003366] font-medium hover:underline">Open in Messages</a> for full view
            </div>
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
