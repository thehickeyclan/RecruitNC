"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
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
import { Loader2, ArrowLeft, Send, Inbox, FolderOpen, Trash2, Eye, Mail, Users, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { RichTextEditor } from "@/components/rich-text-editor"
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
  const [emailCount, setEmailCount] = useState<number | null>(null)
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [channels, setChannels] = useState({ inApp: false, email: true, sms: false })
  const [logoVariant, setLogoVariant] = useState<"recruitnc" | "nc-united">("nc-united")
  const [testEmail, setTestEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{
    recipientCount: number
    result: {
      inApp?: { sent: boolean; threadId?: string; error?: string }
      email: { sent: number; failed: number }
      sms: { sent: number; failed: number }
    }
    emailSkippedNoAddress?: number
    testOnly?: boolean
  } | null>(null)
  const [bodyHtml, setBodyHtml] = useState("")
  const [showRecipients, setShowRecipients] = useState(false)

  const [activeTab, setActiveTab] = useState<"compose" | "sent" | "folders">("compose")
  const [sent, setSent] = useState<SentBlastRow[]>([])
  const [sentHasMore, setSentHasMore] = useState(false)
  const [sentLoading, setSentLoading] = useState(false)
  const [folders, setFolders] = useState<{ id: string; name: string; sort_order: number }[]>([])
  const [threads, setThreads] = useState<{ id: string; name: string; type: string; context_type: string | null; context_id: string | null; last_message_at: string; folder_id: string | null }[]>([])
  const [foldersLoading, setFoldersLoading] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [creatingFolder, setCreatingFolder] = useState(false)

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
        setEmailCount(typeof data.emailCount === "number" ? data.emailCount : null)
      })
      .catch(() => {
        setError("Failed to load recipients")
        setRecipients([])
        setCount(null)
      })
      .finally(() => setLoadingRecipients(false))
  }

  useEffect(() => {
    if (!loadingAudiences) {
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

  const audienceLabel = () => {
    const parts: string[] = []
    if (profile !== "all") {
      const p = profiles.find(p => p.value === profile)
      parts.push(p?.label || profile)
    }
    if (group !== "all") {
      const g = groups.find(g => g.id === group)
      parts.push(g?.name || group)
    }
    return parts.length > 0 ? parts.join(" + ") : "All members"
  }

  return (
    <div className="min-h-screen bg-[#061224]">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0A1628]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10" asChild>
              <HardLink href="/admin"><ArrowLeft className="h-5 w-5" /></HardLink>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Mass Email</h1>
              <p className="text-white/50 text-sm">Send announcements to RecruitNC members</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <AdminHeader />

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6">
          <button
            onClick={() => setActiveTab("compose")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === "compose" 
                ? "bg-[#C8A94A] text-[#061224]" 
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            <Send className="inline w-4 h-4 mr-2" />
            Compose
          </button>
          <button
            onClick={() => setActiveTab("sent")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === "sent" 
                ? "bg-[#C8A94A] text-[#061224]" 
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            <Inbox className="inline w-4 h-4 mr-2" />
            Sent
          </button>
          <button
            onClick={() => setActiveTab("folders")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === "folders" 
                ? "bg-[#C8A94A] text-[#061224]" 
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            <FolderOpen className="inline w-4 h-4 mr-2" />
            Folders
          </button>
          <HardLink
            href="/admin/messaging/email-replies"
            className="ml-auto px-4 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5"
          >
            <Mail className="inline w-4 h-4 mr-2" />
            Replies
          </HardLink>
        </div>

        {/* Sent Tab */}
        {activeTab === "sent" && (
          <div className="rounded-xl bg-[#0A1628] border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Sent Messages</h2>
              <p className="text-sm text-white/50">History of blasts sent from Command Center</p>
            </div>
            <div className="p-4">
              {sentLoading && sent.length === 0 ? (
                <div className="flex items-center gap-2 text-white/50 py-8 justify-center">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading...
                </div>
              ) : sent.length === 0 ? (
                <p className="text-white/50 py-8 text-center">No sent blasts yet</p>
              ) : (
                <div className="space-y-2">
                  {sent.map((row) => (
                    <div key={row.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white truncate">{row.subject || "No subject"}</p>
                        <p className="text-sm text-white/50">
                          {new Date(row.sent_at).toLocaleDateString()} - {row.audience_group || row.audience_profile || "All"} - {row.recipient_count} recipients
                          {row.channels_email && row.result_email_sent > 0 ? ` · ${row.result_email_sent} emailed` : ""}
                          {row.result_email_failed > 0 ? ` · ${row.result_email_failed} failed` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        {row.channels_email && <span className="px-2 py-1 rounded bg-white/10">Email</span>}
                        {row.channels_sms && <span className="px-2 py-1 rounded bg-white/10">SMS</span>}
                        {row.channels_in_app && <span className="px-2 py-1 rounded bg-white/10">In-app</span>}
                      </div>
                    </div>
                  ))}
                  {sentHasMore && (
                    <Button variant="outline" className="w-full mt-2 border-white/20 text-white/70" disabled={sentLoading} onClick={() => loadSent(sent[sent.length - 1]?.id)}>
                      {sentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Folders Tab */}
        {activeTab === "folders" && (
          <div className="rounded-xl bg-[#0A1628] border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Folders</h2>
              <p className="text-sm text-white/50">Organize threads into folders</p>
            </div>
            <div className="p-4 space-y-6">
              <div className="flex gap-2">
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="New folder name..."
                  className="max-w-xs bg-white/5 border-white/20 text-white placeholder:text-white/40"
                />
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
                      if (res.ok) {
                        setNewFolderName("")
                        loadFoldersAndThreads()
                      }
                    } finally {
                      setCreatingFolder(false)
                    }
                  }}
                  className="bg-[#C8A94A] hover:bg-[#B89A3A] text-[#061224]"
                >
                  {creatingFolder ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
              </div>
              
              {folders.length > 0 && (
                <div className="space-y-1">
                  {folders.map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <span className="font-medium text-white">{f.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={async () => {
                          if (!confirm("Delete this folder?")) return
                          await fetch(`/api/admin/messaging/folders/${f.id}`, { method: "DELETE", credentials: "include" })
                          loadFoldersAndThreads()
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Compose Tab */}
        {activeTab === "compose" && (
          <div className="max-w-3xl space-y-4">
            {/* Audience Selection */}
            <div className="rounded-xl bg-[#0A1628] border border-white/10 p-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-white/70 text-sm">To</Label>
                  <div className="flex gap-2 mt-1">
                    <Select value={profile} onValueChange={setProfile}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="All roles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All roles</SelectItem>
                        {profiles.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={group} onValueChange={setGroup}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="All groups" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All groups</SelectItem>
                        {groups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {loadingRecipients ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white/50" />
                  ) : count !== null ? (
                    <button 
                      onClick={() => setShowRecipients(!showRecipients)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#C8A94A]/10 text-[#C8A94A] text-sm font-medium hover:bg-[#C8A94A]/20"
                    >
                      <Users className="h-4 w-4" />
                      {count} recipient{count !== 1 ? "s" : ""}
                      {emailCount !== null && channels.email ? (
                        <span className="text-[#C8A94A]/70"> · {emailCount} with email</span>
                      ) : null}
                      {showRecipients ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Expandable recipients list */}
              {showRecipients && recipients.length > 0 && (
                <div className="mt-4 max-h-48 overflow-y-auto rounded-lg bg-white/5 divide-y divide-white/5">
                  {recipients.slice(0, 50).map((r) => (
                    <div key={r.user_id} className="px-3 py-2 text-sm">
                      <span className="text-white">{r.display_name || "Unknown"}</span>
                      <span className="text-white/40 ml-2">{r.email}</span>
                    </div>
                  ))}
                  {recipients.length > 50 && (
                    <p className="px-3 py-2 text-xs text-white/40">+ {recipients.length - 50} more</p>
                  )}
                </div>
              )}

              {/* Test email */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Test address — use Send test, not Send"
                    className="flex-1 min-w-[220px] bg-white/5 border-white/20 text-white placeholder:text-white/40"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!body.trim() || !testEmail.trim() || sending || !channels.email}
                    className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
                    onClick={async () => {
                      setSendResult(null)
                      setError(null)
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
                            bodyHtml: bodyHtml.trim() || undefined,
                            testEmail: testEmail.trim(),
                            testOnly: true,
                            logoVariant,
                            channels: { ...channels, sms: false, inApp: false },
                          }),
                        })
                        const data = await res.json().catch(() => ({}))
                        if (res.ok && data.ok) {
                          setSendResult({
                            recipientCount: 1,
                            result: data.result,
                            testOnly: true,
                          })
                        } else {
                          setError(data.error ?? "Test send failed")
                        }
                      } catch {
                        setError("Request failed")
                      } finally {
                        setSending(false)
                      }
                    }}
                  >
                    Send test
                  </Button>
                </div>
              </div>
            </div>

            {/* Compose Message */}
            {((count !== null && count > 0) || testEmail.trim() !== "") && (
              <div className="rounded-xl bg-[#0A1628] border border-white/10 p-4 space-y-4">
                {/* Subject */}
                <div>
                  <Label className="text-white/70 text-sm">Subject</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Update from RecruitNC"
                    className="mt-1 bg-white/5 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>

                {/* Message Editor */}
                <div>
                  <Label className="text-white/70 text-sm">Message</Label>
                  <div className="mt-1">
                    <RichTextEditor
                      value={bodyHtml}
                      onChange={(html, markdown) => {
                        setBodyHtml(html)
                        setBody(markdown)
                      }}
                      placeholder="Write your message..."
                    />
                  </div>
                </div>

                {/* Options Row */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-white/50">Send via:</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox 
                        checked={channels.email} 
                        onCheckedChange={(c) => setChannels((prev) => ({ ...prev, email: !!c }))}
                        className="border-white/30 data-[state=checked]:bg-[#C8A94A] data-[state=checked]:border-[#C8A94A]"
                      />
                      <span className="text-sm text-white/70">Email</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox 
                        checked={channels.sms} 
                        onCheckedChange={(c) => setChannels((prev) => ({ ...prev, sms: !!c }))}
                        className="border-white/30 data-[state=checked]:bg-[#C8A94A] data-[state=checked]:border-[#C8A94A]"
                      />
                      <span className="text-sm text-white/70">SMS</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox 
                        checked={channels.inApp} 
                        onCheckedChange={(c) => setChannels((prev) => ({ ...prev, inApp: !!c }))}
                        className="border-white/30 data-[state=checked]:bg-[#C8A94A] data-[state=checked]:border-[#C8A94A]"
                      />
                      <span className="text-sm text-white/70">In-app</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <Select value={logoVariant} onValueChange={(v) => setLogoVariant(v as "recruitnc" | "nc-united")}>
                      <SelectTrigger className="w-[140px] bg-white/5 border-white/20 text-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nc-united">NC United</SelectItem>
                        <SelectItem value="recruitnc">RecruitNC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
                )}

                {/* Success Result */}
                {sendResult && (
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-400">
                    {sendResult.testOnly ? (
                      <p className="font-medium">Test email sent to {testEmail.trim()}</p>
                    ) : (
                      <p className="font-medium">
                        Blast: {sendResult.recipientCount} in audience
                        {sendResult.result.email.sent > 0 || sendResult.result.email.failed > 0 ? (
                          <>
                            {" "}
                            · Email {sendResult.result.email.sent} sent
                            {sendResult.result.email.failed > 0
                              ? `, ${sendResult.result.email.failed} failed`
                              : ""}
                          </>
                        ) : null}
                      </p>
                    )}
                    <div className="mt-1 text-emerald-400/70">
                      {sendResult.result.email.sent > 0 && sendResult.testOnly && (
                        <span>Email: {sendResult.result.email.sent} sent. </span>
                      )}
                      {sendResult.result.sms.sent > 0 && <span>SMS: {sendResult.result.sms.sent} sent. </span>}
                      {sendResult.result.inApp?.sent && <span>In-app: Posted. </span>}
                      {!sendResult.testOnly &&
                        sendResult.result.email.sent === 0 &&
                        channels.email && (
                          <span className="text-red-300">No emails reached Resend — check logs or redeploy fix.</span>
                        )}
                      {(sendResult.emailSkippedNoAddress ?? 0) > 0 && (
                        <span> {sendResult.emailSkippedNoAddress} had no email on file.</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
                    onClick={() => {
                      const params = new URLSearchParams()
                      if (subject.trim()) params.set("subject", subject.trim())
                      if (body.trim()) params.set("b64", btoa(unescape(encodeURIComponent(body.trim()))))
                      if (bodyHtml.trim()) params.set("html64", btoa(unescape(encodeURIComponent(bodyHtml.trim()))))
                      params.set("logo", logoVariant)
                      window.open(`/admin/messaging/preview?${params.toString()}`, "_blank", "noopener,noreferrer")
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    disabled={!body.trim() || sending || (!channels.inApp && !channels.email && !channels.sms)}
                    onClick={async () => {
                      setSendResult(null)
                      setError(null)
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
                            bodyHtml: bodyHtml.trim() || undefined,
                            logoVariant,
                            channels,
                          }),
                        })
                        const data = await res.json().catch(() => ({}))
                        if (res.ok && data.ok) {
                          setSendResult({
                            recipientCount: data.recipientCount,
                            result: data.result,
                            emailSkippedNoAddress: data.emailSkippedNoAddress,
                          })
                        } else {
                          setError(data.error ?? "Send failed")
                          if (data.result?.email) {
                            setSendResult({
                              recipientCount: data.recipientCount ?? count ?? 0,
                              result: data.result,
                              emailSkippedNoAddress: data.emailSkippedNoAddress,
                            })
                          }
                        }
                      } catch {
                        setError("Request failed")
                      } finally {
                        setSending(false)
                      }
                    }}
                    className="bg-[#C8A94A] hover:bg-[#B89A3A] text-[#061224] font-medium"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    {sending ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
