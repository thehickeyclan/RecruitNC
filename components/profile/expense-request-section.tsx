"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  EXPENSE_STATUS_LABELS,
  EXPENSE_STATUS_PARENT_DESCRIPTIONS,
  EXPENSE_TYPE_OPTIONS,
  displayExpenseType,
  type ExpenseRequestStatus,
} from "@/lib/athlete-expense-requests"
import { Receipt, Loader2, ExternalLink, RefreshCw, ChevronDown, CircleHelp, CheckCircle2 } from "lucide-react"
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
  reviewed_at?: string | null
  updated_at?: string | null
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

export function ExpenseRequestSection({ linkedAthletes = [] }: { linkedAthletes?: Linked[] }) {
  const { toast } = useToast()
  const [tab, setTab] = useState("request")
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
  /** After successful submit, show acknowledgment before returning to the form. */
  const [submissionAck, setSubmissionAck] = useState(false)

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
        description: "Try again in a moment or contact NC United staff.",
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
      setAmount("")
      setParentNotes("")
      setZelleInfo("")
      setVenmoInfo("")
      setFile(null)
      await load()
      setSubmissionAck(true)
      toast({ title: "Request received", description: "See confirmation below." })
    } catch (e) {
      console.error("[RecruitNC] expense submit", e)
      toast({
        title: "Could not submit",
        description: "We couldn&apos;t send your request. Try again or contact NC United staff.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden">
      <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-[#fef2f2]/30 px-4 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#03154C] text-[#e8d5a3] shadow-sm">
            <Receipt className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">Reimbursements</CardTitle>
            <CardDescription className="text-sm text-slate-600 leading-relaxed max-w-prose">
              Staff reviews each request. Add Zelle or Venmo for payout if approved. We&apos;ll email you when the status
              changes.
            </CardDescription>
          </div>
        </div>
      </div>
      <CardContent className="px-4 py-5 sm:px-6 sm:py-6">
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v)
            if (v === "status") void load()
          }}
          className="w-full"
        >
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-slate-100/90 p-1 text-slate-600">
            <TabsTrigger
              value="request"
              className="rounded-lg px-2 py-2.5 text-center text-[11px] font-semibold leading-tight shadow-none data-[state=active]:bg-white data-[state=active]:text-[#03154C] data-[state=active]:shadow-sm sm:text-sm sm:py-2"
            >
              Reimbursement request
            </TabsTrigger>
            <TabsTrigger
              value="status"
              className="rounded-lg px-2 py-2.5 text-center text-[11px] font-semibold leading-tight shadow-none data-[state=active]:bg-white data-[state=active]:text-[#03154C] data-[state=active]:shadow-sm sm:text-sm sm:py-2"
            >
              Reimbursement status
              {rows.length > 0 ? (
                <span className="ml-0.5 tabular-nums text-slate-500 data-[state=active]:text-[#003366]">
                  ({rows.length})
                </span>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="request" className="mt-4 space-y-4 focus-visible:outline-none">
            <Collapsible className="rounded-xl border border-[#003366]/12 bg-white/90 shadow-sm">
              <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-3 text-left text-sm font-semibold text-[#03154C] hover:bg-slate-50/80 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#003366]/30 data-[state=open]:rounded-b-none data-[state=open]:border-b data-[state=open]:border-[#003366]/10">
                <CircleHelp className="h-4 w-4 shrink-0 text-[#003366]" aria-hidden />
                <span className="min-w-0 flex-1">What can be reimbursed?</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden px-3 pb-3 pt-0 text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <div className="rounded-b-lg border-t border-[#003366]/8 bg-slate-50/60 px-1 py-3 sm:px-2">
                  <p className="text-xs text-slate-700 leading-relaxed mb-3">
                    NC United operates as a <strong className="font-semibold text-slate-900">501(c)(3)</strong> nonprofit.
                    Reimbursements are only for expenses that{" "}
                    <strong className="font-semibold text-slate-900">support our exempt mission</strong>—for example
                    athlete training, competition, and team programs—and that we can document consistent with{" "}
                    <strong className="font-semibold text-slate-900">IRS expectations</strong> for how tax-exempt
                    organizations spend and record funds. Personal, unrelated, or non-program costs are not eligible.
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed mb-3">
                    Use the categories below when you submit a request. Staff reviews each submission; approval and payout
                    depend on program policy, available funds, and whether the expense clearly fits that nonprofit purpose—not
                    every submission will qualify.
                  </p>
                  <ul className="list-disc pl-5 text-sm text-slate-800 space-y-1.5 marker:text-[#003366]">
                    {EXPENSE_TYPE_OPTIONS.map((o) => (
                      <li key={o.value}>{o.label}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                    For <strong className="font-medium text-slate-700">Other</strong>, describe the expense in the notes so
                    we can see the nonprofit connection.{" "}
                    <strong className="font-medium text-slate-700">Upload receipts or invoices whenever you have them</strong>
                    —clear documentation helps us run reimbursements responsibly and keep records straight. (General
                    information only; not legal or tax advice for your family.)
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {linkedAthletes.length === 0 ? (
              <p className="text-sm text-slate-600">
                Link an athlete on the <span className="font-medium text-[#03154C]">Family &amp; athletes</span> tab to
                submit a request.
              </p>
            ) : submissionAck ? (
              <div
                className="mx-auto w-full max-w-lg rounded-xl border border-[#0f5132]/30 bg-gradient-to-b from-[#0f5132]/6 to-white px-4 py-6 sm:px-6 sm:py-8 shadow-sm"
                role="status"
                aria-live="polite"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0f5132]/15 text-[#0f5132]">
                    <CheckCircle2 className="h-8 w-8" aria-hidden />
                  </span>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-[#03154C]">We received your reimbursement request</h3>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      Thank you. NC United staff will review it shortly and may follow up if we need anything else.
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      You&apos;ll get an <strong className="font-medium text-slate-800">email notification</strong> when
                      the status changes (approved, not approved, or paid).
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      You can always confirm details on the{" "}
                      <strong className="font-medium text-[#03154C]">Reimbursement status</strong> tab.
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center pt-2">
                    <Button
                      type="button"
                      className="w-full sm:w-auto bg-[#03154C] hover:bg-[#0a2a6e] text-white"
                      onClick={() => {
                        setSubmissionAck(false)
                        setTab("status")
                      }}
                    >
                      View reimbursement status
                    </Button>
                    <Button type="button" variant="outline" className="w-full sm:w-auto border-[#003366]/25" onClick={() => setSubmissionAck(false)}>
                      Submit another request
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mx-auto w-full max-w-lg space-y-4">
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
                  className="w-full sm:w-auto bg-[#03154C] hover:bg-[#0a2a6e] text-white shadow-md"
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
          </TabsContent>

          <TabsContent value="status" className="mt-4 space-y-3 focus-visible:outline-none">
            <div className="rounded-lg border border-[#003366]/10 bg-slate-50/90 px-3 py-3 text-xs text-slate-600 space-y-2">
              <p className="font-semibold text-slate-800">Status guide</p>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {(Object.keys(EXPENSE_STATUS_LABELS) as ExpenseRequestStatus[]).map((k) => (
                  <li key={k} className="leading-snug">
                    <span className="font-medium text-[#03154C]">{EXPENSE_STATUS_LABELS[k]}:</span>{" "}
                    {EXPENSE_STATUS_PARENT_DESCRIPTIONS[k]}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                All requests tied to your account, newest first.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 border-[#003366]/20 text-[#03154C]"
                disabled={loading}
                onClick={() => void load()}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Refresh
                  </>
                )}
              </Button>
            </div>
            {loading ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2 py-8 justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-[#003366]" />
                Loading requests…
              </p>
            ) : rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#003366]/15 bg-slate-50/80 px-4 py-8 text-center">
                <p className="text-sm text-slate-600">No reimbursement requests yet.</p>
                <p className="text-xs text-slate-500 mt-1">Submit one from the other tab.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {rows.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-[#003366]/10 bg-slate-50/80 px-3 py-3 sm:px-4 sm:py-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-[#03154C] leading-tight">{r.athlete_name || "Athlete"}</p>
                          <Badge variant={statusVariant(r.status)} className="text-[10px] font-normal leading-snug sm:text-xs max-w-[min(100%,14rem)] whitespace-normal text-center sm:text-left">
                            {EXPENSE_STATUS_LABELS[r.status]}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">
                          Submitted {new Date(r.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                        <p className="text-sm text-slate-700">{displayExpenseType(r.expense_type)}</p>
                        {r.parent_notes ? (
                          <p className="text-xs text-slate-600 border-l-2 border-[#CBAF5D]/60 pl-2 mt-1">{r.parent_notes}</p>
                        ) : null}
                      </div>
                      <div className="shrink-0 space-y-1 sm:text-right">
                        <p className="text-sm font-bold tabular-nums text-[#003366]">{formatMoney(r.amount_cents)}</p>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Requested</p>
                        {r.amount_approved_cents != null && r.amount_approved_cents !== r.amount_cents ? (
                          <p className="text-xs text-slate-700 tabular-nums pt-1">
                            Approved: <span className="font-semibold">{formatMoney(r.amount_approved_cents)}</span>
                          </p>
                        ) : null}
                        {r.status === "paid" && r.paid_at ? (
                          <p className="text-xs text-slate-600 pt-1">
                            Paid {new Date(r.paid_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {r.admin_notes ? (
                      <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-[#003366]/8">
                        <span className="font-medium text-slate-700">Staff note: </span>
                        {r.admin_notes}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {r.document_url ? (
                        <a
                          href={r.document_url}
                          className="inline-flex items-center gap-1 text-sm font-medium text-[#003366] underline underline-offset-2"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Receipt / document
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">No document uploaded</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
