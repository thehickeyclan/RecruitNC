"use client"

import { useState, useEffect } from "react"
import { MessageSquare, Mail, Phone, Send, Clock, ChevronDown, ChevronUp, User, ArrowUpRight, ArrowDownLeft, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

type ThreadRow = {
  id: string
  subject: string | null
  created_at: string
  last_message_at: string | null
  has_unread_inbound: boolean
}

type MessageRow = {
  id: string
  thread_id: string
  direction: "inbound" | "outbound"
  body_text: string | null
  created_at: string
  from_email?: string | null
}

type BlastRow = {
  id: string
  sent_at: string
  subject: string | null
  body_snippet: string | null
  channels_email: boolean
  channels_sms: boolean
}

type Props = {
  contactId: string
  contactType: "athlete" | "parent" | "coach"
  contactName: string
  contactEmail?: string | null
  contactPhone?: string | null
  linkedUserId?: string | null // For athletes, this is claimed_by_user_id
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  } else if (diffDays === 1) {
    return "Yesterday"
  } else if (diffDays < 7) {
    return d.toLocaleDateString("en-US", { weekday: "short" })
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return ""
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits[0] === "1") return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  return phone
}

export function ContactMessagingTab({ contactId, contactType, contactName, contactEmail, contactPhone, linkedUserId }: Props) {
  const [channel, setChannel] = useState<"email" | "sms">("email")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [historyExpanded, setHistoryExpanded] = useState(true)
  const { toast } = useToast()

  // Message history state
  const [threads, setThreads] = useState<ThreadRow[]>([])
  const [blasts, setBlasts] = useState<BlastRow[]>([])
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null)
  const [threadMessages, setThreadMessages] = useState<Record<string, MessageRow[]>>({})
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [loadingThread, setLoadingThread] = useState<string | null>(null)

  const canSendEmail = !!contactEmail?.trim()
  const canSendSms = !!contactPhone?.trim()

  // User ID to query for history - for athletes use linked user, otherwise use contactId
  const userIdForHistory = linkedUserId || (contactType !== "athlete" ? contactId : null)

  // Load message history on mount
  useEffect(() => {
    async function loadHistory() {
      if (!userIdForHistory) {
        setLoadingHistory(false)
        return
      }
      
      try {
        const res = await fetch(`/api/admin/contacts/messages?userId=${encodeURIComponent(userIdForHistory)}`, { credentials: "include" })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.success) {
          setThreads(data.threads || [])
          setBlasts(data.blasts || [])
        }
      } catch (e) {
        console.error("Failed to load message history:", e)
      } finally {
        setLoadingHistory(false)
      }
    }
    loadHistory()
  }, [userIdForHistory])

  // Load messages for a specific thread
  async function loadThreadMessages(threadId: string) {
    if (threadMessages[threadId]) return
    
    setLoadingThread(threadId)
    try {
      const res = await fetch(`/api/admin/contacts/messages/${encodeURIComponent(threadId)}`, { credentials: "include" })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setThreadMessages(prev => ({ ...prev, [threadId]: data.messages || [] }))
        // Mark as read in local state
        setThreads(prev => prev.map(t => t.id === threadId ? { ...t, has_unread_inbound: false } : t))
      }
    } catch (e) {
      console.error("Failed to load thread messages:", e)
    } finally {
      setLoadingThread(null)
    }
  }

  function toggleThread(threadId: string) {
    if (expandedThreadId === threadId) {
      setExpandedThreadId(null)
    } else {
      setExpandedThreadId(threadId)
      loadThreadMessages(threadId)
    }
  }

  async function handleSend() {
    if (!body.trim()) {
      toast({ title: "Error", description: "Message body is required", variant: "destructive" })
      return
    }
    if (channel === "email" && !canSendEmail) {
      toast({ title: "Error", description: "No email address on file", variant: "destructive" })
      return
    }
    if (channel === "sms" && !canSendSms) {
      toast({ title: "Error", description: "No phone number on file", variant: "destructive" })
      return
    }

    setSending(true)
    try {
      const res = await fetch("/api/admin/contacts/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          contactId,
          contactType,
          recipientUserId: userIdForHistory,
          channel,
          subject: channel === "email" ? subject || `Message from RecruitNC` : undefined,
          body: body.trim(),
          recipientEmail: channel === "email" ? contactEmail : undefined,
          recipientPhone: channel === "sms" ? contactPhone : undefined,
          contactName,
        }),
      })
      const result = await res.json()
      if (res.ok && result.success) {
        toast({ title: "Sent!", description: `${channel === "email" ? "Email" : "SMS"} sent to ${contactName}` })
        setBody("")
        setSubject("")
        // Reload history to show new message
        if (userIdForHistory) {
          const histRes = await fetch(`/api/admin/contacts/messages?userId=${encodeURIComponent(userIdForHistory)}`, { credentials: "include" })
          const histData = await histRes.json().catch(() => ({}))
          if (histRes.ok && histData.success) {
            setThreads(histData.threads || [])
          }
        }
      } else {
        toast({ title: "Failed", description: result.error || "Failed to send message", variant: "destructive" })
      }
    } catch (e) {
      toast({ title: "Error", description: "Network error - please try again", variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  const hasHistory = threads.length > 0 || blasts.length > 0

  return (
    <div className="rounded-xl border border-white/10 bg-[#0B2545]/50 p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C8A94A]/20">
          <MessageSquare className="h-4 w-4 text-[#C8A94A]" />
        </div>
        <h3 className="text-lg font-bold text-white">Messages</h3>
        {hasHistory && (
          <span className="ml-auto text-xs text-white/50">{threads.length + blasts.length} conversations</span>
        )}
      </div>

      {/* Contact Info Summary */}
      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        {contactEmail && (
          <div className="flex items-center gap-2 text-white/70">
            <Mail className="h-4 w-4 text-white/50" />
            <span>{contactEmail}</span>
          </div>
        )}
        {contactPhone && (
          <div className="flex items-center gap-2 text-white/70">
            <Phone className="h-4 w-4 text-white/50" />
            <span>{formatPhone(contactPhone)}</span>
          </div>
        )}
      </div>

      {/* Channel Selector */}
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setChannel("email")}
          disabled={!canSendEmail}
          className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            channel === "email"
              ? "border-[#C8A94A] bg-[#C8A94A]/20 text-[#C8A94A]"
              : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
          } ${!canSendEmail ? "cursor-not-allowed opacity-40" : ""}`}
        >
          <Mail className="h-4 w-4" />
          Email
        </button>
        <button
          type="button"
          onClick={() => setChannel("sms")}
          disabled={!canSendSms}
          className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            channel === "sms"
              ? "border-[#C8A94A] bg-[#C8A94A]/20 text-[#C8A94A]"
              : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
          } ${!canSendSms ? "cursor-not-allowed opacity-40" : ""}`}
        >
          <Phone className="h-4 w-4" />
          SMS
        </button>
      </div>

      {/* Compose Form */}
      <div className="space-y-3">
        {channel === "email" && (
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-[#061224] px-4 py-3 text-base text-white placeholder:text-white/40 focus:border-[#C8A94A] focus:outline-none focus:ring-1 focus:ring-[#C8A94A]/50"
          />
        )}
        <textarea
          placeholder={channel === "email" ? "Write your message..." : "Write your text message (160 chars recommended)..."}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-lg border border-white/15 bg-[#061224] px-4 py-3 text-base text-white placeholder:text-white/40 focus:border-[#C8A94A] focus:outline-none focus:ring-1 focus:ring-[#C8A94A]/50"
        />
        {channel === "sms" && (
          <p className="text-xs text-white/40">{body.length}/160 characters {body.length > 160 && "(may be sent as multiple messages)"}</p>
        )}
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !body.trim()}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-[#C8A94A] px-4 py-3 text-base font-bold text-[#061224] transition-colors hover:bg-[#d4b75c] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send {channel === "email" ? "Email" : "SMS"}
            </>
          )}
        </button>
      </div>

      {/* Message History */}
      <div className="mt-6 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={() => setHistoryExpanded(!historyExpanded)}
          className="flex w-full items-center justify-between py-2 text-left"
        >
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-white/50" />
            <span className="text-sm font-semibold text-white">Message History</span>
            {hasHistory && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">{threads.length + blasts.length}</span>
            )}
          </div>
          {historyExpanded ? <ChevronUp className="h-4 w-4 text-white/50" /> : <ChevronDown className="h-4 w-4 text-white/50" />}
        </button>

        {historyExpanded && (
          <div className="mt-3 space-y-2 max-h-[400px] overflow-y-auto">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-white/40" />
              </div>
            ) : !hasHistory ? (
              <p className="text-center text-sm text-white/40 py-6">
                {userIdForHistory ? "No messages sent to this contact yet" : "Link this athlete to a user account to see message history"}
              </p>
            ) : (
              <>
                {/* Email Threads */}
                {threads.map((thread) => (
                  <div key={thread.id} className="rounded-lg border border-white/10 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleThread(thread.id)}
                      className="w-full flex items-center justify-between px-3 py-3 bg-white/5 hover:bg-white/10 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Mail className="h-4 w-4 text-white/50 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {thread.subject || "No subject"}
                          </p>
                          <p className="text-xs text-white/50">
                            {formatDate(thread.last_message_at || thread.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {thread.has_unread_inbound && (
                          <span className="h-2 w-2 rounded-full bg-[#C8A94A]" title="Unread reply" />
                        )}
                        {expandedThreadId === thread.id ? (
                          <ChevronUp className="h-4 w-4 text-white/40" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-white/40" />
                        )}
                      </div>
                    </button>
                    
                    {expandedThreadId === thread.id && (
                      <div className="border-t border-white/10 px-3 py-3 space-y-3 bg-[#061224]/50">
                        {loadingThread === thread.id ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-white/40" />
                          </div>
                        ) : threadMessages[thread.id]?.length ? (
                          threadMessages[thread.id].map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex gap-2 ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[85%] rounded-lg px-3 py-2 ${
                                  msg.direction === "outbound"
                                    ? "bg-[#C8A94A]/20"
                                    : "bg-white/10"
                                }`}
                              >
                                <div className="flex items-center gap-1 mb-1">
                                  {msg.direction === "outbound" ? (
                                    <ArrowUpRight className="h-3 w-3 text-[#C8A94A]" />
                                  ) : (
                                    <ArrowDownLeft className="h-3 w-3 text-emerald-400" />
                                  )}
                                  <span className="text-[10px] text-white/50">
                                    {msg.direction === "outbound" ? "Sent" : "Received"} {formatDate(msg.created_at)}
                                  </span>
                                </div>
                                <p className="text-sm text-white/90 whitespace-pre-wrap">{msg.body_text}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center text-xs text-white/40 py-2">No messages in this thread</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Blast Messages */}
                {blasts.map((blast) => (
                  <div key={blast.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-1 shrink-0">
                        {blast.channels_email && <Mail className="h-4 w-4 text-white/50" />}
                        {blast.channels_sms && <Phone className="h-4 w-4 text-white/50" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">
                          {blast.subject || "Announcement"}
                        </p>
                        <p className="text-xs text-white/60 mt-1 line-clamp-2">{blast.body_snippet}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/40 shrink-0">
                        <Clock className="h-3 w-3" />
                        {formatDate(blast.sent_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
