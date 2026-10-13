"use client"

import { useEffect, useState } from "react"

import { CoachEmailComposer } from "@/components/colleges/coach-email-composer"
import { ListControls } from "@/components/colleges/list-controls"
import { COLLEGE_LIST_STATUSES, type CollegeListItem, type CollegeListResponse, type CollegeListStatus } from "@/lib/college-programs/list"

/**
 * My List and Email the coach for one school, on its page. Renders nothing until the list is
 * known to be available to this viewer (Blue members and admins), so nobody else sees a button
 * that would refuse them.
 */
export function SchoolActions({ schoolId, schoolName }: { schoolId: string; schoolName: string }) {
  const [available, setAvailable] = useState(false)
  const [item, setItem] = useState<CollegeListItem | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailing, setEmailing] = useState(false)

  useEffect(() => {
    fetch("/api/college-list", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return
        const body = (await res.json()) as CollegeListResponse
        setAvailable(body.available)
        setItem(body.items.find((i) => i.schoolId === schoolId))
      })
      .catch(() => {})
  }, [schoolId])

  const save = async (status?: CollegeListStatus) => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/college-list", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, ...(status ? { status } : {}) }),
      })
      const body = (await res.json()) as { item?: CollegeListItem; error?: string }
      if (!res.ok || !body.item) throw new Error(body.error || "Could not save. Try again.")
      setItem(body.item)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.")
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/college-list?school=${encodeURIComponent(schoolId)}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setItem(undefined)
    } catch {
      setError("Could not remove. Try again.")
    } finally {
      setBusy(false)
    }
  }

  if (!available) return null
  return (
    <div className="max-w-md">
      <ListControls item={item} busy={busy} onSave={save} onRemove={remove} onEmail={() => setEmailing(true)} />
      {error ? <p className="mt-1 text-xs text-red-300">{error}</p> : null}
      {emailing ? (
        <CoachEmailComposer
          schoolId={schoolId}
          schoolName={schoolName}
          open
          onOpenChange={(open) => {
            if (!open) setEmailing(false)
          }}
          onSent={(status) => {
            // Sending moves the school along My List; it never moves it backwards.
            if (status && item && COLLEGE_LIST_STATUSES.indexOf(status) > COLLEGE_LIST_STATUSES.indexOf(item.status)) {
              void save(status)
            }
          }}
        />
      ) : null}
    </div>
  )
}
