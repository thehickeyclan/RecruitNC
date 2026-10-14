"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { MAJOR_FAMILIES, type FamilyFitProfile } from "@/lib/recruiting/family-fit"

/** What matters to the family, saved on their own account and never shown to a coach. */
export function FamilyFitForm({ initial, open: startOpen, embedded = false, afterSave }: { initial: FamilyFitProfile; open: boolean; embedded?: boolean; afterSave?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(startOpen)
  const [p, setP] = useState<FamilyFitProfile>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-xs font-bold ${on ? "border-[#D3B574] bg-[#D3B574]/15 text-white" : "border-white/15 text-white/65 hover:text-white"}`
  const toggle = <T,>(list: T[], v: T, max = 99) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v].slice(-max))

  const save = async () => {
    setSaving(true)
    setError(null)
    const res = await fetch("/api/family-fit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(p) }).catch(() => null)
    setSaving(false)
    if (!res?.ok) return setError("Could not save. Try again.")
    if (afterSave) return router.push(afterSave)
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-4 text-sm font-bold text-[#D3B574] hover:underline">
        Edit what matters to your family →
      </button>
    )
  }
  return (
    <div className={embedded ? "mt-2 text-sm" : "mt-4 rounded-xl border border-white/10 bg-[#0f1c2e] p-5 text-sm"}>
      {embedded ? null : (
        <>
          <p className="font-bold text-white">What matters to your family</p>
          <p className="mt-1 text-xs text-white/55">Saved on your account only. A coach never sees it.</p>
        </>
      )}

      <p className="mt-5 text-sm font-semibold text-white">Intended major <span className="font-normal text-white/50">(up to three)</span></p>
      <div className="mt-2 flex flex-wrap gap-2">
        {MAJOR_FAMILIES.map((m) => (
          <button key={m.code} type="button" className={chip(p.majors.includes(m.code))} onClick={() => setP({ ...p, majors: toggle(p.majors, m.code, 3) })}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="block text-xs font-semibold text-white/60">
          Most your family can pay a year
          <input inputMode="numeric" value={p.budget ?? ""} placeholder="e.g. 25000" onChange={(e) => setP({ ...p, budget: Number(e.target.value.replace(/[^0-9]/g, "")) || null })} className="mt-1 h-10 w-full rounded-md border border-white/15 bg-white/5 px-3 text-sm text-white" />
        </label>
        <label className="block text-xs font-semibold text-white/60">
          Home ZIP code
          <input inputMode="numeric" maxLength={5} value={p.homeZip ?? ""} onChange={(e) => setP({ ...p, homeZip: e.target.value.replace(/[^0-9]/g, "").slice(0, 5) || null })} className="mt-1 h-10 w-full rounded-md border border-white/15 bg-white/5 px-3 text-sm text-white" />
        </label>
        <label className="block text-xs font-semibold text-white/60">
          Farthest from home, in miles
          <input inputMode="numeric" value={p.maxMiles ?? ""} placeholder="e.g. 500" onChange={(e) => setP({ ...p, maxMiles: Number(e.target.value.replace(/[^0-9]/g, "")) || null })} className="mt-1 h-10 w-full rounded-md border border-white/15 bg-white/5 px-3 text-sm text-white" />
        </label>
      </div>

      <p className="mt-5 text-sm font-semibold text-white">School size</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {([["small", "Small, under 5,000"], ["medium", "Medium, 5,000 to 15,000"], ["large", "Large, over 15,000"]] as const).map(([v, label]) => (
          <button key={v} type="button" className={chip(p.size === v)} onClick={() => setP({ ...p, size: p.size === v ? null : v })}>
            {label}
          </button>
        ))}
      </div>
      <p className="mt-5 text-sm font-semibold text-white">Setting</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {(["city", "suburb", "town", "rural"] as const).map((v) => (
          <button key={v} type="button" className={chip(p.settings.includes(v))} onClick={() => setP({ ...p, settings: toggle(p.settings, v) })}>
            {v[0].toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button type="button" disabled={saving} onClick={save} className="rounded-lg bg-[#D3B574] px-5 py-2.5 text-sm font-bold text-[#0A1628] hover:bg-[#e2c98d] disabled:opacity-60">
          {saving ? "Saving…" : "Save and see the comparison →"}
        </button>
        {error ? <span className="text-xs text-red-300">{error}</span> : null}
      </div>
    </div>
  )
}
