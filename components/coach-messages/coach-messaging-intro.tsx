"use client"

import { useEffect, useState } from "react"
import { Mail, X } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

const DISMISS_KEY = "coach-messaging-intro-dismissed"

/**
 * "New: message recruits directly" - a one-time introduction for college coaches.
 *
 * Shown only to a coach staff have confirmed (the server's `canStart`) who has not started a
 * conversation yet; it goes away for good once they dismiss it or send their first message.
 * Says the two things a coach should know before writing to a minor: the family sees it, and
 * the coach always speaks first.
 */
export function CoachMessagingIntro({ className = "" }: { className?: string }) {
  const { user } = useAuth()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!user) return
    try {
      if (localStorage.getItem(DISMISS_KEY)) return
    } catch {
      // Storage blocked: fall through and show it; dismissing then only lasts the page.
    }
    let live = true
    fetch("/api/coach-messages/unread", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (live && d?.canStart && Number(d?.total) === 0) setShow(true)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [user])

  if (!show) return null

  const dismiss = () => {
    setShow(false)
    try {
      localStorage.setItem(DISMISS_KEY, "1")
    } catch {
      // ignore
    }
  }

  return (
    <div className={`relative rounded-xl border border-[#D3B574]/50 bg-[#D3B574]/10 p-4 pr-10 text-left sm:p-5 sm:pr-12 ${className}`}>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="absolute right-2 top-2 rounded p-1.5 text-white/50 hover:bg-white/10 hover:text-white">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D3B574] text-[#0A1628]">
          <Mail className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.14em] text-[#D3B574]">New · Message recruits directly</p>
          <p className="mt-1 text-sm text-white/80">
            Open any wrestler&apos;s profile and tap <span className="font-semibold text-white">Message</span>, or use the
            Message button in My Recruits. The wrestler and their parents see the conversation and can reply, and you get an
            email (and a phone alert in the NC United app) when they do.
          </p>
        </div>
      </div>
    </div>
  )
}
