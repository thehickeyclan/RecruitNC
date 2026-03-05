"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Loader2, RefreshCw, DollarSign } from "lucide-react"
import { HardLink } from "@/components/hard-link"

const STORE_GREEN = "#1a5f4a"

type PayoutRow = {
  id: string
  amount: number
  amountFormatted: string
  currency: string
  status: string
  method: string
  arrivalDate: string
  createdAt: number
  destination: string
}

export default function AdminOrdersPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/orders/payouts", { credentials: "include" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || `Failed (${res.status})`)
        setPayouts([])
        return
      }
      setPayouts(data.payouts ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load payouts")
      setPayouts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <HardLink href="/admin/orders"><ArrowLeft className="h-4 w-4" /></HardLink>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-[#003366]">Stripe Payouts</h1>
            <p className="text-sm text-gray-600">Same data as Stripe Dashboard → Transactions → Payouts. Amount, destination, arrive by, status.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-sm text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" style={{ color: STORE_GREEN }} />
              Payouts
            </CardTitle>
            <CardDescription>Recent payouts to your bank. Data from Stripe.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && payouts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#003366]" />
                <p className="text-sm text-gray-600">Loading payouts…</p>
              </div>
            ) : payouts.length === 0 ? (
              <p className="py-8 text-center text-gray-500">No payouts returned. Check Stripe or try again.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Arrive by</TableHead>
                      <TableHead>Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.amountFormatted}</TableCell>
                        <TableCell>
                          <span
                            className={
                              p.status === "paid"
                                ? "text-green-600"
                                : p.status === "failed" || p.status === "canceled"
                                  ? "text-red-600"
                                  : "text-amber-600"
                            }
                          >
                            {p.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-700">{p.destination}</TableCell>
                        <TableCell className="text-gray-600">
                          {p.arrivalDate
                            ? new Date(p.arrivalDate + "T12:00:00").toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-gray-500">{p.method}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
