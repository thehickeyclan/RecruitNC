"use client"

import { useMemo, useState } from "react"
import { Check, Plus, Search } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CONTACT_KINDS, CONTACT_LABEL, type ContactKind } from "@/lib/college-programs/contacts"

export type ReachedOutSchool = { id: string; name: string; place: string; level: string }

/**
 * "A college reached out": three taps - which college, how, when (lib/college-programs/contacts.ts).
 * Colleges already on the family's list are offered first; any of the season's programs can be found
 * by name.
 */
export function ReachedOutButton({
  athletes,
  schools,
  listIds,
  className = "",
}: {
  athletes: Array<{ id: string; firstName: string }>
  schools: ReachedOutSchool[]
  listIds: string[]
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [athleteId, setAthleteId] = useState(athletes[0]?.id ?? "")
  const [query, setQuery] = useState("")
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [kind, setKind] = useState<ContactKind | null>(null)
  const [day, setDay] = useState(() => new Date().toLocaleDateString("en-CA"))
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onList = useMemo(() => new Set(listIds), [listIds])
  const matches = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const pool = words.length ? schools.filter((s) => words.every((w) => `${s.name} ${s.place}`.toLowerCase().includes(w))) : schools.filter((s) => onList.has(s.id))
    return pool.slice(0, 8)
  }, [query, schools, onList])
  const chosen = schools.find((s) => s.id === schoolId) ?? null

  const reset = () => {
    setQuery("")
    setSchoolId(null)
    setKind(null)
    setNote("")
    setError(null)
    setDay(new Date().toLocaleDateString("en-CA"))
  }

  const save = async () => {
    if (!schoolId || !kind || !athleteId) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/college-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId, schoolId, kind, happenedOn: day, note }),
      })
      const d = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) throw new Error(d?.error ?? "Could not save. Try again.")
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.")
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          reset()
          setOpen(true)
        }}
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#D3B574] px-4 py-2 text-sm font-bold text-[#0A1628] hover:bg-[#e2c98d] ${className}`}
      >
        <Plus className="h-4 w-4" aria-hidden /> A college reached out
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#0f1c2e] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>A college reached out</DialogTitle>
            <DialogDescription className="text-white/60">Log it in a few taps. It goes on your list and your activity.</DialogDescription>
          </DialogHeader>

          {athletes.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {athletes.map((a) => (
                <button key={a.id} type="button" onClick={() => setAthleteId(a.id)} aria-pressed={athleteId === a.id} className={`rounded-full border px-3 py-1 text-sm font-semibold ${athleteId === a.id ? "border-[#D3B574] bg-[#D3B574] text-[#0A1628]" : "border-white/20 text-white/80"}`}>
                  {a.firstName}
                </button>
              ))}
            </div>
          ) : null}

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/50">1. Which college</p>
            {chosen ? (
              <button type="button" onClick={() => setSchoolId(null)} className="mt-2 flex w-full items-center justify-between rounded-lg border border-[#D3B574]/60 bg-[#D3B574]/10 px-3 py-2 text-left">
                <span>
                  <span className="block font-semibold">{chosen.name}</span>
                  <span className="text-xs text-white/55">
                    {chosen.level} · {chosen.place}
                  </span>
                </span>
                <span className="text-xs text-white/50">Change</span>
              </button>
            ) : (
              <>
                <label className="mt-2 flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3">
                  <Search className="h-4 w-4 text-white/40" aria-hidden />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search colleges" className="h-10 w-full bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none" autoFocus />
                </label>
                {!query && !matches.length ? <p className="mt-2 text-xs text-white/45">Type a college's name.</p> : null}
                <ul className="mt-2 divide-y divide-white/5">
                  {matches.map((s) => (
                    <li key={s.id}>
                      <button type="button" onClick={() => setSchoolId(s.id)} className="flex w-full items-center justify-between gap-3 px-1 py-2 text-left hover:bg-white/5">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{s.name}</span>
                          <span className="text-xs text-white/50">
                            {s.level} · {s.place}
                          </span>
                        </span>
                        {onList.has(s.id) ? <span className="shrink-0 text-[10px] font-bold uppercase text-white/40">On your list</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/50">2. How</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CONTACT_KINDS.map((k) => (
                <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-semibold ${kind === k ? "border-[#D3B574] bg-[#D3B574] text-[#0A1628]" : "border-white/20 text-white/80 hover:border-white/50"}`}>
                  {kind === k ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
                  {CONTACT_LABEL[k]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-white/50">3. When</span>
              <input type="date" value={day} max={new Date().toLocaleDateString("en-CA")} onChange={(e) => setDay(e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white [color-scheme:dark]" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-white/50">Note (optional)</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Coach's name, what they said" className="mt-2 h-10 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-white/35" />
            </label>
          </div>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <button type="button" disabled={!schoolId || !kind || saving} onClick={() => void save()} className="mt-1 w-full rounded-lg bg-[#D3B574] py-2.5 text-sm font-bold text-[#0A1628] hover:bg-[#e2c98d] disabled:opacity-40">
            {saving ? "Saving…" : "Save"}
          </button>
        </DialogContent>
      </Dialog>
    </>
  )
}
