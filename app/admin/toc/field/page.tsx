"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HardLink } from "@/components/hard-link"
import { ArrowLeft, Download, ExternalLink, Loader2, Lock, RefreshCw, Unlock } from "lucide-react"
import { TOC_MAX_CONFIRMED_PER_WEIGHT } from "@/lib/toc/invitations"
import type { TocFieldBoard, TocFieldAthlete, TocWeightBoard } from "@/lib/toc/field-board"
import {
  buildTocAllWeightsRosterCsv,
  buildTocSeedChartText,
  buildTocWeightRosterCsv,
} from "@/lib/toc/bracket-export"

function statusVariant(status: TocFieldAthlete["status"]) {
  if (status === "confirmed") return "default" as const
  if (status === "invited") return "secondary" as const
  return "outline" as const
}

function downloadText(filename: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function WeightBoardCard({
  board,
  onSeedChange,
  seedSavingId,
  bracketStatus,
  onLockDraw,
  onUnlockDraw,
  bracketBusy,
}: {
  board: TocWeightBoard
  onSeedChange: (invitationId: string, seed: number | null) => Promise<void>
  seedSavingId: string | null
  bracketStatus?: {
    locked: boolean
    readyToLock: boolean
    lockError: string | null
    canViewLive?: boolean
    confirmedCount?: number
    isComplete?: boolean
  }
  onLockDraw: (weightClass: number) => Promise<void>
  onUnlockDraw: (weightClass: number) => Promise<void>
  bracketBusy: boolean
}) {
  const [showChart, setShowChart] = useState(false)
  const seedChart = useMemo(() => buildTocSeedChartText(board), [board])

  const exportCsv = () => {
    downloadText(`toc-${board.weightClass}-roster.csv`, buildTocWeightRosterCsv(board), "text/csv;charset=utf-8")
  }

  return (
    <Card className="border-t-4 border-t-[#CC0000]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{board.weightClass} lbs</CardTitle>
            <CardDescription>
              {board.confirmedCount}/{board.maxSlots} confirmed
              {board.invitedCount > 0 ? ` · ${board.invitedCount} pending invite` : ""}
              {board.openConfirmedSlots > 0 ? ` · ${board.openConfirmedSlots} open` : " · full"}
            </CardDescription>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={exportCsv} title="Export CSV">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {board.athletes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No invites yet</p>
        ) : (
          <ul className="space-y-2">
            {board.athletes.map((a) => (
              <li key={a.invitationId} className="flex items-center gap-2 text-sm border rounded-md px-2 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{a.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.school ?? "—"}</p>
                </div>
                <Badge variant={statusVariant(a.status)} className="shrink-0 text-[10px] uppercase">
                  {a.status}
                </Badge>
                {a.status === "confirmed" ? (
                  <Select
                    value={a.seed != null ? String(a.seed) : "none"}
                    onValueChange={(v) => void onSeedChange(a.invitationId, v === "none" ? null : Number(v))}
                    disabled={seedSavingId === a.invitationId}
                  >
                    <SelectTrigger className="h-8 w-[72px] text-xs">
                      <SelectValue placeholder="Seed" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {Array.from({ length: TOC_MAX_CONFIRMED_PER_WEIGHT }, (_, i) => i + 1).map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          #{n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {seedChart ? (
          <div className="pt-2">
            <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => setShowChart((v) => !v)}>
              {showChart ? "Hide" : "Show"} seed chart / R1 pairings
            </Button>
            {showChart ? (
              <pre className="mt-2 text-[11px] leading-relaxed bg-muted/50 rounded-md p-2 whitespace-pre-wrap font-sans">
                {seedChart}
              </pre>
            ) : null}
          </div>
        ) : null}

        <div className="pt-3 border-t space-y-2">
          {bracketStatus?.locked ? (
            <>
              <Badge className="bg-[#002147]">Draw published</Badge>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" asChild>
                  <HardLink href={`/tournament-of-champions/brackets/${board.weightClass}`}>
                    View bracket
                  </HardLink>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={bracketBusy}
                  onClick={() => void onUnlockDraw(board.weightClass)}
                >
                  <Unlock className="h-3.5 w-3.5 mr-1" />
                  Unlock
                </Button>
              </div>
            </>
          ) : (
            <>
              {bracketStatus?.canViewLive ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <HardLink href={`/tournament-of-champions/brackets/${board.weightClass}`}>
                      View live bracket
                    </HardLink>
                  </Button>
                  {bracketStatus.confirmedCount != null && bracketStatus.isComplete === false ? (
                    <Badge variant="secondary" className="text-[10px]">
                      {bracketStatus.confirmedCount}/{TOC_MAX_CONFIRMED_PER_WEIGHT} · building
                    </Badge>
                  ) : null}
                </div>
              ) : null}
              {bracketStatus?.lockError ? (
                <p className="text-[11px] text-muted-foreground leading-relaxed">{bracketStatus.lockError}</p>
              ) : null}
              <Button
                type="button"
                size="sm"
                className="bg-[#CC0000] hover:bg-[#a80000]"
                disabled={!bracketStatus?.readyToLock || bracketBusy}
                onClick={() => void onLockDraw(board.weightClass)}
              >
                <Lock className="h-3.5 w-3.5 mr-1" />
                Lock official draw
              </Button>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Bracket shows live as soon as one wrestler is confirmed with a seed. Lock when the field is final.
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function TocFieldAdminPage() {
  const [board, setBoard] = useState<TocFieldBoard | null>(null)
  const [bracketsUrl, setBracketsUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [seedSavingId, setSeedSavingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "active">("active")
  const [bracketStatuses, setBracketStatuses] = useState<
    Record<
      number,
      {
        locked: boolean
        readyToLock: boolean
        lockError: string | null
        canViewLive?: boolean
        confirmedCount?: number
        isComplete?: boolean
      }
    >
  >({})
  const [bracketBusyWeight, setBracketBusyWeight] = useState<number | null>(null)

  const loadBracketStatuses = useCallback(async () => {
    const res = await fetch("/api/admin/toc/brackets")
    const data = await res.json()
    if (!res.ok) return
    const map: Record<
      number,
      {
        locked: boolean
        readyToLock: boolean
        lockError: string | null
        canViewLive?: boolean
        confirmedCount?: number
        isComplete?: boolean
      }
    > = {}
    for (const s of data.statuses ?? []) {
      map[s.weightClass as number] = {
        locked: Boolean(s.locked),
        readyToLock: Boolean(s.readyToLock),
        lockError: s.lockError ?? null,
        canViewLive: Boolean(s.canViewLive),
        confirmedCount: typeof s.confirmedCount === "number" ? s.confirmedCount : undefined,
        isComplete: typeof s.isComplete === "boolean" ? s.isComplete : undefined,
      }
    }
    setBracketStatuses(map)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/toc/field")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load")
      setBoard(data.board)
      setBracketsUrl(data.bracketsUrl ?? null)
      await loadBracketStatuses()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [loadBracketStatuses])

  useEffect(() => {
    void load()
  }, [load])

  const updateSeed = async (invitationId: string, seed: number | null) => {
    setSeedSavingId(invitationId)
    try {
      const res = await fetch(`/api/admin/toc/invitations/${invitationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update seed")
      void load()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update seed")
    } finally {
      setSeedSavingId(null)
    }
  }

  const visibleWeights = useMemo(() => {
    if (!board) return []
    if (filter === "all") return board.weights
    return board.weights.filter((w) => w.athletes.length > 0)
  }, [board, filter])

  const exportAllCsv = () => {
    if (!board) return
    downloadText(
      "toc-field-roster.csv",
      buildTocAllWeightsRosterCsv(board.weights),
      "text/csv;charset=utf-8",
    )
  }

  const lockDraw = async (weightClass: number) => {
    setBracketBusyWeight(weightClass)
    try {
      const res = await fetch(`/api/admin/toc/brackets/${weightClass}`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to publish draw")
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to publish draw")
    } finally {
      setBracketBusyWeight(null)
    }
  }

  const unlockDraw = async (weightClass: number) => {
    if (!confirm(`Unlock ${weightClass} lbs? Public bracket page will go offline until you publish again.`)) return
    setBracketBusyWeight(weightClass)
    try {
      const res = await fetch(`/api/admin/toc/brackets/${weightClass}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to unlock")
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to unlock")
    } finally {
      setBracketBusyWeight(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/toc">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Field by weight</h1>
            <p className="text-sm text-muted-foreground">
              Admin-only roster. Seed 1–8, publish official draws to{" "}
              <HardLink href="/tournament-of-champions/brackets" className="text-[#B31B1B] hover:underline">
                public brackets
              </HardLink>
              .
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportAllCsv} disabled={!board}>
            <Download className="h-4 w-4 mr-2" />
            Export all CSV
          </Button>
          <Button variant="outline" size="sm" asChild>
            <HardLink href="/admin/toc/invitations">Send invites</HardLink>
          </Button>
        </div>
      </div>

      {board ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-[#002147]">{board.summary.totalConfirmed}</p>
              <p className="text-xs text-muted-foreground">Confirmed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-[#002147]">{board.summary.totalInvited}</p>
              <p className="text-xs text-muted-foreground">Invited (pending)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-[#002147]">{board.summary.fullBrackets}</p>
              <p className="text-xs text-muted-foreground">Brackets full (8/8)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-[#002147]">{board.summary.partialBrackets}</p>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bracketing</CardTitle>
          <CardDescription>
            Publish draws from this page when 8 wrestlers are confirmed with seeds 1–8. Export CSV for TrackWrestling if
            you also run live scoring there.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <HardLink
            href="/tournament-of-champions/brackets"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#B31B1B] hover:underline"
          >
            Public brackets hub <ExternalLink className="h-3.5 w-3.5" />
          </HardLink>
          <a
            href="https://www.trackwrestling.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#B31B1B] hover:underline"
          >
            TrackWrestling (optional) <ExternalLink className="h-3.5 w-3.5" />
          </a>
          {bracketsUrl ? (
            <a
              href={bracketsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#B31B1B] hover:underline"
            >
              External live URL <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={filter === "active" ? "default" : "outline"}
          size="sm"
          className={filter === "active" ? "bg-[#002147]" : ""}
          onClick={() => setFilter("active")}
        >
          Weights with activity
        </Button>
        <Button
          type="button"
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          className={filter === "all" ? "bg-[#002147]" : ""}
          onClick={() => setFilter("all")}
        >
          All 11 weights
        </Button>
      </div>

      {error ? <p className="text-red-600 text-sm">{error}</p> : null}
      {loading && !board ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading field…
        </p>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleWeights.map((w) => (
          <WeightBoardCard
            key={w.weightClass}
            board={w}
            onSeedChange={updateSeed}
            seedSavingId={seedSavingId}
            bracketStatus={bracketStatuses[w.weightClass]}
            onLockDraw={lockDraw}
            onUnlockDraw={unlockDraw}
            bracketBusy={bracketBusyWeight === w.weightClass}
          />
        ))}
      </div>
    </div>
  )
}
