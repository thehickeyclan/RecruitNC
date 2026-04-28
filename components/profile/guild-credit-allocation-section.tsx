"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Building2, Loader2, RefreshCw } from "lucide-react"
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
  if (status === "guild_applied") return <Badge className="bg-[#0f5132]">Applied in Guild</Badge>
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>
  return <Badge variant="outline">Pending</Badge>
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
    <Card className="border-[#003366]/10 shadow-md shadow-[#003366]/5 overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-[#0f5132] via-[#03154C] to-[#CBAF5D]" aria-hidden />
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-[#03154C] text-lg">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0f5132] text-white">
            <Building2 className="h-4 w-4" />
          </span>
          Guild credits (from fundraising)
        </CardTitle>
        <CardDescription className="text-slate-600 text-sm leading-snug">
          Move part of your athlete&apos;s <strong className="font-medium text-slate-800">net fundraising balance</strong>{" "}
          into the Guild wallet for private lessons and small groups. This is an internal allocation—the bank balance
          doesn&apos;t move—but your RecruitNC notional balance goes down and Guild credits go up. Staff must link your
          Guild account first. Amounts below use the <strong className="font-medium text-slate-800">same numbers</strong>{" "}
          as the Spartan card above, minus anything already reserved for Guild.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
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

        {busy ? (
          <p className="text-sm text-slate-500 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-[#003366]" />
            Loading…
          </p>
        ) : !guildParentUserId ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-3 text-sm text-amber-950">
            Your RecruitNC account is not linked to a Guild parent profile yet. Contact NC United staff so they can set
            your Guild user ID—then you can allocate credits here.
          </div>
        ) : !grantConfigured ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            Guild grant integration is not enabled on this environment yet. (Admins: set{" "}
            <span className="font-mono text-xs">GUILD_API_BASE_URL</span> and{" "}
            <span className="font-mono text-xs">GUILD_API_SECRET</span>, or{" "}
            <span className="font-mono text-xs">GUILD_CREDIT_GRANT_STUB=1</span> for testing.)
          </div>
        ) : spartanAthletes.length === 0 ? (
          <p className="text-sm text-slate-600">Link athletes under Family &amp; athletes to see balances.</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 max-w-lg">
            <div className="rounded-lg border border-[#003366]/10 bg-slate-50/80 px-3 py-2 text-xs text-slate-600 space-y-1">
              {allocatable.map((a) => (
                <div key={a.athleteId} className="flex flex-wrap justify-between gap-1">
                  <span className="font-medium text-slate-800">{a.name}</span>
                  <span>
                    Available to allocate:{" "}
                    <strong className="text-[#0f5132] tabular-nums">{formatUsd(a.allocatableToGuildCents)}</strong>
                    {a.reservedToGuildCents > 0 ? (
                      <span className="text-slate-500"> ({formatUsd(a.reservedToGuildCents)} already reserved)</span>
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
                      {a.name} — {formatUsd(a.allocatableToGuildCents)} allocatable
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
          <div className="border-t border-[#003366]/10 pt-4">
            <h3 className="text-sm font-semibold text-[#03154C] mb-2">Recent allocations</h3>
            <ul className="space-y-2">
              {allocations.slice(0, 15).map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#003366]/8 bg-white/90 px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium tabular-nums">{formatUsd(r.amount_cents)}</span>
                    <span className="text-slate-500 text-xs ml-2">
                      {new Date(r.created_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                    </span>
                    {statusBadge(r.status)}
                  </div>
                  {r.status === "failed" && r.error_message ? (
                    <p className="text-xs text-red-700 w-full">{r.error_message}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
