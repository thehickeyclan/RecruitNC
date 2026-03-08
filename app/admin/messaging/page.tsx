"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { AdminHeader } from "@/components/admin-header"
import { HardLink } from "@/components/hard-link"
import { MessageSquare, Users, Loader2, ArrowLeft, Bold, Italic, Link2, List, ListOrdered, Send } from "lucide-react"
import type { ProfileOption, AudienceGroupOption } from "@/app/api/admin/messaging/audiences/route"
import type { RecipientRow } from "@/app/api/admin/messaging/recipients/route"

export default function AdminMessagingPage() {
  const [profiles, setProfiles] = useState<ProfileOption[]>([])
  const [groups, setGroups] = useState<AudienceGroupOption[]>([])
  const [loadingAudiences, setLoadingAudiences] = useState(true)
  const [profile, setProfile] = useState<string>("all")
  const [group, setGroup] = useState<string>("all")
  const [recipients, setRecipients] = useState<RecipientRow[]>([])
  const [count, setCount] = useState<number | null>(null)
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [channels, setChannels] = useState({ inApp: true, email: true, sms: false })
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ recipientCount: number; result: { inApp?: { sent: boolean; threadId?: string; error?: string }; email: { sent: number; failed: number }; sms: { sent: number; failed: number } } } | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const insertAtCursor = (before: string, after: string = "") => {
    const ta = bodyRef.current
    if (!ta) {
      setBody((prev) => prev + before + after)
      return
    }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const text = body
    const newText = text.slice(0, start) + before + (text.slice(start, end) || "text") + after + text.slice(end)
    setBody(newText)
    setTimeout(() => {
      ta.focus()
      const pos = start + before.length + (end - start || 4) + after.length
      ta.setSelectionRange(pos, pos)
    }, 0)
  }

  useEffect(() => {
    fetch("/api/admin/messaging/audiences", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setProfiles(data.profiles ?? [])
        setGroups(data.groups ?? [])
      })
      .catch(() => setError("Failed to load audiences"))
      .finally(() => setLoadingAudiences(false))
  }, [])

  const loadRecipients = () => {
    setLoadingRecipients(true)
    setError(null)
    const params = new URLSearchParams()
    if (profile && profile !== "all") params.set("profile", profile)
    if (group && group !== "all") params.set("group", group)
    params.set("limit", "500")
    fetch(`/api/admin/messaging/recipients?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setRecipients(data.recipients ?? [])
        setCount(data.totalMatching ?? data.count ?? (data.recipients ?? []).length)
      })
      .catch(() => {
        setError("Failed to load recipients")
        setRecipients([])
        setCount(null)
      })
      .finally(() => setLoadingRecipients(false))
  }

  useEffect(() => {
    if (!loadingAudiences && (profile !== "all" || group !== "all")) {
      loadRecipients()
    } else if (!loadingAudiences && profile === "all" && group === "all") {
      loadRecipients()
    }
  }, [loadingAudiences, profile, group])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#003366] to-[#004080] text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" asChild>
              <HardLink href="/admin"><ArrowLeft className="h-5 w-5" /></HardLink>
            </Button>
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-[#C8A94A]" />
              <div>
                <h1 className="text-2xl font-bold">Messaging & Command Center</h1>
                <p className="text-blue-200 text-sm">Select RecruitNC members by profile and group for announcements and blasts</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <AdminHeader />

        <Card className="max-w-3xl border-[#003366]/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#003366]">
              <Users className="h-5 w-5" />
              Select audience
            </CardTitle>
            <CardDescription>
              Choose RecruitNC members, then narrow by profile (role) and/or group (Blue Program, NHSCA Duals 2026, forum groups, etc.).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingAudiences ? (
              <div className="flex items-center gap-2 text-gray-500 py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading options…
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-[#003366]">Profile (role)</Label>
                    <Select value={profile} onValueChange={setProfile}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All profiles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All profiles</SelectItem>
                        {profiles.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[#003366]">Group</Label>
                    <Select value={group} onValueChange={setGroup}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All groups" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All RecruitNC members</SelectItem>
                        {groups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}

                {loadingRecipients ? (
                  <div className="flex items-center gap-2 text-gray-500 py-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Counting recipients…
                  </div>
                ) : count !== null ? (
                  <div className="rounded-lg border border-[#003366]/20 bg-[#003366]/5 p-4">
                    <p className="text-lg font-semibold text-[#003366]">
                      {count} recipient{count !== 1 ? "s" : ""} selected
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Use this audience for in-app announcements, email, or SMS when those features are enabled.
                    </p>
                    {recipients.length > 0 && (
                      <div className="mt-4 max-h-48 overflow-y-auto border rounded-md bg-white">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="text-left p-2">Name</th>
                              <th className="text-left p-2">Email</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recipients.slice(0, 50).map((r) => (
                              <tr key={r.user_id} className="border-t">
                                <td className="p-2">{r.display_name || "—"}</td>
                                <td className="p-2">{r.email || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {recipients.length > 50 && (
                          <p className="text-xs text-gray-500 p-2 border-t">Showing first 50 of {recipients.length}</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="flex gap-2 pt-2">
                  <Button onClick={loadRecipients} disabled={loadingRecipients} variant="outline" className="border-[#003366]/30">
                    {loadingRecipients ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh count"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {count !== null && count > 0 && (
          <Card className="max-w-3xl mt-6 border-[#003366]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#003366]">
                <Send className="h-5 w-5" />
                Compose & send
              </CardTitle>
              <CardDescription>
                Use Markdown: **bold**, *italic*, [link text](url), - or 1. for lists. Same message goes to In-app (announcement), Email (HTML), and SMS (plain text).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-[#003366]">Subject (for email)</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Update from RecruitNC"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-[#003366]">Message</Label>
                <div className="mt-1 flex flex-wrap gap-1 p-2 border rounded-t-md bg-gray-50 border-b-0">
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => insertAtCursor("**", "**")} title="Bold">
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => insertAtCursor("*", "*")} title="Italic">
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => insertAtCursor("[", "](https://)")} title="Link">
                    <Link2 className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => insertAtCursor("\n- ", "")} title="Bullet">
                    <List className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => insertAtCursor("\n1. ", "")} title="Numbered list">
                    <ListOrdered className="h-4 w-4" />
                  </Button>
                </div>
                <textarea
                  ref={bodyRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your message…"
                  rows={8}
                  className="w-full rounded-b-md border border-t-0 px-3 py-2 text-sm min-h-[120px] resize-y"
                />
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Label className="text-[#003366]">Send via</Label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={channels.inApp} onCheckedChange={(c) => setChannels((prev) => ({ ...prev, inApp: !!c }))} />
                  <span className="text-sm">In-app (announcement in group thread)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={channels.email} onCheckedChange={(c) => setChannels((prev) => ({ ...prev, email: !!c }))} />
                  <span className="text-sm">Email</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={channels.sms} onCheckedChange={(c) => setChannels((prev) => ({ ...prev, sms: !!c }))} />
                  <span className="text-sm">SMS (text)</span>
                </label>
              </div>
              {sendResult && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
                  <p className="font-medium text-green-800">Sent to {sendResult.recipientCount} recipients</p>
                  {sendResult.result.inApp !== undefined && (
                    <p>In-app: {sendResult.result.inApp.sent ? "Posted as announcement" : sendResult.result.inApp.error ?? "Skipped"}</p>
                  )}
                  <p>Email: {sendResult.result.email.sent} sent{sendResult.result.email.failed > 0 ? `, ${sendResult.result.email.failed} failed` : ""}</p>
                  <p>SMS: {sendResult.result.sms.sent} sent{sendResult.result.sms.failed > 0 ? `, ${sendResult.result.sms.failed} failed` : ""}</p>
                </div>
              )}
              <Button
                disabled={!body.trim() || sending || (!channels.inApp && !channels.email && !channels.sms)}
                onClick={async () => {
                  setSendResult(null)
                  setSending(true)
                  try {
                    const res = await fetch("/api/admin/messaging/send", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({
                        profile: profile === "all" ? undefined : profile,
                        group: group === "all" ? undefined : group,
                        subject: subject || "Update from RecruitNC",
                        body: body.trim(),
                        channels,
                      }),
                    })
                    const data = await res.json().catch(() => ({}))
                    if (res.ok && data.ok) {
                      setSendResult({ recipientCount: data.recipientCount, result: data.result })
                    } else {
                      setError(data.error ?? "Send failed")
                    }
                  } catch {
                    setError("Request failed")
                  } finally {
                    setSending(false)
                  }
                }}
                className="bg-[#003366] hover:bg-[#003366]/90"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? " Sending…" : " Send blast"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
