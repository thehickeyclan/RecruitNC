"use client"

import { useState, useEffect, useCallback } from "react"
import { ThumbsUp, ThumbsDown } from "lucide-react"
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

export function NchsaaArticleReactions({ articleSlug }: { articleSlug: string }) {
  const [up, setUp] = useState(0)
  const [down, setDown] = useState(0)
  const [userReaction, setUserReaction] = useState<"up" | "down" | null>(null)
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch(`/api/nchsaa/article-reactions?slug=${encodeURIComponent(articleSlug)}`)
      const data = await res.json()
      if (res.ok) {
        setUp(data.up ?? 0)
        setDown(data.down ?? 0)
      }
    } catch {
      setUp(0)
      setDown(0)
    }
  }, [articleSlug])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  const submit = async (reaction: "up" | "down") => {
    if (loading) return
    setLoading(true)
    try {
      const guestId = !user ? getOrCreateGuestId() : undefined
      const res = await fetch("/api/nchsaa/article-reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: articleSlug, reaction, guestId }),
      })
      const data = await res.json()
      if (res.ok) {
        setUp(data.up ?? 0)
        setDown(data.down ?? 0)
        setUserReaction(reaction)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-4 py-3 text-slate-600">
      <span className="text-sm font-medium mr-2">Was this useful?</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={`gap-1.5 ${userReaction === "up" ? "border-[#003366] bg-[#003366]/10 text-[#003366]" : "border-slate-300"}`}
        onClick={() => submit("up")}
        disabled={loading}
      >
        <ThumbsUp className="h-4 w-4" />
        {up}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={`gap-1.5 ${userReaction === "down" ? "border-[#C20017] bg-[#C20017]/10 text-[#C20017]" : "border-slate-300"}`}
        onClick={() => submit("down")}
        disabled={loading}
      >
        <ThumbsDown className="h-4 w-4" />
        {down}
      </Button>
    </div>
  )
}
