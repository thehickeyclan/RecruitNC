"use client"

import { useState } from "react"
import { Check, ChevronRight, GraduationCap, Medal, Search, Target, Trophy, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import type { RoadmapYear } from "@/lib/recruiting/learn/roadmap"

const GRADE_LABEL: Record<number, string> = { 8: "8th grade", 9: "9th grade", 10: "10th grade", 11: "11th grade", 12: "12th grade" }
const ACCENT: Record<number, string> = { 8: "#5B9BFF", 9: "#38BDF8", 10: "#A78BFA", 11: "#F5C04E", 12: "#F87171" }
/** Wide screens read 8th to 12th left to right, whatever order a phone shows them in. */
const XL_ORDER: Record<number, string> = { 8: "xl:order-1", 9: "xl:order-2", 10: "xl:order-3", 11: "xl:order-4", 12: "xl:order-5" }
const ICON: Record<number, LucideIcon> = { 8: Medal, 9: Target, 10: Search, 11: Users, 12: GraduationCap }

/**
 * Five grade columns with a checklist each. The wrestler's own year is marked and leads on a
 * phone; ticking saves to the family's account. Read-only in a developer's family preview.
 */
export function RoadmapBoard({
  years,
  initialDone,
  current,
  selected,
  readOnly,
  name,
}: {
  years: RoadmapYear[]
  initialDone: string[]
  current: number | null
  selected: number
  readOnly: boolean
  name: string | null
}) {
  const [done, setDone] = useState(() => new Set(initialDone))
  const [error, setError] = useState<string | null>(null)

  const toggle = async (id: string) => {
    if (readOnly) return
    const next = !done.has(id)
    setDone((d) => {
      const copy = new Set(d)
      if (next) copy.add(id)
      else copy.delete(id)
      return copy
    })
    setError(null)
    const res = await fetch("/api/roadmap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, done: next }) }).catch(() => null)
    if (!res?.ok) {
      setError("Could not save that. Try again.")
      setDone((d) => {
        const copy = new Set(d)
        if (next) copy.delete(id)
        else copy.add(id)
        return copy
      })
    }
  }

  // On a phone the wrestler's year comes first; on a wide screen the years read left to right.
  const ordered = current ? [...years].sort((a, b) => Number(b.grade === current) - Number(a.grade === current)) : years

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {ordered.map((year) => {
          const Icon = ICON[year.grade]
          const accent = ACCENT[year.grade]
          const count = year.items.filter((i) => done.has(i.id)).length
          const isCurrent = year.grade === current
          const past = current != null && year.grade < current
          return (
            <section
              key={year.grade}
              style={{ borderTopColor: accent }}
              className={`flex flex-col rounded-2xl border border-t-4 bg-[#0d1d36]/90 ${isCurrent ? "border-x-white/20 border-b-white/20 shadow-[0_0_0_1px_rgba(211,181,116,0.5)]" : "border-x-white/10 border-b-white/10"} ${past ? "opacity-75" : ""} ${XL_ORDER[year.grade]}`}
            >
              <a href={`?grade=${year.grade}#this-year`} className="block p-4 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xl font-black tracking-tight">{GRADE_LABEL[year.grade]}</p>
                    <p className="text-sm font-bold" style={{ color: accent }}>
                      {year.title}
                    </p>
                  </div>
                  <Icon className="h-6 w-6 shrink-0" style={{ color: accent }} aria-hidden />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {isCurrent ? (
                    <span className="rounded-full bg-[#D3B574] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0A1628]">{name ? `${name} is here` : "You are here"}</span>
                  ) : null}
                  {year.grade === selected && !isCurrent ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Showing below</span> : null}
                  <span className="ml-auto text-xs font-semibold text-white/50">
                    {count}/{year.items.length}
                  </span>
                </div>
                <span className="mt-2 block h-1 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full rounded-full transition-all" style={{ width: `${(count / year.items.length) * 100}%`, backgroundColor: accent }} />
                </span>
              </a>
              <ul className="flex-1 space-y-1 border-t border-white/10 p-3">
                {year.items.map((item) => {
                  const on = done.has(item.id)
                  return (
                    <li key={item.id} className="flex items-start gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-white/[0.04]">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        aria-label={item.text}
                        disabled={readOnly}
                        onClick={() => toggle(item.id)}
                        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition ${on ? "border-transparent text-[#0A1628]" : "border-white/35 hover:border-white/70"}`}
                        style={on ? { backgroundColor: accent } : undefined}
                      >
                        {on ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : null}
                      </button>
                      {item.href ? (
                        <a href={item.href} className={`group flex-1 text-sm leading-5 ${on ? "text-white/45 line-through" : "text-white/85 hover:text-white"}`}>
                          {item.text}
                          <ChevronRight className="ml-0.5 inline h-3.5 w-3.5 text-white/30 group-hover:text-white/70" aria-hidden />
                        </a>
                      ) : (
                        <span className={`flex-1 text-sm leading-5 ${on ? "text-white/45 line-through" : "text-white/85"}`}>{item.text}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
              <div className="m-3 mt-0 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                {count === year.items.length ? (
                  <Trophy className="h-5 w-5 shrink-0" style={{ color: accent }} aria-hidden />
                ) : (
                  <Target className="h-5 w-5 shrink-0 text-white/40" aria-hidden />
                )}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: accent }}>
                    Key outcome
                  </p>
                  <p className="text-xs leading-5 text-white/75">{year.outcome}</p>
                </div>
              </div>
            </section>
          )
        })}
      </div>
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
      {readOnly ? <p className="mt-2 text-xs text-white/40">Preview: ticking is off.</p> : null}
    </div>
  )
}
