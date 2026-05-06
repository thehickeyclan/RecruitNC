"use client"

import { useEffect, useState } from "react"
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
import { cn } from "@/lib/utils"

export type FundraisingParentLinkPayload = {
  athleteId: string
  displayName: string
  athleteCode: string
  fundraisingSlug?: string | null
}

type Props = {
  payload: FundraisingParentLinkPayload | null
  variant: "admin" | "fundraising"
  onClose: () => void
  /** Runs immediately after successful API (e.g. optimistic parent coverage row). */
  afterLinked?: (ctx: FundraisingParentLinkPayload) => void
  onRefresh?: () => void | Promise<void>
}

export function LinkParentToAthleteDialog({
  payload,
  variant,
  onClose,
  afterLinked,
  onRefresh,
}: Props) {
  const open = payload !== null
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<{ id: string; email?: string | null; full_name: string }[]>([])
  const [searchBusy, setSearchBusy] = useState(false)
  const [selected, setSelected] = useState<{ id: string; email?: string | null; full_name: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const isFund = variant === "fundraising"

  useEffect(() => {
    if (!open) {
      setQuery("")
      setResults([])
      setSelected(null)
      setSaving(false)
    }
  }, [open, payload?.athleteId])

  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setSearchBusy(false)
      return
    }
    const ctrl = new AbortController()
    const t = window.setTimeout(() => {
      setSearchBusy(true)
      void fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}`, {
        credentials: "include",
        signal: ctrl.signal,
      })
        .then((res) => res.json() as Promise<{ users?: { id: string; email?: string | null; full_name: string }[] }>)
        .then((j) => setResults(Array.isArray(j.users) ? j.users.slice(0, 40) : []))
        .catch(() => {
          if (!ctrl.signal.aborted) setResults([])
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setSearchBusy(false)
        })
    }, 320)
    return () => {
      ctrl.abort()
      window.clearTimeout(t)
    }
  }, [query, open])

  const submit = async () => {
    if (!payload?.athleteId || !selected) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/parent-athlete-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          athleteId: payload.athleteId,
          parentUserId: selected.id,
        }),
      })
      const j = (await res.json()) as { error?: string; message?: string }
      if (!res.ok) throw new Error(j.error || "Could not create link")

      afterLinked?.(payload)
      toast({ title: "Parent linked", description: j.message ?? "Saved." })
      onClose()
      await onRefresh?.()
    } catch (e) {
      toast({
        title: "Link failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const slug = payload?.fundraisingSlug?.trim()

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
          <DialogTitle className={cn("leading-snug", isFund ? "text-white" : "")}>Link parent to wrestler</DialogTitle>
          <DialogDescription className={cn("leading-snug", isFund ? "text-white/65" : "")}>
            Search, select an account, then <strong className={isFund ? "text-white" : "text-foreground"}>Create link</strong>
            {" — "}
            <code className={cn("rounded px-1 text-[11px]", isFund ? "bg-black/30" : "bg-muted")}>parent_athlete_links</code>
            {slug ? (
              <>
                {" · Donor page: "}
                <HardLink href={`/fundraising/athletes/${slug}`} className="text-primary underline-offset-4 hover:underline">
                  /fundraising/athletes/{slug}
                </HardLink>
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        {payload ? (
          <div className="space-y-4 text-sm">
            <div
              className={cn(
                "rounded-md border px-3 py-2 leading-relaxed",
                isFund ? "border-white/10 bg-black/20" : "border bg-muted/35",
              )}
            >
              <p className={cn("font-medium", isFund ? "text-white/90" : "text-foreground")}>{payload.displayName}</p>
              <p className={cn("mt-1 font-mono text-xs", isFund ? "text-white/50" : "text-muted-foreground")}>
                {payload.athleteCode}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wiring-parent-q" className={isFund ? "text-white/80" : ""}>
                Search parent accounts
              </Label>
              <Input
                id="wiring-parent-q"
                placeholder="Email or name…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSelected(null)
                }}
                autoComplete="off"
                className={
                  isFund ? "border-white/20 bg-[#061224] text-white placeholder:text-white/35" : ""
                }
              />
              {!isFund ? (
                <p className="text-muted-foreground text-xs leading-snug">
                  Matches login email and profile name — click a row to select.
                </p>
              ) : null}
            </div>
            {searchBusy ? (
              <p className={cn("text-xs", isFund ? "text-white/45" : "text-muted-foreground")}>Searching…</p>
            ) : results.length > 0 ? (
              <div className={cn("max-h-[220px] overflow-y-auto rounded-md border", isFund ? "border-white/10" : "")}>
                <ul className={cn("divide-y", isFund ? "divide-white/10" : "divide-border")}>
                  {results.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition-colors",
                          selected?.id === u.id
                            ? isFund
                              ? "bg-white/10"
                              : "bg-muted"
                            : isFund
                              ? "hover:bg-white/5"
                              : "hover:bg-muted/60",
                        )}
                        onClick={() => setSelected(u)}
                      >
                        <span className={cn("font-medium", isFund ? "text-white" : "")}>{u.full_name}</span>
                        <span className={cn("break-all text-xs", isFund ? "text-white/55" : "text-muted-foreground")}>
                          {u.email ?? "—"}
                        </span>
                        <span className={cn("font-mono text-[10px]", isFund ? "text-white/35" : "text-muted-foreground")}>
                          {u.id}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : query.trim().length >= 2 ? (
              <p className={cn("text-xs", isFund ? "text-white/45" : "text-muted-foreground")}>No matches.</p>
            ) : null}
            {selected ? (
              <div
                className={cn(
                  "rounded-md border px-3 py-2 text-sm",
                  isFund
                    ? "border-emerald-500/35 bg-emerald-950/40"
                    : "border-emerald-600/40 bg-emerald-50/50 dark:bg-emerald-950/30",
                )}
              >
                <p
                  className={cn(
                    "font-medium",
                    isFund ? "text-emerald-200 text-xs" : "text-emerald-950 dark:text-emerald-50",
                  )}
                >
                  Selected
                </p>
                <p className={cn("mt-1", isFund ? "text-white" : "")}>{selected.full_name}</p>
                <p className={cn("break-all text-xs", isFund ? "text-white/55" : "text-muted-foreground")}>
                  {selected.email ?? "—"}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            className={isFund ? "bg-[#C8A94A] text-[#061224] hover:bg-[#d4b75c]" : ""}
            onClick={() => void submit()}
            disabled={saving || !payload?.athleteId || !selected}
          >
            {saving ? "Saving…" : "Create link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
