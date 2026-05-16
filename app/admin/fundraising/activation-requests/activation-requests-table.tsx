"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronRight, Check, X, AlertTriangle, Link2, Power, Bell } from "lucide-react"
import { HardLink } from "@/components/hard-link"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import {
  type EnrichedActivationRow,
  type WiringStatus,
  fixParentLinkAction,
  fixProfileActiveAction,
  resendNotificationAction,
} from "@/app/actions/fundraising/fundraising-activation-actions"
import { ActivationRequestReviewButtons } from "./activation-request-review-buttons"

const WIRING_STEPS: { key: keyof WiringStatus; label: string; fixKey?: "parentLink" | "profileActive" | "notification" }[] = [
  { key: "athleteResolved", label: "Athlete resolved" },
  { key: "profileActive", label: "Profile active", fixKey: "profileActive" },
  { key: "checkoutLive", label: "Checkout live", fixKey: "profileActive" },
  { key: "parentLinked", label: "Parent linked", fixKey: "parentLink" },
  { key: "notificationSent", label: "Family notified", fixKey: "notification" },
]

function WiringStepper({ wiring, status }: { wiring: WiringStatus; status: string }) {
  const isRejected = status === "rejected"
  const isPending = status === "pending"

  return (
    <div className="flex items-center gap-0">
      {WIRING_STEPS.map((step, i) => {
        const done = wiring[step.key]
        const isGray = isRejected || (isPending && !done)

        return (
          <div key={step.key} className="flex items-center">
            {i > 0 && (
              <div
                className={`h-0.5 w-6 ${
                  isGray ? "bg-gray-200" : done ? "bg-emerald-400" : "bg-red-300"
                }`}
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                  isGray
                    ? "border-gray-200 bg-gray-50"
                    : done
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-red-400 bg-red-50"
                }`}
              >
                {isGray ? (
                  <span className="text-xs text-gray-400">{i + 1}</span>
                ) : done ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <X className="h-3.5 w-3.5 text-red-500" />
                )}
              </div>
              <span
                className={`text-[10px] font-medium leading-tight text-center w-16 ${
                  isGray ? "text-gray-400" : done ? "text-emerald-700" : "text-red-600"
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function FixButtons({ row }: { row: EnrichedActivationRow }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [fixingKey, setFixingKey] = useState<string | null>(null)

  const runFix = (key: string, action: (id: string) => Promise<{ ok: boolean; error?: string }>) => {
    setFixingKey(key)
    startTransition(async () => {
      const res = await action(row.id)
      if (res.ok) {
        toast({ title: "Fixed", description: `${key} completed.` })
        router.refresh()
      } else {
        toast({ title: "Error", description: res.error ?? "Failed.", variant: "destructive" })
      }
      setFixingKey(null)
    })
  }

  const fixes: { key: string; show: boolean; label: string; icon: React.ReactNode; action: (id: string) => Promise<{ ok: boolean; error?: string }> }[] = [
    {
      key: "parentLink",
      show: !row.wiring.parentLinked && row.wiring.athleteResolved,
      label: "Link parent",
      icon: <Link2 className="mr-1.5 h-3.5 w-3.5" />,
      action: fixParentLinkAction,
    },
    {
      key: "profileActive",
      show: (!row.wiring.profileActive || !row.wiring.checkoutLive) && row.wiring.athleteResolved,
      label: "Activate profile",
      icon: <Power className="mr-1.5 h-3.5 w-3.5" />,
      action: fixProfileActiveAction,
    },
    {
      key: "notification",
      show: !row.wiring.notificationSent && row.wiring.athleteResolved,
      label: "Send notification",
      icon: <Bell className="mr-1.5 h-3.5 w-3.5" />,
      action: resendNotificationAction,
    },
  ]

  const visibleFixes = fixes.filter((f) => f.show)
  if (visibleFixes.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {visibleFixes.map((f) => (
        <Button
          key={f.key}
          size="sm"
          variant="outline"
          disabled={pending}
          className="h-7 text-xs"
          onClick={() => runFix(f.key, f.action)}
        >
          {fixingKey === f.key ? "Fixing..." : <>{f.icon}{f.label}</>}
        </Button>
      ))}
    </div>
  )
}

export function ActivationRequestsTable({ rows }: { rows: EnrichedActivationRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const pendingCount = rows.filter((r) => r.status === "pending").length
  const incompleteCount = rows.filter((r) => r.wiringIncomplete).length

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex gap-3">
        {pendingCount > 0 && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
            {pendingCount} pending
          </span>
        )}
        {incompleteCount > 0 && (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-900">
            {incompleteCount} incomplete wiring
          </span>
        )}
        {pendingCount === 0 && incompleteCount === 0 && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
            All clear
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white shadow-sm">
        {/* Header */}
        <div className="grid grid-cols-[2rem_1fr_1fr_6rem_6rem] gap-3 border-b px-4 py-3 text-xs font-medium text-gray-500">
          <div />
          <div>Slug</div>
          <div>Requester</div>
          <div>Status</div>
          <div className="text-right">Wiring</div>
        </div>

        {/* Rows */}
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-gray-400">
            No activation requests yet.
          </div>
        ) : (
          rows.map((r) => {
            const isExpanded = expandedId === r.id
            const allWired = Object.values(r.wiring).every(Boolean)

            return (
              <div key={r.id} className={`border-b last:border-b-0 ${isExpanded ? "bg-gray-50/50" : ""}`}>
                {/* Main row */}
                <button
                  type="button"
                  className="grid w-full grid-cols-[2rem_1fr_1fr_6rem_6rem] gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                >
                  <div className="flex items-center">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-sm font-medium text-blue-600">
                      {r.fundraising_slug}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {new Date(r.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                    </span>
                  </div>

                  <div className="flex items-center truncate text-xs text-gray-500">
                    {r.requester_email ?? "no email"}
                  </div>

                  <div className="flex items-center">
                    <span
                      className={
                        r.status === "pending"
                          ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950"
                          : r.status === "approved"
                            ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-950"
                            : "rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600"
                      }
                    >
                      {r.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-end">
                    {r.status === "rejected" ? (
                      <span className="text-xs text-gray-400">n/a</span>
                    ) : r.status === "pending" ? (
                      <span className="text-xs text-gray-400">pending</span>
                    ) : allWired ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <Check className="h-3.5 w-3.5" /> Complete
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
                        <AlertTriangle className="h-3.5 w-3.5" /> Incomplete
                      </span>
                    )}
                  </div>
                </button>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 px-6 py-4">
                    <div className="space-y-4">
                      {/* Stepper */}
                      <div>
                        <p className="mb-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Wiring progress</p>
                        <WiringStepper wiring={r.wiring} status={r.status} />
                      </div>

                      {/* Details grid */}
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                        <div>
                          <span className="text-gray-500">User ID:</span>{" "}
                          <span className="font-mono">{r.user_id.slice(0, 12)}...</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Athlete ID:</span>{" "}
                          <span className="font-mono">{r.athlete_id ? `${r.athlete_id.slice(0, 12)}...` : "none"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Reviewed:</span>{" "}
                          <span>{r.reviewed_at ? new Date(r.reviewed_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "not yet"}</span>
                        </div>
                        <div>
                          <HardLink
                            href={`/fundraising/athletes/${encodeURIComponent(r.fundraising_slug)}`}
                            className="text-blue-600 underline-offset-4 hover:underline"
                          >
                            View athlete page
                          </HardLink>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-4 pt-1">
                        {r.status === "pending" && (
                          <ActivationRequestReviewButtons requestId={r.id} fundraisingSlug={r.fundraising_slug} />
                        )}
                        {r.status === "approved" && r.wiringIncomplete && (
                          <FixButtons row={r} />
                        )}
                        {r.status === "approved" && !r.wiringIncomplete && (
                          <p className="text-xs text-emerald-600 font-medium">All wiring complete - family is operational.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
