"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Mail, Send } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

/**
 * The "Message" button on a wrestler's profile - college coaches only.
 *
 * Replaces the old any-user-to-any-user DM button. Renders nothing for families, fans and
 * signed-out visitors: /api/coach-messages/eligibility decides. A coach staff have not reviewed
 * yet sees the button but gets the explanation instead of a compose box. If the coach already
 * wrote to this wrestler, the button opens that conversation.
 */
export function CoachMessageButton({
  athleteId,
  athleteName,
  className,
  iconClassName = "h-4 w-4",
  showLabel = false,
}: {
  athleteId: string
  athleteName?: string
  className?: string
  iconClassName?: string
  showLabel?: boolean
}) {
  const { user } = useAuth()
  const router = useRouter()
  const [gate, setGate] = useState<{ show: boolean; canSend?: boolean; threadId?: string | null; message?: string } | null>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !athleteId) {
      setGate(null)
      return
    }
    let cancelled = false
    fetch(`/api/coach-messages/eligibility?athleteId=${encodeURIComponent(athleteId)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((g) => {
        if (!cancelled) setGate(g)
      })
      .catch(() => {
        if (!cancelled) setGate(null)
      })
    return () => {
      cancelled = true
    }
  }, [user, athleteId])

  if (!gate?.show) return null

  const label = athleteName ? `Message ${athleteName}` : "Message"

  const onClick = () => {
    if (gate.threadId) {
      router.push(`/inbox/${gate.threadId}`)
      return
    }
    setError(null)
    setOpen(true)
  }

  const send = async () => {
    if (!draft.trim() || sending) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch("/api/coach-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ athleteId, body: draft }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Could not send.")
      setOpen(false)
      setDraft("")
      router.push(`/inbox/${data.threadId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send.")
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button type="button" onClick={onClick} className={className} aria-label={label} title={label}>
        <Mail className={iconClassName} />
        {showLabel ? <span className="ml-1.5">Message</span> : null}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>
              {gate.canSend
                ? "The wrestler and every parent linked to the profile see this conversation, and they can reply. NC United staff can review conversations."
                : gate.message}
            </DialogDescription>
          </DialogHeader>
          {gate.canSend ? (
            <div className="space-y-3">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={6}
                maxLength={4000}
                placeholder="Introduce yourself and your program…"
                autoFocus
              />
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={sending}>
                  Cancel
                </Button>
                <Button onClick={send} disabled={!draft.trim() || sending} className="bg-[#0A1628] text-white hover:bg-[#13294B]">
                  {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
