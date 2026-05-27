"use client"

import { useEffect, useState } from "react"
import { Mail } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
import { useToast } from "@/hooks/use-toast"
import {
  dateToInputValue,
  defaultReceiptGreetingName,
  formatCentsDollars,
  localDateToNoonIso,
  nationalTeamProgramLabel,
  nationalTeamReceiptTotalCents,
  nationalTeamRegistrationIsPaid,
  parseDollarsToCents,
  type NationalTeamFeeReceiptRegistration,
} from "@/lib/national-team-fee-receipt-ui"

type Props = {
  registration: NationalTeamFeeReceiptRegistration | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSent?: () => void | Promise<void>
}

export function NationalTeamFeeReceiptSendButton({
  registration,
  onClick,
  className,
}: {
  registration: NationalTeamFeeReceiptRegistration
  onClick: () => void
  className?: string
}) {
  const paid = nationalTeamRegistrationIsPaid(registration)
  const total = nationalTeamReceiptTotalCents(registration)
  if (!paid || total <= 0) {
    return <span className="text-muted-foreground text-sm">—</span>
  }

  return (
    <div className={`flex flex-col gap-1.5 items-start ${className ?? ""}`}>
      {registration.fee_receipt_email_sent_at ? (
        <Badge className="border-0 bg-green-600 text-[10px] font-medium text-white hover:bg-green-600">
          Receipt sent
        </Badge>
      ) : (
        <Badge className="border-0 bg-amber-600 text-[10px] font-medium text-white hover:bg-amber-600">
          Receipt not sent
        </Badge>
      )}
      <Button
        type="button"
        size="sm"
        className="h-8 gap-1.5 text-xs bg-[#13294B] hover:bg-[#03154C] text-white"
        onClick={onClick}
      >
        <Mail className="h-3.5 w-3.5" />
        Send receipt
      </Button>
    </div>
  )
}

export function NationalTeamFeeReceiptDialog({ registration, open, onOpenChange, onSent }: Props) {
  const { toast } = useToast()
  const [firstName, setFirstName] = useState("")
  const [to, setTo] = useState("")
  const [amountDollars, setAmountDollars] = useState("")
  const [dateStr, setDateStr] = useState("")
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [previewBusy, setPreviewBusy] = useState(false)
  const [sendBusy, setSendBusy] = useState(false)

  function resetFromRow(r: NationalTeamFeeReceiptRegistration) {
    setFirstName(defaultReceiptGreetingName(r))
    setTo((r.parent_email ?? "").trim())
    setAmountDollars(formatCentsDollars(nationalTeamReceiptTotalCents(r)))
    setDateStr(dateToInputValue(r.created_at))
    setPreviewHtml(null)
    setMsg(null)
  }

  const row = registration

  useEffect(() => {
    if (open && row) resetFromRow(row)
  }, [open, row?.id])

  async function runPreview() {
    if (!row) return
    setMsg(null)
    const cents = parseDollarsToCents(amountDollars)
    if (cents == null) {
      setMsg("Enter a valid amount.")
      return
    }
    if (!dateStr) {
      setMsg("Choose a payment date.")
      return
    }
    if (!to.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      setMsg("Enter a valid recipient email.")
      return
    }
    setPreviewBusy(true)
    setPreviewHtml(null)
    try {
      const athleteFull = `${row.athlete_first_name} ${row.athlete_last_name}`.trim()
      const res = await fetch("/api/admin/national-team-fee-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "preview",
          firstName: firstName.trim(),
          amountCents: cents,
          paymentDateIso: localDateToNoonIso(dateStr),
          recipientEmail: to.trim(),
          athleteFullName: athleteFull,
          programLabel: nationalTeamProgramLabel(row.event_slug),
        }),
      })
      const j = (await res.json()) as {
        error?: string
        preview?: { html: string; subject: string; to: string; from: string }
      }
      if (!res.ok) throw new Error(j.error || "Preview failed")
      if (j.preview?.html) setPreviewHtml(j.preview.html)
      else setMsg("No preview returned.")
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Preview failed")
    } finally {
      setPreviewBusy(false)
    }
  }

  async function sendReceiptEmail() {
    if (!row) return
    setMsg(null)
    const cents = parseDollarsToCents(amountDollars)
    if (cents == null) {
      setMsg("Enter a valid amount.")
      return
    }
    if (!dateStr) {
      setMsg("Choose a payment date.")
      return
    }
    if (!to.trim()) {
      setMsg("Missing email.")
      return
    }
    setSendBusy(true)
    try {
      const athleteFull = `${row.athlete_first_name} ${row.athlete_last_name}`.trim()
      const res = await fetch("/api/admin/national-team-fee-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "send",
          registrationId: row.id,
          firstName: firstName.trim(),
          amountCents: cents,
          paymentDateIso: localDateToNoonIso(dateStr),
          recipientEmail: to.trim(),
          athleteFullName: athleteFull,
          programLabel: nationalTeamProgramLabel(row.event_slug),
        }),
      })
      const j = (await res.json()) as { error?: string; warning?: string; ok?: boolean }
      if (!res.ok) throw new Error(j.error || "Send failed")
      if (j.warning) {
        toast({ title: "Receipt sent (log issue)", description: j.warning })
        setMsg(j.warning)
      } else {
        toast({ title: "Receipt sent", description: `Emailed ${to.trim()}` })
        setMsg(null)
      }
      onOpenChange(false)
      await onSent?.()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Send failed")
    } finally {
      setSendBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setPreviewHtml(null)
          setMsg(null)
        }
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Send National Team payment receipt</DialogTitle>
          <DialogDescription>
            Emails the official NC United receipt via Resend. Recipient must match the Stripe checkout email (
            {row?.parent_email ?? "parent email"}).
          </DialogDescription>
        </DialogHeader>
        {row ? (
          <div className="space-y-3 text-sm">
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs space-y-1">
              <p>
                <span className="text-muted-foreground">Athlete: </span>
                {row.athlete_first_name} {row.athlete_last_name}
              </p>
              <p>
                <span className="text-muted-foreground">Program: </span>
                {nationalTeamProgramLabel(row.event_slug)}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nt-rcpt-first">First name (greeting)</Label>
              <Input
                id="nt-rcpt-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Parent or payer first name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nt-rcpt-to">To (Stripe checkout email)</Label>
              <Input
                id="nt-rcpt-to"
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nt-rcpt-amt">Amount (USD)</Label>
              <Input
                id="nt-rcpt-amt"
                inputMode="decimal"
                value={amountDollars}
                onChange={(e) => setAmountDollars(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nt-rcpt-date">Payment date (shown in email)</Label>
              <Input id="nt-rcpt-date" type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
            </div>
            {previewHtml ? (
              <div className="rounded-md border bg-white p-3">
                <p className="text-muted-foreground mb-2 text-[10px] font-medium uppercase">Preview</p>
                <iframe
                  title="Email preview"
                  className="h-[min(280px,40vh)] w-full rounded border-0 bg-white text-black"
                  srcDoc={previewHtml}
                />
              </div>
            ) : null}
            {msg ? (
              <p className="text-destructive text-sm" role="alert">
                {msg}
              </p>
            ) : null}
          </div>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="secondary" onClick={() => void runPreview()} disabled={previewBusy || !row}>
            {previewBusy ? "Preview…" : "Preview"}
          </Button>
          <Button type="button" onClick={() => void sendReceiptEmail()} disabled={sendBusy || !row}>
            {sendBusy ? "Sending…" : "Send receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Hook for pages that list registrations — open dialog for a row. */
export function useNationalTeamFeeReceiptDialog(onSent?: () => void | Promise<void>) {
  const [open, setOpen] = useState(false)
  const [registration, setRegistration] = useState<NationalTeamFeeReceiptRegistration | null>(null)

  function openReceipt(r: NationalTeamFeeReceiptRegistration) {
    setRegistration(r)
    setOpen(true)
  }

  const dialog = (
    <NationalTeamFeeReceiptDialog
      registration={registration}
      open={open}
      onOpenChange={setOpen}
      onSent={onSent}
    />
  )

  return { openReceipt, dialog }
}
