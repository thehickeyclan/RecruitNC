"use client"

/**
 * The program's perfect recruit, on the comparison.
 *
 * Three pieces:
 * - an invitation to describe one, for a coach who has not (optional, dismissable, never a gate);
 * - a five-step wizard: size and class, academics, competition level, what decides it, and a
 *   summary where the coach marks the must-haves and saves it for the whole staff;
 * - the card on the results: both wrestlers checked against it, stamped with who saved it and when.
 *
 * Checked here, in the browser, from facts the API sends (lib/program-fit.ts is pure), so a save
 * re-checks both wrestlers at once instead of re-running the comparison.
 */
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, Check, HelpCircle, Pencil, Sparkles, Star, Target, X } from "lucide-react"
import { ACADEMIC_MAJOR_OPTIONS } from "@/lib/academic-majors"
import {
  COLLEGE_WEIGHTS,
  EMPTY_CRITERIA,
  PRIORITY_OPTIONS,
  STATE_FINISH_OPTIONS,
  describePerfectRecruit,
  evaluateProgramFit,
  hasAnyCriteria,
  type FitCheck,
  type FitKey,
  type FitStatus,
  type FitSubject,
  type ProgramFitCriteria,
} from "@/lib/program-fit"

export type SavedPerfectRecruit = { criteria: ProgramFitCriteria; updatedByName: string | null; updatedAt: string | null }

export type ProgramFitPayload = {
  saved: SavedPerfectRecruit | null
  left: FitSubject
  right: FitSubject
}

const GOLD = "text-[#D3B574]"
const MAJORS = ACADEMIC_MAJOR_OPTIONS.filter((m) => m !== "Undecided" && m !== "Other")
const INVITE_DISMISSED_KEY = "rnc-perfect-recruit-invite-dismissed"

export function StatusIcon({ status, className = "h-4 w-4" }: { status: FitStatus; className?: string }) {
  if (status === "fit") return <Check className={`${className} shrink-0 text-emerald-400`} aria-label="Meets your perfect recruit" />
  if (status === "miss") return <X className={`${className} shrink-0 text-red-400`} aria-label="Misses your perfect recruit" />
  return <HelpCircle className={`${className} shrink-0 text-white/30`} aria-label="Not on file" />
}

function savedLine(saved: SavedPerfectRecruit | null): string | null {
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
      className={`rounded-full border px-3 py-1.5 text-sm font-bold transition ${
        on ? "border-[#D3B574] bg-[#D3B574] text-[#0A1628]" : "border-white/15 text-white/70 hover:border-[#D3B574]/60 hover:text-white"
      }`}
    >
      {children}
    </button>
  )
}

function Choice({ on, onClick, title, body }: { on: boolean; onClick: () => void; title: string; body?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`w-full rounded-xl border p-4 text-left transition ${
        on ? "border-[#D3B574] bg-[#D3B574]/10" : "border-white/10 bg-white/[0.02] hover:border-white/30"
      }`}
    >
      <p className={`font-bold ${on ? GOLD : "text-white"}`}>{title}</p>
      {body ? <p className="mt-0.5 text-sm text-white/50">{body}</p> : null}
    </button>
  )
}

/* ------------------------------------------------------------------ invitation */

/** Shown to a coach who has not described a perfect recruit. Dismissable; never in the way. */
export function PerfectRecruitInvite({ onStart }: { onStart: () => void }) {
  const [hidden, setHidden] = useState(true)
  useEffect(() => {
    try {
      setHidden(window.localStorage.getItem(INVITE_DISMISSED_KEY) === "1")
    } catch {
      setHidden(false)
    }
  }, [])
  if (hidden) return null
  const dismiss = () => {
    setHidden(true)
    try {
      window.localStorage.setItem(INVITE_DISMISSED_KEY, "1")
    } catch {
      /* private window: it simply comes back next visit */
    }
  }
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-[#D3B574]/40 bg-gradient-to-r from-[#D3B574]/15 to-[#0f1c2e] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex gap-3">
        <Sparkles className={`mt-0.5 h-5 w-5 shrink-0 ${GOLD}`} />
        <div>
          <p className="font-black text-white">Who&apos;s your perfect recruit?</p>
          <p className="mt-0.5 text-sm text-white/60">
            Weights, classes, academics, competition level. One minute, and every comparison reads against it. Shared with
            your staff.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button type="button" onClick={dismiss} className="text-sm font-bold text-white/50 hover:text-white">
          Not now
        </button>
        <button type="button" onClick={onStart} className="rounded-lg bg-[#D3B574] px-4 py-2 text-sm font-bold text-[#0A1628] hover:bg-[#c4a665]">
          Set it up
        </button>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ wizard */

const STEPS = ["Size & class", "Academics", "Competition", "What decides it", "Your perfect recruit"] as const

const MUST_HAVE_LABEL: Record<FitKey, string> = {
  weight: "Weight",
  class: "Class",
  gpa: "GPA",
  tests: "Test scores",
  major: "Major",
  national: "National experience",
  state: "State finish",
  ranked: "Ranked",
}

/** Which needs this set actually asks for - only those can be must-haves. */
function setNeeds(c: ProgramFitCriteria): FitKey[] {
  const out: FitKey[] = []
  if (c.targetWeights.length) out.push("weight")
  if (c.classYears.length) out.push("class")
  if (c.minGpa != null) out.push("gpa")
  if (c.minSat != null || c.minAct != null) out.push("tests")
  if (c.majors.length) out.push("major")
  if (c.requireNational) out.push("national")
  if (c.stateFinish !== "any") out.push("state")
  if (c.requireRanked) out.push("ranked")
  return out
}

export function PerfectRecruitWizard({
  initial,
  classYearOptions,
  onClose,
  onSaved,
}: {
  initial: ProgramFitCriteria
  classYearOptions: number[]
  onClose: () => void
  onSaved: (saved: SavedPerfectRecruit) => void
}) {
  const [step, setStep] = useState(0)
  const [c, setC] = useState<ProgramFitCriteria>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Every change builds on the latest state: quick taps on several chips must all stick.
  const update = (patch: (prev: ProgramFitCriteria) => Partial<ProgramFitCriteria>) => setC((prev) => ({ ...prev, ...patch(prev) }))
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((x) => x !== value) : [...list, value])
  const numberOrNull = (v: string) => (v.trim() === "" || !Number.isFinite(Number(v)) ? null : Number(v))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      // Must-haves only among the needs actually set.
      const needs = setNeeds(c)
      const criteria = { ...c, mustHaves: c.mustHaves.filter((k) => needs.includes(k)) }
      const res = await fetch("/api/coaches/program-fit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criteria }),
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

  const label = "mb-2.5 block text-[11px] font-black uppercase tracking-widest text-white/40"
  const input =
    "h-11 w-full rounded-lg border border-white/10 bg-[#0A1628] px-3 text-sm text-white placeholder:text-white/25 focus:border-[#D3B574]/60 focus:outline-none"
  const last = step === STEPS.length - 1
  const needs = setNeeds(c)
  const groups = [...new Set(PRIORITY_OPTIONS.map((o) => o.group))]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Your perfect recruit">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0f1c2e] shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
          <div>
            <p className={`text-[11px] font-black uppercase tracking-widest ${GOLD}`}>
              Step {step + 1} of {STEPS.length}
            </p>
            <h2 className="text-lg font-black text-white">{STEPS[step]}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex gap-1 px-5 pt-3 sm:px-6">
          {STEPS.map((s, i) => (
            <span key={s} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-[#D3B574]" : "bg-white/10"}`} />
          ))}
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
          {step === 0 ? (
            <>
              <div>
                <span className={label}>Weights you&apos;re recruiting</span>
                <div className="flex flex-wrap gap-2">
                  {COLLEGE_WEIGHTS.map((w) => (
                    <Chip key={w} on={c.targetWeights.includes(w)} onClick={() => update((p) => ({ targetWeights: toggle(p.targetWeights, w) }))}>
                      {w}
                    </Chip>
                  ))}
                </div>
                <p className="mt-2 text-xs text-white/40">
                  We use the wrestler&apos;s own college projection, or the weight at or just above what they last wrestled
                  and the next one up.
                </p>
              </div>
              <div>
                <span className={label}>Classes</span>
                <div className="flex flex-wrap gap-2">
                  {classYearOptions.map((y) => (
                    <Chip key={y} on={c.classYears.includes(y)} onClick={() => update((p) => ({ classYears: toggle(p.classYears, y) }))}>
                      {y}
                    </Chip>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <label>
                  <span className={label}>Minimum GPA</span>
                  <input className={input} inputMode="decimal" placeholder="e.g. 3.0" defaultValue={c.minGpa ?? ""} onChange={(e) => { const v = e.target.value; update(() => ({ minGpa: numberOrNull(v) })) }} />
                </label>
                <label>
                  <span className={label}>Minimum SAT</span>
                  <input className={input} inputMode="numeric" placeholder="e.g. 1100" defaultValue={c.minSat ?? ""} onChange={(e) => { const v = e.target.value; update(() => ({ minSat: numberOrNull(v) })) }} />
                </label>
                <label>
                  <span className={label}>Or minimum ACT</span>
                  <input className={input} inputMode="numeric" placeholder="e.g. 22" defaultValue={c.minAct ?? ""} onChange={(e) => { const v = e.target.value; update(() => ({ minAct: numberOrNull(v) })) }} />
                </label>
              </div>
              <div>
                <span className={label}>Majors you offer</span>
                <div className="flex flex-wrap gap-2">
                  {MAJORS.map((m) => (
                    <Chip key={m} on={c.majors.includes(m)} onClick={() => update((p) => ({ majors: toggle(p.majors, m) }))}>
                      {m}
                    </Chip>
                  ))}
                </div>
              </div>
              <p className="text-xs text-white/40">
                Leave anything blank to skip it. A wrestler with no GPA on file is shown as &ldquo;not on file&rdquo;, never as a miss.
              </p>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div>
                <span className={label}>Where they compete</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Choice on={!c.requireNational} onClick={() => update(() => ({ requireNational: false }))} title="NC-only is fine" body="In-state results are enough." />
                  <Choice on={c.requireNational} onClick={() => update(() => ({ requireNational: true }))} title="National experience" body="At least one NHSCA, Super 32, Fargo or Journeymen." />
                </div>
              </div>
              <div>
                <span className={label}>NC state finish</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {STATE_FINISH_OPTIONS.map((o) => (
                    <Choice key={o.value} on={c.stateFinish === o.value} onClick={() => update(() => ({ stateFinish: o.value }))} title={o.label} />
                  ))}
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 p-4">
                <input
                  type="checkbox"
                  checked={c.requireRanked}
                  onChange={(e) => { const checked = e.target.checked; update(() => ({ requireRanked: checked })) }}
                  className="h-4 w-4 accent-[#D3B574]"
                />
                <span className="text-sm text-white/80">Ranked only: a published RecruitNC rank or a national ranking</span>
              </label>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <p className="text-sm text-white/60">
                When you compare two wrestlers, which categories decide it? These become your rows and your edge count.
                Head to head and common opponents always count.
              </p>
              {groups.map((g) => (
                <div key={g}>
                  <span className={label}>{g}</span>
                  <div className="flex flex-wrap gap-2">
                    {PRIORITY_OPTIONS.filter((o) => o.group === g).map((o) => (
                      <Chip key={o.key} on={c.priorities.includes(o.key)} onClick={() => update((p) => ({ priorities: toggle(p.priorities, o.key) }))}>
                        {o.label}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}
              {!c.priorities.length ? <p className="text-xs text-white/40">Pick none and the comparison uses its standard rows.</p> : null}
            </>
          ) : null}

          {step === 4 ? (
            <>
              <div className="rounded-xl border border-[#D3B574]/40 bg-[#D3B574]/[0.07] p-5">
                <p className={`text-[11px] font-black uppercase tracking-widest ${GOLD}`}>Your perfect recruit</p>
                {describePerfectRecruit(c).length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {describePerfectRecruit(c).map((d) => (
                      <span key={d} className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-white">
                        {d}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-white/60">No needs set. Comparisons will use your categories only.</p>
                )}
                {c.priorities.length ? (
                  <p className="mt-3 text-sm text-white/60">
                    Decided by: {c.priorities.map((k) => PRIORITY_OPTIONS.find((o) => o.key === k)?.label).filter(Boolean).join(", ")}
                  </p>
                ) : null}
              </div>
              {needs.length ? (
                <div>
                  <span className={label}>Which are must-haves?</span>
                  <p className="-mt-1 mb-3 text-sm text-white/50">
                    Missing a must-have rules a wrestler out. We&apos;ll warn you even when that wrestler leads on edges.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {needs.map((k) => {
                      const on = c.mustHaves.includes(k)
                      return (
                        <Chip key={k} on={on} onClick={() => update((p) => ({ mustHaves: toggle(p.mustHaves, k) }))}>
                          <span className="inline-flex items-center gap-1">
                            <Star className={`h-3.5 w-3.5 ${on ? "fill-current" : ""}`} /> {MUST_HAVE_LABEL[k]}
                          </span>
                        </Chip>
                      )
                    })}
                  </div>
                </div>
              ) : null}
              {error ? <p className="text-sm text-red-300">{error}</p> : null}
            </>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-4 sm:px-6">
          {step > 0 ? (
            <button type="button" onClick={() => setStep(step - 1)} className="inline-flex items-center gap-1 text-sm font-bold text-white/60 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          ) : (
            <button type="button" onClick={onClose} className="text-sm font-bold text-white/50 hover:text-white">
              Not now
            </button>
          )}
          {last ? (
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="rounded-lg bg-[#D3B574] px-5 py-2.5 text-sm font-bold text-[#0A1628] hover:bg-[#c4a665] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save for your staff"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="inline-flex items-center gap-1 rounded-lg bg-[#D3B574] px-5 py-2.5 text-sm font-bold text-[#0A1628] hover:bg-[#c4a665]"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ card on the results */

export function PerfectRecruitPanel({
  fit,
  leftName,
  rightName,
  onEdit,
}: {
  fit: ProgramFitPayload
  leftName: string
  rightName: string
  onEdit: () => void
}) {
  const criteria = fit.saved?.criteria ?? EMPTY_CRITERIA
  const left = useMemo(() => evaluateProgramFit(fit.left, criteria), [fit.left, criteria])
  const right = useMemo(() => evaluateProgramFit(fit.right, criteria), [fit.right, criteria])
  const met = (checks: FitCheck[]) => checks.filter((c) => c.status === "fit").length
  const stamp = savedLine(fit.saved)
  if (!hasAnyCriteria(criteria)) return null

  return (
    <section className="rounded-xl border border-[#D3B574]/30 bg-[#0f1c2e] p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/40">
          <Target className={`h-3.5 w-3.5 ${GOLD}`} /> Your perfect recruit
        </h2>
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 text-xs font-bold text-[#D3B574] hover:text-[#c4a665]">
          <Pencil className="h-3 w-3" /> Edit
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {describePerfectRecruit(criteria).map((d) => (
          <span key={d} className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs font-semibold text-white/70">
            {d}
          </span>
        ))}
      </div>
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">matched</p>
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
              <span className="pt-0.5 text-center text-[10px] font-black uppercase tracking-wide text-white/50">
                {lc.label}
                {lc.mustHave ? <Star className="ml-1 inline h-3 w-3 fill-current text-[#D3B574]" aria-label="must-have" /> : null}
              </span>
              <div className="flex items-start justify-end gap-2 text-right">
                <span className="text-white/70">{rc.detail}</span>
                <StatusIcon status={rc.status} />
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-xs text-white/40">
        <Star className="mr-1 inline h-3 w-3 fill-current text-[#D3B574]" /> must-have ·{" "}
        <HelpCircle className="mr-1 inline h-3 w-3" />
        not on the wrestler&apos;s profile, which isn&apos;t a miss{stamp ? ` · ${stamp}` : ""}
      </p>
    </section>
  )
}
