"use client"

import { useState } from "react"
import { ArrowRight, Check, Plus } from "lucide-react"

import type { ListCard, PriorityListsView } from "@/app/my-recruiting/priority-lists"
import { FIRST_LIST_GOAL, FirstListProgress } from "@/components/portal/first-list-progress"

const LEVEL_COLOR: Record<string, string> = { D1: "#60a5fa", D2: "#34d399", D3: "#fbbf24", NAIA: "#f472b6", NJCAA: "#a78bfa" }

/** No logo on file: the college's initials, never a blank box. */
function monogram(name: string): string {
  const words = name.split(/\s+/).filter((w) => /^[A-Z]/.test(w) && !["Of", "The", "And", "At"].includes(w))
  return (words.length ? words : [name]).slice(0, 2).map((w) => w[0]).join("").toUpperCase()
}

/**
 * The two suggestion lists, shaped by the survey (priorities v3, part 3). Each card says why it
 * fits, what might not, and the one thing to check next. Never padded: a list can be short.
 */
export function PriorityLists({
  lists,
  athleteId,
  firstName,
  levelColors,
  readOnly,
  savedCount = 0,
  bare = false,
}: {
  lists: PriorityListsView
  athleteId: string
  firstName: string
  levelColors?: Record<string, string>
  readOnly?: boolean
  savedCount?: number
  bare?: boolean
}) {
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const colors = levelColors ?? LEVEL_COLOR
  const save = async (id: string) => {
    if (readOnly) return
    const res = await fetch("/api/college-list", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schoolId: id, status: "interested" }) }).catch(() => null)
    if (res?.ok) setSaved((s) => new Set(s).add(id))
  }
  const card = (c: ListCard) => (
    <li key={c.id} className="flex flex-col rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-start gap-2.5">
        {c.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.logo} alt="" className="h-9 w-9 shrink-0 rounded bg-white object-contain p-0.5" />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-white/[0.08] text-[11px] font-black text-white/70" aria-hidden>
            {monogram(c.name)}
          </span>
        )}
        <a href={`/recruiting/schools/${c.id}`} className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm font-bold leading-5 hover:underline">{c.name}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/50">
            <span className="shrink-0 rounded px-1 text-[10px] font-black text-[#071427]" style={{ backgroundColor: colors[c.level] ?? "#94a3b8" }}>
              {c.level}
            </span>
            <span className="truncate">{c.place}</span>
          </span>
        </a>
        <button
          type="button"
          onClick={() => save(c.id)}
          disabled={saved.has(c.id) || readOnly}
          aria-label={saved.has(c.id) ? `${c.name} saved` : `Save ${c.name} to My List`}
          className={`shrink-0 rounded-lg p-1.5 ${saved.has(c.id) ? "bg-emerald-500 text-[#0A1628]" : "border border-white/20 text-white hover:border-[#D3B574]"}`}
        >
          {saved.has(c.id) ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>
      <ul className="mt-2.5 space-y-1 text-xs leading-4">
        {c.why.map((w) => (
          <li key={w} className="flex gap-1.5 text-white/80">
            <Check className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
            {w}
          </li>
        ))}
        {c.mightNot.map((m) => (
          <li key={m} className="flex gap-1.5 text-amber-200/85">
            <span className="mt-px w-3.5 shrink-0 text-center font-black" aria-hidden>
              !
            </span>
            {m}
          </li>
        ))}
      </ul>
      {c.opportunityNote ? <p className="mt-1.5 text-[11px] leading-4 text-white/40">{c.opportunityNote}</p> : null}
      <a href={c.next.href} className="mt-auto flex items-center gap-1 pt-2.5 text-xs font-bold text-[#D3B574] hover:underline" {...(c.next.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
        {c.next.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </a>
    </li>
  )
  const list = (id: string, title: string, sub: string, cards: ListCard[]) =>
    cards.length ? (
      <div className="mt-4">
        <h3 id={id} className="text-sm font-black">
          {title} <span className="font-bold text-white/45">· {cards.length}</span>
        </h3>
        <p className="text-xs text-white/50">{sub}</p>
        <ul aria-labelledby={id} className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map(card)}
        </ul>
      </div>
    ) : null
  if (!lists.bestFit.length && !lists.opportunities.length && !lists.shortLine) return null
  return (
    <section className={bare ? "mt-5 scroll-mt-24" : "mt-4 scroll-mt-24 rounded-xl border border-white/10 bg-[#0f1c2e] p-5"} id="cc-lists" aria-labelledby="cc-lists-h">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 id="cc-lists-h" className="text-base font-black">
          Colleges for {firstName}, from what matters to your family
        </h2>
        <a href={`/my-recruiting/priorities?w=${athleteId}`} className="text-xs font-bold text-[#D3B574] hover:underline">
          Change answers →
        </a>
      </div>
      <p className="text-xs text-white/50">{lists.shapedBy} Tap + to save.</p>
      {savedCount < FIRST_LIST_GOAL ? <FirstListProgress count={savedCount + saved.size} firstName={firstName} className="mt-3" /> : null}
      {list("cc-best", "Best fit", `Levels you're open to, ranked by what you said matters most, where ${firstName}'s results fit.`, lists.bestFit)}
      {list("cc-opps", "Opportunities worth pursuing", `Where there's evidence a program could use ${firstName}: a projected opening at the weight, a coach-posted need, or coaches viewing the profile.`, lists.opportunities)}
      {lists.shortLine ? <p className="mt-3 text-xs text-white/55">{lists.shortLine}</p> : null}
      {lists.notes.map((n) => (
        <p key={n} className="mt-2 text-[11px] text-white/45">
          {n}
        </p>
      ))}
    </section>
  )
}
