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
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Loader2 } from "lucide-react"

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
}

// Match http/https URLs, @mentions (e.g. @John Smith), and custom emoji :slug:
const URL_REGEX = /(https?:\/\/[^\s]+)/gi
const MENTION_REGEX = /(@[\w]+(?:\s+[\w]+)*)/g
const CUSTOM_EMOJI_REGEX = /(:[a-z0-9-]+:)/g

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
        const byCustom = customEmojiMap ? bit.split(/(:[a-z0-9-]+:)/g) : [bit]
        byCustom.forEach((seg, k) => {
          if (seg.startsWith(":") && seg.endsWith(":") && customEmojiMap) {
            const slug = seg.slice(1, -1)
            const url = customEmojiMap[slug]
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

export function MessageBubble(
  props: {
    message: MessageRow
    isOwn: boolean
    currentUserId: string
    onEdited?: (updated: MessageRow) => void
    customEmojiMap?: Record<string, string>
  }
) {
  const { message, isOwn, onEdited, customEmojiMap } = props
  const [editing, setEditing] = useState(false)
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
      <div className="flex items-center gap-1.5 px-1">
        <span className="text-xs text-gray-400">{time}</span>
        {message.edited_at && (
          <span className="text-xs text-gray-400">· Edited</span>
        )}
        {showEdit && !editing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-0.5 rounded text-gray-400 hover:text-gray-600"
                aria-label="Edit message"
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
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}
