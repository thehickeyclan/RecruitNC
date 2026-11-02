"use client"

/**
 * A staff's recruiting needs (app/my-recruits/needs). Post: pick weights and classes, optional
 * filters, one button. Each need: "Still recruiting" re-dates it, "Clear" removes it, and its
 * matching wrestlers open underneath with a star to add any of them to My Recruits.
 */
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, ChevronDown, ChevronUp, ClipboardList, Loader2, Star, X } from "lucide-react"

import {
  GPA_OPTIONS,
  MILES_OPTIONS,
  NEED_EXPIRE_DAYS,
  RESULTS_LEVELS,
  confirmedLabel,
  filterLabels,
  needHeadline,
  weightsFor,
  type NeedStatus,
  type RecruitingNeed,
  type ResultsLevel,
} from "@/lib/recruiting/needs"
import type { NeedMatch } from "@/lib/recruiting/needs-server"
import type { ViewGender } from "@/lib/recruiting/coach-program"

type Need = RecruitingNeed & { status: NeedStatus }
type Loaded = { available: boolean; canPost: boolean; program: string | null; genders: ViewGender[]; classYears: number[]; needs: Need[] }

const GOLD = "text-[#D3B574]"
const PANEL = "rounded-xl border border-white/10 bg-[#0f1c2e]"
const TITLE = "text-[11px] font-black uppercase tracking-widest text-white/40"
const chip = (on: boolean) =>
  `min-h-[40px] rounded-lg border px-3 text-sm font-bold transition-colors ${on ? "border-[#D3B574] bg-[#D3B574] text-[#0A1628]" : "border-white/15 text-white/75 hover:border-[#D3B574]/50"}`

const STATUS: Record<NeedStatus, { label: string; cls: string }> = {
  active: { label: "Live", cls: "bg-emerald-500/15 text-emerald-300" },
  confirm: { label: "Confirm soon", cls: "bg-amber-500/15 text-amber-300" },
  expired: { label: "Expired · hidden", cls: "bg-white/10 text-white/50" },
  cleared: { label: "Cleared", cls: "bg-white/10 text-white/50" },
}

export function NeedsBoard({ asUserId }: { asUserId: string | null }) {
  const qs = asUserId ? `?as=${encodeURIComponent(asUserId)}` : ""
  const [data, setData] = useState<Loaded | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/coach-portal/needs${qs}`, { credentials: "include", cache: "no-store" })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) setError(body.error ?? "Could not load.")
    else setData(body as Loaded)
  }, [qs])
  useEffect(() => {
    void load()
  }, [load])

  return (
    <main className="min-h-screen bg-[#0A1628] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {asUserId ? (
          <p className="mb-3 rounded-lg border border-[#D3B574]/40 px-3 py-2 text-sm">
            Viewing as a coach · read-only ·{" "}
            <Link href={`/my-recruits?as=${encodeURIComponent(asUserId)}`} className={`font-bold ${GOLD} underline`}>
              Their My Recruits
            </Link>
          </p>
        ) : null}
        <p className={`${TITLE} flex items-center gap-2`}>
          <ClipboardList className={`h-3.5 w-3.5 ${GOLD}`} /> {data?.program ?? "Your program"}
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Recruiting needs</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/60">
          Post the weights and classes you are recruiting. You get a matching list; families at that weight and class see your program as coach-confirmed. Never shown as a roster spot or a
          scholarship. Hidden after {NEED_EXPIRE_DAYS} days unless you tap Still recruiting.
        </p>

        {error ? <p className="mt-6 text-sm text-red-300">{error}</p> : null}
        {!data && !error ? <Loader2 className={`mt-8 h-6 w-6 animate-spin ${GOLD}`} /> : null}
        {data && !data.available ? <p className={`${PANEL} mt-6 p-4 text-sm text-white/70`}>Recruiting needs are being switched on. Check back shortly.</p> : null}
        {data?.available ? (
          <>
            {data.canPost ? <PostNeed data={data} onSaved={load} /> : null}
            {!data.canPost && !asUserId ? (
              <p className={`${PANEL} mt-6 p-4 text-sm text-white/70`}>Add your program to your account to post needs.</p>
            ) : null}
            <section className="mt-8" aria-labelledby="needs-open">
              <h2 id="needs-open" className={TITLE}>
                Your needs ({data.needs.length})
              </h2>
              {data.needs.length === 0 ? <p className="mt-3 text-sm text-white/55">None posted yet.</p> : null}
              <div className="mt-3 space-y-3">
                {data.needs.map((n) => (
                  <NeedCard key={n.id} need={n} showGender={data.genders.length > 1} readOnly={!data.canPost} qs={qs} onChanged={load} />
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  )
}

function PostNeed({ data, onSaved }: { data: Loaded; onSaved: () => Promise<void> }) {
  const [gender, setGender] = useState<ViewGender>(data.genders[0] ?? "Male")
  const [weights, setWeights] = useState<number[]>([])
  const [years, setYears] = useState<number[]>([])
  const [minGpa, setMinGpa] = useState<number | null>(null)
  const [maxMiles, setMaxMiles] = useState<number | null>(null)
  const [level, setLevel] = useState<ResultsLevel>("any")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const toggle = (list: number[], v: number) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const post = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch("/api/coach-portal/needs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gender, weights, classYears: years, minGpa, maxMiles, resultsLevel: level }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) return setMsg(body.error ?? "Could not save.")
      setWeights([])
      setMsg(`Posted ${body.needs?.length ?? 0}`)
      await onSaved()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`${PANEL} mt-6 p-4 sm:p-5`} aria-labelledby="needs-post">
      <h2 id="needs-post" className={TITLE}>
        Post a need
      </h2>
      {data.genders.length > 1 ? (
        <div className="mt-3 flex gap-2">
          {data.genders.map((g) => (
            <button
              key={g}
              type="button"
              className={chip(gender === g)}
              onClick={() => {
                setGender(g)
                setWeights([])
              }}
            >
              {g === "Female" ? "Women's" : "Men's"}
            </button>
          ))}
        </div>
      ) : null}
      <p className="mt-4 text-xs font-bold text-white/50">Weights</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {weightsFor(gender).map((w) => (
          <button key={w} type="button" aria-pressed={weights.includes(w)} className={chip(weights.includes(w))} onClick={() => setWeights((l) => toggle(l, w))}>
            {w}
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs font-bold text-white/50">Class</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {data.classYears.map((y) => (
          <button key={y} type="button" aria-pressed={years.includes(y)} className={chip(years.includes(y))} onClick={() => setYears((l) => toggle(l, y))}>
            {y}
          </button>
        ))}
      </div>
      <details className="mt-4">
        <summary className="cursor-pointer text-xs font-bold text-white/50">Optional filters{filterLabels({ minGpa, maxMiles, resultsLevel: level }).length ? ` · ${filterLabels({ minGpa, maxMiles, resultsLevel: level }).join(" · ")}` : ""}</summary>
        <p className="mt-3 text-xs text-white/45">Min GPA</p>
        <div className="mt-1 flex flex-wrap gap-2">
          <button type="button" className={chip(minGpa == null)} onClick={() => setMinGpa(null)}>
            Any
          </button>
          {GPA_OPTIONS.map((g) => (
            <button key={g} type="button" className={chip(minGpa === g)} onClick={() => setMinGpa(g)}>
              {g.toFixed(1)}+
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-white/45">Distance from campus (to the wrestler&apos;s home state)</p>
        <div className="mt-1 flex flex-wrap gap-2">
          <button type="button" className={chip(maxMiles == null)} onClick={() => setMaxMiles(null)}>
            Any
          </button>
          {MILES_OPTIONS.map((m) => (
            <button key={m} type="button" className={chip(maxMiles === m)} onClick={() => setMaxMiles(m)}>
              {m.toLocaleString()} mi
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-white/45">Verified results</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {RESULTS_LEVELS.map((l) => (
            <button key={l.value} type="button" className={chip(level === l.value)} onClick={() => setLevel(l.value)}>
              {l.label}
            </button>
          ))}
        </div>
      </details>
      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          disabled={busy || !weights.length || !years.length}
          onClick={post}
          className="min-h-[44px] rounded-lg bg-[#D3B574] px-5 text-sm font-black text-[#0A1628] disabled:opacity-40"
        >
          {busy ? "Posting…" : weights.length > 1 ? `Post ${weights.length} needs` : "Post need"}
        </button>
        {msg ? <span className="text-sm text-white/70">{msg}</span> : null}
      </div>
    </section>
  )
}

function NeedCard({ need, showGender, readOnly, qs, onChanged }: { need: Need; showGender: boolean; readOnly: boolean; qs: string; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [matches, setMatches] = useState<{ matches: NeedMatch[]; total: number } | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!open || matches) return
    fetch(`/api/coach-portal/needs/${need.id}/matches${qs}`, { credentials: "include", cache: "no-store" })
      .then(async (r) => (r.ok ? setMatches(await r.json()) : setFailed(true)))
      .catch(() => setFailed(true))
  }, [open, matches, need.id, qs])

  const act = async (action: "confirm" | "clear") => {
    setBusy(action)
    try {
      await fetch("/api/coach-portal/needs", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: need.id, action }) })
      await onChanged()
    } finally {
      setBusy(null)
    }
  }
  const s = STATUS[need.status]
  const filters = filterLabels(need)
  return (
    <article className={`${PANEL} p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xl font-black">
            {showGender ? <span className="mr-2 text-sm font-bold text-white/50">{need.gender === "Female" ? "W" : "M"}</span> : null}
            {needHeadline(need)}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/55">
            <span className={`rounded-full px-2 py-0.5 font-bold ${s.cls}`}>{s.label}</span>
            <span>{confirmedLabel(need.confirmedAt)}</span>
            {filters.map((f) => (
              <span key={f} className="rounded-full border border-white/15 px-2 py-0.5">
                {f}
              </span>
            ))}
          </p>
        </div>
        {readOnly ? null : (
          <div className="flex gap-2">
            <button type="button" onClick={() => act("confirm")} disabled={!!busy} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#D3B574]/40 px-3 text-sm font-bold text-[#D3B574] hover:bg-[#D3B574]/10">
              <CheckCircle2 className="h-4 w-4" /> {busy === "confirm" ? "…" : "Still recruiting"}
            </button>
            <button type="button" onClick={() => act("clear")} disabled={!!busy} aria-label={`Clear ${needHeadline(need)}`} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/15 px-3 text-sm font-bold text-white/70 hover:border-white/40">
              <X className="h-4 w-4" /> {busy === "clear" ? "…" : "Clear"}
            </button>
          </div>
        )}
      </div>
      <button type="button" onClick={() => setOpen((o) => !o)} className={`mt-3 inline-flex items-center gap-1 text-sm font-bold ${GOLD}`} aria-expanded={open}>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />} {matches ? `${matches.total} matching wrestlers` : "Matching wrestlers"}
      </button>
      {open ? (
        <div className="mt-2">
          {failed ? <p className="text-sm text-red-300">Could not load matches.</p> : null}
          {!matches && !failed ? <Loader2 className={`h-5 w-5 animate-spin ${GOLD}`} /> : null}
          {matches && matches.matches.length === 0 ? <p className="text-sm text-white/55">No uncommitted wrestler on file fits this yet.</p> : null}
          {matches?.matches.length ? (
            <>
              <p className="text-xs text-white/45">Weight is the one each last competed at. Ranked and verified results first.</p>
              <ul className="mt-1">
                {matches.matches.map((m) => (
                  <MatchRow key={m.id} m={m} readOnly={readOnly} />
                ))}
              </ul>
              {matches.total > matches.matches.length ? <p className="mt-2 text-xs text-white/45">Top {matches.matches.length} of {matches.total}.</p> : null}
            </>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

function MatchRow({ m, readOnly }: { m: NeedMatch; readOnly: boolean }) {
  const [on, setOn] = useState(m.starred)
  const [busy, setBusy] = useState(false)
  const star = async () => {
    if (busy || on || readOnly) return
    setBusy(true)
    try {
      const res = await fetch("/api/coach-portal/star", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ athleteId: m.id }) })
      if (res.ok) setOn(true)
    } finally {
      setBusy(false)
    }
  }
  const tags = [m.rankLabel, m.nationalLabel, m.credential].filter(Boolean) as string[]
  const flags = m.checks.filter((c) => c.status === "unknown")
  return (
    <li className="flex items-center gap-3 border-b border-white/5 py-2.5 last:border-0">
      <button
        type="button"
        onClick={star}
        disabled={busy || on || readOnly}
        aria-pressed={on}
        aria-label={on ? `${m.name} is on My Recruits` : `Add ${m.name} to My Recruits`}
        title={on ? "On My Recruits" : "Add to My Recruits"}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#D3B574]/40 hover:bg-[#D3B574]/10 disabled:opacity-100"
      >
        <Star className={`h-5 w-5 ${GOLD} ${on ? "fill-[#D3B574]" : ""}`} />
      </button>
      <Link href={`/athletes/${m.id}`} className="min-w-0 flex-1">
        <span className="block truncate font-bold text-white">{m.name}</span>
        <span className="block truncate text-xs text-white/50">{[`${m.weight} lbs`, `Class of ${m.classYear}`, m.highSchool, m.state].filter(Boolean).join(" · ")}</span>
        {tags.length || flags.length ? (
          <span className="mt-1 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className={`rounded-full bg-[#D3B574]/10 px-2 py-0.5 text-[11px] font-bold ${GOLD}`}>
                {t}
              </span>
            ))}
            {flags.map((f) => (
              <span key={f.key} className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/50">
                {f.label}
              </span>
            ))}
          </span>
        ) : null}
      </Link>
    </li>
  )
}
