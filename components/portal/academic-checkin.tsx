"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { GraduationCap } from "lucide-react"

import type { AcademicItem, TestKind } from "@/lib/recruiting/academic-checkin"

/**
 * "Keep the grades current" on the Command Center home (lib/recruiting/academic-checkin.ts decides
 * what to ask). One tap where possible; every answer saves at once and the card moves on.
 */
const BTN = "rounded-lg bg-[#D3B574] px-4 py-2 text-sm font-black text-[#0A1628] hover:bg-[#e2c98d] disabled:opacity-50"
const GHOST = "rounded-lg border border-white/20 px-3 py-2 text-sm font-bold text-white hover:border-[#D3B574] disabled:opacity-50"
const INPUT = "w-28 rounded-lg border border-white/20 bg-[#0A1628] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#D3B574] focus:outline-none"
const TEST_LABEL: Record<TestKind, string> = { sat: "SAT", act: "ACT" }
const day = (d: string) => new Date(d.length === 10 ? `${d}T12:00:00Z` : d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })

export function AcademicCheckin({ athleteId, firstName, self, items }: { athleteId: string; firstName: string; self: boolean; items: AcademicItem[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const whose = self ? "your" : `${firstName}'s`
  const who = self ? "you" : firstName

  const send = async (body: Record<string, unknown>) => {
    setBusy(true)
    setError(null)
    const r = await fetch("/api/my-recruiting/academics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ athleteId, ...body }) }).catch(() => null)
    const d = r ? await r.json().catch(() => ({})) : {}
    setBusy(false)
    if (!r?.ok) return setError(d.error ?? "Couldn't save. Try again.")
    router.refresh()
  }

  if (!items.length) return null
  return (
    <section aria-labelledby="cc-academics" className="mt-6 rounded-xl border border-white/10 bg-[#0f1c2e] p-5">
      <h2 id="cc-academics" className="flex items-center gap-2 text-base font-black text-white">
        <GraduationCap className="h-5 w-5 text-[#D3B574]" aria-hidden /> Keep the grades current
      </h2>
      <p className="mt-1 text-xs text-white/55">Coaches check grades and test scores early.</p>
      <div className="mt-4 grid gap-4">
        {items.map((it) => (
          <div key={it.kind} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            {it.kind === "gpa-missing" ? <GpaForm label={`What's ${whose} GPA?`} hint="From the latest report card." busy={busy} onSave={(gpa) => send({ action: "gpa", gpa })} /> : null}
            {it.kind === "gpa-check" ? <GpaCheck it={it} whose={whose} busy={busy} send={send} /> : null}
            {it.kind === "test-ask" ? <TestAsk who={who} busy={busy} send={send} /> : null}
            {it.kind === "test-score" ? <TestScore it={it} busy={busy} send={send} /> : null}
          </div>
        ))}
      </div>
      {error ? <p className="mt-3 text-sm text-amber-300">{error}</p> : null}
    </section>
  )
}

function GpaForm({ label, hint, busy, onSave, initial = "" }: { label: string; hint: string; busy: boolean; onSave: (gpa: string) => void; initial?: string }) {
  const [v, setV] = useState(initial)
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (v.trim()) onSave(v.trim())
      }}
    >
      <p className="text-sm font-bold text-white">{label}</p>
      <p className="text-xs text-white/55">{hint}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input className={INPUT} inputMode="decimal" placeholder="3.45" aria-label="GPA" value={v} onChange={(e) => setV(e.target.value)} />
        <button type="submit" className={BTN} disabled={busy || !v.trim()}>
          Save
        </button>
      </div>
    </form>
  )
}

function GpaCheck({ it, whose, busy, send }: { it: Extract<AcademicItem, { kind: "gpa-check" }>; whose: string; busy: boolean; send: (b: Record<string, unknown>) => void }) {
  const [editing, setEditing] = useState(false)
  const gpa = it.gpa.toFixed(2)
  if (editing) return <GpaForm label={`What's ${whose} GPA now?`} hint="From the latest report card." busy={busy} onSave={(g) => send({ action: "gpa", gpa: g })} />
  return (
    <div>
      <p className="text-sm font-bold text-white">
        {it.lastUpdated ? "New grades out? " : ""}Is {whose} GPA still {gpa}?
      </p>
      <p className="text-xs text-white/55">{it.lastUpdated ? `Last updated ${day(it.lastUpdated)}.` : "We don't know when it was last updated."}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className={BTN} disabled={busy} onClick={() => send({ action: "gpa_same" })}>
          Still {gpa}
        </button>
        <button type="button" className={GHOST} disabled={busy} onClick={() => setEditing(true)}>
          It changed
        </button>
      </div>
    </div>
  )
}

function TestPicker({ test, setTest }: { test: TestKind; setTest: (t: TestKind) => void }) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-white/20" role="group" aria-label="Which test">
      {(["sat", "act"] as const).map((t) => (
        <button key={t} type="button" aria-pressed={test === t} onClick={() => setTest(t)} className={`px-3 py-2 text-sm font-bold ${test === t ? "bg-[#D3B574] text-[#0A1628]" : "text-white"}`}>
          {TEST_LABEL[t]}
        </button>
      ))}
    </div>
  )
}

function TestAsk({ who, busy, send }: { who: string; busy: boolean; send: (b: Record<string, unknown>) => void }) {
  const [mode, setMode] = useState<"ask" | "score" | "planned">("ask")
  const [test, setTest] = useState<TestKind>("sat")
  const [v, setV] = useState("")
  const asked = who === "you" ? "Have you taken the SAT or ACT?" : `Has ${who} taken the SAT or ACT?`
  if (mode === "score")
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send({ action: "test_score", test, score: v.trim() })
        }}
      >
        <p className="text-sm font-bold text-white">Add the best score</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <TestPicker test={test} setTest={setTest} />
          <input className={INPUT} inputMode="numeric" placeholder={test === "sat" ? "1200" : "26"} aria-label="Score" value={v} onChange={(e) => setV(e.target.value)} />
          <button type="submit" className={BTN} disabled={busy || !v.trim()}>
            Save
          </button>
          <button type="button" className={GHOST} onClick={() => setMode("ask")}>
            Back
          </button>
        </div>
      </form>
    )
  if (mode === "planned")
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send({ action: "test_status", status: "planned", test, date: v })
        }}
      >
        <p className="text-sm font-bold text-white">Which test, and when?</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <TestPicker test={test} setTest={setTest} />
          <input type="date" className={`${INPUT} w-auto`} aria-label="Test date" value={v} onChange={(e) => setV(e.target.value)} />
          <button type="submit" className={BTN} disabled={busy || !v}>
            Save
          </button>
          <button type="button" className={GHOST} onClick={() => setMode("ask")}>
            Back
          </button>
        </div>
        <p className="mt-2 text-xs text-white/55">We&apos;ll ask for the score a couple of weeks after.</p>
      </form>
    )
  return (
    <div>
      <p className="text-sm font-bold text-white">{asked}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className={BTN} disabled={busy} onClick={() => setMode("score")}>
          Yes, add the score
        </button>
        <button
          type="button"
          className={GHOST}
          disabled={busy}
          onClick={() => {
            setV("")
            setMode("planned")
          }}
        >
          Signed up for one
        </button>
        <button type="button" className={GHOST} disabled={busy} onClick={() => send({ action: "test_status", status: "not_yet" })}>
          Not yet
        </button>
        <button type="button" className={GHOST} disabled={busy} onClick={() => send({ action: "test_status", status: "not_taking" })}>
          Not planning to
        </button>
      </div>
    </div>
  )
}

function TestScore({ it, busy, send }: { it: Extract<AcademicItem, { kind: "test-score" }>; busy: boolean; send: (b: Record<string, unknown>) => void }) {
  const [v, setV] = useState("")
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        send({ action: "test_score", test: it.test, score: v.trim() })
      }}
    >
      <p className="text-sm font-bold text-white">
        How did the {TEST_LABEL[it.test]} on {day(it.date)} go?
      </p>
      <p className="text-xs text-white/55">Add the score once it&apos;s back.</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input className={INPUT} inputMode="numeric" placeholder={it.test === "sat" ? "1200" : "26"} aria-label={`${TEST_LABEL[it.test]} score`} value={v} onChange={(e) => setV(e.target.value)} />
        <button type="submit" className={BTN} disabled={busy || !v.trim()}>
          Save
        </button>
        <button type="button" className={GHOST} disabled={busy} onClick={() => send({ action: "test_later" })}>
          Not back yet
        </button>
        <button type="button" className={GHOST} disabled={busy} onClick={() => send({ action: "test_status", status: "not_yet" })}>
          Didn&apos;t take it
        </button>
      </div>
    </form>
  )
}
