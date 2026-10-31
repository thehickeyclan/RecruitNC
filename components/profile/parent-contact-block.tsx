"use client"

import { useEffect, useState } from "react"

import { formatPhoneForDisplay } from "@/lib/phone-format"
import type { ParentContact } from "@/lib/parent-contact"

/**
 * One parent or guardian, under Contact Information (lib/parent-contact.ts). The route decides who
 * sees it - the wrestler's parent, college coaches, admins - and this draws nothing for anyone else.
 * The family gets "+ Add parent" and can change or clear it.
 */
export function ParentContactBlock({ athleteId }: { athleteId: string }) {
  const [state, setState] = useState<{ see: boolean; edit: boolean; contact: ParentContact | null } | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", phone: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/athletes/${encodeURIComponent(athleteId)}/parent-contact`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.see) setState({ see: true, edit: Boolean(d.edit), contact: d.contact ?? null })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [athleteId])

  if (!state?.see) return null
  const c = state.contact

  const open = () => {
    setForm({ name: c?.name ?? "", email: c?.email ?? "", phone: c?.phone ?? "" })
    setError(null)
    setEditing(true)
  }
  const save = async () => {
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/athletes/${encodeURIComponent(athleteId)}/parent-contact`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).catch(() => null)
    const d = res ? await res.json().catch(() => null) : null
    setSaving(false)
    if (!res?.ok) return setError(d?.error ?? "Could not save. Try again.")
    setState({ ...state, contact: d?.contact ?? null })
    setEditing(false)
  }

  if (editing) {
    const field = "w-full rounded-lg border border-[#1a3a5f] bg-[#0f1c2e] px-3 py-2 text-[13px] text-white placeholder:text-[#6B829D]"
    return (
      <div className="w-full space-y-2 rounded-xl border border-[#1a3a5f] p-3">
        <p className="text-[10px] font-extrabold tracking-[0.24em] text-[#D3B574]">PARENT / GUARDIAN</p>
        <input className={field} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={field} placeholder="Email" type="email" inputMode="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className={field} placeholder="Cell phone" type="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        {error ? <p className="text-xs text-red-300">{error}</p> : null}
        <div className="flex items-center gap-3 pt-1">
          <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-[#D3B574] px-4 py-2 text-xs font-extrabold text-[#0A1628] disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-xs font-bold text-[#A8BBD1] hover:underline">
            Cancel
          </button>
        </div>
        <p className="text-[11px] text-[#6B829D]">Only college coaches and your family see this.</p>
      </div>
    )
  }

  if (!c) {
    return state.edit ? (
      <button type="button" onClick={open} className="text-xs font-bold text-[#D3B574] hover:underline">
        + Add parent
      </button>
    ) : null
  }

  return (
    <div className="w-full rounded-xl border border-[#1a3a5f] p-3">
      <p className="text-[10px] font-extrabold tracking-[0.24em] text-[#D3B574]">PARENT / GUARDIAN</p>
      {c.name ? <p className="pt-1 text-[13px] font-bold text-white">{c.name}</p> : null}
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[13px]">
        {c.phone ? (
          <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="text-[#D3B574] hover:underline">
            {formatPhoneForDisplay(c.phone)}
          </a>
        ) : null}
        {c.email ? (
          <a href={`mailto:${c.email}`} className="break-all text-[#D3B574] hover:underline">
            {c.email}
          </a>
        ) : null}
      </div>
      {state.edit ? (
        <button type="button" onClick={open} className="pt-2 text-xs font-bold text-[#A8BBD1] hover:underline">
          Edit parent
        </button>
      ) : null}
    </div>
  )
}
