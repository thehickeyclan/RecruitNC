"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2 } from "lucide-react"

const MAX_LENGTH = 2000

export function Composer({
  threadId,
  onSent,
  disabled,
}: {
  threadId: string
  onSent?: () => void
  disabled?: boolean
}) {
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!sending && textareaRef.current) textareaRef.current.focus()
  }, [sending])

  async function send() {
    const trimmed = body.trim()
    if (!trimmed || sending || disabled) return
    if (trimmed.length > MAX_LENGTH) {
      setError(`Message must be ${MAX_LENGTH} characters or less`)
      return
    }
    setError(null)
    setSending(true)
    try {
      const res = await fetch(`/api/messaging/threads/${threadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: trimmed, type: "message" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Failed to send")
      setBody("")
      onSent?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send")
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="border-t bg-white p-3">
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          placeholder="Type a message..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending || disabled}
          className="min-h-[44px] max-h-32 resize-none"
          rows={2}
          maxLength={MAX_LENGTH + 100}
        />
        <Button
          type="button"
          size="icon"
          className="shrink-0 h-11 w-11 bg-[#003366] hover:bg-[#003366]/90"
          onClick={send}
          disabled={!body.trim() || sending || disabled}
          aria-label="Send"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </div>
      {body.length > MAX_LENGTH * 0.9 && (
        <p className="text-xs text-gray-500 mt-1">{body.length} / {MAX_LENGTH}</p>
      )}
    </div>
  )
}
