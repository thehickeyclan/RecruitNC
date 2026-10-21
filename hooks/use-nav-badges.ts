"use client"

import { useCallback, useEffect, useState } from "react"

/** Fired on window when a conversation is read or written in place, so badges elsewhere re-count. */
export const COACH_MESSAGES_CHANGED = "coach-messages:changed"

export type NavNotification = { id: string; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string }

/**
 * Coach conversations with something unread (lib/coach-messages.ts). Re-read on every page
 * change, so opening a conversation clears the badge by the time you navigate away.
 *
 * `show`: coaches and admins always; anyone else only once a coach has written to them.
 */
export function useCoachMessageBadge(signedIn: boolean, pathname: string) {
  const [unread, setUnread] = useState(0)
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!signedIn) {
      setUnread(0)
      setShow(false)
      return
    }
    const read = () =>
      fetch("/api/coach-messages/unread", { credentials: "include" })
        .then((r) => r.json())
        .then((d) => {
          setUnread(Number(d?.unread) || 0)
          setShow(Boolean(d?.show))
        })
        .catch(() => {})
    void read()
    // The inbox opens a conversation without leaving the page; it says so, and the count follows.
    window.addEventListener(COACH_MESSAGES_CHANGED, read)
    return () => window.removeEventListener(COACH_MESSAGES_CHANGED, read)
  }, [signedIn, pathname])
  return { unread, show }
}

/** The bell: loaded on sign-in and again each time the list is opened. */
export function useNavNotifications(signedIn: boolean, open: boolean) {
  const [notifications, setNotifications] = useState<NavNotification[]>([])

  const fetchNotifications = useCallback(() => {
    if (!signedIn) return
    fetch("/api/notifications", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setNotifications(Array.isArray(data?.notifications) ? data.notifications : []))
      .catch(() => setNotifications([]))
  }, [signedIn])

  useEffect(() => {
    if (!signedIn) {
      setNotifications([])
      return
    }
    fetchNotifications()
  }, [signedIn, fetchNotifications])

  useEffect(() => {
    if (signedIn && open) fetchNotifications()
  }, [signedIn, open, fetchNotifications])

  const markRead = useCallback((id: string) => {
    fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ read: true }),
    }).then(() => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)))
    })
  }, [])

  const markAllRead = useCallback(() => {
    fetch("/api/notifications/read-all", { method: "PATCH", credentials: "include" }).then(() => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
    })
  }, [])

  return { notifications, unread: notifications.filter((n) => !n.read_at).length, markRead, markAllRead }
}

/** Wrestlers newly interested in the coach's program, beside Interested in the menu (Matt, 21 Oct 2026). */
export function useInterestBadge(signedIn: boolean, pathname: string) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!signedIn) {
      setCount(0)
      return
    }
    fetch("/api/college-interest/new", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCount(Number(d?.count) || 0))
      .catch(() => {})
  }, [signedIn, pathname])
  return count
}
