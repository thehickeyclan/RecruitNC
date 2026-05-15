"use client"

import { useState } from "react"
import { MessageSquare, Mail, Phone, Send, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp, User } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

type MessageLogRow = {
  id: string
  direction: "outbound" | "inbound"
  channel: "email" | "sms"
  subject?: string
  body: string
  created_at: string
  status: "sent" | "delivered" | "failed" | "received"
  recipient_email?: string
  recipient_phone?: string
}

type Props = {
  contactId: string
  contactType: "athlete" | "parent" | "coach"
  contactName: string
  contactEmail?: string | null
  contactPhone?: string | null
  messageHistory?: MessageLogRow[]
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
}

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return ""
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits[0] === "1") return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  return phone
}

export function ContactMessagingTab({ contactId, contactType, contactName, contactEmail, contactPhone, messageHistory = [] }: Props) {
  const [channel, setChannel] = useState<"email" | "sms">("email")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [historyExpanded, setHistoryExpanded] = useState(true)
  const { toast } = useToast()

  const canSendEmail = !!contactEmail?.trim()
  const canSendSms = !!contactPhone?.trim()

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
          channel,
          subject: channel === "email" ? subject : undefined,
          body: body.trim(),
          recipientEmail: channel === "email" ? contactEmail : undefined,
          recipientPhone: channel === "sms" ? contactPhone : undefined,
        }),
      })
      const result = await res.json()
      if (res.ok && result.success) {
        toast({ title: "Sent!", description: `${channel === "email" ? "Email" : "SMS"} sent to ${contactName}` })
        setBody("")
        setSubject("")
      } else {
        toast({ title: "Failed", description: result.error || "Failed to send message", variant: "destructive" })
      }
    } catch (e) {
      toast({ title: "Error", description: "Network error - please try again", variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#0B2545]/50 p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C8A94A]/20">
          <MessageSquare className="h-4 w-4 text-[#C8A94A]" />
        </div>
        <h3 className="text-lg font-bold text-white">Send Message</h3>
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
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#061224] border-t-transparent" />
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
            {messageHistory.length > 0 && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">{messageHistory.length}</span>
            )}
          </div>
          {historyExpanded ? <ChevronUp className="h-4 w-4 text-white/50" /> : <ChevronDown className="h-4 w-4 text-white/50" />}
        </button>

        {historyExpanded && (
          <div className="mt-3 space-y-3 max-h-[400px] overflow-y-auto">
            {messageHistory.length === 0 ? (
              <p className="text-center text-sm text-white/40 py-6">No messages sent to this contact yet</p>
            ) : (
              messageHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-lg border p-3 ${
                    msg.direction === "outbound"
                      ? "border-[#C8A94A]/20 bg-[#C8A94A]/5 ml-4"
                      : "border-white/10 bg-white/5 mr-4"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {msg.direction === "outbound" ? (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#C8A94A]/20">
                          <Send className="h-3 w-3 text-[#C8A94A]" />
                        </div>
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
                          <User className="h-3 w-3 text-white/60" />
                        </div>
                      )}
                      <span className="text-xs font-medium text-white/70">
                        {msg.direction === "outbound" ? "You" : contactName}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        msg.channel === "email" ? "bg-blue-500/20 text-blue-300" : "bg-green-500/20 text-green-300"
                      }`}>
                        {msg.channel === "email" ? <Mail className="h-2.5 w-2.5" /> : <Phone className="h-2.5 w-2.5" />}
                        {msg.channel.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {msg.status === "sent" || msg.status === "delivered" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : msg.status === "failed" ? (
                        <XCircle className="h-3.5 w-3.5 text-red-400" />
                      ) : null}
                      <span className="text-[10px] text-white/40">{formatDate(msg.created_at)}</span>
                    </div>
                  </div>
                  {msg.subject && (
                    <p className="text-xs font-medium text-white/80 mb-1">{msg.subject}</p>
                  )}
                  <p className="text-sm text-white/70 whitespace-pre-wrap">{msg.body}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
