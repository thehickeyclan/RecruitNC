"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  TOC_STATUS_REASON_LABELS,
  TOC_STATUS_REASONS,
  type TocStatusReason,
} from "@/lib/toc/invitations"

type Props = {
  open: boolean
  athleteName: string
  action: "declined" | "withdrew"
  busy?: boolean
  description?: string
  onOpenChange: (open: boolean) => void
  onSubmit: (reason: TocStatusReason, otherReason: string | null) => void | Promise<void>
}

export function TocStatusReasonDialog({
  open,
  athleteName,
  action,
  busy = false,
  description,
  onOpenChange,
  onSubmit,
}: Props) {
  const [reason, setReason] = useState<TocStatusReason | "">("")
  const [otherReason, setOtherReason] = useState("")

  useEffect(() => {
    if (!open) {
      setReason("")
      setOtherReason("")
    }
  }, [open])

  const needsOther = reason === "other"
  const canSubmit = reason !== "" && (!needsOther || otherReason.trim().length > 0)

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark {athleteName} {action}</DialogTitle>
          <DialogDescription>
            {description ?? `Select why this athlete ${action === "declined" ? "declined the invitation" : "withdrew from the tournament"}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(value) => setReason(value as TocStatusReason)} disabled={busy}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {TOC_STATUS_REASONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {TOC_STATUS_REASON_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsOther ? (
            <div className="space-y-2">
              <Label htmlFor="toc-status-other-reason">Other reason</Label>
              <Input
                id="toc-status-other-reason"
                value={otherReason}
                onChange={(event) => setOtherReason(event.target.value)}
                placeholder="Briefly explain"
                maxLength={500}
                disabled={busy}
                autoFocus
              />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!canSubmit || busy}
            onClick={() => reason && void onSubmit(reason, needsOther ? otherReason.trim() : null)}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Mark {action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
