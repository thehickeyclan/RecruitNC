"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Send, Loader2, Pencil, Reply, Smile, X, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ForumMessageBody, type CustomEmojiItem } from "@/components/forum/forum-message-body"
import { ForumEmojiPicker, type CustomEmojiWithCategory } from "@/components/forum/forum-emoji-picker"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type ReactionAgg = { emoji: string; count: number; user_ids: string[] }

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
  parent_id?: string | null
  reactions?: ReactionAgg[]
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
  const [channelName, setChannelName] = useState<string>("")
  const [groupName, setGroupName] = useState<string | null>(null)
  const [customEmoji, setCustomEmoji] = useState<CustomEmojiItem[]>([])
  const [customEmojiWithCategory, setCustomEmojiWithCategory] = useState<CustomEmojiWithCategory[]>([])
  const [authors, setAuthors] = useState<Record<string, { display_name: string; headshot_url: string | null }>>({})
  const [replyingTo, setReplyingTo] = useState<{ id: string; snippet: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
    fetch("/api/messaging/custom-emoji", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const list = (data?.emoji ?? []) as { slug: string; image_url: string; category?: string; display_name?: string | null }[]
        setCustomEmoji(list.map((e) => ({ slug: e.slug, image_url: e.image_url })))
        setCustomEmojiWithCategory(list.map((e) => ({ slug: e.slug, image_url: e.image_url, category: e.category, display_name: e.display_name })))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const authorIds = [...new Set(messages.map((m) => m.author_id).filter(Boolean))]
    if (authorIds.length === 0) return
    fetch(`/api/forum/authors?ids=${authorIds.join(",")}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setAuthors(data.authors ?? {}))
      .catch(() => {})
  }, [messages])

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
        if (data?.group_name) setGroupName(data.group_name)
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
    const parentId = replyingTo?.id ?? null
    try {
      const res = await fetch(`/api/forum/channels/${channelId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: text, parent_id: parentId || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? "Failed to send")
      const newMsg = data.message as Message
      setMessages((prev) => [newMsg, ...prev])
      setDraft("")
      setReplyingTo(null)
      try {
        localStorage.removeItem(`forum-draft-${channelId}`)
      } catch {}
    } catch (e) {
      console.error("[forum] send error", e)
    } finally {
      setSending(false)
    }
  }, [channelId, draft, sending, replyingTo])

  const handleEdit = useCallback(
    async (messageId: string, newBody: string) => {
      if (!channelId || !newBody.trim()) return
      const res = await fetch(`/api/forum/channels/${channelId}/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: newBody.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? "Failed to edit")
      const updated = data.message as { id: string; body: string; edited_at: string }
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, body: updated.body, edited_at: updated.edited_at } : m))
      )
      setEditingId(null)
      setEditDraft("")
    },
    [channelId]
  )

  const handleDelete = useCallback(
    async (messageId: string) => {
      if (!channelId || !user?.id) return
      if (!confirm("Delete this message?")) return
      const res = await fetch(`/api/forum/channels/${channelId}/messages/${messageId}`, { method: "DELETE", credentials: "include" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        console.error("[forum] delete error", data?.error)
        return
      }
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    },
    [channelId, user?.id]
  )

  const handleReaction = useCallback(
    async (messageId: string, emoji: string, currentReaction: ReactionAgg | undefined) => {
      if (!channelId || !user?.id) return
      const haveReacted = currentReaction?.user_ids.includes(user.id)
      const url = `/api/forum/channels/${channelId}/messages/${messageId}/reactions`
      if (haveReacted) {
        const res = await fetch(url, { method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ emoji }) })
        if (!res.ok) return
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m
            const reactions = (m.reactions ?? [])
              .map((r) => {
                if (r.emoji !== emoji) return r
                if (r.count <= 1) return null
                return { ...r, count: r.count - 1, user_ids: r.user_ids.filter((id) => id !== user.id) }
              })
              .filter((x): x is ReactionAgg => x != null)
            return { ...m, reactions }
          })
        )
      } else {
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ emoji }) })
        if (!res.ok) return
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m
            const list = m.reactions ?? []
            const existing = list.find((r) => r.emoji === emoji)
            if (existing) return { ...m, reactions: list.map((r) => (r.emoji !== emoji ? r : { ...r, count: r.count + 1, user_ids: [...r.user_ids, user.id] })) }
            return { ...m, reactions: [...list, { emoji, count: 1, user_ids: [user.id] }] }
          })
        )
      }
    },
    [channelId, user?.id]
  )

  const insertEmoji = useCallback((emoji: string) => {
    const ta = textareaRef.current
    if (ta) {
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const before = draft.slice(0, start)
      const after = draft.slice(end)
      setDraft(before + emoji + after)
      setTimeout(() => {
        ta.focus()
        ta.setSelectionRange(start + emoji.length, start + emoji.length)
      }, 0)
    } else {
      setDraft((d) => d + emoji)
    }
  }, [draft])

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
          {groupName || (channelName && channelName !== "general" ? channelName : null) || "…"}
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
                {chronological.map((msg) => {
                  const parentMsg = msg.parent_id ? messages.find((m) => m.id === msg.parent_id) : null
                  const isOwn = msg.author_id === user?.id
                  const isEditing = editingId === msg.id
                  const author = authors[msg.author_id]
                  const displayName = author?.display_name ?? (isOwn ? "You" : "Member")
                  const headshotUrl = author?.headshot_url ?? null
                  const initialsForAvatar = (author?.display_name ?? displayName).slice(0, 2).toUpperCase().replace(/[^A-Z0-9]/gi, "") || "?"
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "rounded-lg p-3 group",
                        msg.pinned ? "border-l-4 border-[#C8A94A] bg-[#C8A94A]/10" : "bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Avatar className="h-8 w-8 flex-shrink-0 rounded-full border border-white/20">
                          <AvatarImage src={headshotUrl ?? undefined} alt="" />
                          <AvatarFallback className="bg-white/10 text-white text-xs">{initialsForAvatar}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-white text-sm" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                          {isOwn ? "You" : displayName}
                        </span>
                        <span className="text-xs text-white/50">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                        {msg.edited_at && (
                          <span className="text-xs text-white/40">(edited)</span>
                        )}
                        {msg.pinned && (
                          <span className="text-xs text-[#C8A94A] font-medium">PINNED</span>
                        )}
                        {!isEditing && (
                          <span className="flex-1 inline-flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isOwn && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(msg.id)
                                    setEditDraft(msg.body)
                                  }}
                                  className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white"
                                  aria-label="Edit message"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(msg.id)}
                                  className="p-1 rounded hover:bg-red-500/20 text-white/70 hover:text-red-300"
                                  aria-label="Delete message"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => setReplyingTo({ id: msg.id, snippet: msg.body.slice(0, 80) + (msg.body.length > 80 ? "…" : "") })}
                              className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white"
                              aria-label="Reply"
                            >
                              <Reply className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        )}
                      </div>
                      {parentMsg && (
                        <p className="text-xs text-white/50 mb-1 border-l-2 border-white/20 pl-2">
                          Replying to {parentMsg.author_id === user?.id ? "You" : (authors[parentMsg.author_id]?.display_name ?? "Member")}: {parentMsg.body.slice(0, 60)}{parentMsg.body.length > 60 ? "…" : ""}
                        </p>
                      )}
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            rows={3}
                            className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-[#C8A94A]"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleEdit(msg.id, editDraft)} className="bg-[#C8A94A] text-[#0B2545] hover:bg-[#E2C46A]">
                              Save
                            </Button>
                            <Button size="sm" variant="outline" className="border-white/30 text-white" onClick={() => { setEditingId(null); setEditDraft("") }}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-[#F0F4FF] text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            <ForumMessageBody body={msg.body} customEmoji={customEmoji} />
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1">
                            {(msg.reactions ?? []).map((r) => {
                              const haveReacted = r.user_ids.includes(user?.id ?? "")
                              const customSlug = r.emoji.match(/^:([a-z0-9_-]+):$/i)?.[1]
                              const customUrl = customSlug ? customEmoji.find((e) => e.slug.toLowerCase() === customSlug.toLowerCase())?.image_url : null
                              const isCustomSlug = !!r.emoji.match(/^:[a-z0-9_-]+:$/i)
                              return (
                                <button
                                  key={r.emoji}
                                  type="button"
                                  onClick={() => handleReaction(msg.id, r.emoji, r)}
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm border transition-colors",
                                    haveReacted ? "border-[#C8A94A]/50 bg-[#C8A94A]/10 text-white" : "border-white/20 bg-white/5 text-white/80 hover:bg-white/10"
                                  )}
                                >
                                  {customUrl ? (
                                    <img src={customUrl} alt="" role="presentation" className="w-4 h-4 object-contain" />
                                  ) : isCustomSlug ? (
                                    <span className="inline-block w-4 h-4 rounded-full bg-white/10" aria-hidden />
                                  ) : (
                                    <span>{r.emoji}</span>
                                  )}
                                  {r.count > 1 && <span className="text-xs">{r.count}</span>}
                                </button>
                              )
                            })}
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex items-center rounded-full px-2 py-0.5 text-sm border border-white/20 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80 transition-opacity opacity-0 group-hover:opacity-100"
                                  aria-label="Add reaction"
                                >
                                  <Smile className="w-3.5 h-3.5" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 bg-[#0D1F3C] border-white/20 max-h-64" align="start">
                                <ForumEmojiPicker
                                  customEmoji={customEmojiWithCategory}
                                  onSelect={(emoji) => handleReaction(msg.id, emoji, (msg.reactions ?? []).find((x) => x.emoji === emoji))}
                                  className="max-h-56"
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex-shrink-0 p-3 border-t border-white/10">
        {replyingTo && (
          <div className="flex items-center gap-2 mb-2 py-1.5 px-2 rounded bg-white/10 border border-white/10 text-sm text-white/80">
            <Reply className="w-4 h-4 flex-shrink-0 text-[#C8A94A]" />
            <span className="truncate flex-1">Replying to: {replyingTo.snippet}</span>
            <button type="button" onClick={() => setReplyingTo(null)} className="p-1 rounded hover:bg-white/10 text-white" aria-label="Cancel reply">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <div className="flex-1 flex gap-1 min-w-0">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex-shrink-0 h-[44px] w-10 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 flex items-center justify-center"
                  aria-label="Insert emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-[#0D1F3C] border-white/20 max-h-80" align="start">
                <ForumEmojiPicker
                  customEmoji={customEmojiWithCategory}
                  onSelect={insertEmoji}
                  className="max-h-72"
                />
              </PopoverContent>
            </Popover>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message… (Enter to send, Shift+Enter for new line)"
              rows={2}
              className="flex-1 min-h-[44px] max-h-32 resize-y rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-[#C8A94A]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>
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
