"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronDown, Trophy } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn, scrollTableXClass } from "@/lib/utils"
import { placementLabel, type OtherTournamentProfileBlock } from "@/lib/other-tournaments"
import { PROFILE_SECTION_HEADER, PROFILE_SECTION_TITLE } from "@/lib/unified-profile-section-styles"

interface TournamentResult {
  year: number
  placement: string
  record?: string
  weight?: string
  division?: string
  notes?: string
}

interface NCHSAAResult {
  year: number
  place: number | null | undefined
  classification: string
  weight_class: string
}

export interface NationalTeamResult {
  event: string
  year: number
  record: string
  isPlaceholder?: boolean
}

interface TournamentResultsDisplayProps {
  nhscaResults?: TournamentResult[]
  super32Results?: TournamentResult[]
  /**
   * Qualifiers and open events — Super 32 Early Entry and the like. A separate tournament
   * from Super 32, so it gets its own section above it rather than being merged in.
   */
  otherTournamentBlocks?: OtherTournamentProfileBlock[]
  fargoResults?: TournamentResult[]
  nchsaaResults?: NCHSAAResult[]
  nationalTeamResults?: NationalTeamResult[]
  compact?: boolean
  alwaysShowStructure?: boolean
  theme?: "light" | "dark"
  /** Single tabbed card on mobile — national team tab first. */
  mobileTabbedLayout?: boolean
}

export function TournamentResultsDisplay({
  nhscaResults = [],
  super32Results = [],
  otherTournamentBlocks = [],
  fargoResults = [],
  nchsaaResults = [],
  nationalTeamResults = [],
  compact = false,
  alwaysShowStructure = true,
  theme = "light",
  mobileTabbedLayout = false,
}: TournamentResultsDisplayProps) {
  const isDark = theme === "dark"
  const cardClass = isDark
    ? "profile-card border-t-4 border-t-[#D3B574] border-white/10 bg-[#0f1c2e] shadow-none"
    : "border-t-4 border-t-[#D3B574] shadow-md"
  const contentClass = isDark ? "p-4 md:p-6 bg-[#0f1c2e] text-white/80" : "p-4 md:p-6"
  const tableHeadRowClass = isDark ? "bg-white/5 border-white/10" : "bg-gray-50"
  const tableHeadCellClass = isDark ? "font-semibold text-white/60" : "font-semibold"
  const tableRowClass = isDark
    ? "hover:bg-white/5 border-white/10 text-white/80"
    : "hover:bg-gray-50 transition-colors"
  const tableWrapClass = isDark ? "rounded-lg border border-white/10 min-w-0" : "rounded-lg border min-w-0"
  const descClass = isDark ? "text-sm text-white/50 mb-4" : "text-sm text-gray-600 mb-4"
  const cellPrimaryClass = isDark ? "font-medium text-white" : "font-medium text-[#03154C]"
  const cellYearClass = isDark ? "font-semibold text-white" : "font-semibold text-[#13294B]"
  const cellYearNhscaClass = isDark ? "font-semibold text-white" : "font-semibold text-[#002147]"
  const cellMonoClass = isDark ? "font-mono text-white/80" : "font-mono"
  const cellMonoMutedClass = isDark ? "font-mono text-white/40" : "font-mono text-gray-400"
  const emptyRowClass = isDark ? "text-center text-white/40 py-6" : "text-center text-gray-500 py-6"
  const memberHintClass = isDark
    ? "ml-2 text-xs font-normal text-white/40"
    : "ml-2 text-xs font-normal text-gray-500"
  const emptyBadgeClass = isDark ? "text-white/40" : "text-gray-400"
  const outlineBadgeClass = isDark ? "border-white/30 text-white/80 bg-transparent" : ""
  const hasAnyResults =
    nhscaResults.length > 0 ||
    otherTournamentBlocks.length > 0 ||
    super32Results.length > 0 ||
    fargoResults.length > 0 ||
    nchsaaResults.length > 0 ||
    nationalTeamResults.length > 0

  if (!hasAnyResults && !alwaysShowStructure) {
    return null
  }

  const getPlacementBadge = (
    placement: string | null | undefined,
    size: "default" | "sm" = "default",
    emptyLabel = "—"
  ) => {
    if (!placement) {
      return <span className={emptyBadgeClass}>{emptyLabel}</span>
    }

    const p = placement.toLowerCase()
    const badgeClass = size === "sm" ? "text-xs px-2 py-0.5" : ""

    if (p === "champion" || p === "1st" || p === "1") {
      return (
        <Badge className={`bg-yellow-500 text-white hover:bg-yellow-600 ${badgeClass}`}>
          🥇 {placement}
        </Badge>
      )
    }
    if (p === "finalist" || p === "2nd" || p === "2") {
      return (
        <Badge className={`bg-gray-400 text-white hover:bg-gray-500 ${badgeClass}`}>🥈 {placement}</Badge>
      )
    }
    if (p === "3rd" || p === "3") {
      return (
        <Badge className={`bg-amber-600 text-white hover:bg-amber-700 ${badgeClass}`}>🥉 {placement}</Badge>
      )
    }
    if (["4th", "5th", "6th", "7th", "8th", "4", "5", "6", "7", "8"].includes(p)) {
      return (
        <Badge className={`bg-[#002147] text-white hover:bg-[#003366] ${badgeClass}`}>{placement}</Badge>
      )
    }
    return <Badge variant="outline" className={`${badgeClass} ${outlineBadgeClass}`}>{placement}</Badge>
  }

  const nationalTeamTable = (
    <>
      <p className={descClass}>
        National team competition: Ultimate Club Duals, NHSCA Duals, and AAU Scholastic Duals
      </p>
      <p className={cn("text-xs mb-3 lg:hidden", isDark ? "text-white/40" : "text-gray-500")}>
        ← Swipe for more columns →
      </p>
      <div className={tableWrapClass}>
        <Table className="min-w-[400px]">
          <TableHeader>
            <TableRow className={tableHeadRowClass}>
              <TableHead className={tableHeadCellClass}>Event</TableHead>
              <TableHead className={tableHeadCellClass}>Year</TableHead>
              <TableHead className={tableHeadCellClass}>Record</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {nationalTeamResults.length > 0 ? (
              nationalTeamResults.map((result, index) => (
                <TableRow key={index} className={tableRowClass}>
                  <TableCell className={cellPrimaryClass}>
                    {result.event}
                    {result.isPlaceholder && <span className={memberHintClass}>(Member)</span>}
                  </TableCell>
                  <TableCell className={cellYearClass}>{result.year}</TableCell>
                  <TableCell className={result.isPlaceholder ? cellMonoMutedClass : cellMonoClass}>
                    {result.record}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className={emptyRowClass}>
                  No national team results recorded
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )

  const nhscaTable = (
    <div className={tableWrapClass}>
      <Table className="min-w-[540px]">
        <TableHeader>
          <TableRow className={tableHeadRowClass}>
            <TableHead className={tableHeadCellClass}>Year</TableHead>
            <TableHead className={tableHeadCellClass}>Placement</TableHead>
            <TableHead className={tableHeadCellClass}>Record</TableHead>
            <TableHead className={tableHeadCellClass}>Weight</TableHead>
            <TableHead className={tableHeadCellClass}>Division</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {nhscaResults.length > 0 ? (
            nhscaResults.map((result, index) => (
              <TableRow key={index} className={tableRowClass}>
                <TableCell className={cellYearNhscaClass}>{result.year}</TableCell>
                <TableCell>{getPlacementBadge(result.placement)}</TableCell>
                <TableCell className={cellMonoClass}>{result.record || "—"}</TableCell>
                <TableCell>{result.weight || "—"}</TableCell>
                <TableCell>{result.division || "—"}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className={emptyRowClass}>
                No NHSCA results recorded
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )

  /**
   * Qualifier / open-event results. Each event shows the placement and record, then the
   * wins behind that record with the opponent's own finish — the strength of the win, not
   * just the score.
   */
  const otherTournamentsTable = (
    <>
      <p className={descClass}>
        Qualifiers and open events. Top 4 earns a chance to enter Super 32 when registration opens.
      </p>
      <div className={tableWrapClass}>
        <Table className="min-w-[560px]">
          <TableHeader>
            <TableRow className={tableHeadRowClass}>
              <TableHead className={tableHeadCellClass}>Year</TableHead>
              <TableHead className={tableHeadCellClass}>Event</TableHead>
              <TableHead className={tableHeadCellClass}>Placement</TableHead>
              <TableHead className={tableHeadCellClass}>Record</TableHead>
              <TableHead className={tableHeadCellClass}>Weight</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {otherTournamentBlocks.length > 0 ? (
              otherTournamentBlocks.map((block, index) => (
                <TableRow key={`${block.result.eventKey}-${index}`} className={tableRowClass}>
                  <TableCell className={cellYearClass}>{block.result.year}</TableCell>
                  <TableCell className={cellPrimaryClass}>
                    {block.result.eventShortName}
                    {block.result.eventState && (
                      <span className={memberHintClass}>{block.result.eventState}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {getPlacementBadge(placementLabel(block.result.placement), "default", "DNP")}
                      {block.result.qualified && (
                        <Badge className="bg-[#D3B574] text-[#0A1628] hover:bg-[#c5a769] text-xs px-2 py-0.5">
                          Super 32 qualifier
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className={cellMonoClass}>
                    {block.result.record || "—"}
                    {block.result.entrants ? (
                      <span className={memberHintClass}>of {block.result.entrants}</span>
                    ) : null}
                  </TableCell>
                  <TableCell>{block.result.weight || "—"}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className={emptyRowClass}>
                  No qualifier or open-event results recorded
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/*
        Collapsed by default. The table above already carries placement and record; the
        bout-by-bout detail is depth for whoever wants it, and left open it pushed the rest
        of the profile off the screen. Same disclosure idiom as the AAU quality wins section.
      */}
      {otherTournamentBlocks.map((block) =>
        block.strengthOfWins.length > 0 ? (
          <Collapsible
            key={`wins-${block.result.eventKey}`}
            className={cn(
              "group/wins mt-3 overflow-hidden rounded-xl border",
              isDark ? "border-white/10" : "border-gray-200",
            )}
          >
            <CollapsibleTrigger
              className={cn(
                "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors",
                isDark ? "bg-white/[0.03] hover:bg-white/[0.06]" : "bg-gray-50/80 hover:bg-gray-100",
              )}
            >
              <div className="min-w-0">
                <p className={cn("text-sm font-bold", isDark ? "text-white" : "text-[#03154C]")}>
                  Wins at {block.result.eventShortName} {block.result.year}
                </p>
                <p className={cn("mt-0.5 text-xs", isDark ? "text-white/55" : "text-gray-600")}>
                  {block.strengthOfWins.length} win{block.strengthOfWins.length === 1 ? "" : "s"}
                  {block.notableWins.length > 0
                    ? ` · ${block.notableWins.length} over placers, ranked wrestlers, or TOC field`
                    : ""}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform group-data-[state=open]/wins:rotate-180",
                  isDark ? "text-white/50" : "text-gray-500",
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul
                className={cn(
                  "space-y-1.5 border-t px-4 py-3",
                  isDark ? "border-white/10" : "border-gray-200",
                )}
              >
                {block.strengthOfWins.map((win, index) => (
                  <li
                    key={`${win.opponentName}-${index}`}
                    className={cn(
                      "flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-md px-3 py-2 text-sm",
                      isDark ? "bg-white/5 text-white/80" : "bg-gray-50 text-gray-700",
                    )}
                  >
                    <span className={isDark ? "font-medium text-white" : "font-medium text-[#03154C]"}>
                      {win.opponentName}
                    </span>
                    {win.opponentClub && (
                      <span className={isDark ? "text-white/40 text-xs" : "text-gray-500 text-xs"}>
                        {win.opponentClub}
                      </span>
                    )}
                    {win.credential?.placement != null && (
                      <Badge className="bg-[#13294B] text-white hover:bg-[#1e3a5f] text-xs px-2 py-0.5">
                        {placementLabel(win.credential.placement)} at this event
                      </Badge>
                    )}
                    {win.credential?.prospectRanking != null && (
                      <Badge className="bg-[#D3B574] text-[#0A1628] hover:bg-[#c5a769] text-xs px-2 py-0.5">
                        #{win.credential.prospectRanking}
                        {win.credential.graduationYear ? ` · Class of ${win.credential.graduationYear}` : ""}
                      </Badge>
                    )}
                    {win.credential?.tocParticipant && (
                      <Badge className="bg-[#7c3aed] text-white hover:bg-[#6d28d9] text-xs px-2 py-0.5">
                        TOC field
                      </Badge>
                    )}
                    {win.credential?.placement == null && win.credential?.record && (
                      <span className={isDark ? "text-white/40 text-xs" : "text-gray-500 text-xs"}>
                        opponent went {win.credential.record}
                      </span>
                    )}
                    <span className={cn("ml-auto", cellMonoClass)}>
                      {win.winType}
                      {win.score ? ` ${win.score}` : ""}
                    </span>
                    <span className={isDark ? "text-white/40 text-xs" : "text-gray-500 text-xs"}>{win.round}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        ) : null,
      )}
    </>
  )

  const super32Table = (
    <div className={tableWrapClass}>
      <Table className="min-w-[480px]">
        <TableHeader>
          <TableRow className={tableHeadRowClass}>
            <TableHead className={tableHeadCellClass}>Year</TableHead>
            <TableHead className={tableHeadCellClass}>Placement</TableHead>
            <TableHead className={tableHeadCellClass}>Record</TableHead>
            <TableHead className={tableHeadCellClass}>Weight</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {super32Results.length > 0 ? (
            super32Results.map((result, index) => (
              <TableRow key={index} className={tableRowClass}>
                <TableCell className={cellYearClass}>{result.year}</TableCell>
                <TableCell>{getPlacementBadge(result.placement, "default", "DNP")}</TableCell>
                <TableCell className={cellMonoClass}>{result.record || "—"}</TableCell>
                <TableCell>{result.weight || "—"}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className={emptyRowClass}>
                No Super 32 results recorded
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )

  const fargoTable = (
    <div className={tableWrapClass}>
      <Table className="min-w-[560px]">
        <TableHeader>
          <TableRow className={tableHeadRowClass}>
            <TableHead className={tableHeadCellClass}>Year</TableHead>
            <TableHead className={tableHeadCellClass}>Division</TableHead>
            <TableHead className={tableHeadCellClass}>Placement</TableHead>
            <TableHead className={tableHeadCellClass}>Record</TableHead>
            <TableHead className={tableHeadCellClass}>Weight</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fargoResults.length > 0 ? (
            fargoResults.map((result, index) => (
              <TableRow key={index} className={tableRowClass}>
                <TableCell className={cellYearClass}>{result.year}</TableCell>
                <TableCell>{result.division || "—"}</TableCell>
                <TableCell>{getPlacementBadge(result.placement, "default", result.record ? "—" : "DNP")}</TableCell>
                <TableCell className={cellMonoClass}>{result.record || "—"}</TableCell>
                <TableCell>{result.weight || "—"}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className={emptyRowClass}>
                No Fargo Nationals results recorded
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )

  const nchsaaTable = (
    <div className={tableWrapClass}>
      <Table className="min-w-[480px]">
        <TableHeader>
          <TableRow className={tableHeadRowClass}>
            <TableHead className={tableHeadCellClass}>Year</TableHead>
            <TableHead className={tableHeadCellClass}>Placement</TableHead>
            <TableHead className={tableHeadCellClass}>Classification</TableHead>
            <TableHead className={tableHeadCellClass}>Weight</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {nchsaaResults.length > 0 ? (
            nchsaaResults.map((result, index) => {
              let placementText: string
              if (result.place === null || result.place === undefined || result.place === 0) {
                placementText = "SQ"
              } else if (result.place === 1) {
                placementText = "Champion"
              } else if (result.place === 2) {
                placementText = "2nd Place"
              } else if (result.place === 3) {
                placementText = "3rd Place"
              } else if (result.place === 4) {
                placementText = "4th Place"
              } else {
                placementText = `${result.place}th Place`
              }

              return (
                <TableRow key={index} className={tableRowClass}>
                  <TableCell className={cellYearClass}>{result.year}</TableCell>
                  <TableCell>{getPlacementBadge(placementText)}</TableCell>
                  <TableCell>{result.classification}</TableCell>
                  <TableCell>{result.weight_class}</TableCell>
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell colSpan={4} className={emptyRowClass}>
                No NCHSAA results recorded
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )

  if (compact) {
    return (
      <div className="space-y-4">
        {nhscaResults.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[#002147]" />
              NHSCA National Championship
            </h4>
            <div className="space-y-2">
              {nhscaResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between text-sm bg-gray-50 rounded p-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">{result.year}</span>
                    {getPlacementBadge(result.placement, "sm")}
                  </div>
                  {result.record && <span className="text-gray-600 font-mono">{result.record}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        {super32Results.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[#B31B1B]" />
              Super 32
            </h4>
            <div className="space-y-2">
              {super32Results.map((result, index) => (
                <div key={index} className="flex items-center justify-between text-sm bg-gray-50 rounded p-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">{result.year}</span>
                    {getPlacementBadge(result.placement, "sm", "DNP")}
                  </div>
                  {result.record && <span className="text-gray-600 font-mono">{result.record}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const mobileTabs = useMemo(() => {
    // National tournaments only — NC United National Team and NCHSAA/States are their own sections.
    const tabs: { id: string; label: string; hasData: boolean }[] = [
      { id: "nhsca", label: "NHSCA", hasData: nhscaResults.length > 0 },
      { id: "fargo", label: "Fargo", hasData: fargoResults.length > 0 },
      { id: "other", label: "Other", hasData: otherTournamentBlocks.length > 0 },
      { id: "super32", label: "Super 32", hasData: super32Results.length > 0 },
    ]
    if (!alwaysShowStructure) {
      return tabs.filter((t) => t.hasData)
    }
    return tabs
  }, [alwaysShowStructure, nhscaResults.length, fargoResults.length, otherTournamentBlocks.length, super32Results.length])

  const defaultMobileTab = mobileTabs[0]?.id ?? "nhsca"
  const showMobileNationalTeam =
    mobileTabbedLayout && (nationalTeamResults.length > 0 || alwaysShowStructure)
  const showMobileNchsaa =
    mobileTabbedLayout && (nchsaaResults.length > 0 || alwaysShowStructure)

  const mobileTabbedCard = mobileTabbedLayout && mobileTabs.length > 0 && (
    <Card className={cn(cardClass, "lg:hidden")} id="national-results">
      <CardHeader className={cn(PROFILE_SECTION_HEADER, "from-[#03154C] to-[#1e3a8a]")}>
        <CardTitle className={cn(PROFILE_SECTION_TITLE, "flex items-center gap-2")}>
          <Trophy className="h-5 w-5 text-[#D3B574]" />
          National Results
        </CardTitle>
        <p className={cn("text-xs mt-1", isDark ? "text-white/50" : "text-gray-500")}>
          NHSCA, Fargo, qualifiers, and Super 32
        </p>
      </CardHeader>
      <CardContent className={contentClass}>
        <Tabs defaultValue={defaultMobileTab}>
          <div className={cn(scrollTableXClass, "-mx-1 px-1 mb-4")}>
            <TabsList
              className={cn(
                "inline-flex w-max h-auto p-1 gap-1",
                isDark ? "bg-white/10" : "bg-gray-100"
              )}
            >
              {mobileTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "text-xs px-3 py-1.5 min-h-0 min-w-0 data-[state=active]:bg-[#D3B574] data-[state=active]:text-[#0A1628]",
                    isDark && "text-white/70 data-[state=inactive]:text-white/60"
                  )}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value="nhsca">{nhscaTable}</TabsContent>
          <TabsContent value="fargo">{fargoTable}</TabsContent>
          <TabsContent value="other">{otherTournamentsTable}</TabsContent>
          <TabsContent value="super32">{super32Table}</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )

  const mobileNationalTeamCard = showMobileNationalTeam && (
    <Card className={cn(cardClass, "lg:hidden")} id="national-team">
      <CardHeader className={cn(PROFILE_SECTION_HEADER, "from-[#03154C] to-[#1e3a8a]")}>
        <CardTitle className={cn(PROFILE_SECTION_TITLE, "flex items-center gap-2")}>
          <Trophy className="h-5 w-5 text-[#D3B574]" />
          NC United National Team
        </CardTitle>
      </CardHeader>
      <CardContent className={contentClass}>{nationalTeamTable}</CardContent>
    </Card>
  )

  const mobileNchsaaStatesCard = showMobileNchsaa && (
    <Card className={cn(cardClass, "lg:hidden")} id="nchsaa-states">
      <CardHeader className={cn(PROFILE_SECTION_HEADER, "from-[#13294B] to-[#1e3a5f]")}>
        <CardTitle className={cn(PROFILE_SECTION_TITLE, "flex items-center gap-2")}>
          <Trophy className="h-5 w-5 text-[#D3B574]" />
          State Championships
        </CardTitle>
        <p className={cn("text-xs mt-1", isDark ? "text-white/50" : "text-gray-500")}>
          North Carolina high school state tournament results
        </p>
      </CardHeader>
      <CardContent className={contentClass}>{nchsaaTable}</CardContent>
    </Card>
  )

  const desktopCards = (
    <div className={cn("space-y-6 min-w-0 max-w-full", mobileTabbedLayout && "hidden lg:block")}>
      {(nationalTeamResults.length > 0 || alwaysShowStructure) && (
        <Card className={cardClass} id="national-team">
          <CardHeader className="bg-gradient-to-r from-[#03154C] to-[#1e3a8a] py-4">
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-[#D3B574]" />
              NC United National Team
            </CardTitle>
          </CardHeader>
          <CardContent className={contentClass}>{nationalTeamTable}</CardContent>
        </Card>
      )}

      {(nchsaaResults.length > 0 || alwaysShowStructure) && (
        <Card className={cardClass} id="nchsaa-states">
          <CardHeader className="bg-gradient-to-r from-[#13294B] to-[#1e3a5f] py-4">
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-[#D3B574]" />
              State Championships
            </CardTitle>
          </CardHeader>
          <CardContent className={contentClass}>{nchsaaTable}</CardContent>
        </Card>
      )}

      {(nhscaResults.length > 0 || alwaysShowStructure) && (
        <Card className={cardClass}>
          <CardHeader className="bg-gradient-to-r from-[#13294B] to-[#1e3a5f] py-4">
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-[#D3B574]" />
              NHSCA National Championship
            </CardTitle>
          </CardHeader>
          <CardContent className={contentClass}>{nhscaTable}</CardContent>
        </Card>
      )}

      {(fargoResults.length > 0 || alwaysShowStructure) && (
        <Card className={cardClass}>
          <CardHeader className="bg-gradient-to-r from-[#13294B] to-[#1e3a5f] py-4">
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-[#D3B574]" />
              Fargo Nationals
            </CardTitle>
          </CardHeader>
          <CardContent className={contentClass}>{fargoTable}</CardContent>
        </Card>
      )}

      {(otherTournamentBlocks.length > 0 || alwaysShowStructure) && (
        <Card className={cardClass} id="other-tournaments">
          <CardHeader className="bg-gradient-to-r from-[#13294B] to-[#1e3a5f] py-4">
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-[#D3B574]" />
              Other Tournaments
            </CardTitle>
          </CardHeader>
          <CardContent className={contentClass}>{otherTournamentsTable}</CardContent>
        </Card>
      )}

      {(super32Results.length > 0 || alwaysShowStructure) && (
        <Card className={cardClass}>
          <CardHeader className="bg-gradient-to-r from-[#13294B] to-[#1e3a5f] py-4">
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-[#D3B574]" />
              Super 32
            </CardTitle>
          </CardHeader>
          <CardContent className={contentClass}>{super32Table}</CardContent>
        </Card>
      )}
    </div>
  )

  return (
    <>
      {mobileTabbedCard}
      {mobileNationalTeamCard}
      {mobileNchsaaStatesCard}
      {desktopCards}
    </>
  )
}
