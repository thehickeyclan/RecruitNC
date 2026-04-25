"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  EXPENSE_STATUS_LABELS,
  EXPENSE_TYPE_OPTIONS,
  displayExpenseType,
  type ExpenseRequestStatus,
} from "@/lib/athlete-expense-requests"
import { Receipt, Loader2, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type Linked = { id: string; name: string }

type ExpenseRow = {
  id: string
  athlete_id: string
  athlete_name: string
  expense_type: string
  amount_cents: number
  amount_approved_cents: number | null
  payment_method: string
  zelle_info: string | null
  venmo_info: string | null
  parent_notes: string | null
  document_url: string | null
  status: ExpenseRequestStatus
  admin_notes: string | null
  created_at: string
  paid_at: string | null
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}

function statusVariant(s: ExpenseRequestStatus): "default" | "secondary" | "destructive" | "outline" {
  if (s === "approved") return "default"
  if (s === "paid") return "secondary"
  if (s === "rejected") return "destructive"
  return "outline"
}

export function ExpenseRequestSection({ linkedAthletes }: { linkedAthletes: Linked[] }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [rows, setRows] = useState<ExpenseRow[]>([])

  const [athleteId, setAthleteId] = useState("")
  const [expenseType, setExpenseType] = useState("")
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"zelle" | "venmo" | "">("")
  const [zelleInfo, setZelleInfo] = useState("")
  const [venmoInfo, setVenmoInfo] = useState("")
  const [parentNotes, setParentNotes] = useState("")
  const [file, setFile] = useState<File | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/profile/expense-requests", { cache: "no-store", credentials: "include" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Could not load requests")
      }
      setRows(data.requests ?? [])
    } catch (e) {
      console.error("[RecruitNC] expense list", e)
      toast({
        title: "Could not load reimbursement requests",
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

  useEffect(() => {
    if (linkedAthletes.length === 1 && !athleteId) {
      setAthleteId(linkedAthletes[0].id)
    }
  }, [linkedAthletes, athleteId])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!athleteId || !expenseType || !amount || !paymentMethod) {
      toast({ title: "Fill in all required fields", variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.set("athleteId", athleteId)
      fd.set("expenseType", expenseType)
      fd.set("amountDollars", amount)
      fd.set("paymentMethod", paymentMethod)
      if (paymentMethod === "zelle") fd.set("zelleInfo", zelleInfo)
      if (paymentMethod === "venmo") fd.set("venmoInfo", venmoInfo)
      if (parentNotes) fd.set("parentNotes", parentNotes)
      if (file) fd.set("document", file)

      const res = await fetch("/api/profile/expense-requests", {
        method: "POST",
        body: fd,
        credentials: "include",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Submit failed")
      }
      toast({ title: "Reimbursement request submitted" })
      setAmount("")
      setParentNotes("")
      setZelleInfo("")
      setVenmoInfo("")
      setFile(null)
      void load()
    } catch (err) {
      toast({
        title: "Could not submit",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-[#003366]/10 shadow-md shadow-[#003366]/5 overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-[#03154C] via-[#B31B1B] to-[#CBAF5D]" aria-hidden />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#03154C]">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#03154C] text-[#CBAF5D]">
            <Receipt className="h-4 w-4" />
          </span>
          Reimbursement requests
        </CardTitle>
        <CardDescription className="text-slate-600">
          Request reimbursement for approved team (training) expenses. Submissions are reviewed by NC United staff. Payouts
          are not guaranteed and depend on program policy and available funds. Provide Zelle or Venmo details for payout.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {linkedAthletes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Link an athlete on the <span className="font-medium">Family &amp; athletes</span> tab to submit a
            reimbursement request.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 max-w-lg">
            <div className="space-y-2">
              <Label htmlFor="exp-athlete">Athlete</Label>
              <Select value={athleteId} onValueChange={setAthleteId} required>
                <SelectTrigger id="exp-athlete">
                  <SelectValue placeholder="Select athlete" />
                </SelectTrigger>
                <SelectContent>
                  {linkedAthletes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-type">Category</Label>
              <Select value={expenseType} onValueChange={setExpenseType} required>
                <SelectTrigger id="exp-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-amt">Amount requested (USD)</Label>
              <Input
                id="exp-amt"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Payout method</Label>
              <Select
                value={paymentMethod || undefined}
                onValueChange={(v) => setPaymentMethod(v as "zelle" | "venmo")}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Zelle or Venmo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zelle">Zelle</SelectItem>
                  <SelectItem value="venmo">Venmo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentMethod === "zelle" && (
              <div className="space-y-2">
                <Label htmlFor="zelle">Zelle email or phone</Label>
                <Input
                  id="zelle"
                  autoComplete="off"
                  value={zelleInfo}
                  onChange={(e) => setZelleInfo(e.target.value)}
                  required
                />
              </div>
            )}
            {paymentMethod === "venmo" && (
              <div className="space-y-2">
                <Label htmlFor="venmo">Venmo @username</Label>
                <Input
                  id="venmo"
                  autoComplete="off"
                  placeholder="@yourname"
                  value={venmoInfo}
                  onChange={(e) => setVenmoInfo(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="exp-notes">Notes (optional)</Label>
              <Textarea
                id="exp-notes"
                value={parentNotes}
                onChange={(e) => setParentNotes(e.target.value)}
                rows={3}
                placeholder="Tournament name, date, or other context"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-file">Receipt or invoice (optional)</Label>
              <Input
                id="exp-file"
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">PDF or image, up to 10MB.</p>
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#03154C] hover:bg-[#0a2a6e] text-white shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit reimbursement request"
              )}
            </Button>
          </form>
        )}

        <div>
          <h3 className="text-sm font-medium mb-2 text-[#03154C]">Your reimbursement requests</h3>
          {loading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reimbursement requests yet.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Athlete</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Doc</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(r.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">{r.athlete_name}</TableCell>
                      <TableCell className="text-sm max-w-[140px]">{displayExpenseType(r.expense_type)}</TableCell>
                      <TableCell className="text-sm">
                        {formatMoney(r.amount_cents)}
                        {r.amount_approved_cents != null && r.amount_approved_cents !== r.amount_cents ? (
                          <span className="text-muted-foreground text-xs block">
                            Approved: {formatMoney(r.amount_approved_cents)}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(r.status)} className="text-xs font-normal">
                          {EXPENSE_STATUS_LABELS[r.status]}
                        </Badge>
                        {r.admin_notes ? (
                          <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">{r.admin_notes}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.document_url ? (
                          <a
                            href={r.document_url}
                            className="inline-flex items-center gap-1 text-sm text-primary underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
