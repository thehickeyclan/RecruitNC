"use client"

import { useState } from "react"

import {
  APP_PLANS,
  APP_PLAN_LABEL,
  APP_STATUSES,
  APP_STATUS_LABEL,
  PREREADS,
  PREREAD_LABEL,
  type Admissions,
} from "@/lib/college-programs/list"

/**
 * The admissions track on one college (Matt, 22 Oct 2026: "did I apply and what is the status?"):
 * the application's status and plan, the day it went in, and the coach's pre-read. Beside the
 * recruiting stage, never instead of it. Saves each change on its own.
 */
export function AdmissionsControls({ schoolId, value, readOnly }: { schoolId: string; value: Admissions; readOnly: boolean }) {
  const [a, setA] = useState<Admissions>(value)
  const [failed, setFailed] = useState(false)
  const save = async (patch: Partial<Admissions>) => {
    const before = a
    const next = { ...a, ...patch }
    setA(next)
    setFailed(false)
    const res = await fetch("/api/college-list", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schoolId, admissions: patch }) }).catch(() => null)
    if (!res?.ok) {
      setA(before)
      setFailed(true)
    }
  }
  const select = "h-7 min-w-0 rounded-md border border-white/15 bg-[#0A1628] px-1 text-[11px] text-white/80 disabled:opacity-50"
  const today = new Date().toISOString().slice(0, 10)
  const tone = a.status === "admitted" ? "text-emerald-300" : a.status === "denied" ? "text-white/40" : a.status === "deferred" || a.status === "waitlisted" ? "text-amber-200" : ""
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <select
        aria-label="Application status"
        disabled={readOnly}
        value={a.status ?? ""}
        onChange={(e) => {
          const status = (e.target.value || null) as Admissions["status"]
          void save(status === "submitted" && !a.submittedOn ? { status, submittedOn: today } : { status })
        }}
        className={`${select} ${tone}`}
      >
        <option value="">Application: not yet</option>
        {APP_STATUSES.map((s) => (
          <option key={s} value={s}>
            {APP_STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      {a.status ? (
        <select aria-label="Application plan" disabled={readOnly} value={a.plan ?? ""} onChange={(e) => void save({ plan: (e.target.value || null) as Admissions["plan"] })} className={select}>
          <option value="">Plan?</option>
          {APP_PLANS.map((p) => (
            <option key={p} value={p}>
              {APP_PLAN_LABEL[p]}
            </option>
          ))}
        </select>
      ) : null}
      {a.status && a.status !== "planning" ? (
        <input
          type="date"
          aria-label="Date submitted"
          disabled={readOnly}
          value={a.submittedOn ?? ""}
          max={today}
          onChange={(e) => void save({ submittedOn: e.target.value || null })}
          className={`${select} w-[7.5rem]`}
        />
      ) : null}
      <select aria-label="Admissions pre-read" disabled={readOnly} value={a.preread ?? ""} onChange={(e) => void save({ preread: (e.target.value || null) as Admissions["preread"] })} className={select}>
        <option value="">Pre-read: none</option>
        {PREREADS.map((p) => (
          <option key={p} value={p}>
            {PREREAD_LABEL[p]}
          </option>
        ))}
      </select>
      {failed ? <span className="text-[11px] text-amber-200">not saved</span> : null}
    </div>
  )
}
