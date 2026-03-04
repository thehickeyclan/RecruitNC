"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { MessageBubble, type MessageRow } from "./message-bubble"
import { Composer } from "./composer"
import { Loader2 } from "lucide-react"

function formatDateLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: "long" })
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })
}

function messageGroupsWithDates(messages: MessageRow[]): { dateLabel: string; items: MessageRow[] }[] {
  const groups: { dateLabel: string; items: MessageRow[] }[] = []
  let currentLabel = ""
  let currentItems: MessageRow[] = []
  for (const m of messages) {
    const label = formatDateLabel(m.created_at)
    if (label !== currentLabel) {
      if (currentItems.length > 0) groups.push({ dateLabel: currentLabel, items: currentItems })
      currentLabel = label
      currentItems = [m]
    } else {
      currentItems.push(m)
    }
  }
  if (currentItems.length > 0) groups.push({ dateLabel: currentLabel, items: currentItems })
  return groups
}

export type ThreadViewMember = { user_id: string; display_name: string }

export function ThreadView({
  threadId,
  threadName,
  currentUserId,
}: {
  threadId: string
  threadName: string
  currentUserId: string
}) {
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [members, setMembers] = useState<ThreadViewMember[]>([])
  const [customEmojiMap, setCustomEmojiMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [typingUsers, setTypingUsers] = useState<{ user_id: string; display_name: string }[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  function loadMessages(beforeId?: string) {
    const url = beforeId
      ? `/api/messaging/threads/${threadId}/messages?before=${encodeURIComponent(beforeId)}&limit=50`
      : `/api/messaging/threads/${threadId}/messages?limit=50`
    return fetch(url, { credentials: "include" }).then((r) => r.json())
  }

  function fetchAndPrepend(beforeId: string) {
    if (loadingMore) return
    setLoadingMore(true)
    loadMessages(beforeId)
      .then((data) => {
        if (data.messages?.length) {
          setMessages((prev) => [...data.messages, ...prev])
          setHasMore(!!data.hasMore)
        }
      })
      .finally(() => setLoadingMore(false))
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      loadMessages(),
      fetch(`/api/messaging/threads/${threadId}/read`, { method: "PATCH", credentials: "include" }),
      fetch(`/api/messaging/threads/${threadId}/members`, { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([data, , membersData]) => {
        setMessages(data.messages ?? [])
        setHasMore(!!data.hasMore)
        const list = (membersData?.members ?? []).map((m: { user_id: string; display_name: string }) => ({ user_id: m.user_id, display_name: m.display_name }))
        setMembers(list)
      })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false))
  }, [threadId])

  // Real-time: new messages (Supabase Realtime). Requires messaging_messages in replication (Supabase Dashboard → Database → Replication).
  useEffect(() => {
    if (!threadId || loading) return
    const supabase = createClient()
    const channel = supabase
      .channel(`thread-messages-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messaging_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        () => {
          loadMessages().then((data) => setMessages(data.messages ?? []))
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          try {
            console.log("[RecruitNC] Messaging realtime subscribed for thread", threadId)
          } catch (_) {}
        }
      })
    return () => {
      supabase.removeChannel(channel)
    }
  }, [threadId, loading])

  // Typing indicators: listen for broadcast on thread channel (exclude current user)
  useEffect(() => {
    if (!threadId) return
    const supabase = createClient()
    const channel = supabase.channel(`thread-typing-${threadId}`)
    const handleTyping = (payload: { payload?: { user_id?: string; display_name?: string } }) => {
      const uid = payload.payload?.user_id
      const name = payload.payload?.display_name ?? "Someone"
      if (!uid || uid === currentUserId) return
      setTypingUsers((prev) => {
        const next = prev.filter((u) => u.user_id !== uid)
        next.push({ user_id: uid, display_name: name })
        return next
      })
      if (typingTimeoutRef.current[uid]) clearTimeout(typingTimeoutRef.current[uid])
      const t = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u.user_id !== uid))
        delete typingTimeoutRef.current[uid]
      }, 4000)
      typingTimeoutRef.current[uid] = t
    }
    const handleStopped = (payload: { payload?: { user_id?: string } }) => {
      const uid = payload.payload?.user_id
      if (!uid) return
      if (typingTimeoutRef.current[uid]) {
        clearTimeout(typingTimeoutRef.current[uid])
        delete typingTimeoutRef.current[uid]
      }
      setTypingUsers((prev) => prev.filter((u) => u.user_id !== uid))
    }
    channel.on("broadcast", { event: "typing" }, handleTyping).on("broadcast", { event: "stopped" }, handleStopped).subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [threadId, currentUserId])

  useEffect(() => {
    fetch("/api/messaging/custom-emoji", { credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        const list = res?.emoji ?? []
        const map: Record<string, string> = {}
        for (const e of list) {
          const slug = e?.slug?.trim()
          const url = e?.image_url ?? e?.imageUrl
          if (slug && url && typeof url === "string") {
            map[slug.toLowerCase()] = url
            map[slug] = url
          }
        }
        setCustomEmojiMap(map)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!scrollRef.current || messages.length === 0) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages.length])

  function onSent() {
    loadMessages().then((data) => setMessages(data.messages ?? []))
  }

  function handleScroll() {
    const el = scrollRef.current
    const top = topSentinelRef.current
    if (!el || !top || loadingMore || !hasMore) return
    const rect = top.getBoundingClientRect()
    if (rect.top >= el.getBoundingClientRect().top - 100) fetchAndPrepend(messages[0]?.id)
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#003366]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 min-h-0"
      >
        {loadingMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        )}
        <div ref={topSentinelRef} aria-hidden />
        <div className="space-y-4">
          {messageGroupsWithDates(messages).map(({ dateLabel, items }) => (
            <div key={dateLabel} className="space-y-4">
              <div className="flex justify-center">
                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                  {dateLabel}
                </span>
              </div>
              {items.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isOwn={m.sender_id === currentUserId}
                  currentUserId={currentUserId}
                  customEmojiMap={customEmojiMap}
                  onEdited={(updated) =>
                    setMessages((prev) => prev.map((msg) => (msg.id === updated.id ? updated : msg)))
                  }
                  onReactionChange={() => loadMessages().then((data) => setMessages(data.messages ?? []))}
                  onDeleted={(id) => setMessages((prev) => prev.filter((msg) => msg.id !== id))}
                />
              ))}
            </div>
          ))}
        </div>
        {messages.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="font-medium">No messages yet</p>
            <p className="text-sm mt-1">Say something to get the conversation started.</p>
          </div>
        )}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 py-2 text-sm text-gray-500">
            <span className="inline-flex gap-1">
              <span className="animate-pulse">●</span>
              <span className="animate-pulse">●</span>
              <span className="animate-pulse">●</span>
            </span>
            {typingUsers.map((u) => u.display_name).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing…
          </div>
        )}
      </div>
      <Composer
        threadId={threadId}
        onSent={onSent}
        members={members}
        currentUserId={currentUserId}
        currentUserDisplayName={members.find((m) => m.user_id === currentUserId)?.display_name ?? "You"}
      />
    </div>
  )
}
