"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toCalendarEvent, type CollegeScheduleRow } from "@/lib/college-schedules/calendar-event"

export type CollegeTeam = { id: string; name: string; division: string | null; logo_url: string | null }

/** Where the picked team is remembered between visits. Per browser, no account needed. */
const STORAGE_KEY = "recruitnc.calendar.followedCollege"

function readStoredTeam(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    // Private windows and blocked site data both throw here; a remembered team is a convenience.
    return null
  }
}

/**
 * The college team a reader has chosen to follow, and its season.
 *
 * Nothing is fetched and nothing is shown until a team is picked — that choice is the whole
 * feature. Twelve programs at roughly twenty dates each would bury the eighteen NC events this
 * calendar exists for if they all arrived at once.
 */
export function useCollegeSchedule() {
  const [teams, setTeams] = useState<CollegeTeam[]>([])
  const [teamId, setTeamId] = useState<string | null>(null)
  const [rows, setRows] = useState<CollegeScheduleRow[]>([])
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/college-schedules", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { teams: [] }))
      .then((data) => {
        if (cancelled) return
        setTeams(data.teams ?? [])
        const stored = readStoredTeam()
        if (stored && (data.teams ?? []).some((t: CollegeTeam) => t.id === stored)) setTeamId(stored)
        setReady(true)
      })
      .catch(() => !cancelled && setReady(true))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!teamId) {
      setRows([])
      return
    }
    let cancelled = false
    setLoading(true)
    fetch(`/api/college-schedules?college_id=${encodeURIComponent(teamId)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { events: [] }))
      .then((data) => !cancelled && setRows(data.events ?? []))
      .catch(() => !cancelled && setRows([]))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [teamId])

  const follow = useCallback((id: string | null) => {
    setTeamId(id)
    try {
      if (id) window.localStorage.setItem(STORAGE_KEY, id)
      else window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Not being able to remember the choice is survivable; not being able to make it is not.
    }
  }, [])

  const teamName = useMemo(() => teams.find((t) => t.id === teamId)?.name ?? null, [teams, teamId])

  const events = useMemo(
    () => (teamName ? rows.map((row) => toCalendarEvent(row, teamName)) : []),
    [rows, teamName],
  )

  return { teams, teamId, teamName, events, loading, ready, follow }
}
