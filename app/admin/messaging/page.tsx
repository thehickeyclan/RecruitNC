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
import { MessageSquare, Users, Loader2, ArrowLeft, Bold, Italic, Link2, List, ListOrdered, Send, Inbox, FolderOpen, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ProfileOption, AudienceGroupOption } from "@/app/api/admin/messaging/audiences/route"
import type { RecipientRow } from "@/app/api/admin/messaging/recipients/route"
import type { SentBlastRow } from "@/app/api/admin/messaging/sent/route"

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
  const [testEmail, setTestEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ recipientCount: number; result: { inApp?: { sent: boolean; threadId?: string; error?: string }; email: { sent: number; failed: number }; sms: { sent: number; failed: number } } } | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const [activeTab, setActiveTab] = useState<"compose" | "sent" | "folders">("compose")
  const [sent, setSent] = useState<SentBlastRow[]>([])
  const [sentHasMore, setSentHasMore] = useState(false)
  const [sentLoading, setSentLoading] = useState(false)
  const [folders, setFolders] = useState<{ id: string; name: string; sort_order: number }[]>([])
  const [threads, setThreads] = useState<{ id: string; name: string; type: string; context_type: string | null; context_id: string | null; last_message_at: string; folder_id: string | null }[]>([])
  const [foldersLoading, setFoldersLoading] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [creatingFolder, setCreatingFolder] = useState(false)

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

  const loadSent = (before?: string) => {
    setSentLoading(true)
    const url = before ? `/api/admin/messaging/sent?before=${encodeURIComponent(before)}&limit=30` : "/api/admin/messaging/sent?limit=30"
    fetch(url, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const list = data.sent ?? []
        if (before) setSent((prev) => [...prev, ...list])
        else setSent(list)
        setSentHasMore(!!data.hasMore)
      })
      .catch(() => setSent([]))
      .finally(() => setSentLoading(false))
  }

  const loadFoldersAndThreads = () => {
    setFoldersLoading(true)
    Promise.all([
      fetch("/api/admin/messaging/folders", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/messaging/threads", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([foldersRes, threadsRes]) => {
        setFolders(foldersRes.folders ?? [])
        setThreads(threadsRes.threads ?? [])
      })
      .catch(() => { setFolders([]); setThreads([]) })
      .finally(() => setFoldersLoading(false))
  }

  useEffect(() => {
    if (activeTab === "sent") loadSent()
  }, [activeTab])
  useEffect(() => {
    if (activeTab === "folders") loadFoldersAndThreads()
  }, [activeTab])

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

        <div className="flex gap-1 border-b border-[#003366]/20 mb-6 max-w-3xl">
          <button
            type="button"
            onClick={() => setActiveTab("compose")}
            className={cn(
              "min-h-[44px] px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === "compose" ? "border-[#003366] text-[#003366]" : "border-transparent text-gray-600 hover:text-[#003366]"
            )}
          >
            <Send className="inline w-4 h-4 mr-2" />
            Compose
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sent")}
            className={cn(
              "min-h-[44px] px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === "sent" ? "border-[#003366] text-[#003366]" : "border-transparent text-gray-600 hover:text-[#003366]"
            )}
          >
            <Inbox className="inline w-4 h-4 mr-2" />
            Sent
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("folders")}
            className={cn(
              "min-h-[44px] px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === "folders" ? "border-[#003366] text-[#003366]" : "border-transparent text-gray-600 hover:text-[#003366]"
            )}
          >
            <FolderOpen className="inline w-4 h-4 mr-2" />
            Folders
          </button>
        </div>

        {activeTab === "sent" && (
          <Card className="max-w-3xl border-[#003366]/20">
            <CardHeader>
              <CardTitle className="text-[#003366]">Sent</CardTitle>
              <CardDescription>History of blasts you’ve sent from Command Center.</CardDescription>
            </CardHeader>
            <CardContent>
              {sentLoading && sent.length === 0 ? (
                <div className="flex items-center gap-2 text-gray-500 py-8"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
              ) : sent.length === 0 ? (
                <p className="text-gray-500 py-8">No sent blasts yet. Use Compose to send one.</p>
              ) : (
                <>
                  <div className="border rounded-md overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-2">Date</th>
                          <th className="text-left p-2">Audience</th>
                          <th className="text-left p-2">Subject</th>
                          <th className="text-left p-2">Channels</th>
                          <th className="text-right p-2">Recipients</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sent.map((row) => (
                          <tr key={row.id} className="border-t">
                            <td className="p-2 whitespace-nowrap">{new Date(row.sent_at).toLocaleString()}</td>
                            <td className="p-2">
                              {row.audience_group || row.audience_profile || "All"}
                            </td>
                            <td className="p-2 max-w-[180px] truncate" title={row.subject ?? undefined}>{row.subject || "—"}</td>
                            <td className="p-2">
                              {[row.channels_in_app && "In-app", row.channels_email && "Email", row.channels_sms && "SMS"].filter(Boolean).join(", ")}
                            </td>
                            <td className="p-2 text-right">{row.recipient_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {sentHasMore && (
                    <Button variant="outline" className="mt-4" disabled={sentLoading} onClick={() => loadSent(sent[sent.length - 1]?.id)}>
                      {sentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "folders" && (
          <Card className="max-w-3xl border-[#003366]/20">
            <CardHeader>
              <CardTitle className="text-[#003366]">Folders</CardTitle>
              <CardDescription>Organize threads into folders. Create a folder, then assign threads below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2 flex-wrap items-end">
                <div>
                  <Label className="text-[#003366] text-xs">New folder</Label>
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="e.g. Blue, NHSCA"
                    className="mt-1 w-48"
                  />
                </div>
                <Button
                  disabled={!newFolderName.trim() || creatingFolder}
                  onClick={async () => {
                    setCreatingFolder(true)
                    try {
                      const res = await fetch("/api/admin/messaging/folders", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ name: newFolderName.trim() }),
                      })
                      const data = await res.json()
                      if (res.ok && data.folder) {
                        setNewFolderName("")
                        loadFoldersAndThreads()
                      } else {
                        setError(data.error ?? "Failed to create folder")
                      }
                    } finally {
                      setCreatingFolder(false)
                    }
                  }}
                >
                  {creatingFolder ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create folder"}
                </Button>
              </div>
              {folders.length > 0 && (
                <div>
                  <Label className="text-[#003366] text-sm">Your folders</Label>
                  <ul className="mt-2 space-y-1">
                    {folders.map((f) => (
                      <li key={f.id} className="flex items-center justify-between py-2 border-b">
                        <span className="font-medium">{f.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={async () => {
                            if (!confirm("Delete this folder? Threads will be unassigned.")) return
                            const res = await fetch(`/api/admin/messaging/folders/${f.id}`, { method: "DELETE", credentials: "include" })
                            if (res.ok) loadFoldersAndThreads()
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <Label className="text-[#003366] text-sm">Threads — assign to folder</Label>
                {foldersLoading && threads.length === 0 ? (
                  <p className="text-gray-500 py-4">Loading threads…</p>
                ) : threads.length === 0 ? (
                  <p className="text-gray-500 py-4">No threads. You’ll see threads here when you’re a member of event or group chats (e.g. from hub).</p>
                ) : (
                  <div className="mt-2 border rounded-md divide-y">
                    {threads.map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-4 p-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{t.name}</p>
                          <p className="text-xs text-gray-500">{t.context_type}/{t.context_id || "—"}</p>
                        </div>
                        <Select
                          value={t.folder_id ?? "none"}
                          onValueChange={async (val) => {
                            const folderId = val === "none" ? null : val
                            const res = await fetch(`/api/admin/messaging/threads/${t.id}/folder`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              credentials: "include",
                              body: JSON.stringify({ folder_id: folderId }),
                            })
                            if (res.ok) loadFoldersAndThreads()
                          }}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No folder</SelectItem>
                            {folders.map((f) => (
                              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`/forum`}>Open</a>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "compose" && (
        <>
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

                <div className="pt-4 border-t border-gray-200 mt-4">
                  <Label className="text-[#003366]">Test email (optional)</Label>
                  <Input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="e.g. you@example.com — send only to this address"
                    className="mt-1 max-w-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">When set, the blast is sent only to this address (no audience). Use to test before sending to everyone.</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {((count !== null && count > 0) || testEmail.trim() !== "") && (
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
                        testEmail: testEmail.trim() || undefined,
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
        </>
        )}
      </div>
    </div>
  )
}
