"use client"

import { useState, useEffect, useCallback } from "react"
import { ThumbsUp, ThumbsDown, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"

const STORAGE_KEY = "nchsaa_guest_id"

function getOrCreateGuestId(): string {
  if (typeof window === "undefined") return ""
  let id = localStorage.getItem(STORAGE_KEY)
  if (!id) {
    id = "guest_" + Math.random().toString(36).slice(2) + "_" + Date.now()
    localStorage.setItem(STORAGE_KEY, id)
  }
  return id
}

type Comment = {
  id: number
  parent_id: number | null
  author_name: string
  content: string
  created_at: string
  replies?: Comment[]
}

export function NchsaaArticleComments({ articleSlug }: { articleSlug: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [reactions, setReactions] = useState<Record<number, { up: number; down: number }>>({})
  const [loading, setLoading] = useState(true)
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const { user } = useAuth()

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/nchsaa/article-comments?slug=${encodeURIComponent(articleSlug)}`)
      const data = await res.json()
      setComments(data.comments ?? [])
    } catch {
      setComments([])
    } finally {
      setLoading(false)
    }
  }, [articleSlug])

  const fetchReactions = useCallback(
    async (commentIds: number[]) => {
      if (commentIds.length === 0) return
      try {
        const res = await fetch(`/api/nchsaa/comment-reactions?ids=${commentIds.join(",")}`)
        const data = await res.json()
        setReactions((prev) => ({ ...prev, ...data }))
      } catch {}
    },
    []
  )

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  useEffect(() => {
    const ids = new Set<number>()
    function collectIds(list: Comment[]) {
      for (const c of list) {
        ids.add(c.id)
        if (c.replies?.length) collectIds(c.replies)
      }
    }
    collectIds(comments)
    if (ids.size) fetchReactions([...ids])
  }, [comments, fetchReactions])

  return (
    <div className="mt-10 border-t border-slate-200 pt-8">
      <h2 className="text-xl font-bold text-[#003366] mb-6 flex items-center gap-2">
        <MessageCircle className="h-5 w-5" />
        Comments
      </h2>
      <CommentForm
        articleSlug={articleSlug}
        parentId={null}
        onSuccess={() => {
          fetchComments()
        }}
        onCancel={() => {}}
      />
      {loading ? (
        <p className="text-slate-500 text-sm mt-4">Loading comments…</p>
      ) : (
        <ul className="mt-6 space-y-6">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              articleSlug={articleSlug}
              reactions={reactions[c.id] ?? { up: 0, down: 0 }}
              onReact={async (commentId, reaction) => {
                const guestId = !user ? getOrCreateGuestId() : undefined
                const res = await fetch("/api/nchsaa/comment-reactions", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ commentId, reaction, guestId }),
                })
                const data = await res.json()
                if (res.ok) setReactions((prev) => ({ ...prev, [commentId]: { up: data.up, down: data.down } }))
              }}
              replyTo={replyTo}
              onReplyTo={setReplyTo}
              onReplySuccess={fetchComments}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function CommentForm({
  articleSlug,
  parentId,
  onSuccess,
  onCancel,
}: {
  articleSlug: string
  parentId: number | null
  onSuccess: () => void
  onCancel: () => void
}) {
  const [authorName, setAuthorName] = useState("")
  const [authorEmail, setAuthorEmail] = useState("")
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authorName.trim() || !content.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/nchsaa/article-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: articleSlug,
          parentId: parentId ?? undefined,
          authorName: authorName.trim(),
          authorEmail: authorEmail.trim() || undefined,
          content: content.trim(),
        }),
      })
      if (res.ok) {
        setContent("")
        if (!parentId) setAuthorName("")
        setAuthorEmail("")
        onSuccess()
        onCancel()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {parentId == null && (
        <>
          <input
            type="text"
            placeholder="Your name *"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <input
            type="email"
            placeholder="Email (optional)"
            value={authorEmail}
            onChange={(e) => setAuthorEmail(e.target.value)}
            className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm ml-0 md:ml-3"
          />
        </>
      )}
      <textarea
        placeholder={parentId ? "Write a reply…" : "Add a comment…"}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full min-h-[80px] rounded-md border border-slate-300 px-3 py-2 text-sm"
        required
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="bg-[#003366] hover:bg-[#004080]" disabled={submitting}>
          {parentId ? "Reply" : "Post comment"}
        </Button>
        {parentId && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}

function CommentItem({
  comment,
  articleSlug,
  reactions,
  onReact,
  replyTo,
  onReplyTo,
  onReplySuccess,
}: {
  comment: Comment
  articleSlug: string
  reactions: { up: number; down: number }
  onReact: (commentId: number, reaction: "up" | "down") => void
  replyTo: number | null
  onReplyTo: (id: number | null) => void
  onReplySuccess: () => void
}) {
  const [reacting, setReacting] = useState(false)
  const isReply = comment.parent_id != null

  return (
    <li className={isReply ? "pl-6 border-l-2 border-slate-200" : ""}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-[#003366]">{comment.author_name}</span>
          <span className="text-slate-400">
            {new Date(comment.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
          </span>
        </div>
        <p className="text-slate-700 text-sm leading-relaxed">{comment.content}</p>
        <div className="flex items-center gap-4 mt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-slate-600 hover:text-[#003366]"
            onClick={async () => {
              setReacting(true)
              await onReact(comment.id, "up")
              setReacting(false)
            }}
            disabled={reacting}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            {reactions.up}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-slate-600 hover:text-[#C20017]"
            onClick={async () => {
              setReacting(true)
              await onReact(comment.id, "down")
              setReacting(false)
            }}
            disabled={reacting}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            {reactions.down}
          </Button>
          {!isReply && (
            <Button type="button" variant="ghost" size="sm" className="h-8 text-slate-600" onClick={() => onReplyTo(replyTo === comment.id ? null : comment.id)}>
              Reply
            </Button>
          )}
        </div>
      </div>
      {replyTo === comment.id && (
        <div className="mt-3 pl-2">
          <CommentForm
            articleSlug={articleSlug}
            parentId={comment.id}
            onSuccess={onReplySuccess}
            onCancel={() => onReplyTo(null)}
          />
        </div>
      )}
      {comment.replies && comment.replies.length > 0 && (
        <ul className="mt-4 space-y-4">
          {comment.replies.map((r) => (
            <CommentItem
              key={r.id}
              comment={r}
              articleSlug={articleSlug}
              reactions={reactions[r.id] ?? { up: 0, down: 0 }}
              onReact={onReact}
              replyTo={replyTo}
              onReplyTo={onReplyTo}
              onReplySuccess={onReplySuccess}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
