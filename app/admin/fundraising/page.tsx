"use client"

import { useEffect, useMemo, useState } from "react"
import { AdminHeader } from "@/components/admin-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { HardLink } from "@/components/hard-link"
import { publicAthleteCreditLabel } from "@/lib/spartan-fayetteville-stripe"
import { SpartanFundraisingVisuals } from "@/components/admin/spartan-fundraising-visuals"
import { ArrowLeft, ClipboardCopy, Coins, Download, Mail, RefreshCw, Wrench } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { firstNameFromDonorName } from "@/lib/email/ncu-donation-acknowledgment"

type SpartanDonationRow = {
  sessionId: string
  createdIso: string
  createdUnix: number
  amountCents: number
  currency: string
  donorEmail: string | null
  donorName: string | null
  donorListPublic: boolean
  raceParticipant: boolean
  fundraisingType: "race_donation" | "gift_only"
  athleteCode: string | null
  athleteDisplayName: string | null
  manualCreditName: string | null
  attribution: "athlete" | "general_nc_united" | "manual_name"
  tierPreference: string
  /** Set when `spartan_donation_receipt_emails` row exists (Supabase). */
  receiptEmailSentAt?: string | null
}

type SpartanAthleteAggregate = {
  athleteCode: string
  totalCents: number
  donationCount: number
  raceSignupCount: number
}

const LS_LEADERBOARD = "recruitnc_admin_fundraising_spartan2026_leaderboard"
const LS_NOTES = "recruitnc_admin_fundraising_spartan2026_notes"

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (currency || "usd").toUpperCase(),
    }).format(cents / 100)
  } catch {
    return `$${(cents / 100).toFixed(2)}`
  }
}

function dateToInputValue(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function localDateToNoonIso(yyyyMmDd: string) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number)
  if (!y || !m || !d) return new Date().toISOString()
  return new Date(y, m - 1, d, 12, 0, 0, 0).toISOString()
}

function parseDollarsToCents(raw: string): number | null {
  const n = Number.parseFloat(raw.replace(/[$,]/g, "").trim())
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

export default function AdminFundraisingPage() {
  const [leaderboard, setLeaderboard] = useState("")
  const [notes, setNotes] = useState("")
  const [mounted, setMounted] = useState(false)

  const [donations, setDonations] = useState<SpartanDonationRow[] | null>(null)
  const [byAthlete, setByAthlete] = useState<SpartanAthleteAggregate[] | null>(null)
  const [generalTotalCents, setGeneralTotalCents] = useState(0)
  const [donationsLoading, setDonationsLoading] = useState(false)
  const [donationsError, setDonationsError] = useState<string | null>(null)
  const [athleteFilter, setAthleteFilter] = useState("")
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "athlete" | "amount">("date-desc")
  const [receiptAckFilter, setReceiptAckFilter] = useState<"all" | "sent" | "unsent">("all")
  const [adminView, setAdminView] = useState<"all" | "byAthlete">("all")

  const [creditFixSessionId, setCreditFixSessionId] = useState("")
  const [creditFixCode, setCreditFixCode] = useState("")
  const [creditFixBusy, setCreditFixBusy] = useState(false)
  const [creditFixMsg, setCreditFixMsg] = useState<string | null>(null)

  const [exportBusy, setExportBusy] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptRow, setReceiptRow] = useState<SpartanDonationRow | null>(null)
  const [receiptFirstName, setReceiptFirstName] = useState("")
  const [receiptTo, setReceiptTo] = useState("")
  const [receiptAmountDollars, setReceiptAmountDollars] = useState("")
  const [receiptDateStr, setReceiptDateStr] = useState("")
  const [receiptPreviewHtml, setReceiptPreviewHtml] = useState<string | null>(null)
  const [receiptPreviewBusy, setReceiptPreviewBusy] = useState(false)
  const [receiptSendBusy, setReceiptSendBusy] = useState(false)
  const [receiptMsg, setReceiptMsg] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    try {
      setLeaderboard(localStorage.getItem(LS_LEADERBOARD) ?? "")
      setNotes(localStorage.getItem(LS_NOTES) ?? "")
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem(LS_LEADERBOARD, leaderboard)
    } catch {
      /* ignore */
    }
  }, [leaderboard, mounted])

  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem(LS_NOTES, notes)
    } catch {
      /* ignore */
    }
  }, [notes, mounted])

  const publicBase =
    typeof window !== "undefined" ? `${window.location.origin}/spartan` : "https://recruitnc.com/spartan"

  const copyTemplate = () => {
    const t = `Optional /spartan bookmark (opens the page ready to give):\n${publicBase}?athlete=NCU-LASTNAME-YY\n\nReplace LASTNAME and YY with grad year (two digits). Donors search and select the athlete by name at checkout — that’s what credits the gift. Example: ${publicBase}?athlete=NCU-SMITH-28`
    void navigator.clipboard.writeText(t)
  }

  const loadDonations = async () => {
    setDonationsLoading(true)
    setDonationsError(null)
    try {
      const res = await fetch("/api/admin/spartan-donations?days=120")
      const j = (await res.json()) as {
        error?: string
        donations?: SpartanDonationRow[]
        byAthlete?: SpartanAthleteAggregate[]
        generalTotalCents?: number
      }
      if (!res.ok) throw new Error(j.error || "Could not load donations")
      setDonations(j.donations ?? [])
      setByAthlete(j.byAthlete ?? [])
      setGeneralTotalCents(typeof j.generalTotalCents === "number" ? j.generalTotalCents : 0)
    } catch (e) {
      setDonationsError(e instanceof Error ? e.message : "Load failed")
      setDonations(null)
      setByAthlete(null)
      setGeneralTotalCents(0)
    } finally {
      setDonationsLoading(false)
    }
  }

  const downloadSpartanCsv = async (kind: "runners" | "receipts" | "credits") => {
    setExportError(null)
    setExportBusy(kind)
    try {
      const res = await fetch(`/api/admin/spartan-export?kind=${kind}&days=120`, { credentials: "include" })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error || "Download failed")
      }
      const blob = await res.blob()
      const dispo = res.headers.get("Content-Disposition")
      const nameMatch = dispo?.match(/filename="([^"]+)"/)
      const filename = nameMatch?.[1] ?? `spartan-${kind}.csv`
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.rel = "noopener"
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Download failed")
    } finally {
      setExportBusy(null)
    }
  }

  const applySpartanCreditFix = async () => {
    setCreditFixMsg(null)
    setCreditFixBusy(true)
    try {
      const res = await fetch("/api/admin/spartan-credit-corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: creditFixSessionId.trim(),
          athlete_code: creditFixCode.trim(),
        }),
      })
      const j = (await res.json()) as { error?: string; message?: string }
      if (!res.ok) throw new Error(j.error || "Save failed")
      setCreditFixMsg(j.message ?? "Saved.")
      setCreditFixSessionId("")
      setCreditFixCode("")
      if (donations !== null) await loadDonations()
    } catch (e) {
      setCreditFixMsg(e instanceof Error ? e.message : "Save failed")
    } finally {
      setCreditFixBusy(false)
    }
  }

  const openReceiptDialog = (d: SpartanDonationRow) => {
    setReceiptRow(d)
    setReceiptFirstName(firstNameFromDonorName(d.donorName))
    setReceiptTo((d.donorEmail ?? "").trim())
    setReceiptAmountDollars((d.amountCents / 100).toFixed(2))
    setReceiptDateStr(dateToInputValue(d.createdIso))
    setReceiptPreviewHtml(null)
    setReceiptMsg(null)
    setReceiptOpen(true)
  }

  const runReceiptPreview = async () => {
    setReceiptMsg(null)
    const cents = parseDollarsToCents(receiptAmountDollars)
    if (cents == null) {
      setReceiptMsg("Enter a valid amount.")
      return
    }
    if (!receiptDateStr) {
      setReceiptMsg("Choose a donation date.")
      return
    }
    if (!receiptTo.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(receiptTo)) {
      setReceiptMsg("Enter a valid recipient email.")
      return
    }
    setReceiptPreviewBusy(true)
    setReceiptPreviewHtml(null)
    try {
      const res = await fetch("/api/admin/spartan-donation-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          firstName: receiptFirstName.trim(),
          amountCents: cents,
          currency: "usd",
          donationDateIso: localDateToNoonIso(receiptDateStr),
          recipientEmail: receiptTo.trim(),
        }),
        credentials: "include",
      })
      const j = (await res.json()) as {
        error?: string
        preview?: { html: string; subject: string; to: string; from: string }
      }
      if (!res.ok) throw new Error(j.error || "Preview failed")
      setReceiptMsg(null)
      if (j.preview?.html) setReceiptPreviewHtml(j.preview.html)
      else setReceiptMsg("No preview returned.")
    } catch (e) {
      setReceiptMsg(e instanceof Error ? e.message : "Preview failed")
    } finally {
      setReceiptPreviewBusy(false)
    }
  }

  const sendReceiptEmail = async () => {
    if (!receiptRow) return
    setReceiptMsg(null)
    const cents = parseDollarsToCents(receiptAmountDollars)
    if (cents == null) {
      setReceiptMsg("Enter a valid amount.")
      return
    }
    if (!receiptDateStr) {
      setReceiptMsg("Choose a donation date.")
      return
    }
    if (cents !== receiptRow.amountCents) {
      setReceiptMsg("Amount must match this Stripe row — refresh the list or fix the value.")
      return
    }
    if (!receiptTo.trim()) {
      setReceiptMsg("Missing email.")
      return
    }
    setReceiptSendBusy(true)
    try {
      const res = await fetch("/api/admin/spartan-donation-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          sessionId: receiptRow.sessionId,
          firstName: receiptFirstName.trim(),
          amountCents: cents,
          currency: "usd",
          donationDateIso: localDateToNoonIso(receiptDateStr),
          recipientEmail: receiptTo.trim(),
        }),
        credentials: "include",
      })
      const j = (await res.json()) as { error?: string; warning?: string; ok?: boolean }
      if (!res.ok) throw new Error(j.error || "Send failed")
      setReceiptMsg(j.warning || "Sent.")
      setReceiptOpen(false)
      setReceiptRow(null)
      if (donations !== null) await loadDonations()
    } catch (e) {
      setReceiptMsg(e instanceof Error ? e.message : "Send failed")
    } finally {
      setReceiptSendBusy(false)
    }
  }

  const ackStats = useMemo(() => {
    const list = donations ?? []
    let sent = 0
    let unsent = 0
    for (const d of list) {
      if (d.receiptEmailSentAt) sent += 1
      else unsent += 1
    }
    return { sent, unsent, total: list.length }
  }, [donations])

  const filteredDonations = useMemo(() => {
    const list = donations ?? []
    const q = athleteFilter.trim().toLowerCase()
    const afterAthlete = q
      ? list.filter(
          (d) =>
            (d.athleteCode ?? "").toLowerCase().includes(q) ||
            (d.manualCreditName ?? "").toLowerCase().includes(q) ||
            (d.athleteDisplayName ?? "").toLowerCase().includes(q),
        )
      : list
    const byAck =
      receiptAckFilter === "sent"
        ? afterAthlete.filter((d) => Boolean(d.receiptEmailSentAt))
        : receiptAckFilter === "unsent"
          ? afterAthlete.filter((d) => !d.receiptEmailSentAt)
          : afterAthlete
    const sorted = [...byAck]
    if (sortBy === "date-desc") sorted.sort((a, b) => b.createdUnix - a.createdUnix)
    else if (sortBy === "date-asc") sorted.sort((a, b) => a.createdUnix - b.createdUnix)
    else if (sortBy === "athlete")
      sorted.sort((a, b) => {
        const ac = (a.athleteCode ?? "").toLowerCase()
        const bc = (b.athleteCode ?? "").toLowerCase()
        if (ac !== bc) return ac.localeCompare(bc)
        return b.createdUnix - a.createdUnix
      })
    else sorted.sort((a, b) => b.amountCents - a.amountCents || b.createdUnix - a.createdUnix)
    return sorted
  }, [donations, athleteFilter, sortBy, receiptAckFilter])

  const filteredTotalCents = useMemo(
    () => filteredDonations.reduce((s, d) => s + d.amountCents, 0),
    [filteredDonations],
  )

  const filteredByAthlete = useMemo(() => {
    const list = byAthlete ?? []
    const q = athleteFilter.trim().toLowerCase()
    if (!q) return list
    return list.filter((a) => a.athleteCode.toLowerCase().includes(q))
  }, [byAthlete, athleteFilter])

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <HardLink href="/admin">
              <ArrowLeft className="h-4 w-4" />
            </HardLink>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-[#003366] md:text-3xl">
              <Coins className="h-8 w-8 text-[#C8102E]" />
              Fundraising
            </h1>
            <p className="text-muted-foreground mt-1">
              Live Stripe donation list (admin), export hints, and scratchpads (saved in this browser only).
            </p>
          </div>
        </div>

        <AdminHeader />

        <Tabs defaultValue="spartan-2026" className="mt-6 w-full">
          <TabsList>
            <TabsTrigger value="spartan-2026">Spartan 2026</TabsTrigger>
            <TabsTrigger value="future" disabled>
              Future campaigns
            </TabsTrigger>
          </TabsList>

          <TabsContent value="spartan-2026" className="mt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>How dollars attach to a kid</CardTitle>
                <CardDescription>
                  Donors credit an athlete by <strong>searching and selecting their name</strong> on the Spartan checkout
                  form (not by &quot;using a link&quot; alone). Optional bookmark URL{" "}
                  <code className="rounded bg-muted px-1">?athlete=NCU-LASTNAME-YY</code> can open the page ready to give.
                  Stripe stores <code className="rounded bg-muted px-1">athlete_code</code> /{" "}
                  <code className="rounded bg-muted px-1">fundraising_code</code> on each payment.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="list-inside list-disc space-y-2">
                  <li>
                    <strong className="text-foreground">Race donation:</strong> donor picks a distance → metadata{" "}
                    <code className="text-xs">race_entry_requested=true</code>,{" "}
                    <code className="text-xs">fundraising_type=race_donation</code>.
                  </li>
                  <li>
                    <strong className="text-foreground">Fundraising-only (no race):</strong> donor leaves distance as
                    &quot;general support&quot; → <code className="text-xs">race_entry_requested=false</code>,{" "}
                    <code className="text-xs">fundraising_type=gift_only</code> — still counts toward a kid if{" "}
                    <code className="text-xs">athlete_code</code> is set.
                  </li>
                  <li>
                    Roll up totals in Stripe: Payments → filter metadata{" "}
                    <code className="text-xs">spartan_campaign=fayetteville_2026</code> → export CSV → pivot on{" "}
                    <code className="text-xs">athlete_code</code>. (Automated leaderboard DB is a follow-up.)
                  </li>
                  <li>
                    <strong className="text-foreground">Who is &quot;running&quot; vs donation-only:</strong>{" "}
                    <code className="text-xs">race_entry_requested=true</code> + <code className="text-xs">tier_preference</code>{" "}
                    means they went through the <em>entry-code</em> path (intend to race).{" "}
                    <code className="text-xs">race_entry_requested=false</code> /{" "}
                    <code className="text-xs">fundraising_type=gift_only</code> means support only. RecruitNC does not know
                    who physically starts on race day — that lives with Spartan after they issue codes.
                  </li>
                </ul>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={copyTemplate}>
                    <ClipboardCopy className="mr-2 h-4 w-4" />
                    Copy bookmark template
                  </Button>
                  <Button type="button" variant="outline" size="sm" asChild>
                    <a href="/spartan" target="_blank" rel="noopener noreferrer">
                      Open public /spartan
                    </a>
                  </Button>
                  <Button type="button" variant="outline" size="sm" asChild>
                    <a
                      href="https://dashboard.stripe.com/payments"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Stripe Payments
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wrench className="h-4 w-4 text-amber-700 dark:text-amber-500" />
                  Fix athlete credit (after a bad checkout)
                </CardTitle>
                <CardDescription>
                  If the public list shows the right name but <strong className="text-foreground">totals by athlete</strong> are
                  wrong, Stripe metadata probably missed <code className="rounded bg-muted px-1 text-xs">athlete_code</code>.
                  Paste the <strong className="text-foreground">PaymentIntent id</strong> (<code className="text-xs">pi_…</code>)
                  or <strong className="text-foreground">Checkout Session id</strong> (<code className="text-xs">cs_…</code>) from
                  Stripe, and the correct NCU code. No SQL — saves to{" "}
                  <code className="rounded bg-muted px-1 text-xs">spartan_credit_corrections</code> and merges everywhere.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="grid min-w-[200px] flex-1 gap-1.5">
                  <Label htmlFor="credit-fix-session">Session or PI id</Label>
                  <Input
                    id="credit-fix-session"
                    placeholder="pi_… or cs_live_…"
                    value={creditFixSessionId}
                    onChange={(e) => setCreditFixSessionId(e.target.value)}
                    autoComplete="off"
                    className="font-mono text-xs"
                  />
                </div>
                <div className="grid min-w-[180px] flex-1 gap-1.5">
                  <Label htmlFor="credit-fix-code">Athlete code</Label>
                  <Input
                    id="credit-fix-code"
                    placeholder="NCU-APONTEJ-31"
                    value={creditFixCode}
                    onChange={(e) => setCreditFixCode(e.target.value)}
                    autoComplete="off"
                    className="font-mono text-xs"
                  />
                </div>
                <Button type="button" onClick={() => void applySpartanCreditFix()} disabled={creditFixBusy}>
                  {creditFixBusy ? "Saving…" : "Apply fix"}
                </Button>
                {creditFixMsg ? (
                  <p className="w-full text-sm text-muted-foreground sm:basis-full">{creditFixMsg}</p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">CSV exports (last 120 days)</CardTitle>
                <CardDescription>
                  Three lanes: <strong className="text-foreground">Runners</strong> (race entry path + who is on course in
                  metadata), <strong className="text-foreground">Receipts</strong> (payer-focused for records),{" "}
                  <strong className="text-foreground">Credits</strong> (fundraising attribution aligned with corrections).
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={exportBusy !== null}
                    onClick={() => void downloadSpartanCsv("runners")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {exportBusy === "runners" ? "Preparing…" : "Runners (Spartan)"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={exportBusy !== null}
                    onClick={() => void downloadSpartanCsv("receipts")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {exportBusy === "receipts" ? "Preparing…" : "Receipts (payers)"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={exportBusy !== null}
                    onClick={() => void downloadSpartanCsv("credits")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {exportBusy === "credits" ? "Preparing…" : "Fundraising credits"}
                  </Button>
                </div>
                {exportError ? (
                  <p className="text-destructive text-sm" role="alert">
                    {exportError}
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <SpartanFundraisingVisuals
              donations={donations}
              byAthlete={byAthlete}
              generalTotalCents={generalTotalCents}
              onPickAthlete={(code) => setAthleteFilter(code)}
              selectedAthleteFilter={athleteFilter}
            />

            <Card>
              <CardHeader>
                <CardTitle>Donations (Stripe)</CardTitle>
                <CardDescription>
                  Paid Checkout sessions with <code className="rounded bg-muted px-1 text-xs">spartan_campaign=fayetteville_2026</code>.
                  <strong className="text-foreground"> New payments</strong> appear when you <strong className="text-foreground">Refresh</strong>{" "}
                  (data comes from Stripe). <strong className="text-foreground">Race path</strong> = race / entry flow;{" "}
                  <strong className="text-foreground">Give only</strong> = no race entry. <strong className="text-foreground">Ack</strong>{" "}
                  = 501(c)(3) email sent and logged, or not — filter by sent / not sent. <strong className="text-foreground">By athlete</strong>{" "}
                  for per–athlete totals.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <Button type="button" onClick={loadDonations} disabled={donationsLoading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${donationsLoading ? "animate-spin" : ""}`} />
                    {donations === null ? "Load donations" : "Refresh"}
                  </Button>
                  <div className="grid gap-1.5">
                    <Label htmlFor="admin-view">View</Label>
                    <select
                      id="admin-view"
                      className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
                      value={adminView}
                      onChange={(e) => setAdminView(e.target.value as "all" | "byAthlete")}
                      disabled={donations === null}
                    >
                      <option value="all">All gifts (detail)</option>
                      <option value="byAthlete">Totals by athlete</option>
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="athlete-filter">Filter by athlete code</Label>
                    <Input
                      id="athlete-filter"
                      placeholder="e.g. NCU-SMITH-28"
                      value={athleteFilter}
                      onChange={(e) => setAthleteFilter(e.target.value)}
                      className="w-[220px]"
                      disabled={donations === null}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="sort-donations">Sort</Label>
                    <select
                      id="sort-donations"
                      className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
                      value={sortBy}
                      onChange={(e) =>
                        setSortBy(e.target.value as "date-desc" | "date-asc" | "athlete" | "amount")
                      }
                      disabled={donations === null || adminView === "byAthlete"}
                    >
                      <option value="date-desc">Date (newest)</option>
                      <option value="date-asc">Date (oldest)</option>
                      <option value="athlete">Athlete code (A–Z)</option>
                      <option value="amount">Amount (high → low)</option>
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="ack-filter">Ack email</Label>
                    <select
                      id="ack-filter"
                      className="border-input bg-background h-9 min-w-[9rem] rounded-md border px-3 text-sm shadow-xs"
                      value={receiptAckFilter}
                      onChange={(e) => setReceiptAckFilter(e.target.value as "all" | "sent" | "unsent")}
                      disabled={donations === null || adminView === "byAthlete"}
                    >
                      <option value="all">All (ack status)</option>
                      <option value="unsent">Not sent</option>
                      <option value="sent">Sent</option>
                    </select>
                  </div>
                </div>
                {donationsError && (
                  <p className="text-destructive text-sm" role="alert">
                    {donationsError}
                  </p>
                )}
                {donations !== null && (
                  <p className="text-muted-foreground text-sm">
                    Showing <strong className="text-foreground">{filteredDonations.length}</strong> of{" "}
                    <strong className="text-foreground">{donations.length}</strong> in window — total{" "}
                    <strong className="text-foreground">{formatMoney(filteredTotalCents, "usd")}</strong>
                    {adminView === "all" && (
                      <>
                        {" "}
                        · Ack sent <strong className="text-emerald-700 dark:text-emerald-400">{ackStats.sent}</strong> / not
                        sent <strong className="text-amber-800 dark:text-amber-200">{ackStats.unsent}</strong> (entire
                        list; filter narrows rows above)
                      </>
                    )}
                  </p>
                )}
                {donations !== null && adminView === "all" && filteredDonations.length > 0 && (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Donor</TableHead>
                          <TableHead>Public list</TableHead>
                          <TableHead>Race path</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Athlete</TableHead>
                          <TableHead>Fund</TableHead>
                          <TableHead className="w-[120px]">Ack</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDonations.map((d) => (
                          <TableRow key={d.sessionId}>
                            <TableCell className="whitespace-nowrap font-mono text-xs">
                              {new Date(d.createdIso).toLocaleString()}
                            </TableCell>
                            <TableCell className="font-medium">{formatMoney(d.amountCents, d.currency)}</TableCell>
                            <TableCell>
                              <div className="max-w-[200px]">
                                <div className="truncate text-sm">{d.donorName ?? "—"}</div>
                                <div className="text-muted-foreground truncate text-xs">{d.donorEmail ?? "—"}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {d.donorListPublic !== false ? (
                                <Badge variant="outline" className="text-[10px]">
                                  Public
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  Anonymous
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {d.raceParticipant ? (
                                <Badge variant="default" className="text-[10px]">
                                  Race / entry
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  Not race path
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {d.fundraisingType === "race_donation" ? (
                                <Badge variant="outline" className="text-[10px]">
                                  Race donation
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px]">
                                  Give only
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[240px] text-sm">
                              <span className="text-foreground">{publicAthleteCreditLabel(d) ?? "—"}</span>
                              {d.athleteCode && (
                                <span className="text-muted-foreground mt-0.5 block font-mono text-[10px]">
                                  {d.athleteCode}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              {d.attribution === "athlete"
                                ? "Athlete (code)"
                                : d.attribution === "manual_name"
                                  ? "Manual name"
                                  : "NC United (general)"}
                            </TableCell>
                            <TableCell className="align-top">
                              {d.receiptEmailSentAt ? (
                                <div className="space-y-1">
                                  <Badge className="border-0 bg-emerald-100 text-[10px] text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-100">
                                    Sent
                                  </Badge>
                                  <p className="text-muted-foreground text-[10px] leading-tight">
                                    {new Date(d.receiptEmailSentAt).toLocaleString()}
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <Badge
                                    variant="outline"
                                    className="border-amber-300 bg-amber-50 text-[10px] text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
                                  >
                                    Not sent
                                  </Badge>
                                  {!d.donorEmail ? (
                                    <p className="text-muted-foreground max-w-[7rem] text-[9px] leading-tight">No email on file</p>
                                  ) : null}
                                </div>
                              )}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-2 h-7 text-[10px]"
                                onClick={() => openReceiptDialog(d)}
                                disabled={!d.donorEmail}
                                title={!d.donorEmail ? "No email on this session" : "Charitable acknowledgment email"}
                              >
                                <Mail className="mr-1 h-3 w-3" />
                                {d.receiptEmailSentAt ? "Resend" : "Email"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {donations !== null && adminView === "byAthlete" && byAthlete && filteredByAthlete.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-muted-foreground text-sm">
                      General fund (no athlete code) in window:{" "}
                      <strong className="text-foreground">{formatMoney(generalTotalCents, "usd")}</strong>
                    </p>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Athlete code</TableHead>
                            <TableHead>Total raised</TableHead>
                            <TableHead>Gifts</TableHead>
                            <TableHead>Race signups</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredByAthlete.map((a) => (
                            <TableRow key={a.athleteCode}>
                              <TableCell className="font-mono text-xs">{a.athleteCode}</TableCell>
                              <TableCell className="font-medium">{formatMoney(a.totalCents, "usd")}</TableCell>
                              <TableCell>{a.donationCount}</TableCell>
                              <TableCell>{a.raceSignupCount}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
                {donations !== null && adminView === "byAthlete" && byAthlete && filteredByAthlete.length === 0 && (
                  <p className="text-muted-foreground text-sm">No athlete-coded gifts in this window.</p>
                )}
                {donations !== null && donations.length === 0 && !donationsLoading && (
                  <p className="text-muted-foreground text-sm">No paid Spartan sessions in the last 120 days.</p>
                )}
                {donations !== null && donations.length > 0 && filteredDonations.length === 0 && !donationsLoading && (
                  <p className="text-muted-foreground text-sm">No rows match this athlete filter.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Leaderboard scratchpad</CardTitle>
                <CardDescription>
                  Paste totals from Excel/Stripe here for announcements (saved locally in this browser).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={leaderboard}
                  onChange={(e) => setLeaderboard(e.target.value)}
                  placeholder="e.g. NCU-JONES-26 — $1,240&#10;NCU-LEE-27 — $890&#10;..."
                  className="min-h-[180px] font-mono text-sm"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
                <CardDescription>Internal reminders, who to thank, export schedule, etc.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[120px] text-sm"
                  placeholder="Notes…"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>501(c)(3) acknowledgment email</DialogTitle>
              <DialogDescription>
                Preview and send the official NC United acknowledgment. Amount and email must match Stripe for this session.
                Create table <code className="text-xs">spartan_donation_receipt_emails</code> in Supabase to log sends (see
                comment in <code className="text-xs">app/api/admin/spartan-donation-receipt/route.ts</code>).
              </DialogDescription>
            </DialogHeader>
            {receiptRow && (
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground font-mono text-xs">{receiptRow.sessionId}</p>
                <div className="grid gap-2">
                  <Label htmlFor="rcpt-first">First name (greeting)</Label>
                  <Input
                    id="rcpt-first"
                    value={receiptFirstName}
                    onChange={(e) => setReceiptFirstName(e.target.value)}
                    placeholder="Jane"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rcpt-to">To (must match Stripe)</Label>
                  <Input
                    id="rcpt-to"
                    type="email"
                    value={receiptTo}
                    onChange={(e) => setReceiptTo(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rcpt-amt">Amount (USD, must match row)</Label>
                  <Input
                    id="rcpt-amt"
                    inputMode="decimal"
                    value={receiptAmountDollars}
                    onChange={(e) => setReceiptAmountDollars(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rcpt-date">Donation date (shown in letter)</Label>
                  <Input
                    id="rcpt-date"
                    type="date"
                    value={receiptDateStr}
                    onChange={(e) => setReceiptDateStr(e.target.value)}
                  />
                </div>
                {receiptPreviewHtml ? (
                  <div className="rounded-md border bg-white p-3">
                    <p className="text-muted-foreground mb-2 text-[10px] font-medium uppercase">Preview</p>
                    <iframe
                      title="Email preview"
                      className="h-[min(280px,40vh)] w-full rounded border-0 bg-white text-black"
                      srcDoc={receiptPreviewHtml}
                    />
                  </div>
                ) : null}
                {receiptMsg && (
                  <p className="text-destructive text-sm" role="alert">
                    {receiptMsg}
                  </p>
                )}
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void runReceiptPreview()}
                disabled={receiptPreviewBusy || !receiptRow}
              >
                {receiptPreviewBusy ? "Preview…" : "Preview"}
              </Button>
              <Button
                type="button"
                onClick={() => void sendReceiptEmail()}
                disabled={receiptSendBusy || !receiptRow || !receiptPreviewHtml}
              >
                {receiptSendBusy ? "Sending…" : "Send email"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
