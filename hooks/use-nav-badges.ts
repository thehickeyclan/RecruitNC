"use client"

import { useCallback, useEffect, useState } from "react"

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
    fetch("/api/coach-messages/unread", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setUnread(Number(d?.unread) || 0)
        setShow(Boolean(d?.show))
      })
      .catch(() => {})
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
