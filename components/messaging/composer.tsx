"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Send, Loader2, SmilePlus, AtSign, ImagePlus, X, ImageIcon } from "lucide-react"
import { EmojiStrip, type CustomEmojiItem } from "./emoji-strip"

const MAX_LENGTH = 2000
const SLUG_REGEX = /(:[a-zA-Z0-9_-]+:)/g

/** Renders message body with :slug: replaced by logo images for preview */
function ComposerPreview({ body, customEmoji }: { body: string; customEmoji: CustomEmojiItem[] }) {
  const map = useMemo(() => {
    const m: Record<string, string> = {}
    for (const e of customEmoji) {
      if (e?.slug && e?.image_url) {
        m[e.slug.toLowerCase()] = e.image_url
        m[e.slug] = e.image_url
      }
    }
    return m
  }, [customEmoji])
  if (!body.trim() || Object.keys(map).length === 0) return null
  const parts = body.split(SLUG_REGEX)
  const hasSlug = parts.some((p) => p.startsWith(":") && p.endsWith(":"))
  if (!hasSlug) return null
  return (
    <div className="flex flex-wrap items-center gap-0.5 text-sm text-gray-600 mt-1 min-h-[24px]">
      {parts.map((seg, i) => {
        if (seg.startsWith(":") && seg.endsWith(":")) {
          const slug = seg.slice(1, -1).trim()
          const url = map[slug] ?? map[slug.toLowerCase()]
          if (url) return <img key={i} src={url} alt={slug} className="inline-block w-5 h-5 align-middle object-contain" />
        }
        return <span key={i}>{seg}</span>
      })}
    </div>
  )
}

export type PendingAttachment = { url: string; content_type: string; filename: string }

export type ComposerMember = { user_id: string; display_name: string }

const TYPING_DEBOUNCE_MS = 300
const TYPING_STOP_MS = 2000

export function Composer({
  threadId,
  onSent,
  disabled,
  members = [],
  currentUserId,
  currentUserDisplayName,
}: {
  threadId: string
  onSent?: () => void
  disabled?: boolean
  members?: ComposerMember[]
  currentUserId?: string
  currentUserDisplayName?: string
}) {
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [customEmoji, setCustomEmoji] = useState<CustomEmojiItem[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerOpenToLogos, setPickerOpenToLogos] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasLogos = customEmoji.length > 0
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastAtRef = useRef<number>(-1)
  const typingChannelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null)
  const typingSentRef = useRef(false)
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch("/api/messaging/custom-emoji", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setCustomEmoji(data.emoji ?? []))
      .catch(() => setCustomEmoji([]))
  }, [])

  // Typing indicator: join broadcast channel and send typing/stopped
  useEffect(() => {
    if (!threadId || !currentUserId || !currentUserDisplayName) return
    const supabase = createClient()
    const ch = supabase.channel(`thread-typing-${threadId}`).subscribe()
    typingChannelRef.current = ch
    return () => {
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current)
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current)
      if (typingSentRef.current) {
        ch.send({ type: "broadcast", event: "stopped", payload: { user_id: currentUserId } })
      }
      supabase.removeChannel(ch)
      typingChannelRef.current = null
    }
  }, [threadId, currentUserId, currentUserDisplayName])

  const broadcastTyping = useCallback(() => {
    const ch = typingChannelRef.current
    if (!ch || !currentUserId || !currentUserDisplayName) return
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current)
      typingStopTimerRef.current = null
    }
    ch.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: currentUserId, display_name: currentUserDisplayName },
    })
    typingSentRef.current = true
    typingStopTimerRef.current = setTimeout(() => {
      ch.send({ type: "broadcast", event: "stopped", payload: { user_id: currentUserId } })
      typingSentRef.current = false
      typingStopTimerRef.current = null
    }, TYPING_STOP_MS)
  }, [currentUserId, currentUserDisplayName])

  const scheduleTypingBroadcast = useCallback(() => {
    if (!typingChannelRef.current || !currentUserId) return
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current)
    typingDebounceRef.current = setTimeout(broadcastTyping, TYPING_DEBOUNCE_MS)
  }, [broadcastTyping, currentUserId])

  useEffect(() => {
    if (!sending && textareaRef.current) textareaRef.current.focus()
  }, [sending])

  const filteredMembers = useMemo(() => {
    if (!mentionQuery) return members.slice(0, 8)
    const q = mentionQuery.toLowerCase()
    return members
      .filter((m) => m.display_name.toLowerCase().includes(q))
      .slice(0, 8)
  }, [members, mentionQuery])

  function insertAtCursor(text: string) {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart ?? body.length
    const end = ta.selectionEnd ?? body.length
    const before = body.slice(0, start)
    const after = body.slice(end)
    const next = before + text + after
    setBody(next)
    setMentionQuery(null)
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + text.length
      ta.setSelectionRange(pos, pos)
    })
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value
    setBody(v)
    if (v.trim()) scheduleTypingBroadcast()
    const cursor = e.target.selectionStart ?? 0
    const beforeCursor = v.slice(0, cursor)
    const atMatch = beforeCursor.match(/@(\w*)$/)
    if (atMatch) {
      setMentionQuery(atMatch[1])
      setMentionIndex(0)
      lastAtRef.current = cursor - atMatch[0].length
    } else {
      setMentionQuery(null)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setMentionIndex((i) => (i + 1) % filteredMembers.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setMentionIndex((i) => (i - 1 + filteredMembers.length) % filteredMembers.length)
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        const m = filteredMembers[mentionIndex]
        if (m) {
          const start = lastAtRef.current
          const before = body.slice(0, start)
          const after = body.slice(textareaRef.current?.selectionStart ?? body.length)
          setBody(before + `@${m.display_name} ` + after)
          setMentionQuery(null)
          const ta = textareaRef.current
          if (ta) {
            const pos = start + m.display_name.length + 3
            ta.setSelectionRange(pos, pos)
            ta.focus()
          }
        }
        return
      }
      if (e.key === "Escape") {
        setMentionQuery(null)
        return
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  async function uploadFiles(files: FileList | File[]): Promise<void> {
    const fileList = Array.from(files).filter((f) => f.type.startsWith("image/"))
    if (fileList.length === 0) return
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.set("threadId", threadId)
      for (const f of fileList) form.append("file", f)
      const res = await fetch("/api/messaging/upload", { method: "POST", credentials: "include", body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Upload failed")
      const uploads = (data.uploads ?? []) as PendingAttachment[]
      setPendingAttachments((prev) => [...prev, ...uploads])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload image")
    } finally {
      setUploading(false)
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items
    if (!items) return
    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      const file = items[i].getAsFile()
      if (file?.type.startsWith("image/")) files.push(file)
    }
    if (files.length > 0) {
      e.preventDefault()
      uploadFiles(files)
    }
  }

  async function send() {
    const trimmed = body.trim()
    const hasContent = trimmed.length > 0 || pendingAttachments.length > 0
    if (!hasContent || sending || disabled) return
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
        body: JSON.stringify({
          body: trimmed,
          type: "message",
          attachment_urls: pendingAttachments.map((a) => ({ url: a.url, content_type: a.content_type, filename: a.filename })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Failed to send")
      setBody("")
      setMentionQuery(null)
      setPendingAttachments([])
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current)
        typingStopTimerRef.current = null
      }
      if (typingSentRef.current && typingChannelRef.current && currentUserId) {
        typingChannelRef.current.send({ type: "broadcast", event: "stopped", payload: { user_id: currentUserId } })
        typingSentRef.current = false
      }
      onSent?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send")
    } finally {
      setSending(false)
    }
  }

  const canSend = (body.trim().length > 0 || pendingAttachments.length > 0) && !sending && !disabled

  return (
    <div className="w-full border-t-2 border-[#003366]/15 bg-[#003366]/[0.03] px-2 py-3 sm:px-3">
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      {/* @mentions dropdown */}
      {mentionQuery !== null && members.length > 0 && (
        <div className="mb-2 border rounded-lg bg-white shadow-lg overflow-hidden max-h-40 overflow-y-auto">
          {filteredMembers.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-500">No one found</p>
          ) : (
            filteredMembers.map((m, i) => (
              <button
                key={m.user_id}
                type="button"
                onClick={() => {
                  const start = lastAtRef.current
                  const before = body.slice(0, start)
                  const after = body.slice(textareaRef.current?.selectionStart ?? body.length)
                  setBody(before + `@${m.display_name} ` + after)
                  setMentionQuery(null)
                  const ta = textareaRef.current
                  if (ta) {
                    const pos = start + m.display_name.length + 3
                    ta.setSelectionRange(pos, pos)
                    ta.focus()
                  }
                }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 ${i === mentionIndex ? "bg-[#003366]/10" : ""}`}
              >
                <AtSign className="h-3.5 w-3.5 text-gray-400" />
                <span>{m.display_name}</span>
              </button>
            ))
          )}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files
          if (files?.length) {
            uploadFiles(files)
            e.target.value = ""
          }
        }}
      />
      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {pendingAttachments.map((att, i) => (
            <div key={`${att.url}-${i}`} className="relative rounded-lg overflow-hidden border border-gray-200 w-16 h-16 shrink-0">
              <img src={att.url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                className="absolute top-0.5 right-0.5 rounded-full bg-black/60 text-white p-0.5 hover:bg-black/80"
                aria-label="Remove"
                onClick={() => setPendingAttachments((prev) => prev.filter((_, j) => j !== i))}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Textarea full width on first row; pic, emoji, add photo, send on second row so the text box is wider. */}
      <div className="flex flex-col gap-2 w-full min-w-0">
        <Textarea
          ref={textareaRef}
          placeholder="Send a message…"
          value={body}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={sending || disabled}
          className="w-full min-w-0 min-h-[52px] max-h-28 resize-none rounded-xl border-[#003366]/20 bg-white text-gray-900 placeholder:text-gray-500 px-4 py-3 text-base shadow-inner focus:ring-2 focus:ring-[#003366]/30"
          rows={2}
          maxLength={MAX_LENGTH + 100}
        />
        <div className="flex items-center gap-1 w-full justify-end shrink-0">
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <span className="inline-flex shrink-0 gap-0">
                  {hasLogos && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-11 w-11 text-[#003366]/70 hover:text-[#003366] hover:bg-[#003366]/10 rounded-full"
                      aria-label="Insert logo"
                      onClick={() => setPickerOpenToLogos(true)}
                    >
                      <ImageIcon className="h-5 w-5" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-11 w-11 text-[#003366]/70 hover:text-[#003366] hover:bg-[#003366]/10 rounded-full"
                    aria-label={hasLogos ? "Insert emoji" : "Insert emoji or logo"}
                    onClick={() => setPickerOpenToLogos(false)}
                  >
                    <SmilePlus className="h-5 w-5" />
                  </Button>
                </span>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <EmojiStrip
                  onPick={(emoji) => {
                    insertAtCursor(emoji)
                    setPickerOpen(false)
                  }}
                  customEmoji={customEmoji}
                  defaultTab={pickerOpenToLogos ? "logos" : "standard"}
                />
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="shrink-0 h-11 w-11 text-[#003366]/70 hover:text-[#003366] hover:bg-[#003366]/10 rounded-full"
              aria-label="Add photo"
              disabled={uploading || sending || disabled}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            </Button>
            <Button
              type="button"
              size="icon"
              className="shrink-0 h-11 w-11 rounded-full bg-[#003366] hover:bg-[#002147] text-white shadow-md"
              onClick={send}
              disabled={!canSend}
              aria-label="Send"
            >
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 mt-1.5 md:mt-1.5">
        <ComposerPreview body={body} customEmoji={customEmoji} />
        {body.length > MAX_LENGTH * 0.9 && (
          <p className="text-xs text-gray-500">{body.length} / {MAX_LENGTH}</p>
        )}
        <p className="text-xs text-gray-500 hidden sm:block">
          @ mention · {hasLogos ? "Logos · " : ""}Emoji · Add photo or paste image
        </p>
      </div>
    </div>
  )
}
