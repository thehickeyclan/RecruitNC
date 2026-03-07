"use client"

import { useState, useCallback } from "react"
import { Mail, Send, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface MessageAthleteButtonProps {
  athleteId: string
  /** If already known (e.g. from view-profile), avoids an extra fetch. */
  claimedByUserId?: string | null
  /** Optional label for tooltip and a11y. */
  athleteName?: string
  className?: string
  /** Size of the icon. */
  size?: "sm" | "md"
  /** Inline style for icon class. */
  iconClassName?: string
}

/**
 * Message button that opens a Slack-like compose modal, then opens the thread in Community.
 * Shown next to athlete names in rankings and on view-profile.
 */
export function MessageAthleteButton({
  athleteId,
  claimedByUserId,
  athleteName,
  className,
  size = "sm",
  iconClassName,
}: MessageAthleteButtonProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [modalOtherUserId, setModalOtherUserId] = useState<string | null>(null)
  const [modalDisplayName, setModalDisplayName] = useState<string>("")

  const openComposeModal = useCallback(
    async (otherUserId: string, displayName: string) => {
      if (!user || otherUserId === user.id) return
      setError(null)
      setDraft("")
      setModalOtherUserId(otherUserId)
      setModalDisplayName(displayName || "User")
      setModalOpen(true)
    },
    [user]
  )

  const handleClick = useCallback(async () => {
    if (!user) {
      window.location.href = `/auth/signin?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`
      return
    }
    setError(null)
    let otherUserId: string | null = claimedByUserId ?? null
    if (otherUserId === user.id) return
    if (!otherUserId && athleteId) {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/messaging/athlete-contact?athlete_id=${encodeURIComponent(athleteId)}`,
          { credentials: "include" }
        )
        const data = await res.json().catch(() => ({}))
        otherUserId = data?.user_id ?? null
      } finally {
        setLoading(false)
      }
    }
    if (!otherUserId) {
      setError("No contact to message for this profile.")
      return
    }
    await openComposeModal(otherUserId, athleteName ?? "User")
  }, [user, athleteId, claimedByUserId, athleteName, openComposeModal])

  const handleSend = useCallback(async () => {
    const body = draft.trim()
    if (!body || !modalOtherUserId || !user || sending) return
    setSending(true)
    setError(null)
    try {
      const dmRes = await fetch("/api/messaging/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ other_user_id: modalOtherUserId }),
      })
      const dmData = await dmRes.json()
      if (!dmRes.ok) throw new Error(dmData?.error ?? "Failed to start conversation")
      const threadId = dmData?.threadId
      if (!threadId) throw new Error("No conversation id returned")

      const msgRes = await fetch(`/api/messaging/threads/${threadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body }),
      })
      if (!msgRes.ok) {
        const msgData = await msgRes.json().catch(() => ({}))
        throw new Error(msgData?.error ?? "Failed to send message")
      }
      setModalOpen(false)
      setDraft("")
      setModalOtherUserId(null)
      window.location.href = `/forum/dm/${threadId}`
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setSending(false)
    }
  }, [draft, modalOtherUserId, user, sending])

  const label = athleteName ? `Message ${athleteName}` : "Message"
  const titleText = error ?? (loading ? "Opening…" : label)

  if (!user) {
    return (
      <a
        href={`/auth/signin?returnTo=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/")}`}
        className={
          className ??
          "inline-flex h-8 w-8 items-center justify-center rounded border border-transparent text-gray-500 hover:bg-gray-100 hover:text-[#003366]"
        }
        aria-label={athleteName ? `Message ${athleteName}` : "Message"}
        title="Sign in to message"
      >
        <Mail className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </a>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        title={titleText}
        className={
          className ??
          "inline-flex h-8 w-8 items-center justify-center rounded border border-transparent text-gray-500 hover:bg-gray-100 hover:text-[#003366] disabled:opacity-50"
        }
        aria-label={label}
      >
        <Mail className={iconClassName ?? (size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")} />
      </button>
      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setModalOpen(false)
            setError(null)
            setDraft("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-[#0D1F3C] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-[#F0F4FF]">
              Message {modalDisplayName}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/70">
            Your conversation will appear in Community so you can see everything in one place.
          </p>
          <Textarea
            placeholder="Type a message…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-[100px] bg-white/5 border-white/10 text-white placeholder:text-white/40 resize-none"
            disabled={sending}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => setModalOpen(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#C8A94A] text-[#0B2545] hover:bg-[#E2C46A]"
              onClick={handleSend}
              disabled={!draft.trim() || sending}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="ml-2">{sending ? "Sending…" : "Send & open in Community"}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
