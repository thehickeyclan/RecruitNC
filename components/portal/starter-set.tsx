"use client"

import { useState } from "react"
import { Check, Plus } from "lucide-react"

import type { StarterSchool } from "@/app/my-recruiting/starter-set"

const LEVEL_COLOR: Record<string, string> = { D1: "#60a5fa", D2: "#34d399", D3: "#fbbf24", NAIA: "#f472b6", NJCAA: "#a78bfa" }

/** Step 1's starter set: a few colleges at every level to start from, each one tap to save. */
export function StarterSet({ schools, firstName, levelColors, readOnly }: { schools: StarterSchool[]; firstName: string; levelColors?: Record<string, string>; readOnly?: boolean }) {
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const colors = levelColors ?? LEVEL_COLOR
  const save = async (id: string) => {
    if (readOnly) return
    const res = await fetch("/api/college-list", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schoolId: id, status: "interested" }) }).catch(() => null)
    if (res?.ok) setSaved((s) => new Set(s).add(id))
  }
  if (!schools.length) return null
  return (
    <section className="mt-4 rounded-xl border border-white/10 bg-[#0f1c2e] p-5" aria-labelledby="cc-starter">
      <h2 id="cc-starter" className="text-base font-black">
        A starter set for {firstName}
      </h2>
      <p className="text-xs text-white/50">Two at every level, from academic fit, cost and your state. Save the ones worth a closer look.</p>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {schools.map((s) => (
          <li key={s.id} className="flex flex-col rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
            <div className="flex items-start justify-between gap-2">
              {s.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.logo} alt="" className="h-9 w-9 shrink-0 rounded bg-white object-contain p-0.5" />
              ) : (
                <span className="h-9 w-9 shrink-0 rounded bg-white/[0.06]" aria-hidden />
              )}
              <button
                type="button"
                onClick={() => save(s.id)}
                disabled={saved.has(s.id) || readOnly}
                aria-label={saved.has(s.id) ? `${s.name} saved` : `Save ${s.name} to My List`}
                className={`shrink-0 rounded-lg p-1.5 ${saved.has(s.id) ? "bg-emerald-500 text-[#0A1628]" : "border border-white/20 text-white hover:border-[#D3B574]"}`}
              >
                {saved.has(s.id) ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </button>
            </div>
            <a href={`/recruiting/schools/${s.id}`} className="mt-2 min-w-0">
              <span className="line-clamp-2 text-sm font-bold leading-5 hover:underline">{s.name}</span>
              <span className="mt-1 flex items-center gap-1 text-[11px] text-white/50">
                <span className="rounded px-1 text-[10px] font-black text-[#071427]" style={{ backgroundColor: colors[s.level] ?? "#94a3b8" }}>
                  {s.level}
                </span>
                <span className="truncate">{s.why}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
