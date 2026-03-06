"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Send, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type Message = {
  id: string
  channel_id: string
  author_id: string
  body: string
  attachments: unknown[]
  pinned: boolean
  pin_order: number | null
  created_at: string
  edited_at: string | null
}

export default function ForumChannelPage() {
  const params = useParams()
  const groupId = params.groupId as string
  const channelId = params.channelId as string
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [channelName, setChannelName] = useState<string>("Channel")
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(
    async (beforeId?: string) => {
      if (!channelId) return
      const url = beforeId
        ? `/api/forum/channels/${channelId}/messages?before=${encodeURIComponent(beforeId)}&limit=50`
        : `/api/forum/channels/${channelId}/messages?limit=50`
      const res = await fetch(url, { credentials: "include" })
      const data = await res.json().catch(() => ({}))
      const list = (data.messages ?? []) as Message[]
      const more = data.hasMore === true
      if (beforeId) {
        setMessages((prev) => [...prev, ...list])
      } else {
        setMessages(list)
      }
      setHasMore(more)
      return list
    },
    [channelId]
  )

  useEffect(() => {
    if (!channelId) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`/api/forum/channels/${channelId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.name) setChannelName(data.name)
      })
      .catch(() => {})
    loadMessages()
      .then(() => {
        const key = `forum-draft-${channelId}`
        try {
          const saved = localStorage.getItem(key)
          if (saved) setDraft(saved)
        } catch {}
      })
      .finally(() => setLoading(false))
  }, [channelId, loadMessages])

  useEffect(() => {
    if (!channelId) return
    const key = `forum-draft-${channelId}`
    const t = setTimeout(() => {
      try {
        if (draft) localStorage.setItem(key, draft)
        else localStorage.removeItem(key)
      } catch {}
    }, 300)
    return () => clearTimeout(t)
  }, [channelId, draft])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return
    const oldest = messages[messages.length - 1]
    setLoadingMore(true)
    await loadMessages(oldest.id)
    setLoadingMore(false)
  }, [loadMessages, loadingMore, hasMore, messages])

  const handleSend = useCallback(async () => {
    const text = draft.trim()
    if (!text || sending || !channelId) return
    setSending(true)
    try {
      const res = await fetch(`/api/forum/channels/${channelId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: text }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? "Failed to send")
      const newMsg = data.message as Message
      setMessages((prev) => [newMsg, ...prev])
      setDraft("")
      try {
        localStorage.removeItem(`forum-draft-${channelId}`)
      } catch {}
    } catch (e) {
      console.error("[forum] send error", e)
    } finally {
      setSending(false)
    }
  }, [channelId, draft, sending])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const chronological = [...messages].reverse()

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-4 py-2 border-b border-white/10">
        <h1 className="text-lg font-bold text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          #{channelName}
        </h1>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col-reverse min-h-0">
        <div ref={bottomRef} />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#C8A94A]" />
          </div>
        ) : (
          <>
            {chronological.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-white/60 text-center px-4">
                <p>No messages yet. Say something to get the conversation started.</p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {hasMore && (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="text-sm text-[#C8A94A] hover:underline disabled:opacity-50"
                    >
                      {loadingMore ? "Loading…" : "Load older messages"}
                    </button>
                  </div>
                )}
                {chronological.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "rounded-lg p-3",
                      msg.pinned ? "border-l-4 border-[#C8A94A] bg-[#C8A94A]/10" : "bg-white/5"
                    )}
                  >
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-semibold text-white text-sm" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                        {msg.author_id === user?.id ? "You" : "Member"}
                      </span>
                      <span className="text-xs text-white/50">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                      {msg.pinned && (
                        <span className="text-xs text-[#C8A94A] font-medium">PINNED</span>
                      )}
                    </div>
                    <p className="text-[#F0F4FF] text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {msg.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex-shrink-0 p-3 border-t border-white/10">
        <div className="flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message… (Enter to send, Shift+Enter for new line)"
            rows={2}
            className="flex-1 min-h-[44px] max-h-32 resize-y rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-[#C8A94A]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            className="flex-shrink-0 h-[44px] px-4 rounded-lg bg-[#C8A94A] text-[#0B2545] font-semibold hover:bg-[#E2C46A] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  )
}
