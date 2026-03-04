"use client"

import { useState } from "react"
import type React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MoreHorizontal, Pencil, Loader2, SmilePlus, Trash2 } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export type ReactionAgg = { emoji: string; count: number; user_ids: string[] }

export type MessageRow = {
  id: string
  thread_id: string
  sender_id: string
  type: "message" | "announcement"
  body: string
  created_at: string
  edited_at?: string | null
  sender_name?: string | null
  attachments?: { id: string; file_url: string; content_type?: string | null; filename?: string | null }[]
  reactions?: ReactionAgg[]
}

// Match http/https URLs, @mentions (e.g. @John Smith), and custom emoji :slug:
const URL_REGEX = /(https?:\/\/[^\s]+)/gi
const MENTION_REGEX = /(@[\w]+(?:\s+[\w]+)*)/g
const CUSTOM_EMOJI_REGEX = /(:[a-zA-Z0-9_-]+:)/g

function linkifyAndMentions(
  text: string,
  isOwn: boolean,
  customEmojiMap?: Record<string, string>
) {
  const mentionClass = isOwn
    ? "font-semibold bg-white/25 text-white px-1 rounded"
    : "font-semibold text-[#003366] bg-[#003366]/10 px-1 rounded"
  const byUrl = text.split(URL_REGEX)
  const result: React.ReactNode[] = []
  byUrl.forEach((part, i) => {
    const isUrl = part.startsWith("http://") || part.startsWith("https://")
    if (isUrl) {
      result.push(
        <a
          key={`url-${i}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-inherit hover:opacity-80"
        >
          {part}
        </a>
      )
      return
    }
    const byMention = part.split(MENTION_REGEX)
    byMention.forEach((bit, j) => {
      if (bit.startsWith("@")) {
        result.push(
          <span key={`mention-${i}-${j}`} className={mentionClass}>
            {bit}
          </span>
        )
      } else {
        const byCustom = customEmojiMap ? bit.split(/(:[a-zA-Z0-9_-]+:)/g) : [bit]
        byCustom.forEach((seg, k) => {
          if (seg.startsWith(":") && seg.endsWith(":") && customEmojiMap) {
            const slug = seg.slice(1, -1).trim()
            const url = customEmojiMap[slug] ?? customEmojiMap[slug.toLowerCase()]
            if (url) {
              result.push(
                <img
                  key={`emoji-${i}-${j}-${k}`}
                  src={url}
                  alt={seg}
                  className="inline-block w-6 h-6 align-middle mx-0.5 object-contain"
                />
              )
              return
            }
          }
          result.push(seg)
        })
      }
    })
  })
  return result
}

const MAX_BODY_LENGTH = 2000

const QUICK_EMOJI = ["👍", "👏", "❤️", "😂", "🔥"]

export function MessageBubble(
  props: {
    message: MessageRow
    isOwn: boolean
    currentUserId: string
    onEdited?: (updated: MessageRow) => void
    onDeleted?: (messageId: string) => void
    onReactionChange?: () => void
    customEmojiMap?: Record<string, string>
  }
) {
  const { message, isOwn, onEdited, onDeleted, onReactionChange, customEmojiMap } = props
  const reactions = message.reactions ?? []
  const [editing, setEditing] = useState(false)
  const [reacting, setReacting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function confirmDelete() {
    if (!onDeleted) return
    setDeleting(true)
    try {
      const res = await fetch(
        `/api/messaging/threads/${message.thread_id}/messages/${message.id}`,
        { method: "DELETE", credentials: "include" }
      )
      if (res.ok) {
        setDeleteOpen(false)
        onDeleted(message.id)
      }
    } finally {
      setDeleting(false)
    }
  }

  async function toggleReaction(emoji: string) {
    if (!onReactionChange) return
    const haveReacted = reactions.some((r) => r.emoji === emoji && r.user_ids.includes(props.currentUserId))
    setReacting(true)
    try {
      const url = `/api/messaging/threads/${message.thread_id}/messages/${message.id}/reactions`
      if (haveReacted) {
        await fetch(url, { method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ emoji }) })
      } else {
        await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ emoji }) })
      }
      onReactionChange()
    } finally {
      setReacting(false)
    }
  }

  function renderReactionEmoji(emoji: string) {
    const url = customEmojiMap?.[emoji] ?? customEmojiMap?.[emoji.toLowerCase()]
    if (url) return <img src={url} alt={emoji} className="w-4 h-4 object-contain inline-block" />
    return <span>{emoji}</span>
  }
  const [editBody, setEditBody] = useState(message.body)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const displayName = message.sender_name ?? (isOwn ? "You" : "Member")
  const isAnnouncement = message.type === "announcement"
  const time = new Date(message.created_at).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
  const showEdit = isOwn && !isAnnouncement && onEdited != null

  async function saveEdit() {
    const trimmed = editBody.trim()
    if (!trimmed || trimmed === message.body) {
      setEditing(false)
      return
    }
    if (trimmed.length > MAX_BODY_LENGTH) {
      setEditError(`Message must be ${MAX_BODY_LENGTH} characters or less`)
      return
    }
    setEditError(null)
    setSaving(true)
    try {
      const res = await fetch(
        `/api/messaging/threads/${message.thread_id}/messages/${message.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ body: trimmed }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Failed to save")
      onEdited?.({ ...message, body: trimmed, edited_at: data.edited_at ?? new Date().toISOString() })
      setEditing(false)
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  function cancelEdit() {
    setEditBody(message.body)
    setEditError(null)
    setEditing(false)
  }

  return (
    <div className={cn("flex flex-col gap-0.5", isOwn ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
          isAnnouncement && "bg-amber-100 text-amber-900 border border-amber-200",
          !isAnnouncement && isOwn && "bg-[#003366] text-white",
          !isAnnouncement && !isOwn && "bg-gray-100 text-gray-900"
        )}
      >
        {isAnnouncement && (
          <div className="text-xs font-semibold text-amber-700 mb-1">Announcement</div>
        )}
        {!isOwn && !isAnnouncement && (
          <div className="text-xs font-medium text-gray-500 mb-0.5">{displayName}</div>
        )}
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              disabled={saving}
              className="min-h-[80px] bg-white/10 border-white/30 text-inherit resize-none"
              maxLength={MAX_BODY_LENGTH + 100}
              autoFocus
            />
            {editError && <p className="text-xs text-red-200">{editError}</p>}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={saveEdit} disabled={saving || !editBody.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="whitespace-pre-wrap break-words">
              {linkifyAndMentions(message.body, isOwn, customEmojiMap)}
            </div>
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {message.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg overflow-hidden border border-white/20 max-w-[200px]"
                  >
                    <img
                      src={att.file_url}
                      alt={att.filename ?? "Attachment"}
                      className="w-full h-auto max-h-40 object-cover"
                    />
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-1.5 px-1 flex-wrap">
        <span className="text-xs text-gray-400">{time}</span>
        {message.edited_at && (
          <span className="text-xs text-gray-400">· Edited</span>
        )}
        {showEdit && !editing && (
          <>
            <button
              type="button"
              onClick={() => {
                setEditBody(message.body)
                setEditing(true)
              }}
              className="text-xs text-gray-500 hover:text-[#003366] hover:underline"
              aria-label="Edit message"
            >
              Edit
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-0.5 rounded text-gray-400 hover:text-gray-600"
                  aria-label="More options"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isOwn ? "end" : "start"}>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    setEditBody(message.body)
                    setEditing(true)
                  }}
                >
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  Edit
                </DropdownMenuItem>
                {onDeleted && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault()
                        setDeleteOpen(true)
                      }}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {onDeleted && (
              <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                  <AlertDialogTitle>Delete this message?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This cannot be undone. The message will be removed for everyone in the thread.
                  </AlertDialogDescription>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.preventDefault()
                        confirmDelete()
                      }}
                      disabled={deleting}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        )}
      </div>
      {(reactions.length > 0 || onReactionChange) && (
        <div className="flex items-center gap-1 flex-wrap mt-0.5">
          {reactions.map((r) => {
            const haveReacted = r.user_ids.includes(props.currentUserId)
            return (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onReactionChange && toggleReaction(r.emoji)}
                disabled={reacting}
                className={cn(
                  "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors",
                  haveReacted ? "bg-[#003366]/20 border-[#003366]/40 text-[#003366]" : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
                )}
              >
                {renderReactionEmoji(r.emoji)}
                {r.count > 1 && <span>{r.count}</span>}
              </button>
            )
          })}
          {onReactionChange && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  aria-label="Add reaction"
                  disabled={reacting}
                >
                  <SmilePlus className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align={isOwn ? "end" : "start"} className="w-auto p-2">
                <div className="flex flex-wrap gap-1">
                  {QUICK_EMOJI.map((e) => (
                    <button
                      key={e}
                      type="button"
                      className="p-1.5 rounded hover:bg-gray-100 text-lg"
                      onClick={() => toggleReaction(e)}
                    >
                      {e}
                    </button>
                  ))}
                  {customEmojiMap &&
                    (() => {
                      const seen = new Set<string>()
                      return Object.keys(customEmojiMap)
                        .filter((k) => {
                          const low = k.toLowerCase()
                          if (seen.has(low)) return false
                          seen.add(low)
                          return true
                        })
                        .slice(0, 6)
                        .map((slug) => (
                          <button
                            key={slug}
                            type="button"
                            className="p-1 rounded hover:bg-gray-100"
                            onClick={() => toggleReaction(slug)}
                          >
                            <img src={customEmojiMap[slug]} alt={slug} className="w-5 h-5 object-contain" />
                          </button>
                        ))
                    })()}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}
    </div>
  )
}
