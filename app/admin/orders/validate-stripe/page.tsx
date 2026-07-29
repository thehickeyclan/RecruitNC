"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Download, ExternalLink, RefreshCw } from "lucide-react"
import { HardLink } from "@/components/hard-link"
import { toast } from "sonner"
import type { ValidatedOrderRow } from "@/lib/store/validate-orders-against-stripe"

type ValidationSummary = {
  checked: number
  ship: number
  notPaid: number
  noStripeId: number
  amountMismatch: number
  stripeErrors: number
  duplicateGroups: number
}

const VERDICT_BADGE: Record<string, string> = {
  ship: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  not_paid: "bg-gray-500/20 text-gray-300 border-gray-500/40",
  no_stripe_id: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  amount_mismatch: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  stripe_error: "bg-red-500/20 text-red-300 border-red-500/40",
}

function verdictLabelShort(verdict: string): string {
  if (verdict === "ship") return "Ship"
  if (verdict === "not_paid") return "Not paid"
  if (verdict === "no_stripe_id") return "No PI"
  if (verdict === "amount_mismatch") return "Amount mismatch"
  return "Stripe error"
}

function downloadCsv(rows: ValidatedOrderRow[]) {
  const header = [
    "order_number",
    "verdict",
    "verdict_detail",
    "customer_name",
    "customer_email",
    "product",
    "total",
    "recruitnc_status",
    "stripe_status",
    "stripe_amount",
    "stripe_payment_intent_id",
    "stripe_dashboard_url",
    "duplicate",
    "placed_at",
  ]
  const lines = rows.map((r) =>
    [
      r.orderNumber,
      r.verdict,
      r.verdictLabel,
      r.customerName ?? "",
      r.customerEmail ?? "",
      r.productSummary,
      r.total.toFixed(2),
      r.recruitncStatus,
      r.stripeStatus ?? "",
      r.stripeAmount != null ? r.stripeAmount.toFixed(2) : "",
      r.stripePaymentIntentId ?? "",
      r.stripeDashboardUrl ?? "",
      r.isDuplicate ? "yes" : "no",
      r.placedAt ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  )
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `stripe-order-validation-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ValidateStripeOrdersPage() {
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<ValidatedOrderRow[]>([])
  const [summary, setSummary] = useState<ValidationSummary | null>(null)
  const [filter, setFilter] = useState<"all" | "ship" | "not_paid">("ship")

  const runValidation = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/orders/validate-stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 200 }),
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error || "Validation failed", data.hint ? { description: data.hint } : undefined)
        return
      }
      setRows(data.rows ?? [])
      setSummary(data.summary ?? null)
      toast.success(`Checked ${data.summary?.checked ?? 0} unshipped apparel orders against Stripe`)
    } catch {
      toast.error("Validation request failed")
    } finally {
      setLoading(false)
    }
  }

  const filtered = rows.filter((r) => {
    if (filter === "all") return true
    if (filter === "ship") return r.verdict === "ship" || r.verdict === "amount_mismatch"
    return r.verdict === "not_paid" || r.verdict === "no_stripe_id"
  })

  return (
    <div className="min-h-screen admin-dark-page bg-[#0A1628] p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              <HardLink href="/admin/orders">
                <ArrowLeft className="h-4 w-4" />
              </HardLink>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Validate orders in Stripe</h1>
              <p className="text-white/60 mt-1">
                Unshipped apparel only — Stripe Payment Intent status is the source of truth for “did they pay?”
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={runValidation}
              disabled={loading}
              className="bg-[#D3B574] text-[#0A1628] hover:bg-[#D3B574]/90"
            >
              {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Run validation
            </Button>
            {rows.length > 0 && (
              <Button
                variant="outline"
                onClick={() => downloadCsv(rows)}
                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            )}
          </div>
        </div>

        <Card className="bg-[#0f1c2e] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">How to read this</CardTitle>
            <CardDescription className="text-white/60">
              Ignore RecruitNC “pending” — look at <strong className="text-white">Stripe status</strong>.{" "}
              <strong className="text-emerald-400">Ship</strong> = money captured in Stripe, product not shipped yet.{" "}
              <strong className="text-gray-300">Not paid</strong> = abandoned checkout — do not ship.{" "}
              Click <strong className="text-white">Open in Stripe</strong> to verify any row in the Stripe Dashboard.
            </CardDescription>
          </CardHeader>
          {summary && (
            <CardContent className="flex flex-wrap gap-3 pt-0">
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Ship: {summary.ship + summary.amountMismatch}
              </Badge>
              <Badge className="bg-gray-500/20 text-gray-300 border border-gray-500/40">
                Not paid: {summary.notPaid}
              </Badge>
              <Badge className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                No Stripe ID: {summary.noStripeId}
              </Badge>
              <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/40">
                Duplicate groups: {summary.duplicateGroups}
              </Badge>
            </CardContent>
          )}
        </Card>

        {rows.length > 0 && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={filter === "ship" ? "default" : "outline"}
              onClick={() => setFilter("ship")}
              className={filter === "ship" ? "bg-emerald-600" : "bg-white/5 border-white/10 text-white"}
            >
              Owes shipment
            </Button>
            <Button
              size="sm"
              variant={filter === "not_paid" ? "default" : "outline"}
              onClick={() => setFilter("not_paid")}
              className={filter === "not_paid" ? "bg-gray-600" : "bg-white/5 border-white/10 text-white"}
            >
              Not paid / junk
            </Button>
            <Button
              size="sm"
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
              className={filter === "all" ? "bg-[#D3B574] text-[#0A1628]" : "bg-white/5 border-white/10 text-white"}
            >
              All ({rows.length})
            </Button>
          </div>
        )}

        {filtered.length > 0 ? (
          <Card className="bg-[#0f1c2e] border-white/10 overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/70">Order</TableHead>
                    <TableHead className="text-white/70">Customer</TableHead>
                    <TableHead className="text-white/70">Product</TableHead>
                    <TableHead className="text-white/70">Stripe</TableHead>
                    <TableHead className="text-white/70">Verdict</TableHead>
                    <TableHead className="text-white/70" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.orderId} className="border-white/10">
                      <TableCell className="text-white align-top">
                        <div className="font-medium">{row.orderNumber}</div>
                        <div className="text-xs text-white/50 mt-1">App status: {row.recruitncStatus}</div>
                        <div className="text-xs text-white/50">${row.total.toFixed(2)}</div>
                      </TableCell>
                      <TableCell className="text-white align-top">
                        <div>{row.customerName || "—"}</div>
                        <div className="text-xs text-white/50">{row.customerEmail || "—"}</div>
                      </TableCell>
                      <TableCell className="text-white/90 align-top text-sm max-w-xs">{row.productSummary}</TableCell>
                      <TableCell className="align-top">
                        {row.stripePaymentIntentId ? (
                          <>
                            <Badge variant="outline" className="border-white/20 text-white/80">
                              {row.stripeStatus ?? "?"}
                            </Badge>
                            {row.stripeAmount != null && (
                              <div className="text-xs text-white/50 mt-1">${row.stripeAmount.toFixed(2)} captured</div>
                            )}
                          </>
                        ) : (
                          <span className="text-white/50 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge className={`border ${VERDICT_BADGE[row.verdict] ?? ""}`}>
                          {verdictLabelShort(row.verdict)}
                          {row.isDuplicate ? " · dup" : ""}
                        </Badge>
                        <p className="text-xs text-white/50 mt-1 max-w-xs">{row.verdictLabel}</p>
                      </TableCell>
                      <TableCell className="align-top text-right space-y-2">
                        {row.stripeDashboardUrl && (
                          <a
                            href={row.stripeDashboardUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-[#D3B574] hover:underline"
                          >
                            Open in Stripe
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        )}
                        <div>
                          <HardLink href={`/admin/orders/${row.orderId}`} className="text-sm text-white/70 hover:text-white">
                            Admin order
                          </HardLink>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          !loading && (
            <Card className="bg-[#0f1c2e] border-white/10">
              <CardContent className="py-12 text-center text-white/60">
                Click <strong className="text-white">Run validation</strong> to pull unshipped apparel orders and check each
                Payment Intent in Stripe.
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  )
}
