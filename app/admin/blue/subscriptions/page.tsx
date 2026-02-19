"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Loader2, ExternalLink } from "lucide-react"
import type { BlueSubscriptionRow } from "@/app/api/admin/blue/subscriptions/route"

type Tab = "good_standing" | "paused" | "canceled"

const STRIPE_DASHBOARD_SUB = "https://dashboard.stripe.com/subscriptions"

export default function AdminBlueSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<BlueSubscriptionRow[]>([])
  const [stats, setStats] = useState({ active: 0, paused: 0, cancelled: 0, pending_payment: 0 })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("good_standing")

  useEffect(() => {
    let cancelled = false
    fetch("/api/admin/blue/subscriptions", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setSubscriptions(data.subscriptions ?? [])
        setStats(data.stats ?? { active: 0, paused: 0, cancelled: 0, pending_payment: 0 })
      })
      .catch(() => {
        if (!cancelled) setSubscriptions([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const filtered =
    tab === "good_standing"
      ? subscriptions.filter((s) => s.status === "active" || s.status === "pending_payment")
      : tab === "paused"
        ? subscriptions.filter((s) => s.status === "paused")
        : subscriptions.filter((s) => s.status === "cancelled" || s.status === "alumni")

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/blue"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#13294B]">NC United Blue</h1>
            <p className="text-sm text-gray-600">Recurring subscriptions · synced to Blue roster</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Overview</CardTitle>
            <CardDescription>Active and paused wrestlers. Canceled includes cancelled and alumni.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-8">
              <div>
                <p className="text-2xl font-bold text-[#13294B]">{stats.active}</p>
                <p className="text-sm text-gray-600">Active</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#13294B]">{stats.paused}</p>
                <p className="text-sm text-gray-600">Paused</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-600">{stats.cancelled}</p>
                <p className="text-sm text-gray-600">Canceled</p>
              </div>
              {stats.pending_payment > 0 && (
                <div>
                  <p className="text-2xl font-bold text-amber-600">{stats.pending_payment}</p>
                  <p className="text-sm text-gray-600">Pending payment</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscriptions</CardTitle>
            <CardDescription>Wrestler, billed to, amount, and status.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 border-b mb-4">
              <Button
                variant={tab === "good_standing" ? "default" : "ghost"}
                size="sm"
                onClick={() => setTab("good_standing")}
                className={tab === "good_standing" ? "bg-[#13294B] hover:bg-[#13294B]/90" : ""}
              >
                Good Standing
              </Button>
              <Button variant={tab === "paused" ? "default" : "ghost"} size="sm" onClick={() => setTab("paused")} className={tab === "paused" ? "bg-[#13294B] hover:bg-[#13294B]/90" : ""}>
                Paused
              </Button>
              <Button variant={tab === "canceled" ? "default" : "ghost"} size="sm" onClick={() => setTab("canceled")} className={tab === "canceled" ? "bg-[#13294B] hover:bg-[#13294B]/90" : ""}>
                Canceled
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#13294B]" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-gray-500">
                {tab === "good_standing" && "No active or pending subscriptions."}
                {tab === "paused" && "No paused subscriptions."}
                {tab === "canceled" && "No canceled subscriptions."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Wrestler(s)</TableHead>
                      <TableHead>Billed to</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Subscription info</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">
                          <Link href={`/admin/athletes/edit/${sub.athlete_id}`} className="text-[#13294B] hover:underline">
                            {sub.athlete_name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <span className="block">{sub.payer_name}</span>
                          {sub.payer_email && <span className="block text-xs text-gray-500">{sub.payer_email}</span>}
                        </TableCell>
                        <TableCell>{sub.amount_display}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          <span className="block">Started {new Date(sub.started_at).toLocaleDateString()}</span>
                          <span className="block">Created {new Date(sub.created_at).toLocaleDateString()}</span>
                          <span className="block text-gray-400">Next due: see Stripe</span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              sub.status === "active"
                                ? "text-green-600"
                                : sub.status === "paused"
                                  ? "text-amber-600"
                                  : sub.status === "pending_payment"
                                    ? "text-amber-600"
                                    : "text-gray-500"
                            }
                          >
                            {sub.status === "pending_payment" ? "Pending payment" : sub.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/admin/athletes/edit/${sub.athlete_id}`}>View athlete</Link>
                            </Button>
                            {sub.stripe_subscription_id && (
                              <a
                                href={`${STRIPE_DASHBOARD_SUB}/${sub.stripe_subscription_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-sm text-[#13294B] hover:underline"
                              >
                                Stripe <ExternalLink className="h-3 w-3 ml-0.5" />
                              </a>
                            )}
                          </div>
                        </TableCell>
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
