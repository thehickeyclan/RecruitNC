"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { LayoutGrid, Table, Phone, Mail, ChevronDown, Loader2, ActivityIcon } from 'lucide-react'

interface Prospect {
  id: string
  name: string
  photourl?: string
  prospect_id?: string
  pipeline_stage?: string
  graduationyear?: number
  weightclass?: string
  location?: string
  phone?: string
  contactEmail?: string
  college?: string
  has_applied?: boolean
  star_rating?: number
  academic_gpa?: number
  prospect_ranking?: number
  [key: string]: any
}

interface Activity {
  id: string
  athlete_id: string
  action_date: string
  [key: string]: any
}

interface PipelineStage {
  id: string
  label: string
}

interface RecruitsPipelineViewProps {
  filteredProspects: Prospect[]
  viewMode: "board" | "table"
  onViewModeChange: (mode: "board" | "table") => void
  pipelineStages: PipelineStage[]
  schoolBranding?: { primary_color?: string }
  selectedProspectIds: Set<string>
  onToggleProspectSelection: (prospectId: string, checked: boolean) => void
  onToggleAllVisible: (prospects: Prospect[]) => void
  onStageChange: (prospectId: string, newStage: string) => void
  onAppliedToggle: (prospectId: string, checked: boolean) => void
  appliedUpdating: Record<string, boolean>
  canLogActivities: boolean
  viewAsCoachId?: string
  params: { schoolId: string }
  activities: Activity[]
  isBulkLogging: boolean
  onOpenBulkActivityModal: () => void
  onClearSelectedProspects: () => void
  getStageColor: (stage: string, primaryColor?: string) => string
  normalizeStage: (stage?: string) => string
  getInitials: (name: string) => string
  formatPhoneNumber: (phone: string) => string
  normalizePhoneForTel: (phone: string) => string
  isCommittedElsewhere: (prospect: Prospect) => boolean
}

export function RecruitsPipelineView({
  filteredProspects,
  viewMode,
  onViewModeChange,
  pipelineStages,
  schoolBranding,
  selectedProspectIds,
  onToggleProspectSelection,
  onToggleAllVisible,
  onStageChange,
  onAppliedToggle,
  appliedUpdating,
  canLogActivities,
  viewAsCoachId,
  params,
  activities,
  isBulkLogging,
  onOpenBulkActivityModal,
  onClearSelectedProspects,
  getStageColor,
  normalizeStage,
  getInitials,
  formatPhoneNumber,
  normalizePhoneForTel,
  isCommittedElsewhere,
}: RecruitsPipelineViewProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const getLastActivityForAthlete = (athleteId: string) => {
    const athleteActivities = activities.filter((a) => a.athlete_id === athleteId)
    if (athleteActivities.length === 0) return null
    return athleteActivities.reduce((latest, current) =>
      new Date(current.action_date) > new Date(latest.action_date) ? current : latest
    )
  }

  const getProspectsByStage = (stageId: string) => {
    return filteredProspects.filter((p) => {
      const prospectStage = normalizeStage(p.pipeline_stage)
      const targetStage = stageId.trim()
      return prospectStage.toLowerCase() === targetStage.toLowerCase()
    })
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const sortedProspects = useMemo(() => {
    return [...filteredProspects].sort((a, b) => {
      if (!sortColumn) return 0

      let aValue: any
      let bValue: any

      switch (sortColumn) {
        case "name":
          aValue = a.name?.toLowerCase() || ""
          bValue = b.name?.toLowerCase() || ""
          break
        case "year":
          aValue = a.graduationyear || 0
          bValue = b.graduationyear || 0
          break
        case "weight":
          aValue = parseInt(a.weightclass) || 0
          bValue = parseInt(b.weightclass) || 0
          break
        case "state":
          aValue = a.location?.toLowerCase() || ""
          bValue = b.location?.toLowerCase() || ""
          break
        case "stage":
          aValue = a.pipeline_stage?.toLowerCase() || ""
          bValue = b.pipeline_stage?.toLowerCase() || ""
          break
        case "gpa":
          aValue = a.academic_gpa || 0
          bValue = b.academic_gpa || 0
          break
        case "ranking":
          aValue = a.prospect_ranking || 9999
          bValue = b.prospect_ranking || 9999
          break
        case "rating":
          aValue = a.star_rating || 0
          bValue = b.star_rating || 0
          break
        case "lastActivity": {
          const lastA = getLastActivityForAthlete(a.id)
          const lastB = getLastActivityForAthlete(b.id)
          aValue = lastA ? new Date(lastA.action_date).getTime() : 0
          bValue = lastB ? new Date(lastB.action_date).getTime() : 0
          break
        }
        default:
          return 0
      }

      if (sortDirection === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })
  }, [filteredProspects, sortColumn, sortDirection, activities])

  const selectedVisibleCount = useMemo(
    () =>
      sortedProspects.reduce(
        (count, prospect) => (selectedProspectIds.has(prospect.id) ? count + 1 : count),
        0
      ),
    [sortedProspects, selectedProspectIds]
  )

  const allVisibleSelected = sortedProspects.length > 0 && selectedVisibleCount === sortedProspects.length
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected
  const headerCheckboxState: boolean | "indeterminate" = allVisibleSelected
    ? true
    : someVisibleSelected
      ? "indeterminate"
      : false

  const bulkSelectedCount = selectedProspectIds.size

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex justify-end">
        <div className="flex gap-2 border border-border rounded-lg p-1 bg-background dark:bg-slate-900/70 w-full md:w-auto transition-colors">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange("board")}
            className={`flex-1 md:flex-none h-11 md:h-9 px-3 touch-manipulation transition-colors ${viewMode === "board" ? "bg-muted" : ""}`}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            <span className="text-sm">Board</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange("table")}
            className={`flex-1 md:flex-none h-11 md:h-9 px-3 touch-manipulation transition-colors ${viewMode === "table" ? "bg-muted" : ""}`}
          >
            <Table className="h-4 w-4 mr-2" />
            <span className="text-sm">Table</span>
          </Button>
        </div>
      </div>

      {/* Board or Table View */}
      {viewMode === "board" ? (
        <div className="flex flex-col md:flex-row md:gap-4 md:overflow-x-auto md:pb-4 space-y-4 md:space-y-0">
          {pipelineStages.map((stage) => {
            const stageProspects = getProspectsByStage(stage.id)
            return (
              <div key={stage.id} className="md:flex-shrink-0 md:w-80">
                <div className="bg-card rounded-xl border border-border flex flex-col transition-all hover:border-primary/40 dark:hover:border-primary/60">
                  <div className="flex items-center justify-between px-4 md:px-5 py-3 md:py-4 border-b border-border/60 dark:border-border/40">
                    <h3 className="text-xs md:text-sm font-bold text-foreground uppercase tracking-wide">
                      {stage.label}
                    </h3>
                    <div
                      className="flex items-center justify-center min-w-[24px] md:min-w-[28px] h-[24px] md:h-[28px] px-2 md:px-2.5 rounded-full text-xs md:text-sm font-bold text-white"
                      style={{ backgroundColor: schoolBranding?.primary_color || "#3B82F6" }}
                    >
                      {stageProspects.length}
                    </div>
                  </div>

                  <div className="flex-1 p-3 md:p-4 space-y-3 min-h-[200px] md:min-h-[400px] max-h-[400px] md:max-h-[calc(100vh-400px)] overflow-y-auto">
                    {stageProspects.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 md:py-12 text-center">
                        <div className="text-4xl md:text-5xl opacity-10 mb-2 md:mb-3">📋</div>
                        <div className="text-xs md:text-sm font-semibold text-muted-foreground mb-1">No athletes yet</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground/70">
                          Drag athletes here or add new prospects
                        </div>
                      </div>
                    ) : (
                      stageProspects.map((prospect) => {
                        const committedElsewhere = isCommittedElsewhere(prospect)

                        return (
                          <Card
                            key={prospect.id}
                            onClick={() => {
                              const url = `/schools/${params.schoolId}/athlete/${prospect.id}${viewAsCoachId ? `?viewAsCoachId=${viewAsCoachId}` : ""}`
                              window.location.href = url
                            }}
                            className={`border hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer transition-all rounded-lg touch-manipulation ${
                              committedElsewhere
                                ? "bg-muted border-border opacity-80 dark:bg-slate-800 dark:border-slate-700"
                                : "bg-card border-border hover:border-primary/40 active:border-primary/60 dark:hover:border-primary/60"
                            }`}
                          >
                            <CardContent className="p-3 md:p-4">
                              {committedElsewhere && (
                                <div className="mb-2 bg-gray-700 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1 dark:bg-slate-700">
                                  <span>⚠️ Committed to {prospect.college}</span>
                                </div>
                              )}

                              <div className="flex gap-3 mb-3 relative">
                                {!prospect.prospect_id || !prospect.photourl ? (
                                  <div
                                    className="flex h-12 w-12 md:h-14 md:w-14 flex-shrink-0 items-center justify-center rounded-lg border border-border text-sm md:text-base font-semibold uppercase text-white"
                                    style={{
                                      backgroundColor: getStageColor(prospect.pipeline_stage || "Prospect", schoolBranding?.primary_color),
                                    }}
                                  >
                                    {getInitials(prospect.name)}
                                  </div>
                                ) : (
                                  <img
                                    src={prospect.photourl || "/placeholder.svg?height=56&width=56&query=wrestler"}
                                    alt={prospect.name}
                                    className={`w-12 h-12 md:w-14 md:h-14 rounded-lg object-cover border border-border flex-shrink-0 ${
                                      committedElsewhere ? "grayscale" : ""
                                    }`}
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className={`font-bold text-sm md:text-base truncate mb-1 ${committedElsewhere ? "text-muted-foreground" : "text-foreground"}`}>
                                    {prospect.name}
                                  </h4>
                                  <div className="text-xs text-muted-foreground space-y-0.5">
                                    <div>{prospect.graduationyear} • {prospect.weightclass}lbs</div>
                                    <div>{prospect.location || "NC"}</div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden transition-colors">
          {bulkSelectedCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-blue-50/70 px-4 py-3 text-sm dark:bg-slate-800/70">
              <div className="font-medium text-foreground">
                {bulkSelectedCount} athlete{bulkSelectedCount === 1 ? "" : "s"} selected
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearSelectedProspects}
                  className="rounded-full"
                  disabled={isBulkLogging}
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  className="rounded-full bg-[#0b1728] text-white hover:bg-[#13294B]"
                  onClick={onOpenBulkActivityModal}
                  disabled={!canLogActivities || isBulkLogging}
                >
                  {isBulkLogging ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging...
                    </>
                  ) : !canLogActivities ? (
                    "Admin Preview"
                  ) : (
                    <>
                      <ActivityIcon className="mr-2 h-4 w-4" />
                      Log Activity
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0" style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="md:hidden text-xs text-muted-foreground px-4 py-2 bg-muted border-b border-border/60">
              ← Swipe to see more columns →
            </div>
            <table className="w-full caption-bottom text-sm min-w-[900px]">
              <thead className="[&_tr]:border-b border-border/60 bg-muted">
                <tr className="border-b border-border/60 transition-colors">
                  <th className="h-12 w-12 px-4 align-middle text-left font-semibold text-foreground">
                    <Checkbox
                      checked={headerCheckboxState}
                      onCheckedChange={() => onToggleAllVisible(sortedProspects)}
                      aria-label="Select all prospects"
                      disabled={sortedProspects.length === 0}
                    />
                  </th>
                  <th
                    className="h-12 px-4 text-left align-middle font-semibold text-foreground cursor-pointer hover:bg-muted/60 dark:hover:bg-muted/40 select-none"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Name
                      {sortColumn === "name" && <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                    </div>
                  </th>
                  <th
                    className="h-12 px-4 text-left align-middle font-semibold text-foreground cursor-pointer hover:bg-muted/60 dark:hover:bg-muted/40 select-none"
                    onClick={() => handleSort("year")}
                  >
                    <div className="flex items-center gap-1">
                      Year
                      {sortColumn === "year" && <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                    </div>
                  </th>
                  <th
                    className="h-12 px-4 text-left align-middle font-semibold text-foreground cursor-pointer hover:bg-muted/60 dark:hover:bg-muted/40 select-none"
                    onClick={() => handleSort("weight")}
                  >
                    <div className="flex items-center gap-1">
                      Weight
                      {sortColumn === "weight" && <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                    </div>
                  </th>
                  <th
                    className="h-12 px-4 text-left align-middle font-semibold text-foreground cursor-pointer hover:bg-muted/60 dark:hover:bg-muted/40 select-none"
                    onClick={() => handleSort("state")}
                  >
                    <div className="flex items-center gap-1">
                      State
                      {sortColumn === "state" && <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                    </div>
                  </th>
                  <th
                    className="h-12 px-4 text-left align-middle font-semibold text-foreground cursor-pointer hover:bg-muted/60 dark:hover:bg-muted/40 select-none"
                    onClick={() => handleSort("stage")}
                  >
                    <div className="flex items-center gap-1">
                      Stage
                      {sortColumn === "stage" && <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                    </div>
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-semibold text-foreground">Applied</th>
                  <th
                    className="h-12 px-4 text-left align-middle font-semibold text-foreground cursor-pointer hover:bg-muted/60 dark:hover:bg-muted/40 select-none"
                    onClick={() => handleSort("rating")}
                  >
                    <div className="flex items-center gap-1">
                      Rating
                      {sortColumn === "rating" && <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                    </div>
                  </th>
                  <th
                    className="h-12 px-4 text-left align-middle font-semibold text-foreground cursor-pointer hover:bg-muted/60 dark:hover:bg-muted/40 select-none"
                    onClick={() => handleSort("gpa")}
                  >
                    <div className="flex items-center gap-1">
                      GPA
                      {sortColumn === "gpa" && <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                    </div>
                  </th>
                  <th
                    className="h-12 px-4 text-left align-middle font-semibold text-foreground cursor-pointer hover:bg-muted/60 dark:hover:bg-muted/40 select-none"
                    onClick={() => handleSort("ranking")}
                  >
                    <div className="flex items-center gap-1">
                      Ranking
                      {sortColumn === "ranking" && <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                    </div>
                  </th>
                  <th
                    className="h-12 px-4 text-left align-middle font-semibold text-foreground cursor-pointer hover:bg-muted/60 dark:hover:bg-muted/40 select-none"
                    onClick={() => handleSort("lastActivity")}
                  >
                    <div className="flex items-center gap-1">
                      Last Activity
                      {sortColumn === "lastActivity" && <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {sortedProspects.map((prospect) => {
                  const stageColor = getStageColor(prospect.pipeline_stage || "Prospect", schoolBranding?.primary_color)
                  const stage = pipelineStages.find((s) => s.id === (prospect.pipeline_stage || "Prospect")) || pipelineStages[0]
                  const lastActivity = getLastActivityForAthlete(prospect.id)

                  return (
                    <tr
                      key={prospect.id}
                      className="border-b border-border/60 transition-colors hover:bg-muted/60 dark:hover:bg-muted/40 active:bg-muted/80 group"
                    >
                      <td className="p-4 align-middle" onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          checked={selectedProspectIds.has(prospect.id)}
                          onCheckedChange={(checked) => onToggleProspectSelection(prospect.id, checked === true)}
                          aria-label={`Select ${prospect.name}`}
                        />
                      </td>
                      <td
                        className="p-4 align-middle cursor-pointer"
                        onClick={() => {
                          const url = `/schools/${params.schoolId}/athlete/${prospect.id}${viewAsCoachId ? `?viewAsCoachId=${viewAsCoachId}` : ""}`
                          window.location.href = url
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {!prospect.prospect_id || !prospect.photourl ? (
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-sm font-semibold uppercase text-white"
                              style={{ backgroundColor: stageColor || "#334155" }}
                            >
                              {getInitials(prospect.name)}
                            </div>
                          ) : (
                            <img
                              src={prospect.photourl || "/placeholder.svg"}
                              alt={prospect.name}
                              className="w-10 h-10 rounded-lg object-cover border border-border"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-foreground truncate block">{prospect.name}</span>
                            {prospect.phone && (
                              <span className="mt-0.5 block text-xs text-muted-foreground truncate">
                                {formatPhoneNumber(prospect.phone)}
                              </span>
                            )}
                          </div>
                          <div className="ml-2 flex items-center gap-2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                            {prospect.phone && (
                              <a
                                href={`tel:${normalizePhoneForTel(prospect.phone)}`}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded-full border border-border/60 bg-muted/40 p-2 hover:bg-muted hover:text-foreground dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                aria-label={`Call ${prospect.name}`}
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </a>
                            )}
                            {prospect.contactEmail && (
                              <a
                                href={`mailto:${prospect.contactEmail}`}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded-full border border-border/60 bg-muted/40 p-2 hover:bg-muted hover:text-foreground dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                aria-label={`Email ${prospect.name}`}
                              >
                                <Mail className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td
                        className="p-4 align-middle text-muted-foreground cursor-pointer"
                        onClick={() => {
                          const url = `/schools/${params.schoolId}/athlete/${prospect.id}${viewAsCoachId ? `?viewAsCoachId=${viewAsCoachId}` : ""}`
                          window.location.href = url
                        }}
                      >
                        {prospect.graduationyear}
                      </td>
                      <td
                        className="p-4 align-middle text-muted-foreground cursor-pointer"
                        onClick={() => {
                          const url = `/schools/${params.schoolId}/athlete/${prospect.id}${viewAsCoachId ? `?viewAsCoachId=${viewAsCoachId}` : ""}`
                          window.location.href = url
                        }}
                      >
                        {prospect.weightclass}lbs
                      </td>
                      <td
                        className="p-4 align-middle text-muted-foreground cursor-pointer"
                        onClick={() => {
                          const url = `/schools/${params.schoolId}/athlete/${prospect.id}${viewAsCoachId ? `?viewAsCoachId=${viewAsCoachId}` : ""}`
                          window.location.href = url
                        }}
                      >
                        {prospect.location || "NC"}
                      </td>
                      <td className="p-4 align-middle" onClick={(e) => e.stopPropagation()}>
                        <Select value={prospect.pipeline_stage || "Prospect"} onValueChange={(value) => onStageChange(prospect.id, value)}>
                          <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0">
                            <Badge
                              className="text-xs cursor-pointer hover:opacity-90 transition-opacity"
                              style={{
                                backgroundColor: stageColor,
                                color: "white",
                              }}
                            >
                              {stage.label}
                              <ChevronDown className="ml-1 h-3 w-3 inline" />
                            </Badge>
                          </SelectTrigger>
                          <SelectContent className="min-w-[180px] rounded-xl border border-border bg-card text-foreground shadow-lg dark:bg-slate-900 dark:text-slate-100">
                            {pipelineStages.map((s) => (
                              <SelectItem key={s.id} value={s.id} className="text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStageColor(s.id, schoolBranding?.primary_color) }} />
                                  <span>{s.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4 align-middle" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={prospect.has_applied ?? false}
                            disabled={appliedUpdating[prospect.id] || !canLogActivities}
                            onCheckedChange={(checked) => onAppliedToggle(prospect.id, Boolean(checked))}
                            aria-label={`Mark ${prospect.name} as applied`}
                          />
                        </div>
                      </td>
                      <td
                        className="p-4 align-middle text-muted-foreground cursor-pointer"
                        onClick={() => {
                          const url = `/schools/${params.schoolId}/athlete/${prospect.id}${viewAsCoachId ? `?viewAsCoachId=${viewAsCoachId}` : ""}`
                          window.location.href = url
                        }}
                      >
                        {prospect.star_rating ? `${prospect.star_rating} ⭐` : "-"}
                      </td>
                      <td
                        className="p-4 align-middle text-muted-foreground cursor-pointer"
                        onClick={() => {
                          const url = `/schools/${params.schoolId}/athlete/${prospect.id}${viewAsCoachId ? `?viewAsCoachId=${viewAsCoachId}` : ""}`
                          window.location.href = url
                        }}
                      >
                        {prospect.academic_gpa || "-"}
                      </td>
                      <td
                        className="p-4 align-middle text-muted-foreground cursor-pointer"
                        onClick={() => {
                          const url = `/schools/${params.schoolId}/athlete/${prospect.id}${viewAsCoachId ? `?viewAsCoachId=${viewAsCoachId}` : ""}`
                          window.location.href = url
                        }}
                      >
                        {prospect.prospect_ranking ? `#${prospect.prospect_ranking}` : "-"}
                      </td>
                      <td
                        className="p-4 align-middle text-muted-foreground cursor-pointer"
                        onClick={() => {
                          const url = `/schools/${params.schoolId}/athlete/${prospect.id}${viewAsCoachId ? `?viewAsCoachId=${viewAsCoachId}` : ""}`
                          window.location.href = url
                        }}
                      >
                        {lastActivity ? new Date(lastActivity.action_date).toLocaleDateString() : "-"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
