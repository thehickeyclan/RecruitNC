"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
import { cn } from "@/lib/utils"

const ATHLETE_UUID_PIN_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type AttachAthleteProfileShape = {
  id: string
  slug: string
  athlete_id: string
  athlete_name: string | null
}

type Props = {
  profile: AttachAthleteProfileShape | null
  variant: "admin" | "fundraising"
  onClose: () => void
  onApplied?: () => void | Promise<void>
}

export function AttachAthleteToProfileDialog({ profile, variant, onClose, onApplied }: Props) {
  const open = profile !== null
  const [athletesList, setAthletesList] = useState<{ id: string; name: string }[] | null>(null)
  const [athletesLoading, setAthletesLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [pickId, setPickId] = useState("")
  const [pickName, setPickName] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) {
      setSearch("")
      setPickId("")
      setPickName("")
      setBusy(false)
    }
  }, [open, profile?.id])

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
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      })
      setAthletesList(null)
    } finally {
      setAthletesLoading(false)
    }
  }, [athletesList, athletesLoading])

  const filtered = useMemo(() => {
    if (!athletesList?.length) return []
    const q = search.trim().toLowerCase()
    if (q.length < 2) return []
    return athletesList.filter((a) => a.name.toLowerCase().includes(q)).slice(0, 20)
  }, [athletesList, search])

  const isFund = variant === "fundraising"

  const submit = async () => {
    if (!profile) return
    const aid = pickId.trim()
    if (!ATHLETE_UUID_PIN_RE.test(aid)) {
      toast({
        title: "Pick a wrestler",
        description: "Choose from search or paste a valid athletes.id UUID.",
        variant: "destructive",
      })
      return
    }
    if (aid === profile.athlete_id) {
      toast({ title: "Already attached", description: "This donor page already uses that athlete record." })
      return
    }
    setBusy(true)
    try {
      const res = await fetch("/api/admin/athlete-fundraising-profiles", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: profile.id, athlete_id: aid }),
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
        title: "Athlete attached",
        description: pickName
          ? `${pickName} → /fundraising/athletes/${profile.slug}`
          : `Updated profile ${profile.slug}`,
      })
      onClose()
      await onApplied?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent
        className={cn(
          "max-h-[90vh] max-w-lg overflow-y-auto",
          isFund ? "border-white/10 bg-[#0B2545] text-white" : "",
        )}
      >
        <DialogHeader>
          <DialogTitle className={cn("leading-snug", isFund ? "text-white" : "")}>Attach athlete to donor profile</DialogTitle>
          <DialogDescription className={cn("leading-snug", isFund ? "text-white/65" : "")}>
            Updates{" "}
            <code className={cn("rounded px-1 text-[11px]", isFund ? "bg-black/30 text-white/85" : "bg-muted")}>
              athlete_fundraising_profiles.athlete_id
            </code>{" "}
            for slug <span className={cn("font-mono text-[11px]", isFund ? "text-[#C8A94A]" : "")}>{profile?.slug ?? ""}</span>.
            Public URL unchanged. Another profile cannot already use that athlete.
          </DialogDescription>
        </DialogHeader>
        {profile ? (
          <div className="space-y-4 text-sm">
            <div
              className={cn(
                "rounded-md border px-3 py-2 leading-relaxed",
                isFund ? "border-white/10 bg-black/20" : "border bg-muted/35",
              )}
            >
              <p className={cn("font-medium", isFund ? "text-white/45 text-[11px] uppercase tracking-wide" : "text-foreground")}>
                Currently linked
              </p>
              <p className={cn("mt-1", isFund ? "text-white/90" : "")}>{profile.athlete_name ?? "—"}</p>
              <p className={cn("font-mono text-[11px]", isFund ? "text-white/40" : "text-muted-foreground")}>
                {profile.athlete_id}
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="wiring-attach-ath-search" className={isFund ? "text-white/80" : ""}>
                Find wrestler (min 2 letters)
              </Label>
              <Input
                id="wiring-attach-ath-search"
                placeholder="Type name…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPickId("")
                  setPickName("")
                }}
                onFocus={() => void loadAthletesDirectory()}
                autoComplete="off"
                disabled={athletesLoading}
                className={
                  isFund ? "border-white/20 bg-[#061224] text-white placeholder:text-white/35" : "font-mono text-sm"
                }
              />
              {athletesLoading ? (
                <p className={cn("text-xs", isFund ? "text-white/45" : "text-muted-foreground")}>Loading directory…</p>
              ) : search.trim().length >= 2 && filtered.length === 0 ? (
                <p className={cn("text-xs", isFund ? "text-white/45" : "text-muted-foreground")}>
                  No matches — paste UUID below.
                </p>
              ) : null}
              {filtered.length > 0 ? (
                <ul
                  className={cn(
                    "max-h-44 overflow-auto rounded-md border text-sm",
                    isFund ? "border-white/10 bg-black/25" : "border bg-muted/30",
                  )}
                >
                  {filtered.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        className={cn(
                          "w-full px-3 py-2 text-left",
                          isFund ? "text-white hover:bg-white/10" : "hover:bg-muted/80",
                        )}
                        onClick={() => {
                          setPickId(a.id)
                          setPickName(a.name)
                          setSearch("")
                        }}
                      >
                        <span className={cn("font-medium", !isFund && "text-foreground")}>{a.name}</span>
                        <span className={cn("ml-2 font-mono text-[10px]", isFund ? "text-white/40" : "text-muted-foreground")}>
                          {a.id.slice(0, 8)}…
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="wiring-attach-ath-id" className={isFund ? "text-white/80" : ""}>
                Athletes.id UUID
              </Label>
              <Input
                id="wiring-attach-ath-id"
                className={cn(
                  "font-mono text-xs",
                  isFund ? "border-white/20 bg-[#061224] text-white placeholder:text-white/35" : "",
                )}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={pickId}
                onChange={(e) => {
                  setPickId(e.target.value)
                  setPickName("")
                }}
                autoComplete="off"
              />
              {pickName ? (
                <p className={cn("text-xs", isFund ? "text-white/50" : "text-muted-foreground")}>Selected: {pickName}</p>
              ) : null}
            </div>
          </div>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            className={isFund ? "bg-[#C8A94A] text-[#061224] hover:bg-[#d4b75c]" : ""}
            onClick={() => void submit()}
            disabled={busy}
          >
            {busy ? "Saving…" : "Save attachment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
