"use client"

import { Check, CheckCircle2, ClipboardCopy, ExternalLink, Pencil, RotateCcw } from "lucide-react"
import { useMemo, useState } from "react"

import { ANSWER_FIELDS, ANSWER_GROUPS, readiness, type Answers } from "@/lib/questionnaire/fields"

export type PackForm = {
  schoolId: string
  name: string
  level: string
  logo: string | null
  url: string
  done: boolean
  doneAt: string | null
}

type Loaded = { available: boolean; values: Answers; profile: Answers; own: string[]; updatedAt: string | null }

const card = "rounded-2xl border border-white/10 bg-[#0d1d36]/80"
const stamp = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })

/**
 * The Interest forms page's working part: the colleges' forms, to do and done, and the family's
 * answers with a copy button on each. The family presses Submit on the college's page, never us.
 */
export function QuestionnairePack({
  athleteId,
  firstName,
  forms: initialForms,
  noForm,
  answers: initial,
  readOnly,
}: {
  athleteId: string
  firstName: string
  forms: PackForm[]
  noForm: Array<{ id: string; name: string }>
  answers: Loaded
  readOnly: boolean
}) {
  const [forms, setForms] = useState(initialForms)
  const [loaded, setLoaded] = useState(initial)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Answers>(initial.values)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const ready = useMemo(() => readiness(loaded.values), [loaded.values])

  const mark = async (f: PackForm, done: boolean) => {
    setForms((all) => all.map((x) => (x.schoolId === f.schoolId ? { ...x, done, doneAt: done ? new Date().toISOString() : null } : x)))
    const res = await fetch("/api/college-list", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schoolId: f.schoolId, questionnaireDone: done }) }).catch(() => null)
    const body = res?.ok ? ((await res.json().catch(() => null)) as { item?: { questionnaireDoneAt: string | null } } | null) : null
    if (!res?.ok) {
      setForms((all) => all.map((x) => (x.schoolId === f.schoolId ? f : x)))
      setError("Could not save that. Try again.")
      return
    }
    setForms((all) => all.map((x) => (x.schoolId === f.schoolId ? { ...x, done, doneAt: body?.item?.questionnaireDoneAt ?? x.doneAt } : x)))
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    const res = await fetch("/api/questionnaire/answers", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ athleteId, answers: draft }) }).catch(() => null)
    const body = (await res?.json().catch(() => null)) as (Loaded & { error?: string }) | null
    setSaving(false)
    if (!res?.ok || !body || body.error) {
      setError(body?.error ?? "Could not save. Try again.")
      return
    }
    setLoaded(body)
    setDraft(body.values)
    setEditing(false)
  }

  const copy = async (key: string, value: string) => {
    await navigator.clipboard?.writeText(value).catch(() => null)
    setCopied(key)
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500)
  }

  const toDo = forms.filter((f) => !f.done)
  const done = forms.filter((f) => f.done).sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""))

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_420px]">
      <section className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <Stat value={String(toDo.length)} label="To do" />
          <Stat value={String(done.length)} label="Submitted" />
          <Stat value={`${ready.ready}/${ready.total}`} label="Answers ready" />
        </div>

        {error ? <p className="rounded-lg border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">{error}</p> : null}

        <div className={`${card} p-5`}>
          <h2 className="text-lg font-black">To do</h2>
          <p className="mt-1 text-sm text-white/60">Open the form, fill it in, check it and press Submit on the college&apos;s page. Then come back and tap Mark as submitted.</p>
          {forms.length === 0 ? (
            <p className="mt-4 text-sm text-white/60">
              None of the colleges on your list has a form on file yet. <a className="font-semibold text-[#D3B574]" href="/my-recruiting/colleges">Add colleges</a>
            </p>
          ) : toDo.length === 0 ? (
            <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <CheckCircle2 className="h-4 w-4" aria-hidden /> Every form on your list is submitted.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {toDo.map((f) => (
                <FormRow key={f.schoolId} form={f} readOnly={readOnly} onMark={() => void mark(f, true)} />
              ))}
            </ul>
          )}
        </div>

        {done.length ? (
          <div className={`${card} p-5`}>
            <h2 className="text-lg font-black">Submitted</h2>
            <ul className="mt-3 divide-y divide-white/5">
              {done.map((f) => (
                <li key={f.schoolId} className="flex items-center gap-3 py-2.5">
                  <Logo src={f.logo} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-bold leading-5">{f.name}</p>
                    <p className="text-xs text-emerald-300">{f.doneAt ? `Submitted ${stamp(f.doneAt)}` : "Submitted"}</p>
                  </div>
                  {!readOnly ? (
                    <button type="button" onClick={() => void mark(f, false)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-white/50 hover:text-white">
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Undo
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {noForm.length ? (
          <div className={`${card} p-5`}>
            <h2 className="text-sm font-black uppercase tracking-wider text-white/60">No form on file</h2>
            <p className="mt-1 text-sm text-white/55">We have not found an interest form for these. Their wrestling page may have one, or email the coach.</p>
            <p className="mt-2 text-sm">
              {noForm.map((s, i) => (
                <span key={s.id}>
                  {i ? ", " : ""}
                  <a className="font-semibold text-white/85 hover:text-[#D3B574]" href={`/recruiting/schools/${s.id}`}>
                    {s.name}
                  </a>
                </span>
              ))}
            </p>
          </div>
        ) : null}
      </section>

      <aside className={`${card} h-fit p-5 lg:sticky lg:top-4`}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black">{firstName}&apos;s answers</h2>
            <p className="text-xs text-white/55">Private: only your family and our staff see these.</p>
          </div>
          {!readOnly && loaded.available ? (
            editing ? (
              <button type="button" onClick={() => void save()} disabled={saving} className="rounded-lg bg-[#D3B574] px-3 py-1.5 text-sm font-black text-[#0A1628] disabled:opacity-60">
                {saving ? "Saving…" : "Save"}
              </button>
            ) : (
              <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-sm font-bold hover:border-[#D3B574]">
                <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
              </button>
            )
          ) : null}
        </div>

        {!editing && ready.missing.length ? (
          <button type="button" disabled={readOnly || !loaded.available} onClick={() => setEditing(true)} className="mt-3 w-full rounded-lg border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-left text-sm text-amber-100 disabled:cursor-default">
            <span className="font-bold">{ready.missing.length} answers missing</span>
            <span className="block text-xs text-amber-100/75">{ready.missing.map((f) => f.label).join(", ")}</span>
          </button>
        ) : null}

        <div className="mt-4 space-y-5">
          {ANSWER_GROUPS.map((g) => {
            const fields = ANSWER_FIELDS.filter((f) => f.group === g.key)
            return (
              <div key={g.key}>
                <p className="text-[11px] font-black uppercase tracking-widest text-white/45">{g.label}</p>
                <dl className="mt-1.5 divide-y divide-white/5">
                  {fields.map((f) => {
                    const value = loaded.values[f.key] ?? ""
                    if (editing) {
                      return (
                        <label key={f.key} className="block py-1.5">
                          <span className="text-xs font-semibold text-white/60">
                            {f.label}
                            {f.source === "profile" && loaded.profile[f.key] ? <span className="ml-1 text-white/35">· from the profile</span> : null}
                          </span>
                          {f.key === "accolades" || f.key === "academicHonors" ? (
                            <textarea
                              value={draft[f.key] ?? ""}
                              onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                              rows={3}
                              className="mt-1 w-full rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1.5 text-sm text-white outline-none focus:border-[#D3B574]"
                            />
                          ) : (
                            <input
                              type={f.input ?? "text"}
                              value={draft[f.key] ?? ""}
                              onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                              className="mt-1 w-full rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1.5 text-sm text-white outline-none focus:border-[#D3B574]"
                            />
                          )}
                          {f.hint ? <span className="mt-0.5 block text-[11px] text-white/40">{f.hint}</span> : null}
                        </label>
                      )
                    }
                    return (
                      <div key={f.key} className="flex items-start gap-2 py-1.5">
                        <dt className="w-32 shrink-0 text-xs text-white/50">{f.label}</dt>
                        <dd className={`min-w-0 flex-1 break-words text-sm ${value ? "text-white" : "text-white/30"}`}>{value || (f.core ? "Missing" : "—")}</dd>
                        {value ? (
                          <button type="button" aria-label={`Copy ${f.label}`} onClick={() => void copy(f.key, value)} className="shrink-0 rounded p-1 text-white/45 hover:bg-white/10 hover:text-white">
                            {copied === f.key ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                          </button>
                        ) : null}
                      </div>
                    )
                  })}
                </dl>
              </div>
            )
          })}
        </div>
        {editing ? (
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => void save()} disabled={saving} className="flex-1 rounded-lg bg-[#D3B574] px-3 py-2 text-sm font-black text-[#0A1628] disabled:opacity-60">
              {saving ? "Saving…" : "Save answers"}
            </button>
            <button type="button" onClick={() => (setEditing(false), setDraft(loaded.values))} className="rounded-lg border border-white/20 px-3 py-2 text-sm font-bold">
              Cancel
            </button>
          </div>
        ) : null}
        {!loaded.available ? <p className="mt-3 text-xs text-white/45">Saving answers opens shortly.</p> : null}
      </aside>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className={`${card} p-4`}>
      <p className="text-2xl font-black sm:text-3xl">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wider text-white/50">{label}</p>
    </div>
  )
}

function Logo({ src }: { src: string | null }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-10 w-10 shrink-0 rounded-lg bg-white object-contain p-1" />
  ) : (
    <span className="h-10 w-10 shrink-0 rounded-lg bg-white/[0.06]" aria-hidden />
  )
}

function FormRow({ form, readOnly, onMark }: { form: PackForm; readOnly: boolean; onMark: () => void }) {
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <Logo src={form.logo} />
      <div className="min-w-0 flex-1 basis-48">
        <p className="line-clamp-2 font-bold leading-5">{form.name}</p>
        <p className="mt-0.5 flex items-center gap-2 text-xs">
          <span className="text-white/50">{form.level}</span>
          <span className="inline-flex items-center gap-1 font-semibold text-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300" aria-hidden /> Not submitted yet
          </span>
        </p>
      </div>
      <div className="flex w-full items-center gap-3 sm:w-auto">
        <a href={form.url} data-ncu-form={form.schoolId} target="_blank" rel="noopener noreferrer" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#D3B574] px-3 py-1.5 text-sm font-black text-[#0A1628] sm:flex-none">
          Open form <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
        <button type="button" onClick={onMark} disabled={readOnly} className="shrink-0 text-sm font-semibold text-white/60 underline-offset-2 hover:text-white hover:underline disabled:opacity-50">
          Mark as submitted
        </button>
      </div>
    </li>
  )
}
