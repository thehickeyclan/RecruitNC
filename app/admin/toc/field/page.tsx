"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HardLink } from "@/components/hard-link"
import { ArrowLeft, Check, ChevronDown, ChevronUp, Download, ExternalLink, GripVertical, Loader2, Lock, Megaphone, RefreshCw, Sparkles, Unlock } from "lucide-react"
import { TOC_MAX_CONFIRMED_PER_WEIGHT } from "@/lib/toc/invitations"
import { applyTocSeedOrder, type TocFieldBoard, type TocFieldAthlete, type TocWeightBoard } from "@/lib/toc/field-board"
import {
  buildTocAllWeightsRosterCsv,
  buildTocSeedChartText,
  buildTocWeightRosterCsv,
} from "@/lib/toc/bracket-export"
import {
  buildTocCredentialRollup,
  rankTocWeightBrackets,
  type TocCredentialRollup,
} from "@/lib/toc/credential-rollup"

function CredentialRollup({
  rollup,
  expectedAthletes,
  compact = false,
}: {
  rollup: TocCredentialRollup
  expectedAthletes: number
  compact?: boolean
}) {
  const metrics = [
    {
      label: "State champions",
      value: rollup.stateChampionAthletes,
      detail: `${rollup.stateTitles} title${rollup.stateTitles === 1 ? "" : "s"}`,
    },
    {
      label: "State placers",
      value: rollup.statePlacerAthletes,
      detail: `${rollup.statePlacements} finish${rollup.statePlacements === 1 ? "" : "es"}`,
    },
    {
      label: "All-Americans",
      value: rollup.allAmericanAthletes,
      detail: `${rollup.allAmericanFinishes} NHSCA/Fargo AA finish${rollup.allAmericanFinishes === 1 ? "" : "es"}`,
    },
    { label: "NHSCA record", value: `${rollup.nhscaWins}-${rollup.nhscaLosses}`, detail: "Combined" },
    { label: "Super 32 record", value: `${rollup.super32Wins}-${rollup.super32Losses}`, detail: "Combined" },
    { label: "Fargo FS record", value: `${rollup.fargoWins}-${rollup.fargoLosses}`, detail: "Freestyle only" },
  ]

  return (
    <div className={compact ? "rounded-lg border border-white/10 bg-[#081426] p-2.5" : "rounded-xl border border-white/10 bg-[#0B1D3A] p-4 shadow-xl shadow-black/15"}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className={`${compact ? "text-[10px]" : "text-xs"} font-bold uppercase tracking-[0.16em] text-[#D7B95A]`}>
          {compact ? "Bracket résumé" : "Field résumé snapshot"}
        </p>
        <p className="text-[10px] text-white/45">
          {rollup.athleteCount}/{expectedAthletes} confirmed profiles loaded
        </p>
      </div>
      <div className={`grid ${compact ? "grid-cols-3 gap-1.5" : "grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"}`}>
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0 rounded-md border border-white/10 bg-[#060f1f] px-2 py-2">
            <p className={`${compact ? "text-base" : "text-xl"} font-black leading-none text-white`}>{metric.value}</p>
            <p className="mt-1 text-[10px] font-semibold leading-tight text-white/70">{metric.label}</p>
            {!compact ? <p className="mt-0.5 text-[9px] leading-tight text-white/35">{metric.detail}</p> : null}
          </div>
        ))}
      </div>
    </div>
  )
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

function AthleteCredentialBadges({ athlete }: { athlete: TocFieldAthlete }) {
  const summary = athlete.seedEvidence?.summary
  if (!summary) return null

  const allAmericanFinishes = summary.nhscaAllAmericanFinishes + summary.fargoAllAmericanFinishes
  const badges = [
    summary.stateTitles > 0
      ? {
          label: "State Champ",
          title: `${summary.stateTitles} state championship${summary.stateTitles === 1 ? "" : "s"}`,
          className: "border-[#D7B95A]/55 bg-[#D7B95A] text-[#060f1f]",
        }
      : null,
    summary.statePlacements > 0
      ? {
          label: "State Placer",
          title: `${summary.statePlacements} state placement${summary.statePlacements === 1 ? "" : "s"}`,
          className: "border-sky-300/45 bg-sky-400/15 text-sky-200",
        }
      : null,
    allAmericanFinishes > 0
      ? {
          label: "All-American",
          title: `${allAmericanFinishes} NHSCA/Fargo freestyle All-American finish${allAmericanFinishes === 1 ? "" : "es"}`,
          className: "border-[#CC0000]/55 bg-[#CC0000]/20 text-red-200",
        }
      : null,
  ].filter((badge): badge is NonNullable<typeof badge> => badge !== null)

  if (badges.length === 0) return null

  return (
    <div className="mt-1.5 flex flex-wrap gap-1" aria-label={`${athlete.name} credentials`}>
      {badges.map((badge) => (
        <span
          key={badge.label}
          title={badge.title}
          className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-black uppercase leading-none tracking-[0.04em] ${badge.className}`}
        >
          {badge.label}
        </span>
      ))}
    </div>
  )
}

function WeightBoardCard({
  board,
  watchRank,
  onSeedChange,
  onSeedReorder,
  seedSavingId,
  seedSavingWeight,
  seedSavedWeight,
  bracketStatus,
  onLockDraw,
  onUnlockDraw,
  onToggleAthleteField,
  bracketBusy,
  fieldStatusBusy,
  canManage,
  canEditSeeds,
}: {
  board: TocWeightBoard
  watchRank?: number
  onSeedChange: (invitationId: string, seed: number | null) => Promise<void>
  onSeedReorder: (weightClass: number, invitationIds: string[]) => Promise<void>
  seedSavingId: string | null
  seedSavingWeight: number | null
  seedSavedWeight: number | null
  bracketStatus?: {
    locked: boolean
    readyToLock: boolean
    lockError: string | null
    canViewLive?: boolean
    confirmedCount?: number
    isComplete?: boolean
    athleteFieldLocked?: boolean
    athleteFieldLockedAt?: string | null
  }
  onLockDraw: (weightClass: number) => Promise<void>
  onUnlockDraw: (weightClass: number) => Promise<void>
  onToggleAthleteField: (weightClass: number, locked: boolean) => Promise<void>
  bracketBusy: boolean
  fieldStatusBusy: boolean
  canManage: boolean
  canEditSeeds: boolean
}) {
  const [showChart, setShowChart] = useState(false)
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const seedChart = useMemo(() => buildTocSeedChartText(board), [board])
  const confirmedAthletes = useMemo(() => board.athletes.filter((a) => a.status === "confirmed"), [board.athletes])
  const credentialRollup = useMemo(() => buildTocCredentialRollup(board.athletes), [board.athletes])
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
    <Card className="border border-white/10 border-t-4 border-t-[#CC0000] bg-[#0B1D3A] text-white shadow-xl shadow-black/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-xl font-black uppercase tracking-wide text-white">{board.weightClass} lbs</CardTitle>
              {watchRank ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-black uppercase leading-none tracking-[0.06em] ${
                    watchRank === 1
                      ? "border-[#D7B95A] bg-[#D7B95A] text-[#060f1f]"
                      : watchRank <= 3
                        ? "border-[#D7B95A]/45 bg-[#D7B95A]/10 text-[#D7B95A]"
                        : "border-white/15 bg-white/5 text-white/55"
                  }`}
                  title="Overall bracket ranking based on verified All-American, state championship, state placement, and national-event résumés"
                >
                  <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                  #{watchRank} {watchRank === 1 ? "bracket to watch" : "overall résumé"}
                </span>
              ) : null}
            </div>
            <CardDescription className="text-white/50">
              {board.confirmedCount}/{board.maxSlots} confirmed
              {board.invitedCount > 0 ? ` · ${board.invitedCount} pending invite` : ""}
              {board.openConfirmedSlots > 0 ? ` · ${board.openConfirmedSlots} open` : " · full"}
            </CardDescription>
            {isReordering ? (
              <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#D7B95A]" aria-live="polite">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving seed order…
              </p>
            ) : seedSavedWeight === board.weightClass ? (
              <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300" aria-live="polite">
                <Check className="h-3 w-3" /> Seed order saved
              </p>
            ) : null}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:bg-white/10 hover:text-white" onClick={exportCsv} title="Export CSV">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {board.confirmedCount > 0 ? (
          <CredentialRollup rollup={credentialRollup} expectedAthletes={board.confirmedCount} compact />
        ) : null}
        {board.athletes.length === 0 ? (
          <p className="py-4 text-center text-sm text-white/40">No invites yet</p>
        ) : (
          <ul className="space-y-2.5">
            {board.athletes.map((a) => (
              <li
                key={a.invitationId}
                draggable={canEditSeeds && a.status === "confirmed" && !isReordering}
                onDragStart={(event) => {
                  if (!canEditSeeds || a.status !== "confirmed") return
                  setDraggingId(a.invitationId)
                  event.dataTransfer.effectAllowed = "move"
                  event.dataTransfer.setData("text/plain", a.invitationId)
                }}
                onDragOver={(event) => {
                  if (!canEditSeeds || a.status !== "confirmed" || !draggingId || draggingId === a.invitationId) return
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
                className={`relative rounded-lg border border-white/10 bg-[#081426] px-3 py-3 text-sm transition-all duration-150 ${
                  canEditSeeds && a.status === "confirmed" ? "cursor-grab active:cursor-grabbing" : ""
                } ${
                  dragOverId === a.invitationId
                    ? "translate-y-0.5 border-[#D7B95A] bg-[#D7B95A]/10 shadow-lg shadow-black/20"
                    : draggingId === a.invitationId
                      ? "scale-[0.99] border-[#D7B95A]/40 bg-[#D7B95A]/5 opacity-55"
                      : ""
                }`}
                title={canEditSeeds && a.status === "confirmed" ? `Drag to change ${canManage ? "official" : "your private"} seed order` : undefined}
              >
                <div className="flex items-start gap-3">
                  {a.status === "confirmed" ? (
                    <GripVertical className="mt-1 h-4 w-4 shrink-0 text-white/30" aria-hidden="true" />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-xs font-black tabular-nums ${
                          a.seed ? "bg-[#CC0000] text-white" : "bg-white/10 text-white/45"
                        }`}
                      >
                        {a.seed ? `#${a.seed}` : "—"}
                      </span>
                      <div className="min-w-[11rem] flex-1">
                        <Link
                          href={`/athletes/${a.athleteId}`}
                          className="break-words font-semibold leading-tight text-white underline-offset-2 transition-colors hover:text-[#D7B95A] hover:underline"
                          title={`View ${a.name}'s profile`}
                        >
                          {a.name}
                        </Link>
                        <p className="mt-0.5 break-words text-xs leading-tight text-white/45">{a.school ?? "—"}</p>
                        <AthleteCredentialBadges athlete={a} />
                      </div>
                      {a.seedEvidence ? (
                        <button
                          type="button"
                          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#D7B95A]/35 bg-[#D7B95A]/10 px-2 py-1 text-[10px] font-semibold text-[#D7B95A] hover:bg-[#D7B95A]/20"
                          onClick={() => setExpandedEvidenceId((id) => (id === a.invitationId ? null : a.invitationId))}
                          aria-expanded={expandedEvidenceId === a.invitationId}
                        >
                          See evidence
                          {expandedEvidenceId === a.invitationId ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      ) : null}
                    </div>

                    {a.seedEvidence && expandedEvidenceId === a.invitationId ? (
                      <div className="mt-3 space-y-3 rounded-lg border border-white/10 bg-[#060f1f] p-3">
                            {a.aiSeed != null ? (
                              <div className="rounded-md border border-violet-400/25 bg-violet-400/10 p-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-violet-200">
                                      <Sparkles className="h-3 w-3" aria-hidden="true" />
                                      AI recommendation
                                    </span>
                                    <span className="rounded bg-violet-300 px-1.5 py-0.5 text-xs font-black text-[#160d2b]">
                                      #{a.aiSeed}
                                    </span>
                                    {a.aiSeedConfidence ? (
                                      <span className="text-[10px] font-semibold text-violet-100/70">
                                        {a.aiSeedConfidence} confidence
                                      </span>
                                    ) : null}
                                  </div>
                                  <span className="text-[9px] font-semibold uppercase tracking-wide text-white/35">
                                    Advisory only
                                  </span>
                                </div>

                                {a.seed == null ? (
                                  <p className="mt-2 text-[10px] font-semibold text-amber-200">No manual seed assigned yet.</p>
                                ) : a.seed !== a.aiSeed ? (
                                  <p className="mt-2 text-[10px] font-semibold text-amber-200">
                                    Review: current manual seed is #{a.seed}.
                                  </p>
                                ) : (
                                  <p className="mt-2 text-[10px] font-semibold text-emerald-200">Matches the current manual seed.</p>
                                )}

                                {a.aiSeedReasons?.length ? (
                                  <ul className="mt-2 space-y-1 text-xs leading-snug text-violet-50/80">
                                    {a.aiSeedReasons.slice(0, 3).map((reason) => (
                                      <li key={reason}>• {reason}</li>
                                    ))}
                                  </ul>
                                ) : null}

                                {a.aiSeedWarnings?.[0] ? (
                                  <p className="mt-2 border-t border-violet-200/10 pt-2 text-[10px] leading-snug text-amber-100/70">
                                    Data note: {a.aiSeedWarnings[0]}
                                  </p>
                                ) : null}
                              </div>
                            ) : null}

                            {a.seedEvidence?.headToHead.length ? (
                              <div className="rounded-md border border-emerald-400/25 bg-emerald-400/10 p-2.5">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-300">In-bracket head-to-head</p>
                                <ul className="mt-1 space-y-1 text-xs text-emerald-100">
                                  {a.seedEvidence.headToHead.map((row) => (
                                    <li key={row.opponent}>
                                      vs {row.opponent}: <strong>{row.wins}-{row.losses}</strong>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}

                            <div className="grid gap-3 sm:grid-cols-2">
                              {([
                                ["NCHSAA", a.seedEvidence?.nchsaa],
                                ["NHSCA", a.seedEvidence?.nhsca],
                                ["Super 32", a.seedEvidence?.super32],
                                ["Fargo freestyle", a.seedEvidence?.fargo],
                              ] as const).map(([label, rows]) => (
                                <div key={label}>
                                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#D7B95A]">{label}</p>
                                  {rows?.length ? (
                                    <ul className="mt-1 space-y-1 text-xs leading-snug text-white/75">
                                      {rows.map((row) => <li key={row}>{row}</li>)}
                                    </ul>
                                  ) : (
                                    <p className="mt-1 text-xs text-white/30">No result on file</p>
                                  )}
                                </div>
                              ))}
                            </div>

                      </div>
                    ) : null}

                    {canEditSeeds && a.status === "confirmed" ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Select
                          value={a.seed != null ? String(a.seed) : "none"}
                          onValueChange={(v) => void onSeedChange(a.invitationId, v === "none" ? null : Number(v))}
                          disabled={seedSavingId === a.invitationId || isReordering}
                        >
                          <SelectTrigger className="h-8 w-[8.5rem] border-white/15 bg-white/5 text-xs font-semibold text-white">
                            <SelectValue placeholder={canManage ? "Official seed" : "My seed"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{canManage ? "No official seed" : "Move to end"}</SelectItem>
                            {Array.from({ length: TOC_MAX_CONFIRMED_PER_WEIGHT }, (_, i) => i + 1).map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {canManage ? "Official" : "My seed"} #{n}
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

        {canEditSeeds && confirmedAthletes.length > 1 ? (
          <p className="text-[11px] text-white/40">
            Drag confirmed wrestlers to reorder {canManage ? "official" : "your private"} seeds. Top confirmed row becomes #1; the bracket updates after save.
          </p>
        ) : null}

        {seedChart ? (
          <div className="pt-2">
            <Button type="button" variant="link" className="h-auto p-0 text-xs text-[#D7B95A]" onClick={() => setShowChart((v) => !v)}>
              {showChart ? "Hide" : "Show"} seed chart / R1 pairings
            </Button>
            {showChart ? (
              <pre className="mt-2 whitespace-pre-wrap rounded-md border border-white/10 bg-[#060f1f] p-2 font-sans text-[11px] leading-relaxed text-white/70">
                {seedChart}
              </pre>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2 border-t border-white/10 pt-3">
          <div
            className={`rounded-lg border p-3 ${
              bracketStatus?.athleteFieldLocked
                ? "border-emerald-400/35 bg-emerald-400/10"
                : "border-amber-300/25 bg-amber-300/[0.07]"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge
                className={
                  bracketStatus?.athleteFieldLocked
                    ? "bg-emerald-500 text-[#04150d] hover:bg-emerald-500"
                    : "border border-amber-300/35 bg-amber-300/10 text-amber-100 hover:bg-amber-300/10"
                }
              >
                <Megaphone className="mr-1 h-3.5 w-3.5" />
                {bracketStatus?.athleteFieldLocked
                  ? "Athlete field locked · Ready for NC Mat"
                  : "Athlete field not locked"}
              </Badge>
              {canManage ? (
                <Button
                  type="button"
                  variant={bracketStatus?.athleteFieldLocked ? "ghost" : "outline"}
                  size="sm"
                  className={
                    bracketStatus?.athleteFieldLocked
                      ? "h-8 text-white/65 hover:bg-white/10 hover:text-white"
                      : "h-8 border-emerald-300/35 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20 hover:text-white"
                  }
                  disabled={fieldStatusBusy || board.confirmedCount < 1}
                  onClick={() => void onToggleAthleteField(board.weightClass, !bracketStatus?.athleteFieldLocked)}
                >
                  {fieldStatusBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                  {bracketStatus?.athleteFieldLocked ? "Reopen athlete field" : "Mark field ready"}
                </Button>
              ) : null}
            </div>
            <p className={`mt-2 text-[11px] leading-relaxed ${bracketStatus?.athleteFieldLocked ? "text-emerald-100/75" : "text-amber-100/60"}`}>
              {bracketStatus?.athleteFieldLocked
                ? "NC Mat may announce the athletes in this weight. Seed order remains separate and may still change."
                : "Do not announce this weight yet — athlete additions, withdrawals, or replacements may still occur."}
            </p>
          </div>

          {bracketStatus?.locked ? (
            <>
              <Badge className="bg-emerald-600 text-white">Draw published</Badge>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" asChild>
                  <HardLink href={`/tournament-of-champions/brackets/${board.weightClass}`}>
                    View bracket
                  </HardLink>
                </Button>
                {canManage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:bg-white/10 hover:text-white"
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
                  <Button type="button" variant="outline" size="sm" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" asChild>
                    <HardLink href={`/tournament-of-champions/brackets/${board.weightClass}`}>
                      View live bracket
                    </HardLink>
                  </Button>
                  {bracketStatus.confirmedCount != null && bracketStatus.isComplete === false ? (
                    <Badge variant="secondary" className="bg-white/10 text-[10px] text-white/70">
                      {bracketStatus.confirmedCount}/{TOC_MAX_CONFIRMED_PER_WEIGHT} · building
                    </Badge>
                  ) : null}
                </div>
              ) : null}
              {bracketStatus?.lockError ? (
                <p className="text-[11px] leading-relaxed text-white/40">{bracketStatus.lockError}</p>
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
                  <p className="text-[10px] leading-relaxed text-white/35">
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
  const [workspace, setWorkspace] = useState<"official" | "personal">("official")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [seedSavingId, setSeedSavingId] = useState<string | null>(null)
  const [seedSavingWeight, setSeedSavingWeight] = useState<number | null>(null)
  const [seedSavedWeight, setSeedSavedWeight] = useState<number | null>(null)
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
        athleteFieldLocked?: boolean
        athleteFieldLockedAt?: string | null
      }
    >
  >({})
  const [bracketBusyWeight, setBracketBusyWeight] = useState<number | null>(null)
  const [fieldStatusBusyWeight, setFieldStatusBusyWeight] = useState<number | null>(null)

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
        athleteFieldLocked?: boolean
        athleteFieldLockedAt?: string | null
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
        athleteFieldLocked: s.athleteFieldLocked === true,
        athleteFieldLockedAt: typeof s.athleteFieldLockedAt === "string" ? s.athleteFieldLockedAt : null,
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
      setWorkspace(data.workspace === "personal" ? "personal" : "official")
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
      let res: Response
      if (canManage) {
        res = await fetch(`/api/admin/toc/invitations/${invitationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seed }),
        })
      } else {
        const weight = board?.weights.find((entry) => entry.athletes.some((athlete) => athlete.invitationId === invitationId))
        if (!weight) throw new Error("Weight class not found")
        const order = weight.athletes.filter((athlete) => athlete.status === "confirmed").map((athlete) => athlete.invitationId)
        const currentIndex = order.indexOf(invitationId)
        if (currentIndex < 0) throw new Error("Wrestler not found")
        order.splice(currentIndex, 1)
        const targetIndex = seed == null ? order.length : Math.max(0, Math.min(order.length, seed - 1))
        order.splice(targetIndex, 0, invitationId)
        res = await fetch("/api/admin/toc/personal-seeds", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weightClass: weight.weightClass, invitationIds: order }),
        })
      }
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
    if (!board || seedSavingWeight != null) return
    const previousBoard = board
    setBoard(applyTocSeedOrder(board, weightClass, invitationIds))
    setSeedSavingWeight(weightClass)
    setSeedSavedWeight(null)
    try {
      const res = await fetch(canManage ? "/api/admin/toc/field/reorder" : "/api/admin/toc/personal-seeds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightClass, invitationIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to reorder seeds")
      setSeedSavedWeight(weightClass)
      void loadBracketStatuses()
      window.setTimeout(() => setSeedSavedWeight((saved) => (saved === weightClass ? null : saved)), 1800)
    } catch (e) {
      setBoard(previousBoard)
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
  const fieldCredentialRollup = useMemo(
    () => buildTocCredentialRollup(board?.weights.flatMap((weight) => weight.athletes) ?? []),
    [board],
  )
  const bracketWatchRanks = useMemo(() => {
    const rankings = rankTocWeightBrackets(board?.weights ?? [])
    return new Map(rankings.map((ranking) => [ranking.weightClass, ranking.rank]))
  }, [board])
  const announcementReadyCount = useMemo(
    () => Object.values(bracketStatuses).filter((status) => status.athleteFieldLocked === true).length,
    [bracketStatuses],
  )

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

  const toggleAthleteField = async (weightClass: number, locked: boolean) => {
    const prompt = locked
      ? `Mark the ${weightClass} lb athlete field final and ready for NC Mat to announce? Seeding will remain editable.`
      : `Reopen the ${weightClass} lb athlete field? NC Mat will see that announcements should pause.`
    if (!confirm(prompt)) return

    setFieldStatusBusyWeight(weightClass)
    try {
      const res = await fetch(`/api/admin/toc/field-status/${weightClass}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteFieldLocked: locked }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update athlete field status")
      await loadBracketStatuses()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update athlete field status")
    } finally {
      setFieldStatusBusyWeight(null)
    }
  }

  return (
    <div className="relative left-1/2 min-h-screen w-screen -translate-x-1/2 bg-[#060f1f] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-[96rem] space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white/60 hover:bg-white/10 hover:text-white" asChild>
            <Link href={canManage ? "/admin/toc" : "/tournament-of-champions/brackets"}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-wide text-white">Field by weight</h1>
            <p className="text-sm text-white/50">
              {canManage ? `Private roster. Seed 1–${TOC_MAX_CONFIRMED_PER_WEIGHT}; weights above eight expand automatically. Publish official draws to ` : "Your private seeding workspace. Open your saved draw at "}
              <HardLink href="/tournament-of-champions/brackets" className="text-[#D7B95A] hover:underline">
                public brackets
              </HardLink>
              .
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={exportAllCsv} disabled={!board}>
            <Download className="h-4 w-4 mr-2" />
            Export all CSV
          </Button>
          {canManage ? (
            <Button variant="outline" size="sm" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" asChild>
              <HardLink href="/admin/toc/invitations">Send invites</HardLink>
            </Button>
          ) : null}
        </div>
      </div>

      {workspace === "personal" ? (
        <div className="rounded-xl border border-[#D7B95A]/60 bg-[#002147] px-4 py-3 text-sm text-white shadow-sm">
          <strong className="text-[#D7B95A]">Your private bracket workspace.</strong>{" "}
          Drag wrestlers or choose a seed to build your own draw. Changes save to your account only and never alter NC United's official seeds or another user's bracket.
        </div>
      ) : null}

      {board ? (
        <>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Card className="border-white/10 bg-[#0B1D3A] text-white shadow-lg shadow-black/15">
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-white">{board.summary.totalConfirmed}</p>
              <p className="text-xs text-white/45">Confirmed</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-400/25 bg-emerald-400/10 text-white shadow-lg shadow-black/15">
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-emerald-300">{announcementReadyCount}</p>
              <p className="text-xs text-emerald-100/65">Ready for NC Mat</p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-[#0B1D3A] text-white shadow-lg shadow-black/15">
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-white">{board.summary.totalInvited}</p>
              <p className="text-xs text-white/45">Invited (pending)</p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-[#0B1D3A] text-white shadow-lg shadow-black/15">
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-white">{board.summary.fullBrackets}</p>
              <p className="text-xs text-white/45">Bracket-ready (8+)</p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-[#0B1D3A] text-white shadow-lg shadow-black/15">
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-white">{board.summary.partialBrackets}</p>
              <p className="text-xs text-white/45">In progress</p>
            </CardContent>
          </Card>
        </div>
        <CredentialRollup rollup={fieldCredentialRollup} expectedAthletes={board.summary.totalConfirmed} />
        </>
      ) : null}

      <Card className="border-white/10 bg-[#0B1D3A] text-white shadow-xl shadow-black/20">
        <CardHeader>
          <CardTitle className="text-lg text-white">Bracketing</CardTitle>
          <CardDescription className="text-white/45">
            Eight-person weights use the compact draw; weights with 9–12 wrestlers automatically use a 16-slot draw with byes. Export CSV for TrackWrestling if
            you also run live scoring there.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-[#D7B95A]/35 bg-[#D7B95A]/10 p-3 text-sm text-white/75">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#D7B95A]" />
              <p>
                <strong>Seed evidence</strong> brings together head-to-head results inside the field, NCHSAA
                qualification and placement, NHSCA, Super 32, and Fargo records. Review the evidence, then use the
                manual selector to make the official seed decision.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
          <HardLink
            href="/tournament-of-champions/brackets"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#D7B95A] hover:underline"
          >
            Public brackets hub <ExternalLink className="h-3.5 w-3.5" />
          </HardLink>
          <a
            href="https://www.trackwrestling.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#D7B95A] hover:underline"
          >
            TrackWrestling (optional) <ExternalLink className="h-3.5 w-3.5" />
          </a>
          {bracketsUrl ? (
            <a
              href={bracketsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#D7B95A] hover:underline"
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
          className={filter === "active" ? "bg-[#CC0000] text-white hover:bg-[#a80000]" : "border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"}
          onClick={() => setFilter("active")}
        >
          Weights with activity
        </Button>
        <Button
          type="button"
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          className={filter === "all" ? "bg-[#CC0000] text-white hover:bg-[#a80000]" : "border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"}
          onClick={() => setFilter("all")}
        >
          All 11 weights
        </Button>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {loading && !board ? (
        <p className="flex items-center gap-2 text-sm text-white/45">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading field…
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {visibleWeights.map((w) => (
          <WeightBoardCard
            key={w.weightClass}
            board={w}
            watchRank={bracketWatchRanks.get(w.weightClass)}
            onSeedChange={updateSeed}
            onSeedReorder={reorderSeeds}
            seedSavingId={seedSavingId}
            seedSavingWeight={seedSavingWeight}
            seedSavedWeight={seedSavedWeight}
            bracketStatus={bracketStatuses[w.weightClass]}
            onLockDraw={lockDraw}
            onUnlockDraw={unlockDraw}
            onToggleAthleteField={toggleAthleteField}
            bracketBusy={bracketBusyWeight === w.weightClass}
            fieldStatusBusy={fieldStatusBusyWeight === w.weightClass}
            canManage={canManage}
            canEditSeeds
          />
        ))}
      </div>
      </div>
    </div>
  )
}
