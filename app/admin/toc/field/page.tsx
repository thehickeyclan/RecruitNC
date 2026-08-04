"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HardLink } from "@/components/hard-link"
import { ArrowLeft, Download, ExternalLink, GripVertical, Loader2, Lock, RefreshCw, Sparkles, Unlock } from "lucide-react"
import { TOC_MAX_CONFIRMED_PER_WEIGHT } from "@/lib/toc/invitations"
import type { TocFieldBoard, TocFieldAthlete, TocWeightBoard } from "@/lib/toc/field-board"
import {
  buildTocAllWeightsRosterCsv,
  buildTocSeedChartText,
  buildTocWeightRosterCsv,
} from "@/lib/toc/bracket-export"

function aiSeedConfidenceClass(confidence: TocFieldAthlete["aiSeedConfidence"]) {
  if (confidence === "High") return "bg-emerald-700 text-white"
  if (confidence === "Medium") return "bg-amber-500 text-slate-950"
  if (confidence === "Low") return "bg-red-700 text-white"
  return "bg-slate-600 text-white"
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
  onSeedReorder,
  seedSavingId,
  seedSavingWeight,
  bracketStatus,
  onLockDraw,
  onUnlockDraw,
  bracketBusy,
  canManage,
}: {
  board: TocWeightBoard
  onSeedChange: (invitationId: string, seed: number | null) => Promise<void>
  onSeedReorder: (weightClass: number, invitationIds: string[]) => Promise<void>
  seedSavingId: string | null
  seedSavingWeight: number | null
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
  canManage: boolean
}) {
  const [showChart, setShowChart] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const seedChart = useMemo(() => buildTocSeedChartText(board), [board])
  const confirmedAthletes = useMemo(() => board.athletes.filter((a) => a.status === "confirmed"), [board.athletes])
  const isReordering = seedSavingWeight === board.weightClass

  const exportCsv = () => {
    downloadText(`toc-${board.weightClass}-roster.csv`, buildTocWeightRosterCsv(board), "text/csv;charset=utf-8")
  }

  const reorderConfirmed = (draggedInvitationId: string, targetInvitationId: string) => {
    if (draggedInvitationId === targetInvitationId || isReordering) return
    const fromIndex = confirmedAthletes.findIndex((a) => a.invitationId === draggedInvitationId)
    const toIndex = confirmedAthletes.findIndex((a) => a.invitationId === targetInvitationId)
    if (fromIndex < 0 || toIndex < 0) return

    const next = [...confirmedAthletes]
    const [moved] = next.splice(fromIndex, 1)
    if (!moved) return
    next.splice(toIndex, 0, moved)
    void onSeedReorder(
      board.weightClass,
      next.map((a) => a.invitationId),
    )
  }

  return (
    <Card className="border-t-4 border-t-[#CC0000] shadow-sm">
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
          <ul className="space-y-2.5">
            {board.athletes.map((a) => (
              <li
                key={a.invitationId}
                draggable={canManage && a.status === "confirmed" && !isReordering}
                onDragStart={(event) => {
                  if (!canManage || a.status !== "confirmed") return
                  setDraggingId(a.invitationId)
                  event.dataTransfer.effectAllowed = "move"
                  event.dataTransfer.setData("text/plain", a.invitationId)
                }}
                onDragOver={(event) => {
                  if (!canManage || a.status !== "confirmed" || !draggingId || draggingId === a.invitationId) return
                  event.preventDefault()
                  event.dataTransfer.dropEffect = "move"
                  setDragOverId(a.invitationId)
                }}
                onDragLeave={() => setDragOverId((id) => (id === a.invitationId ? null : id))}
                onDrop={(event) => {
                  event.preventDefault()
                  const draggedInvitationId = event.dataTransfer.getData("text/plain") || draggingId
                  setDraggingId(null)
                  setDragOverId(null)
                  if (draggedInvitationId) reorderConfirmed(draggedInvitationId, a.invitationId)
                }}
                onDragEnd={() => {
                  setDraggingId(null)
                  setDragOverId(null)
                }}
                className={`rounded-xl border bg-white px-3 py-3 text-sm transition-colors ${
                  canManage && a.status === "confirmed" ? "cursor-move" : ""
                } ${
                  dragOverId === a.invitationId
                    ? "border-[#CC0000] bg-[#CC0000]/10"
                    : draggingId === a.invitationId
                      ? "border-[#002147]/50 bg-[#002147]/5 opacity-70"
                      : ""
                }`}
                title={canManage && a.status === "confirmed" ? "Drag to change official seed order" : undefined}
              >
                <div className="flex items-start gap-3">
                  {a.status === "confirmed" ? (
                    <GripVertical className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-xs font-black tabular-nums ${
                          a.seed ? "bg-[#002147] text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {a.seed ? `#${a.seed}` : "—"}
                      </span>
                      <div
                        className="group/ai relative min-w-[11rem] flex-1 outline-none"
                        tabIndex={a.aiSeed ? 0 : -1}
                        aria-label={a.aiSeed ? `${a.name}: hover or focus to view AI seed recommendation` : undefined}
                      >
                        <p className="break-words font-semibold leading-tight text-slate-950">{a.name}</p>
                        <p className="mt-0.5 break-words text-xs leading-tight text-muted-foreground">{a.school ?? "—"}</p>
                        {a.aiSeed ? (
                          <div className="pointer-events-none invisible absolute left-0 top-full z-30 mt-2 w-80 max-w-[calc(100vw-3rem)] translate-y-1 rounded-lg border bg-popover p-3 text-xs opacity-0 shadow-xl transition group-hover/ai:pointer-events-auto group-hover/ai:visible group-hover/ai:translate-y-0 group-hover/ai:opacity-100 group-focus-within/ai:pointer-events-auto group-focus-within/ai:visible group-focus-within/ai:translate-y-0 group-focus-within/ai:opacity-100">
                            <Badge className={`${aiSeedConfidenceClass(a.aiSeedConfidence)} gap-1 text-xs`}>
                              <Sparkles className="h-3 w-3" />
                              AI recommends #{a.aiSeed}
                            </Badge>
                            <p className="mt-2 font-semibold text-popover-foreground">
                              Score {a.aiSeedScore ?? "—"} · {a.aiSeedConfidence ?? "Unknown"} confidence
                            </p>
                            {a.aiSeedReasons?.length ? (
                              <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
                                {a.aiSeedReasons.map((reason) => (
                                  <li key={reason}>{reason}</li>
                                ))}
                              </ul>
                            ) : null}
                            {a.aiSeedWarnings?.length ? (
                              <div className="mt-2 rounded-md bg-amber-50 p-2 text-amber-900">
                                {a.aiSeedWarnings.join(" · ")}
                              </div>
                            ) : null}
                            {canManage && a.seed !== a.aiSeed ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-3 h-7 border-[#B31B1B]/30 px-2 text-xs font-semibold text-[#B31B1B]"
                                disabled={seedSavingId === a.invitationId}
                                onClick={() => void onSeedChange(a.invitationId, a.aiSeed ?? null)}
                              >
                                Use AI recommendation
                              </Button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {canManage && a.status === "confirmed" ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Select
                          value={a.seed != null ? String(a.seed) : "none"}
                          onValueChange={(v) => void onSeedChange(a.invitationId, v === "none" ? null : Number(v))}
                          disabled={seedSavingId === a.invitationId || isReordering}
                        >
                          <SelectTrigger className="h-8 w-[8.5rem] text-xs font-semibold">
                            <SelectValue placeholder="Official seed" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No official seed</SelectItem>
                            {Array.from({ length: TOC_MAX_CONFIRMED_PER_WEIGHT }, (_, i) => i + 1).map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                Official #{n}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <Badge variant="secondary" className="mt-2 text-[10px] uppercase">
                        {a.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {canManage && confirmedAthletes.length > 1 ? (
          <p className="text-[11px] text-muted-foreground">
            Drag confirmed wrestlers to reorder seeds. Top confirmed row becomes #1; the bracket updates after save.
          </p>
        ) : null}

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
                {canManage ? (
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
                ) : null}
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
              {canManage ? (
                <>
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
              ) : null}
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
  const [canManage, setCanManage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [seedSavingId, setSeedSavingId] = useState<string | null>(null)
  const [seedSavingWeight, setSeedSavingWeight] = useState<number | null>(null)
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
      setCanManage(data.canManage === true)
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

  const reorderSeeds = async (weightClass: number, invitationIds: string[]) => {
    setSeedSavingWeight(weightClass)
    try {
      const res = await fetch("/api/admin/toc/field/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightClass, invitationIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to reorder seeds")
      void load()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to reorder seeds")
    } finally {
      setSeedSavingWeight(null)
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
    <div className="mx-auto max-w-[96rem] space-y-6">
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
              {canManage ? "Private roster. Seed 1–8 and publish official draws to " : "Private TOC field and bracket access. View official draws at "}
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
          {canManage ? (
            <Button variant="outline" size="sm" asChild>
              <HardLink href="/admin/toc/invitations">Send invites</HardLink>
            </Button>
          ) : null}
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
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-[#D7B95A]/50 bg-[#D7B95A]/10 p-3 text-sm text-[#3b2b00]">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#B31B1B]" />
              <p>
                <strong>AI seed</strong> is a recommendation based on RecruitNC ranking, match history, head-to-head
                inside the field, NCHSAA results, national tournament data, NC United/NHSCA Duals records, and profile
                accolades. The manual seed selector remains the official seed.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
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
          </div>
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {visibleWeights.map((w) => (
          <WeightBoardCard
            key={w.weightClass}
            board={w}
            onSeedChange={updateSeed}
            onSeedReorder={reorderSeeds}
            seedSavingId={seedSavingId}
            seedSavingWeight={seedSavingWeight}
            bracketStatus={bracketStatuses[w.weightClass]}
            onLockDraw={lockDraw}
            onUnlockDraw={unlockDraw}
            bracketBusy={bracketBusyWeight === w.weightClass}
            canManage={canManage}
          />
        ))}
      </div>
    </div>
  )
}
