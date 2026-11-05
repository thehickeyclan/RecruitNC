"use client"

import { useEffect, useMemo, useState } from "react"

/** Saves run one after another, in the order the screens were answered. */
let queue: Promise<unknown> = Promise.resolve()
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Lock } from "lucide-react"

import type { Answer } from "@/lib/recruiting/priorities/sharing"
import type { Marker, Option, Question, Respondent, SharingClass } from "@/lib/recruiting/priorities/questions"
import { MAJOR_OPTIONS, wantsBsnFollowUp } from "@/lib/recruiting/priorities/questions"

type Q = Question & { sharingLine: string }
type Data = {
  available: boolean
  respondent: Respondent
  athleteId: string
  wrestlers: Array<{ id: string; firstName: string }>
  possessive: "his" | "her" | null
  firstName: string | null
  weight: number | null
  questions: Q[]
  own: { version: number; completedAt: string | null; answers: Answer[] }
  other: { completed: boolean; answers: Answer[] }
  prefill: Record<string, { value: unknown; from: string }>
}

const MARKERS: Array<{ key: Marker; label: string }> = [
  { key: "must", label: "Must-have" },
  { key: "strong", label: "Strong preference" },
  { key: "flexible", label: "Flexible" },
]
const CLASS_LABEL: Record<SharingClass, string> = { shared: "Shared", constraint: "Scout only", private: "Only me" }
const BTN = "inline-flex items-center gap-2 rounded-lg bg-[#D3B574] px-5 py-3 text-sm font-black text-[#0A1628] hover:bg-[#e2c98d] disabled:opacity-50"
const GHOST = "inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-3 text-sm font-bold text-white hover:border-[#D3B574]"
const choice = (on: boolean) =>
  `w-full rounded-lg border px-4 py-3 text-left text-sm font-semibold ${on ? "border-[#D3B574] bg-[#D3B574]/15 text-white" : "border-white/15 bg-white/[0.03] text-white/85 hover:border-white/40"}`

/** One draft answer on screen, before Next saves it. */
type Draft = { value: unknown; marker: Marker | null; notSure: boolean; extra: Record<string, unknown> }

export function PrioritiesApp() {
  const [data, setData] = useState<Data | null>(null)
  const [failed, setFailed] = useState(false)
  const [step, setStep] = useState<number | "intro" | "done" | "summary">("intro")
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)

  // Whose set: the wrestler the home page was showing (?w=), else the API's default (oldest in school).
  const [who, setWho] = useState<string | null>(null)
  const load = (id: string | null = who) =>
    fetch(`/api/recruiting-priorities${id ? `?athleteId=${encodeURIComponent(id)}` : ""}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: Data) => {
        setData(d)
        if (d.own.completedAt) setStep((s) => (s === "intro" ? "summary" : s))
      })
      .catch(() => setFailed(true))
  useEffect(() => {
    const w = new URLSearchParams(window.location.search).get("w")
    setWho(w)
    load(w)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const switchTo = (id: string) => {
    setWho(id)
    setData(null)
    setDrafts({})
    setStep("intro")
    window.history.replaceState(null, "", `?w=${encodeURIComponent(id)}`)
    load(id)
  }

  const name = data?.firstName ?? "your wrestler"
  const own = useMemo(() => new Map((data?.own.answers ?? []).map((a) => [a.key, a])), [data])

  // The screens: every question, plus the nursing follow-up right after academics when it applies.
  const screens = useMemo(() => {
    if (!data) return [] as Array<Q | "bsn">
    const out: Array<Q | "bsn"> = []
    for (const q of data.questions) {
      out.push(q)
      if (q.key === "academics") {
        const d = drafts.academics?.value ?? own.get("academics")?.value
        if (wantsBsnFollowUp(d as { majors?: string[]; text?: string })) out.push("bsn")
      }
    }
    return out
  }, [data, drafts.academics, own])

  if (failed) return <Panel><p className="text-white/70">This page is for the family's own logins. It can't be shown in a preview.</p></Panel>
  if (!data) return <Panel><p className="text-white/60">Loading…</p></Panel>
  if (!data.available) return <Panel><p className="text-white/70">Not switched on yet.</p></Panel>

  const draftFor = (key: string): Draft => {
    if (drafts[key]) return drafts[key]
    const a = own.get(key)
    const extra: Record<string, unknown> =
      key === "budget" ? { kind: own.get("budget_kind")?.value ?? data.prefill.budget_kind?.value } : key === "distance" ? { zip: own.get("home_zip")?.value ?? data.prefill.home_zip?.value } : {}
    if (a) return { value: a.value, marker: a.marker ?? null, notSure: Boolean(a.notSure), extra }
    return { value: data.prefill[key]?.value ?? null, marker: null, notSure: false, extra }
  }
  const setDraft = (key: string, d: Partial<Draft>) => setDrafts((all) => ({ ...all, [key]: { ...draftFor(key), notSure: false, ...d } }))

  const put = (body: Record<string, unknown>) =>
    fetch("/api/recruiting-priorities", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ athleteId: data.athleteId, ...body }) })

  /** Saves what's on this screen (nothing when it was skipped) and moves on. */
  /**
   * Next moves on at once; the answer saves behind it, one save at a time (a quick second tap on a
   * slow connection used to land on the next screen and skip it). Finish waits for every save.
   */
  const next = async (i: number, skip = false) => {
    const s = screens[i]
    const key = s === "bsn" ? "bsn" : s.key
    // Next on a prefilled screen confirms it: the answer is saved as shown.
    // The distance screen also carries the ZIP, which can be prefilled (from a brother's or sister's set) on its own.
    const confirmsPrefill = (!own.has(key) && Boolean(data.prefill[key])) || (key === "distance" && !own.has("home_zip") && Boolean(data.prefill.home_zip))
    if (!skip && (drafts[key] || confirmsPrefill)) {
      const d = drafts[key] ?? draftFor(key)
      // Each save names its wrestler when it is queued: a parent of two who switches while a save is
      // still on its way can only ever write to the child it was answered for.
      const athleteId = data.athleteId
      const bodies: Array<Record<string, unknown>> = d.value != null || d.notSure ? [{ athleteId, key, value: d.value, marker: d.marker, notSure: d.notSure }] : []
      if (key === "distance" && data.respondent === "parent" && typeof d.extra.zip === "string" && d.extra.zip && d.extra.zip !== own.get("home_zip")?.value) bodies.push({ athleteId, key: "home_zip", value: d.extra.zip })
      if (key === "budget" && (d.extra.kind === "target" || d.extra.kind === "limit") && d.extra.kind !== own.get("budget_kind")?.value) bodies.push({ athleteId, key: "budget_kind", value: d.extra.kind })
      for (const body of bodies) {
        queue = queue.then(() =>
          put(body)
            .then((r) => {
              if (!r.ok && r.status !== 400) setSaveFailed(true)
            })
            .catch(() => setSaveFailed(true)),
        )
      }
    }
    if (i + 1 < screens.length) return setStep(i + 1)
    setSaving(true)
    await queue
    await fetch("/api/recruiting-priorities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ athleteId: data.athleteId }) }).catch(() => null)
    setDrafts({})
    await load()
    setSaving(false)
    setStep("done")
  }

  if (step === "intro") {
    return (
      <Panel>
        <WrestlerPicker data={data} onPick={switchTo} />
        <h1 className="text-2xl font-black sm:text-3xl">What matters to your family?</h1>
        <p className="mt-3 text-white/75">
          A few questions, mostly one tap each. &ldquo;Not sure yet&rdquo; is fine everywhere.
        </p>
        <p className="mt-3 text-white/75">We already know {name}&apos;s results, weight and class. This is the part only you can tell us.</p>
        <p className="mt-3 text-sm text-white/55">Coaches never see your answers. Money answers stay with whoever gave them. You can change anything, any time.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className={BTN} onClick={() => setStep(0)}>
            Start <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
          {data.own.version > 0 ? (
            <button type="button" className={GHOST} onClick={() => setStep("summary")}>
              See my answers
            </button>
          ) : null}
        </div>
        {data.respondent === "athlete" ? null : <p className="mt-6 text-xs text-white/45">{data.possessive ? `${name} has ${data.possessive} own set. Only ${name} can answer it.` : `${name} answers a separate set. Only ${name} can answer it.`}</p>}
      </Panel>
    )
  }

  if (step === "done") {
    return (
      <Panel>
        <Check className="h-8 w-8 text-emerald-400" aria-hidden />
        <h1 className="mt-2 text-2xl font-black">{saveFailed ? "Some answers didn't save." : "Saved."}</h1>
        {saveFailed ? <p className="mt-2 text-sm text-amber-300">Check your connection, then open My answers and change the ones that are missing.</p> : null}
        <p className="mt-2 text-white/75">Your answers now shape the colleges on your Command Center. Change any answer whenever you like. Most families do, more than once.</p>
        {data.respondent === "parent" ? (
          <p className="mt-3 text-white/75">
            Next, {name} answers their own set{data.other.completed ? " (already done)" : ""}. Where you agree, great. Where you differ, that&apos;s worth knowing now.
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="/my-recruiting#cc-lists" className={BTN}>
            See your colleges <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
          <button type="button" className={GHOST} onClick={() => setStep("summary")}>
            See my answers
          </button>
        </div>
      </Panel>
    )
  }

  if (step === "summary") return <Summary data={data} name={name} screens={screens} onEdit={(i) => setStep(i)} onChanged={() => load()} onPick={switchTo} />

  const i = step
  const s = screens[i]
  const isBsn = s === "bsn"
  const key = isBsn ? "bsn" : s.key
  const d = draftFor(key)
  const fromPrefill = !own.has(key) && !drafts[key] && data.prefill[key]
  return (
    <Panel>
      <div className="flex items-start justify-between gap-3 text-xs font-bold text-white/50">
        <span className="shrink-0 whitespace-nowrap">
          {i + 1} of {screens.length}
        </span>
        <span className="flex items-start gap-1 text-right">
          {isBsn ? <Eye className="h-3.5 w-3.5" aria-hidden /> : s.sharing === "shared" ? <Eye className="h-3.5 w-3.5" aria-hidden /> : <Lock className="h-3.5 w-3.5" aria-hidden />}
          {isBsn ? "Shared. Coaches never see it." : s.sharingLine}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
        <div className="h-full rounded-full bg-[#D3B574]" style={{ width: `${((i + 1) / screens.length) * 100}%` }} />
      </div>
      <h1 className="mt-5 text-xl font-black sm:text-2xl">{isBsn ? "Does a direct-entry nursing (BSN) program matter, or is pre-nursing fine?" : s.title.replace("{name}", name)}</h1>
      {fromPrefill ? <p className="mt-1 text-sm text-white/55">Filled in from {data.prefill[key].from}. Change anything that&apos;s changed.</p> : null}
      {!isBsn && s.key === "college_weight" && data.weight ? <p className="mt-1 text-sm text-white/55">{name} last competed at {data.weight}.</p> : null}

      <div className="mt-4">
        {isBsn ? (
          <Single options={[{ key: "direct_entry", label: "Direct-entry BSN matters" }, { key: "pre_ok", label: "Pre-nursing is fine" }]} value={d.value} onPick={(v) => setDraft(key, { value: v })} />
        ) : (
          <Field q={s} d={d} set={(p) => setDraft(key, p)} respondent={data.respondent} zip={(drafts.distance?.extra.zip as string | undefined) ?? (own.get("home_zip")?.value as string | undefined) ?? (data.prefill.home_zip?.value as string | undefined) ?? ""} />
        )}
      </div>

      {!isBsn && s.marker && d.value != null && !d.notSure ? (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-white/50">How firm is this?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {MARKERS.map((m) => (
              <button key={m.key} type="button" onClick={() => setDraft(key, { marker: m.key })} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${d.marker === m.key ? "border-[#D3B574] bg-[#D3B574]/15" : "border-white/20 text-white/75"}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!isBsn && s.kind.type !== "top3" ? (
        <button type="button" onClick={() => setDraft(key, { value: null, marker: null, notSure: true })} className={`mt-4 ${choice(d.notSure)} sm:w-auto`}>
          Not sure yet
        </button>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <button type="button" className={GHOST} onClick={() => setStep(i === 0 ? "intro" : i - 1)}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back
        </button>
        <div className="flex gap-3">
          <button type="button" className="text-sm font-bold text-white/60 hover:text-white" onClick={() => next(i, true)} disabled={saving}>
            Skip
          </button>
          <button type="button" className={BTN} onClick={() => next(i)} disabled={saving}>
            {i + 1 === screens.length ? "Finish" : "Next"} <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </Panel>
  )
}

/** A parent of two answers once per wrestler: pick whose. */
function WrestlerPicker({ data, onPick }: { data: Data; onPick: (id: string) => void }) {
  if (data.wrestlers.length < 2) return null
  return (
    <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Whose answers">
      {data.wrestlers.map((w) => (
        <button key={w.id} type="button" onClick={() => w.id !== data.athleteId && onPick(w.id)} aria-pressed={w.id === data.athleteId} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${w.id === data.athleteId ? "border-[#D3B574] bg-[#D3B574]/15 text-white" : "border-white/20 text-white/70"}`}>
          For {w.firstName}
        </button>
      ))}
    </div>
  )
}

function Panel({ children }: { children: React.ReactNode }) {
  return <section className="rounded-2xl border border-white/10 bg-[#0f1c2e] p-6 text-white sm:p-8">{children}</section>
}

function Single({ options, value, onPick }: { options: Option[]; value: unknown; onPick: (v: string) => void }) {
  return (
    <div className="grid gap-2">
      {options.map((o) => (
        <button key={o.key} type="button" className={choice(value === o.key)} onClick={() => onPick(o.key)} aria-pressed={value === o.key}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Field({ q, d, set, respondent, zip }: { q: Q; d: Draft; set: (p: Partial<Draft>) => void; respondent: Respondent; zip: string }) {
  const k = q.kind
  if (k.type === "single") {
    return (
      <>
        <Single options={k.options} value={d.notSure ? null : d.value} onPick={(v) => set({ value: v })} />
        {q.key === "distance" && respondent === "parent" ? (
          <label className="mt-4 block text-sm text-white/70">
            Home ZIP code, for distance only. It&apos;s shown nowhere.
            <input
              inputMode="numeric"
              maxLength={5}
              defaultValue={zip}
              onChange={(e) => set({ value: d.value, marker: d.marker, extra: { ...d.extra, zip: e.target.value.replace(/\D/g, "") } })}
              className="mt-1 block w-32 rounded-lg border border-white/20 bg-white/[0.04] px-3 py-2 text-white"
            />
          </label>
        ) : null}
        {q.key === "budget" && d.value && !d.notSure ? (
          <div className="mt-4">
            <p className="text-sm text-white/70">Is that a comfortable target or an absolute limit?</p>
            <div className="mt-2 flex gap-2">
              {(["target", "limit"] as const).map((x) => (
                <button key={x} type="button" onClick={() => set({ value: d.value, extra: { ...d.extra, kind: x } })} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${d.extra.kind === x ? "border-[#D3B574] bg-[#D3B574]/15" : "border-white/20 text-white/75"}`}>
                  {x === "target" ? "A comfortable target" : "An absolute limit"}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-white/45">A college over a limit stays on the list, marked &ldquo;affordability unverified&rdquo;. What you&apos;d actually pay isn&apos;t known until the aid offer.</p>
          </div>
        ) : null}
      </>
    )
  }
  if (k.type === "multi") {
    const picked = Array.isArray(d.value) ? (d.value as string[]) : []
    const toggle = (key: string) => {
      let nextPicks = picked.includes(key) ? picked.filter((p) => p !== key) : [...picked, key]
      if (k.exclusive?.includes(key) && !picked.includes(key)) nextPicks = [key]
      else if (k.exclusive) nextPicks = nextPicks.filter((p) => !k.exclusive!.includes(p) || p === key)
      if (k.max && nextPicks.length > k.max) nextPicks = nextPicks.slice(-k.max)
      set({ value: nextPicks })
    }
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {k.options.map((o) => (
          <button key={o.key} type="button" className={choice(picked.includes(o.key))} onClick={() => toggle(o.key)} aria-pressed={picked.includes(o.key)}>
            {o.label}
          </button>
        ))}
      </div>
    )
  }
  if (k.type === "grid") {
    const grid = (d.value && typeof d.value === "object" ? d.value : {}) as Record<string, string>
    return (
      <div className="grid gap-3">
        {k.rows.map((r) => (
          <div key={r.key}>
            <p className="text-sm font-bold">{r.label}</p>
            <div className="mt-1 grid grid-cols-3 gap-1.5">
              {k.options.map((o) => (
                <button key={o.key} type="button" onClick={() => set({ value: { ...grid, [r.key]: o.key } })} className={`rounded-lg border px-2 py-2 text-xs font-bold ${grid[r.key] === o.key ? "border-[#D3B574] bg-[#D3B574]/15 text-white" : "border-white/15 text-white/70"}`} aria-pressed={grid[r.key] === o.key}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="text-xs text-white/45">A level you leave blank stays open.</p>
      </div>
    )
  }
  if (k.type === "top3") {
    const order = Array.isArray(d.value) ? (d.value as string[]) : []
    return (
      <div>
        <div className="grid gap-2 sm:grid-cols-2">
          {k.options.map((o) => {
            const n = order.indexOf(o.key)
            return (
              <button key={o.key} type="button" className={`${choice(n >= 0)} flex items-center gap-3`} onClick={() => set({ value: n >= 0 ? order.filter((x) => x !== o.key) : order.length < 3 ? [...order, o.key] : order })}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${n >= 0 ? "bg-[#D3B574] text-[#0A1628]" : "bg-white/10 text-white/40"}`}>{n >= 0 ? n + 1 : ""}</span>
                {o.label}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-white/45">Tap 1st, 2nd, 3rd. Tap again to undo. Fewer than three is fine.</p>
      </div>
    )
  }
  if (k.type === "majors") {
    const v = (d.value && typeof d.value === "object" ? d.value : { majors: [], text: null, undecided: false }) as { majors: string[]; text: string | null; undecided: boolean }
    return (
      <div>
        <div className="flex flex-wrap gap-2">
          {MAJOR_OPTIONS.map((o) => {
            const on = v.majors.includes(o.key)
            return (
              <button key={o.key} type="button" onClick={() => set({ value: { ...v, undecided: false, majors: on ? v.majors.filter((m) => m !== o.key) : [...v.majors, o.key].slice(-3) } })} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${on ? "border-[#D3B574] bg-[#D3B574]/15" : "border-white/20 text-white/75"}`}>
                {o.label}
              </button>
            )
          })}
        </div>
        <label className="mt-4 block text-sm text-white/70">
          In your own words (optional)
          <textarea defaultValue={v.text ?? ""} maxLength={500} rows={2} onChange={(e) => set({ value: { ...v, text: e.target.value } })} className="mt-1 block w-full rounded-lg border border-white/20 bg-white/[0.04] px-3 py-2 text-white" />
        </label>
        <button type="button" onClick={() => set({ value: { majors: [], text: null, undecided: true } })} className={`mt-3 ${choice(v.undecided)} sm:w-auto`}>
          Undecided is fine
        </button>
      </div>
    )
  }
  return (
    <textarea defaultValue={typeof d.value === "string" ? d.value : ""} maxLength={500} rows={4} onChange={(e) => set({ value: e.target.value })} className="block w-full rounded-lg border border-white/20 bg-white/[0.04] px-3 py-2 text-white" />
  )
}

/** My Recruiting Priorities: every answer, who sees it, and a way to change either. */
function Summary({ data, name, screens, onEdit, onChanged, onPick }: { data: Data; name: string; screens: Array<Q | "bsn">; onEdit: (i: number) => void; onChanged: () => void; onPick: (id: string) => void }) {
  const own = new Map(data.own.answers.map((a) => [a.key, a]))
  const setClass = async (key: string, sharing: SharingClass) => {
    await fetch("/api/recruiting-priorities", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ athleteId: data.athleteId, key, sharing }) }).catch(() => null)
    onChanged()
  }
  return (
    <Panel>
      <WrestlerPicker data={data} onPick={onPick} />
      <h1 className="text-2xl font-black">My recruiting priorities</h1>
      <p className="mt-1 text-sm text-white/60">
        {data.respondent === "parent" ? "Your answers as a parent." : "Your answers."} Coaches never see any of them. {data.own.completedAt ? `Saved ${new Date(data.own.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.` : "Not finished yet."}
      </p>
      <ul className="mt-5 divide-y divide-white/10">
        {screens.map((s, i) => {
          const key = s === "bsn" ? "bsn" : s.key
          const a = own.get(key)
          const title = s === "bsn" ? "Nursing: direct-entry BSN" : s.title.replace("{name}", name)
          return (
            <li key={key} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{title}</p>
                <p className="text-sm text-white/65">{a ? describe(s, a) : "Skipped"}</p>
              </div>
              <div className="flex items-center gap-2">
                {a ? (
                  <label className="flex items-center gap-1 text-xs text-white/55">
                    {a.sharing === "shared" ? <Eye className="h-3.5 w-3.5" aria-hidden /> : <EyeOff className="h-3.5 w-3.5" aria-hidden />}
                    <select value={a.sharing} onChange={(e) => setClass(key, e.target.value as SharingClass)} className="rounded border border-white/20 bg-[#0A1628] px-1.5 py-1 text-xs text-white" aria-label={`Who sees: ${title}`}>
                      {(["shared", "constraint", "private"] as SharingClass[]).map((c) => (
                        <option key={c} value={c}>
                          {CLASS_LABEL[c]}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <button type="button" onClick={() => onEdit(i)} className="text-xs font-bold text-[#D3B574] hover:underline">
                  Change
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      <ul className="mt-4 space-y-0.5 text-xs text-white/45">
        <li>Shared: {data.respondent === "parent" ? name : "your parent"} sees it too.</li>
        <li>Scout only: {data.respondent === "parent" ? name : "your parent"} never sees it. Scout uses it for your suggestions.</li>
        <li>Only me: {data.respondent === "parent" ? name : "your parent"} never sees it. It shapes your own view only, never anything joint.</li>
      </ul>
    </Panel>
  )
}

function describe(s: Q | "bsn", a: Answer): string {
  if (a.notSure) return "Not sure yet"
  const marker = a.marker ? ` · ${MARKERS.find((m) => m.key === a.marker)?.label}` : ""
  if (s === "bsn") return a.value === "direct_entry" ? "Direct-entry BSN matters" : "Pre-nursing is fine"
  const k = s.kind
  const label = (opts: Option[], key: unknown) => opts.find((o) => o.key === key)?.label ?? String(key)
  if (k.type === "single") return label(k.options, a.value) + marker
  if (k.type === "multi") return ((a.value as string[]) ?? []).map((v) => label(k.options, v)).join(", ") || "None"
  if (k.type === "top3") return ((a.value as string[]) ?? []).map((v, n) => `${n + 1}. ${label(k.options, v)}`).join("  ")
  if (k.type === "grid") {
    const g = (a.value ?? {}) as Record<string, string>
    // Blank means open: say so, the rule a parent is most likely to misread later (Muse, 5 Nov).
    const set = k.rows.filter((r) => g[r.key]).map((r) => `${r.key}: ${label(k.options, g[r.key])}`)
    return !set.length ? "All open" : set.length < k.rows.length ? `${set.join(" · ")} · others open` : set.join(" · ")
  }
  if (k.type === "majors") {
    const v = a.value as { majors: string[]; text: string | null; undecided: boolean }
    if (v.undecided) return "Undecided"
    return [v.majors.map((m) => label(MAJOR_OPTIONS, m)).join(", "), v.text].filter(Boolean).join(" · ") + marker
  }
  return String(a.value ?? "")
}
