"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { HardLink } from "@/components/hard-link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"

const ATHLETE_UUID_PIN_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type Props = {
  fundraisingSlug: string
  /** Required to repoint this donor URL at another `athletes.id`. */
  profileId: string | null
  /** Used for parent linking (`parent_athlete_links`). */
  athleteId: string | null
  athleteDisplayLabel: string
  ncuHint: string | null
}

export function FundraisingAdminAssignmentPanel({
  fundraisingSlug,
  profileId,
  athleteId,
  athleteDisplayLabel,
  ncuHint,
}: Props) {
  const router = useRouter()

  const [attachOpen, setAttachOpen] = useState(false)
  const [athletesList, setAthletesList] = useState<{ id: string; name: string }[] | null>(null)
  const [athletesLoading, setAthletesLoading] = useState(false)
  const [attachSearch, setAttachSearch] = useState("")
  const [attachPickId, setAttachPickId] = useState("")
  const [attachPickName, setAttachPickName] = useState("")
  const [attachBusy, setAttachBusy] = useState(false)

  const [parentOpen, setParentOpen] = useState(false)
  const [parentQuery, setParentQuery] = useState("")
  const [parentResults, setParentResults] = useState<{ id: string; email?: string | null; full_name: string }[]>([])
  const [parentBusy, setParentBusy] = useState(false)
  const [selectedParent, setSelectedParent] = useState<{ id: string; email?: string | null; full_name: string } | null>(
    null,
  )
  const [linkParentSaving, setLinkParentSaving] = useState(false)

  const loadAthletesDirectory = useCallback(async () => {
    if (athletesList !== null || athletesLoading) return
    setAthletesLoading(true)
    try {
      const res = await fetch("/api/admin/athletes", { credentials: "include" })
      if (!res.ok) throw new Error(`Could not load athletes (${res.status})`)
      const data = await res.json()
      let arr: unknown[] = []
      if (Array.isArray(data)) arr = data
      else if (data && typeof data === "object") {
        const d = data as { athletes?: unknown[]; data?: unknown[] }
        if (Array.isArray(d.athletes)) arr = d.athletes
        else if (Array.isArray(d.data)) arr = d.data
      }
      const mapped = arr
        .map((raw) => {
          const a = raw as { id?: string; name?: string }
          return {
            id: typeof a.id === "string" ? a.id : "",
            name: typeof a.name === "string" ? a.name : "—",
          }
        })
        .filter((a) => a.id)
        .sort((a, b) => a.name.localeCompare(b.name))
      setAthletesList(mapped)
    } catch (e) {
      toast({
        title: "Could not load directory",
        description: e instanceof Error ? e.message : "Try again or use Athletes admin.",
        variant: "destructive",
      })
      setAthletesList(null)
    } finally {
      setAthletesLoading(false)
    }
  }, [athletesList, athletesLoading])

  const attachFiltered = useMemo(() => {
    if (!athletesList?.length) return []
    const q = attachSearch.trim().toLowerCase()
    if (q.length < 2) return []
    return athletesList.filter((a) => a.name.toLowerCase().includes(q)).slice(0, 20)
  }, [athletesList, attachSearch])

  useEffect(() => {
    if (!parentOpen) return
    const q = parentQuery.trim()
    if (q.length < 2) {
      setParentResults([])
      setParentBusy(false)
      return
    }
    const ctrl = new AbortController()
    const t = window.setTimeout(() => {
      setParentBusy(true)
      void fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}`, {
        credentials: "include",
        signal: ctrl.signal,
      })
        .then((res) => res.json() as Promise<{ users?: { id: string; email?: string | null; full_name: string }[] }>)
        .then((j) => setParentResults(Array.isArray(j.users) ? j.users.slice(0, 40) : []))
        .catch(() => {
          if (!ctrl.signal.aborted) setParentResults([])
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setParentBusy(false)
        })
    }, 320)
    return () => {
      ctrl.abort()
      window.clearTimeout(t)
    }
  }, [parentQuery, parentOpen])

  const openAttach = () => {
    setAttachSearch("")
    setAttachPickId("")
    setAttachPickName("")
    setAttachOpen(true)
    void loadAthletesDirectory()
  }

  const submitAttachAthlete = async () => {
    if (!profileId) return
    const aid = attachPickId.trim()
    if (!ATHLETE_UUID_PIN_RE.test(aid)) {
      toast({
        title: "Pick a wrestler",
        description: "Choose from search or paste a valid athletes.id UUID.",
        variant: "destructive",
      })
      return
    }
    if (athleteId && aid === athleteId) {
      toast({ title: "Already attached", description: "This page already uses that athlete record." })
      return
    }
    setAttachBusy(true)
    try {
      const res = await fetch("/api/admin/athlete-fundraising-profiles", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: profileId, athlete_id: aid }),
      })
      const j = (await res.json()) as { error?: string }
      if (!res.ok) {
        toast({
          title: "Could not attach athlete",
          description: j.error ?? res.statusText,
          variant: "destructive",
        })
        return
      }
      toast({
        title: "Athlete updated",
        description: attachPickName ? `${attachPickName} is linked to this URL.` : "Profile updated.",
      })
      setAttachOpen(false)
      router.refresh()
    } finally {
      setAttachBusy(false)
    }
  }

  const submitParentLink = async () => {
    if (!athleteId || !selectedParent) return
    setLinkParentSaving(true)
    try {
      const res = await fetch("/api/admin/parent-athlete-link", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId,
          parentUserId: selectedParent.id,
        }),
      })
      const j = (await res.json()) as { error?: string; message?: string }
      if (!res.ok) throw new Error(j.error || "Could not create link")
      toast({ title: "Parent linked", description: j.message ?? "Saved." })
      setParentOpen(false)
      setParentQuery("")
      setParentResults([])
      setSelectedParent(null)
      router.refresh()
    } catch (e) {
      toast({
        title: "Link failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLinkParentSaving(false)
    }
  }

  const openParent = () => {
    setParentQuery("")
    setParentResults([])
    setSelectedParent(null)
    setParentOpen(true)
  }

  const ncuLine = ncuHint?.trim() || "—"

  return (
    <>
      <section
        className="mb-6 mt-6 rounded-xl border border-amber-500/45 bg-amber-950/35 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:px-5 sm:py-5"
        aria-label="RecruitNC admin assignment tools"
      >
        <p className="font-[family-name:var(--font-fundraising-display)] text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200/95">
          RecruitNC admin only — not shown to the public
        </p>
        <p className="mt-2 text-sm font-semibold text-white">Wire this gift page</p>
        <p className="mt-1 text-xs leading-relaxed text-white/65">
          Page{" "}
          <HardLink href={`/fundraising/athletes/${fundraisingSlug}`} className="font-mono text-[11px] text-[#C8A94A] underline-offset-2 hover:underline">
            /fundraising/athletes/{fundraisingSlug}
          </HardLink>
          . Athlete shown: <span className="text-white/90">{athleteDisplayLabel}</span>
          {athleteId ? (
            <>
              {" "}
              (<span className="font-mono text-[10px] text-white/45">{athleteId.slice(0, 8)}…</span>)
            </>
          ) : null}
          . NCU hint: <span className="font-mono text-[11px] text-white/55">{ncuLine}</span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {profileId ? (
            <button
              type="button"
              onClick={openAttach}
              className="rounded-md border border-amber-400/50 bg-[#061224]/80 px-3 py-2 text-xs font-bold uppercase tracking-wide text-amber-100 hover:bg-[#061224] hover:border-amber-300/60"
            >
              Attach athlete
            </button>
          ) : (
            <span className="text-xs text-white/50">
              No active donor profile for this slug — open fundraising admin to create one before repointing athlete here.
            </span>
          )}
          {athleteId ? (
            <button
              type="button"
              onClick={openParent}
              className="rounded-md border border-amber-400/50 bg-[#061224]/80 px-3 py-2 text-xs font-bold uppercase tracking-wide text-amber-100 hover:bg-[#061224] hover:border-amber-300/60"
            >
              Attach parent
            </button>
          ) : (
            <span className="text-xs text-white/50">Resolve an athlete on this page before linking a parent account.</span>
          )}
        </div>
      </section>

      <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#0B2545] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Attach athlete to this URL</DialogTitle>
            <DialogDescription className="text-white/65">
              Updates <span className="font-mono text-[11px] text-white/85">athlete_fundraising_profiles.athlete_id</span> for{" "}
              <span className="font-mono text-[11px] text-[#C8A94A]">{fundraisingSlug}</span>. Another profile cannot already use
              that athlete.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 text-sm">
            <div className="rounded-md border border-white/10 bg-black/20 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">Currently</p>
              <p className="mt-1 text-white/90">{athleteDisplayLabel}</p>
              {athleteId ? <p className="font-mono text-[11px] text-white/40">{athleteId}</p> : null}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pub-admin-ath-search" className="text-white/80">
                Search wrestlers (min 2 letters)
              </Label>
              <Input
                id="pub-admin-ath-search"
                className="border-white/20 bg-[#061224] text-white placeholder:text-white/35"
                placeholder="Type name…"
                value={attachSearch}
                onChange={(e) => {
                  setAttachSearch(e.target.value)
                  setAttachPickId("")
                  setAttachPickName("")
                }}
                onFocus={() => void loadAthletesDirectory()}
                autoComplete="off"
                disabled={athletesLoading}
              />
              {athletesLoading ? (
                <p className="text-xs text-white/45">Loading directory…</p>
              ) : attachSearch.trim().length >= 2 && attachFiltered.length === 0 ? (
                <p className="text-xs text-white/45">No matches — paste UUID below.</p>
              ) : null}
              {attachFiltered.length > 0 ? (
                <ul className="max-h-44 overflow-auto rounded-md border border-white/10 bg-black/25 text-sm">
                  {attachFiltered.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        className="hover:bg-white/10 w-full px-3 py-2 text-left text-white"
                        onClick={() => {
                          setAttachPickId(a.id)
                          setAttachPickName(a.name)
                          setAttachSearch("")
                        }}
                      >
                        <span className="font-medium">{a.name}</span>
                        <span className="text-white/40 ml-2 font-mono text-[10px]">{a.id.slice(0, 8)}…</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pub-admin-ath-id" className="text-white/80">
                Athletes.id UUID
              </Label>
              <Input
                id="pub-admin-ath-id"
                className="border-white/20 bg-[#061224] font-mono text-xs text-white placeholder:text-white/35"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={attachPickId}
                onChange={(e) => {
                  setAttachPickId(e.target.value)
                  setAttachPickName("")
                }}
                autoComplete="off"
              />
              {attachPickName ? <p className="text-xs text-white/50">Selected: {attachPickName}</p> : null}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="secondary" onClick={() => setAttachOpen(false)} disabled={attachBusy}>
              Cancel
            </Button>
            <Button type="button" className="bg-[#C8A94A] text-[#061224] hover:bg-[#d4b75c]" onClick={() => void submitAttachAthlete()} disabled={attachBusy}>
              {attachBusy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={parentOpen}
        onOpenChange={(o) => {
          setParentOpen(o)
          if (!o) {
            setParentQuery("")
            setParentResults([])
            setSelectedParent(null)
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#0B2545] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Attach parent account</DialogTitle>
            <DialogDescription className="text-white/65">
              Search by email or name, select an account, then create{" "}
              <span className="font-mono text-[11px]">parent_athlete_links</span> for{" "}
              <span className="text-white/90">{athleteDisplayLabel}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="rounded-md border border-white/10 bg-black/20 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">Athlete id</p>
              <p className="font-mono text-[11px] text-white/75">{athleteId}</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pub-admin-parent-q" className="text-white/80">
                Search parent accounts
              </Label>
              <Input
                id="pub-admin-parent-q"
                className="border-white/20 bg-[#061224] text-white placeholder:text-white/35"
                placeholder="Email or name fragment…"
                value={parentQuery}
                onChange={(e) => {
                  setParentQuery(e.target.value)
                  setSelectedParent(null)
                }}
                autoComplete="off"
              />
            </div>
            {parentBusy ? (
              <p className="text-xs text-white/45">Searching…</p>
            ) : parentResults.length > 0 ? (
              <div className="max-h-[220px] overflow-y-auto rounded-md border border-white/10">
                <ul className="divide-y divide-white/10">
                  {parentResults.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition-colors ${
                          selectedParent?.id === u.id ? "bg-white/10" : "hover:bg-white/5"
                        }`}
                        onClick={() => setSelectedParent(u)}
                      >
                        <span className="font-medium text-white">{u.full_name}</span>
                        <span className="break-all text-xs text-white/55">{u.email ?? "—"}</span>
                        <span className="font-mono text-[10px] text-white/35">{u.id}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : parentQuery.trim().length >= 2 ? (
              <p className="text-xs text-white/45">No matches.</p>
            ) : null}
            {selectedParent ? (
              <div className="rounded-md border border-emerald-500/35 bg-emerald-950/40 px-3 py-2">
                <p className="text-xs font-semibold text-emerald-200">Selected</p>
                <p className="mt-1 text-white">{selectedParent.full_name}</p>
                <p className="break-all text-xs text-white/55">{selectedParent.email ?? "—"}</p>
              </div>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="secondary" onClick={() => setParentOpen(false)} disabled={linkParentSaving}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#C8A94A] text-[#061224] hover:bg-[#d4b75c]"
              onClick={() => void submitParentLink()}
              disabled={linkParentSaving || !selectedParent}
            >
              {linkParentSaving ? "Saving…" : "Create link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
