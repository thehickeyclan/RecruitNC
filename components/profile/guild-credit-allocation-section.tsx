"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Building2, ChevronDown, History, Loader2, RefreshCw } from "lucide-react"
import type { GuildCreditAllocationRow } from "@/lib/guild-credit-allocations"
import { allocatableToGuildFromNet } from "@/lib/guild-credit-allocations"

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
    return (
      <Badge className="bg-emerald-700 text-[10px] font-medium hover:bg-emerald-700">Applied</Badge>
    )
  if (status === "failed") return <Badge variant="destructive" className="text-[10px] font-medium">Failed</Badge>
  return (
    <Badge variant="outline" className="text-[10px] font-medium border-slate-200 text-slate-600">
      Pending
    </Badge>
  )
}

type Props = {
  /** Same athletes + nets as the Spartan card (single source of truth). */
  spartanAthletes: GuildSectionSpartanAthlete[]
  spartanLoading: boolean
  /** After allocate or Guild refresh, refetch Spartan totals so Remaining/Spent match reserved amounts. */
  onSpartanTotalsRefresh?: () => void | Promise<void>
}

export function GuildCreditAllocationSection({ spartanAthletes, spartanLoading, onSpartanTotalsRefresh }: Props) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [guildParentUserId, setGuildParentUserId] = useState<string | null>(null)
  const [grantConfigured, setGrantConfigured] = useState(false)
  const [reservedByAthlete, setReservedByAthlete] = useState<Record<string, number>>({})
  const [allocations, setAllocations] = useState<GuildCreditAllocationRow[]>([])
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
      setGrantConfigured(Boolean((data as { guildGrantConfigured?: boolean }).guildGrantConfigured))
      setReservedByAthlete((data as { reservedByAthlete?: Record<string, number> }).reservedByAthlete ?? {})
      setAllocations((data as { allocations?: GuildCreditAllocationRow[] }).allocations ?? [])
    } catch (e) {
      console.error("[RecruitNC] guild credits load", e)
      toast({
        title: "Could not load Guild credits",
        description: e instanceof Error ? e.message : "Try again later.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

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
      toast({ title: "Choose an athlete and amount", variant: "destructive" })
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
      toast({ title: "Credits sent to Guild", description: "Your Guild wallet balance should update shortly." })
      setAmount("")
      await load()
      await onSpartanTotalsRefresh?.()
    } catch (err) {
      toast({
        title: "Could not allocate",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const selected = allocatable.find((a) => a.athleteId === athleteId)
  const busy = loading || spartanLoading

  return (
    <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden">
      <div className="border-b border-slate-100 bg-gradient-to-br from-emerald-50/40 via-white to-slate-50/30 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-sm">
              <Building2 className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl text-balance">
                Guild credits
              </CardTitle>
              <CardDescription className="text-sm text-slate-600 leading-relaxed max-w-prose">
                Move part of your athlete&apos;s <span className="font-medium text-slate-800">available fundraising</span>{" "}
                balance into the Guild wallet for lessons and small groups. Your{" "}
                <span className="font-medium text-slate-800">Available</span> amount above updates when you allocate.
                Staff links your Guild account first.
              </CardDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            className="shrink-0 rounded-xl border-slate-200"
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
      </div>
      <CardContent className="space-y-4 px-4 py-5 sm:px-6 sm:py-6">

        {busy ? (
          <p className="text-sm text-slate-500 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-[#003366]" />
            Loading…
          </p>
        ) : !guildParentUserId ? (
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-4 text-sm text-amber-950 leading-relaxed">
            Your account isn&apos;t linked to Guild yet. Contact NC United staff — once they connect it, you can move
            credits here.
          </div>
        ) : !grantConfigured ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-700 leading-relaxed">
            Transfers to Guild aren&apos;t available in this app build yet. If you expected to see this, contact NC United
            staff — they can confirm when it&apos;s turned on.
          </div>
        ) : spartanAthletes.length === 0 ? (
          <p className="text-sm text-slate-600">Link athletes under Family &amp; athletes to see balances.</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 max-w-lg">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 px-3 py-3 text-sm text-slate-700 space-y-2.5 sm:px-4">
              {allocatable.map((a) => (
                <div key={a.athleteId} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                  <span className="font-medium text-slate-900">{a.name}</span>
                  <span className="text-slate-600 tabular-nums">
                    Can move: <strong className="text-emerald-800">{formatUsd(a.allocatableToGuildCents)}</strong>
                    {a.reservedToGuildCents > 0 ? (
                      <span className="block text-xs font-normal text-slate-500 sm:inline sm:ml-1">
                        ({formatUsd(a.reservedToGuildCents)} already in Guild)
                      </span>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="guild-athlete">Athlete</Label>
              <Select value={athleteId} onValueChange={setAthleteId} required>
                <SelectTrigger id="guild-athlete">
                  <SelectValue placeholder="Select athlete" />
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
              <Label htmlFor="guild-amt">Amount to move (USD)</Label>
              <Input
                id="guild-amt"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              {selected && selected.allocatableToGuildCents > 0 ? (
                <p className="text-xs text-slate-500">Max this athlete: {formatUsd(selected.allocatableToGuildCents)}</p>
              ) : null}
            </div>
            <Button
              type="submit"
              disabled={submitting || !selected || selected.allocatableToGuildCents <= 0}
              className="w-full sm:w-auto bg-[#0f5132] hover:bg-[#0a4028] text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Allocating…
                </>
              ) : (
                "Allocate to Guild credits"
              )}
            </Button>
          </form>
        )}

        {allocations.length > 0 ? (
          <Collapsible defaultOpen={false} className="border-t border-slate-100 pt-4">
            <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 rounded-xl px-2 py-2 text-left text-sm font-medium text-slate-800 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-300 data-[state=open]:bg-slate-50/80">
              <span className="flex items-center gap-2">
                <History className="h-4 w-4 text-slate-500" aria-hidden />
                Allocation history
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 tabular-nums">
                  {allocations.length}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
              <ul className="space-y-2">
                {allocations.slice(0, 15).map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-slate-100 bg-white px-3 py-3 text-sm shadow-[inset_0_0_0_1px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold tabular-nums text-slate-900">{formatUsd(r.amount_cents)}</span>
                      <span className="text-xs text-slate-500">
                        {new Date(r.created_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                      </span>
                      {statusBadge(r.status)}
                    </div>
                    {r.status === "failed" && r.error_message ? (
                      <p className="mt-2 text-xs text-red-700 leading-snug">{r.error_message}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </CardContent>
    </Card>
  )
}
