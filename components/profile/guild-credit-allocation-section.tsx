"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useToast } from "@/hooks/use-toast"
import { ChevronDown, History, Loader2, RefreshCw } from "lucide-react"
import type { GuildCreditAllocationRow } from "@/lib/guild-credit-allocations"
import { allocatableToGuildFromNet } from "@/lib/guild-credit-allocations"
import { cn } from "@/lib/utils"

export type GuildSectionSpartanAthlete = {
  athleteId: string
  name: string
  netAfterReimbursementsCents: number
  codeUnavailable?: boolean
}

type AllocatableRow = {
  athleteId: string
  name: string
  netAfterReimbursementsCents: number
  reservedToGuildCents: number
  allocatableToGuildCents: number
  codeUnavailable?: boolean
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}

function statusBadge(status: GuildCreditAllocationRow["status"]) {
  if (status === "guild_applied")
    return <Badge className="bg-emerald-700 text-[10px] font-medium hover:bg-emerald-700">Applied</Badge>
  if (status === "failed") return <Badge variant="destructive" className="text-[10px] font-medium">Failed</Badge>
  return (
    <Badge variant="outline" className="border-border text-[10px] font-medium text-muted-foreground">
      Pending
    </Badge>
  )
}

function humanizeGuildLinkFailureReason(code: string): string {
  if (code === "guild_supabase_or_grant_column_required") {
    return "Transfers ran over HTTP, but automatic re-link needs either Wrestling Guild database credentials on RecruitNC (for email match) or the SQL column guild_parent_user_id_at_grant on past transfers. Staff can set your link in admin if needed."
  }
  if (code === "no_parent_id_in_allocation_history") {
    return "We could not find a Guild parent id stored with your past transfers (empty or unfamiliar response). Staff may need to set the link once."
  }
  if (code === "ambiguous_allocation_parent_ids") {
    return "Your transfer history points to more than one Guild parent id — staff must pick the correct link."
  }
  if (code === "guild_role_verify_failed") {
    return "Found a candidate id in history, but it is not a Guild parent account on file."
  }
  if (code.startsWith("no_guild_parent_match") || code.includes("guild_lookup")) {
    return "No Wrestling Guild parent account matches this email (or Guild lookup failed)."
  }
  if (code === "ambiguous_guild_parent") {
    return "More than one Guild parent uses this email — fix duplicate Guild accounts first."
  }
  return `Automatic link did not complete (${code}).`
}

type Props = {
  spartanAthletes: GuildSectionSpartanAthlete[]
  spartanLoading: boolean
  onSpartanTotalsRefresh?: () => void | Promise<void>
}

export function GuildCreditAllocationSection({ spartanAthletes, spartanLoading, onSpartanTotalsRefresh }: Props) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [guildParentUserId, setGuildParentUserId] = useState<string | null>(null)
  const [grantConfigured, setGrantConfigured] = useState(false)
  const [reservedByAthlete, setReservedByAthlete] = useState<Record<string, number>>({})
  const [allocations, setAllocations] = useState<GuildCreditAllocationRow[]>([])
  const [guildLinkFailureReason, setGuildLinkFailureReason] = useState<string | null>(null)
  const [athleteId, setAthleteId] = useState("")
  const [amount, setAmount] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/profile/guild-credits", { cache: "no-store", credentials: "include" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || "Could not load")
      }
      setGuildParentUserId((data as { guildParentUserId?: string | null }).guildParentUserId ?? null)
      setGuildLinkFailureReason((data as { guildLinkFailureReason?: string | null }).guildLinkFailureReason ?? null)
      setGrantConfigured(Boolean((data as { guildGrantConfigured?: boolean }).guildGrantConfigured))
      setReservedByAthlete((data as { reservedByAthlete?: Record<string, number> }).reservedByAthlete ?? {})
      setAllocations((data as { allocations?: GuildCreditAllocationRow[] }).allocations ?? [])
    } catch (e) {
      console.error("[RecruitNC] guild credits load", e)
      toast({
        title: "Could not load Guild",
        description: "Try again shortly.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (!open) return
    void load()
  }, [open, load])

  const allocatable = useMemo((): AllocatableRow[] => {
    return spartanAthletes.map((row) => {
      const reserved = reservedByAthlete[row.athleteId] ?? 0
      return {
        athleteId: row.athleteId,
        name: row.name,
        netAfterReimbursementsCents: row.netAfterReimbursementsCents,
        reservedToGuildCents: reserved,
        allocatableToGuildCents: allocatableToGuildFromNet(
          row.netAfterReimbursementsCents,
          reserved,
          row.codeUnavailable,
        ),
        codeUnavailable: row.codeUnavailable,
      }
    })
  }, [spartanAthletes, reservedByAthlete])

  useEffect(() => {
    if (allocatable.length === 1 && !athleteId) {
      setAthleteId(allocatable[0].athleteId)
    }
  }, [allocatable, athleteId])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!athleteId || !amount.trim()) {
      toast({ title: "Choose athlete and amount", variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/profile/guild-credits/allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ athleteId, amountDollars: amount }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || "Allocation failed")
      }
      toast({ title: "Sent to Guild", description: "Your Guild wallet should update shortly." })
      setAmount("")
      await load()
      await onSpartanTotalsRefresh?.()
    } catch (e) {
      console.error("[RecruitNC] guild credits allocate", e)
      toast({
        title: "Transfer failed",
        description: "Try again or contact NC United.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const selected = allocatable.find((a) => a.athleteId === athleteId)

  const hasTransferHistory = allocations.length > 0
  const hasSuccessfulTransfer = allocations.some((a) => a.status === "guild_applied")

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="overflow-hidden rounded-2xl border border-border bg-card shadow-md shadow-[#003366]/5">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-[filter] hover:brightness-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#03154C]/35 focus-visible:ring-offset-2",
            "bg-gradient-to-r from-[#9a7b28] via-[#CBAF5D] to-[#e6d5a5]",
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2.5">
            <span
              role="status"
              className={cn(
                "h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/60 transition-colors",
                loading ? "animate-pulse bg-muted" : guildParentUserId ? "bg-emerald-500" : hasTransferHistory ? "bg-amber-500" : "bg-muted",
              )}
              aria-label={
                loading
                  ? "Checking Guild connection"
                  : guildParentUserId
                    ? "Guild connected"
                    : hasTransferHistory
                      ? "Guild link missing but transfer history exists"
                      : "Guild not linked yet"
              }
            />
            <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-foreground sm:text-sm">Transfer to Guild</span>
          </span>
          <ChevronDown
            className={cn("h-5 w-5 shrink-0 text-foreground transition-transform duration-200", open && "rotate-180")}
            aria-hidden
          />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="border-t border-border data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="space-y-4 px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              className="rounded-xl border-border text-foreground"
              onClick={() =>
                void (async () => {
                  await load()
                  await onSpartanTotalsRefresh?.()
                })()
              }
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Refresh</span>
            </Button>
          </div>

          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-foreground" aria-hidden />
              Loading…
            </p>
          ) : !guildParentUserId ? (
            <div className="space-y-2">
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                {hasSuccessfulTransfer || hasTransferHistory ? (
                  <>
                    RecruitNC first tries your <strong className="font-semibold">email</strong>, then{" "}
                    <strong className="font-semibold">rebuilds your Guild link from past successful transfers</strong> on
                    this login when the profile flag was cleared. Tap <strong className="font-semibold">Refresh</strong>.
                    If it still fails, your RecruitNC email may not match Guild or Guild has more than one parent on that
                    email.
                  </>
                ) : (
                  <>
                    Guild linking runs automatically when your RecruitNC email matches exactly one Wrestling Guild parent.
                    Tap <strong className="font-semibold">Refresh</strong> to retry. If this never connects, use the same
                    email in both places (or fix duplicate Guild parent rows for that email).
                  </>
                )}
              </p>
              {guildLinkFailureReason ? (
                <p className="rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground">
                  {humanizeGuildLinkFailureReason(guildLinkFailureReason)}
                </p>
              ) : null}
            </div>
          ) : !grantConfigured ? (
            <p className="rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground">
              Transfers aren&apos;t enabled yet for your account. Contact NC United if this is unexpected.
            </p>
          ) : spartanAthletes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Link wrestlers under Family & athletes first.</p>
          ) : (
            <>
              {spartanLoading ? (
                <p className="text-xs font-medium text-foreground">Updating balances…</p>
              ) : null}
              <form onSubmit={onSubmit} className="max-w-lg space-y-4">
                <div className="space-y-2 rounded-xl border border-border bg-muted px-3 py-3 text-sm sm:px-4">
                  {allocatable.map((a) => (
                    <div key={a.athleteId} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
                      <span className="font-medium text-foreground">{a.name}</span>
                      <span className="tabular-nums text-foreground">
                        Up to <strong className="text-green-300">{formatUsd(a.allocatableToGuildCents)}</strong>
                        {a.reservedToGuildCents > 0 ? (
                          <span className="block text-xs font-normal text-muted-foreground sm:ml-1 sm:inline">
                            ({formatUsd(a.reservedToGuildCents)} in Guild)
                          </span>
                        ) : null}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guild-athlete">Wrestler</Label>
                  <Select value={athleteId} onValueChange={setAthleteId} required>
                    <SelectTrigger id="guild-athlete" className="border-border">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {allocatable.map((a) => (
                        <SelectItem key={a.athleteId} value={a.athleteId} disabled={a.allocatableToGuildCents <= 0}>
                          {a.name} · up to {formatUsd(a.allocatableToGuildCents)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guild-amt">Amount (USD)</Label>
                  <Input
                    id="guild-amt"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="border-border"
                    disabled={spartanLoading}
                  />
                  {selected && selected.allocatableToGuildCents > 0 ? (
                    <p className="text-xs text-muted-foreground">Max {formatUsd(selected.allocatableToGuildCents)}</p>
                  ) : null}
                </div>
                <Button
                  type="submit"
                  disabled={
                    submitting ||
                    spartanLoading ||
                    !selected ||
                    selected.allocatableToGuildCents <= 0
                  }
                  className="w-full bg-[#13294B] text-white hover:bg-[#1e3a5f] sm:w-auto"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Confirm transfer"
                  )}
                </Button>
              </form>
            </>
          )}

          {allocations.length > 0 ? (
            <Collapsible defaultOpen={false} className="border-t border-border pt-4">
              <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 rounded-xl px-2 py-2 text-left text-sm font-semibold text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-[#003366]/25 [&[data-state=open]_svg:last-child]:rotate-180">
                <span className="flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" aria-hidden />
                  History
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                    {allocations.length}
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <ul className="space-y-2 pt-3">
                  {allocations.slice(0, 15).map((r) => (
                    <li
                      key={r.id}
                      className="rounded-xl border border-border bg-card px-3 py-3 text-sm shadow-[inset_0_0_0_1px_rgba(15,23,42,0.04)]"
                    >
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-semibold tabular-nums text-foreground">{formatUsd(r.amount_cents)}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                        </span>
                        {statusBadge(r.status)}
                      </div>
                      {r.status === "failed" && r.error_message ? (
                        <p className="mt-2 text-xs leading-snug text-red-300">{r.error_message}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
