"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, MessageSquare } from "lucide-react"

type PhoneOption = {
  label: string
  e164: string
  display: string
}

type Props = {
  invitationId: string
  athleteName: string
  lastReminderAt: string | null
  onSent: (lastReminderAt: string, lastReminderBody: string) => void
}

export function TocInviteReminderCard({
  invitationId,
  athleteName,
  lastReminderAt: initialLastReminderAt,
  onSent,
}: Props) {
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phones, setPhones] = useState<PhoneOption[]>([])
  const [selectedPhone, setSelectedPhone] = useState<string>("")
  const [message, setMessage] = useState("")
  const [lastReminderAt, setLastReminderAt] = useState(initialLastReminderAt)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/toc/invitations/${invitationId}/remind`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load reminder")
      setPhones(data.phones ?? [])
      setSelectedPhone(data.phones?.[0]?.e164 ?? "")
      setMessage(data.draftMessage ?? data.defaultMessage ?? "")
      setLastReminderAt(data.lastReminderAt ?? initialLastReminderAt)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reminder")
    } finally {
      setLoading(false)
    }
  }, [invitationId, initialLastReminderAt])

  useEffect(() => {
    void load()
  }, [load])

  const send = async () => {
    if (!message.trim()) {
      setError("Enter a message to send.")
      return
    }
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/toc/invitations/${invitationId}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          phoneE164: selectedPhone || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send text")

      const sentAt = data.invitation?.last_reminder_at ?? new Date().toISOString()
      const sentBody = data.invitation?.last_reminder_body ?? message.trim()
      setLastReminderAt(sentAt)
      onSent(sentAt, sentBody)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send text")
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading reminder…
      </div>
    )
  }

  return (
    <div className="rounded-md border border-[#002147]/15 bg-[#f8f9fb] p-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-[#002147]">Text reminder — {athleteName}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Sends from RecruitNC via Twilio. Edit the message, then send.{" "}
          {lastReminderAt ? (
            <span>
              Last sent <strong>{new Date(lastReminderAt).toLocaleString()}</strong>.
            </span>
          ) : (
            <span>No reminder sent yet.</span>
          )}
        </p>
      </div>

      {phones.length > 1 ? (
        <div className="space-y-2">
          <Label className="text-xs">Send to</Label>
          <Select value={selectedPhone} onValueChange={setSelectedPhone}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select phone" />
            </SelectTrigger>
            <SelectContent>
              {phones.map((p) => (
                <SelectItem key={p.e164} value={p.e164}>
                  {p.label} · {p.display}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : phones.length === 1 ? (
        <p className="text-xs text-muted-foreground">
          To: {phones[0].label} · {phones[0].display}
        </p>
      ) : (
        <p className="text-xs text-red-600">
          No cell phone on file for this athlete or linked parents — add one on their RecruitNC profile first.
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor={`toc-reminder-${invitationId}`} className="text-xs">
          Message
        </Label>
        <Textarea
          id={`toc-reminder-${invitationId}`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className="text-sm font-sans"
          maxLength={1500}
        />
        <p className="text-[10px] text-muted-foreground">
          &quot;RecruitNC:&quot; is added automatically if missing.
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="bg-[#002147]"
          disabled={sending || phones.length === 0 || !message.trim()}
          onClick={() => void send()}
        >
          {sending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Send text
            </>
          )}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={loading || sending} onClick={() => void load()}>
          Reset draft
        </Button>
      </div>
    </div>
  )
}
