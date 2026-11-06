"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { NotebookPen, Star } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/recruiting/pipeline"
import type { StaffActivityItem } from "@/lib/recruiting/staff-activity"
import { StaffActivityList } from "@/components/recruiting/staff-activity-list"
import { LogActivityDialog } from "@/components/coach/log-contact-dialog"

/** Sent when a coach adds or removes a wrestler anywhere on the page, so every control agrees. */
export const BOARD_CHANGED_EVENT = "recruit-board-changed"

type RecordData = { onBoard: boolean; stage: PipelineStage | null; timeline: StaffActivityItem[] }

/**
 * The staff's record on a wrestler's profile: his stage on the board, a button to log a call or
 * visit, and everything the staff has done with him, newest first. What a CRM shows on a
 * contact's page (Matt, 5 Nov 2026, after the Teamworks/ARMS recruit screen), except the
 * wrestler's results are already on the page around it. College coaches only.
 */
export function RecruitRecord({ athleteId, athleteName }: { athleteId: string; athleteName: string }) {
  const { isVerifiedCoach, isAdmin } = useAuth()
  const show = isVerifiedCoach || isAdmin
  const [record, setRecord] = useState<RecordData | null>(null)
  const [logging, setLogging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/coach-portal/recruit/${encodeURIComponent(athleteId)}`, { credentials: "include", cache: "no-store" }).catch(() => null)
    setRecord(res?.ok ? ((await res.json()) as RecordData) : null)
  }, [athleteId])

  useEffect(() => {
    if (!show) return
    void load()
    const reload = () => void load()
    window.addEventListener(BOARD_CHANGED_EVENT, reload)
    return () => window.removeEventListener(BOARD_CHANGED_EVENT, reload)
  }, [show, load])

  if (!show || !record) return null

  const post = async (url: string, body: object, failed: string) => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      window.dispatchEvent(new Event(BOARD_CHANGED_EVENT))
    } catch {
      setError(failed)
    } finally {
      setBusy(false)
    }
  }

  const button =
    "inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[#D3B574] bg-[#D3B574]/10 px-4 text-xs font-extrabold uppercase tracking-[0.14em] text-[#D3B574] hover:bg-[#D3B574]/20 disabled:opacity-50"

  return (
    <section aria-labelledby="recruit-record-title" className="rounded-sm border border-white/10 bg-[#0f1c2e] p-5">
      <div className="flex items-center gap-2">
        <NotebookPen className="h-4 w-4 text-[#D3B574]" aria-hidden />
        <h3 id="recruit-record-title" className="text-sm font-black uppercase tracking-[0.14em] text-white">
          Your staff&apos;s record
        </h3>
        <Link href="/my-recruits" className="ml-auto text-xs font-semibold text-[#D3B574] hover:underline">
          My Recruits
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {record.onBoard && record.stage ? (
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-white/60">
            Stage
            <select
              value={record.stage}
              disabled={busy}
              onChange={(e) => void post("/api/coach-portal/update-stage", { athleteId, stage: e.target.value }, "That stage change did not save. Try again.")}
              className="min-h-[40px] rounded-lg border border-white/20 bg-[#0A1628] px-3 text-sm font-semibold text-white focus:border-[#D3B574] focus:outline-none"
            >
              {PIPELINE_STAGES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void post("/api/coach-portal/star", { athleteId, action: "add" }, `${athleteName} was not added. Try again.`)}
            className={button}
          >
            <Star className="h-4 w-4" aria-hidden />
            Add to My Recruits
          </button>
        )}
        <button type="button" onClick={() => setLogging(true)} className={button}>
          <NotebookPen className="h-4 w-4" aria-hidden />
          Log contact
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}

      {record.timeline.length ? (
        <StaffActivityList items={record.timeline} className="mt-3" />
      ) : (
        <p className="mt-3 text-sm text-white/50">Nothing yet. Calls, visits, messages and stage changes show here for your whole staff.</p>
      )}

      {logging ? (
        <LogActivityDialog
          row={{ athleteId, name: athleteName }}
          onClose={() => setLogging(false)}
          onSaved={() => {
            setLogging(false)
            window.dispatchEvent(new Event(BOARD_CHANGED_EVENT))
          }}
        />
      ) : null}
    </section>
  )
}
