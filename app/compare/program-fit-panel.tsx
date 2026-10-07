"use client"

/**
 * Program fit on the comparison: the staff's saved needs, both wrestlers checked against them, and
 * an editor the whole staff shares. Every save is stamped with the coach and the day.
 *
 * Checked here, in the browser, from facts the API sends (lib/program-fit.ts is pure), so editing a
 * need re-checks both wrestlers at once instead of re-running the comparison.
 */
import { useMemo, useState } from "react"
import { Check, HelpCircle, Pencil, Target, X } from "lucide-react"
import { ACADEMIC_MAJOR_OPTIONS } from "@/lib/academic-majors"
import {
  COLLEGE_WEIGHTS,
  EMPTY_CRITERIA,
  evaluateProgramFit,
  hasAnyCriteria,
  type FitCheck,
  type FitStatus,
  type FitSubject,
  type ProgramFitCriteria,
} from "@/lib/program-fit"

export type ProgramFitPayload = {
  saved: { criteria: ProgramFitCriteria; updatedByName: string | null; updatedAt: string | null } | null
  left: FitSubject
  right: FitSubject
}

const GOLD = "text-[#D3B574]"
const MAJORS = ACADEMIC_MAJOR_OPTIONS.filter((m) => m !== "Undecided" && m !== "Other")

function StatusIcon({ status }: { status: FitStatus }) {
  if (status === "fit") return <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-label="Meets it" />
  if (status === "miss") return <X className="h-4 w-4 shrink-0 text-red-400" aria-label="Does not meet it" />
  return <HelpCircle className="h-4 w-4 shrink-0 text-white/30" aria-label="Not on file" />
}

function savedLine(saved: ProgramFitPayload["saved"]): string | null {
  if (!saved?.updatedAt) return null
  const day = new Date(saved.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  return `Last saved by ${saved.updatedByName ?? "a coach"} on ${day}`
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full border px-2.5 py-1 text-xs font-bold transition ${
        on ? "border-[#D3B574] bg-[#D3B574] text-[#0A1628]" : "border-white/15 text-white/60 hover:border-[#D3B574]/60 hover:text-white"
      }`}
    >
      {children}
    </button>
  )
}

function Editor({
  initial,
  classYearOptions,
  onCancel,
  onSaved,
}: {
  initial: ProgramFitCriteria
  classYearOptions: number[]
  onCancel: () => void
  onSaved: (saved: NonNullable<ProgramFitPayload["saved"]>) => void
}) {
  const [c, setC] = useState<ProgramFitCriteria>(initial)
  // Every change builds on the latest state: two quick taps on weight chips must both stick.
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((x) => x !== value) : [...list, value])
  const numberOrNull = (v: string) => (v.trim() === "" ? null : Number(v))

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/coaches/program-fit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criteria: c }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? "Could not save.")
      onSaved(body.programFit)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.")
    } finally {
      setSaving(false)
    }
  }

  const label = "mb-2 block text-[10px] font-black uppercase tracking-widest text-white/40"
  const input =
    "h-10 w-full rounded-lg border border-white/10 bg-[#0A1628] px-3 text-sm text-white placeholder:text-white/25 focus:border-[#D3B574]/60 focus:outline-none"

  return (
    <div className="mt-5 space-y-5 border-t border-white/10 pt-5">
      <div>
        <span className={label}>Weights you&apos;re recruiting</span>
        <div className="flex flex-wrap gap-1.5">
          {COLLEGE_WEIGHTS.map((w) => (
            <Chip key={w} on={c.targetWeights.includes(w)} onClick={() => setC((prev) => ({ ...prev, targetWeights: toggle(prev.targetWeights, w) }))}>
              {w}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <span className={label}>Classes</span>
        <div className="flex flex-wrap gap-1.5">
          {classYearOptions.map((y) => (
            <Chip key={y} on={c.classYears.includes(y)} onClick={() => setC((prev) => ({ ...prev, classYears: toggle(prev.classYears, y) }))}>
              {y}
            </Chip>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label>
          <span className={label}>Minimum GPA</span>
          <input className={input} inputMode="decimal" placeholder="e.g. 3.0" defaultValue={c.minGpa ?? ""} onChange={(e) => { const v = e.target.value; setC((prev) => ({ ...prev, minGpa: numberOrNull(v) })) }} />
        </label>
        <label>
          <span className={label}>Minimum SAT</span>
          <input className={input} inputMode="numeric" placeholder="e.g. 1100" defaultValue={c.minSat ?? ""} onChange={(e) => { const v = e.target.value; setC((prev) => ({ ...prev, minSat: numberOrNull(v) })) }} />
        </label>
        <label>
          <span className={label}>Or minimum ACT</span>
          <input className={input} inputMode="numeric" placeholder="e.g. 22" defaultValue={c.minAct ?? ""} onChange={(e) => { const v = e.target.value; setC((prev) => ({ ...prev, minAct: numberOrNull(v) })) }} />
        </label>
      </div>
      <div>
        <span className={label}>Majors you offer</span>
        <div className="flex flex-wrap gap-1.5">
          {MAJORS.map((m) => (
            <Chip key={m} on={c.majors.includes(m)} onClick={() => setC((prev) => ({ ...prev, majors: toggle(prev.majors, m) }))}>
              {m}
            </Chip>
          ))}
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={c.requireNational}
          onChange={(e) => { const checked = e.target.checked; setC((prev) => ({ ...prev, requireNational: checked })) }}
          className="h-4 w-4 accent-[#D3B574]"
        />
        <span className="text-sm text-white/80">Wants national experience (an individual national event on file)</span>
      </label>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-lg bg-[#D3B574] px-5 py-2.5 text-sm font-bold text-[#0A1628] hover:bg-[#c4a665] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save for your staff"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm font-bold text-white/50 hover:text-white">
          Cancel
        </button>
        <span className="text-xs text-white/40">Everyone on your program&apos;s staff sees and edits the same needs.</span>
      </div>
    </div>
  )
}

export function ProgramFitPanel({
  fit,
  leftName,
  rightName,
  classYearOptions,
  onSaved,
}: {
  fit: ProgramFitPayload
  leftName: string
  rightName: string
  classYearOptions: number[]
  onSaved: (saved: NonNullable<ProgramFitPayload["saved"]>) => void
}) {
  const [editing, setEditing] = useState(false)
  const criteria = fit.saved?.criteria ?? EMPTY_CRITERIA
  const set = hasAnyCriteria(criteria)
  const left = useMemo(() => evaluateProgramFit(fit.left, criteria), [fit.left, criteria])
  const right = useMemo(() => evaluateProgramFit(fit.right, criteria), [fit.right, criteria])
  const met = (checks: FitCheck[]) => checks.filter((c) => c.status === "fit").length
  const stamp = savedLine(fit.saved)

  return (
    <section className="rounded-xl border border-[#D3B574]/30 bg-[#0f1c2e] p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/40">
          <Target className={`h-3.5 w-3.5 ${GOLD}`} /> Program fit
        </h2>
        {!editing ? (
          <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs font-bold text-[#D3B574] hover:text-[#c4a665]">
            <Pencil className="h-3 w-3" /> {set ? "Edit needs" : "Set your needs"}
          </button>
        ) : null}
      </div>

      {set ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {[
              { name: leftName, checks: left, align: "" },
              { name: rightName, checks: right, align: "text-right" },
            ].map((s) => (
              <div key={s.name} className={s.align}>
                <p className="text-sm font-bold text-white">{s.name}</p>
                <p className={`text-3xl font-black tabular-nums ${met(s.checks) === s.checks.length ? GOLD : "text-white"}`}>
                  {met(s.checks)}
                  <span className="text-lg text-white/30"> / {s.checks.length}</span>
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">needs met</p>
              </div>
            ))}
          </div>
          <ul className="mt-4 divide-y divide-white/5">
            {left.map((lc, i) => {
              const rc = right[i]!
              return (
                <li key={lc.key} className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 py-2.5 text-sm">
                  <div className="flex items-start gap-2">
                    <StatusIcon status={lc.status} />
                    <span className="text-white/70">{lc.detail}</span>
                  </div>
                  <span className="pt-0.5 text-center text-[10px] font-black uppercase tracking-wide text-white/50">{lc.label}</span>
                  <div className="flex items-start justify-end gap-2 text-right">
                    <span className="text-white/70">{rc.detail}</span>
                    <StatusIcon status={rc.status} />
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-xs text-white/40">
            <HelpCircle className="mr-1 inline h-3 w-3" />
            means it isn&apos;t on the wrestler&apos;s profile. That&apos;s not a miss.{stamp ? ` · ${stamp}` : ""}
          </p>
        </>
      ) : !editing ? (
        <p className="mt-3 text-sm text-white/60">
          Tell us what your program is recruiting — weights, classes, an academic floor, the majors you offer — and every
          comparison checks both wrestlers against it. Shared with your whole staff.
        </p>
      ) : null}

      {editing ? (
        <Editor
          initial={criteria}
          classYearOptions={classYearOptions}
          onCancel={() => setEditing(false)}
          onSaved={(saved) => {
            setEditing(false)
            onSaved(saved)
          }}
        />
      ) : null}
    </section>
  )
}
