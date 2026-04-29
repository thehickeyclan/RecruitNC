"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
import { toast } from "@/hooks/use-toast"
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
  /** Aligned with GET /api/spartan/supporters (same pipeline). */
  creditLabel?: string | null
  publicDisplayName?: string
  publicRaceParticipantName?: string | null
}

type SpartanAthleteAggregate = {
  athleteCode: string
  totalCents: number
  donationCount: number
  raceSignupCount: number
  reimbursementsPaidCents?: number
  netAfterReimbursementsCents?: number
  /** Pending + applied Guild credit allocations (notional drawdown). */
  guildAllocationsCents?: number
  /** Same naming as public `/spartan` totals-by-athlete table. */
  athleteDisplayName?: string
}

type SpartanParentCoverageRow = {
  athleteCode: string
  displayName: string
  athleteId: string | null
  totalCents: number
  donationCount: number
  managingUserCount: number
  status: "ok" | "no_managing_user" | "roster_only_no_athlete_row" | "code_not_in_directory"
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

function parentCoverageStatusShort(status: SpartanParentCoverageRow["status"]): string {
  switch (status) {
    case "ok":
      return "Parent linked"
    case "no_managing_user":
      return "Needs parent link"
    case "roster_only_no_athlete_row":
      return "Roster only"
    case "code_not_in_directory":
      return "Code not in directory"
    default:
      return status
  }
}

function sortParentCoverageRows(rows: SpartanParentCoverageRow[]): SpartanParentCoverageRow[] {
  return [...rows].sort((a, b) => {
    const pa = a.status !== "ok" ? 0 : 1
    const pb = b.status !== "ok" ? 0 : 1
    if (pa !== pb) return pa - pb
    return b.totalCents - a.totalCents
  })
}

export default function AdminFundraisingPage() {
  const [leaderboard, setLeaderboard] = useState("")
  const [notes, setNotes] = useState("")
  const [mounted, setMounted] = useState(false)

  const [donations, setDonations] = useState<SpartanDonationRow[] | null>(null)
  const [byAthlete, setByAthlete] = useState<SpartanAthleteAggregate[] | null>(null)
  const [generalTotalCents, setGeneralTotalCents] = useState(0)
  const [reimbursementsPaidTotalCents, setReimbursementsPaidTotalCents] = useState(0)
  const [grossSessionTotalCents, setGrossSessionTotalCents] = useState(0)
  const [netAfterReimbursementsCents, setNetAfterReimbursementsCents] = useState(0)
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

  const [reassignOpen, setReassignOpen] = useState(false)
  const [reassignRow, setReassignRow] = useState<SpartanDonationRow | null>(null)
  const [reassignCode, setReassignCode] = useState("")
  const [reassignBusy, setReassignBusy] = useState(false)

  const [exportBusy, setExportBusy] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [teeRollup, setTeeRollup] = useState<{
    totalTeeOrders: number
    bySize: { size: string; count: number }[]
  } | null>(null)
  const [teeRollupError, setTeeRollupError] = useState<string | null>(null)

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

  const [parentCoverage, setParentCoverage] = useState<{
    rows: SpartanParentCoverageRow[]
    summary: { withFunds: number; needsAttention: number; ok: number }
  } | null>(null)
  /** attention = rows that need work (default). all = everyone with Stripe dollars so linked vs not is visible. */
  const [parentCoverageView, setParentCoverageView] = useState<"attention" | "all">("attention")

  const parentCoverageDisplayRows = useMemo(() => {
    if (!parentCoverage) return []
    const raw =
      parentCoverageView === "attention"
        ? parentCoverage.rows.filter((r) => r.status !== "ok")
        : parentCoverage.rows
    return sortParentCoverageRows(raw)
  }, [parentCoverage, parentCoverageView])

  const fetchTeeRollup = useCallback(() => {
    setTeeRollupError(null)
    return fetch("/api/admin/spartan-tee-fulfillment?days=120", { credentials: "include" })
      .then((r) => r.json())
      .then((j: { error?: string; totalTeeOrders?: number; bySize?: { size: string; count: number }[] }) => {
        if (typeof j.error === "string") {
          setTeeRollupError(j.error)
          setTeeRollup(null)
          return
        }
        setTeeRollup({
          totalTeeOrders: typeof j.totalTeeOrders === "number" ? j.totalTeeOrders : 0,
          bySize: Array.isArray(j.bySize) ? j.bySize : [],
        })
      })
      .catch((e) => {
        setTeeRollupError(e instanceof Error ? e.message : "Tee rollup failed")
        setTeeRollup(null)
      })
  }, [])

  useEffect(() => {
    void fetchTeeRollup()
  }, [fetchTeeRollup])

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
      const res = await fetch("/api/admin/spartan-donations?days=120&includeParentCoverage=1")
      const j = (await res.json()) as {
        error?: string
        donations?: SpartanDonationRow[]
        byAthlete?: SpartanAthleteAggregate[]
        generalTotalCents?: number
        reimbursementsPaidTotalCents?: number
        grossSessionTotalCents?: number
        netAfterReimbursementsCents?: number
        parentCoverage?: { rows: SpartanParentCoverageRow[]; summary: { withFunds: number; needsAttention: number; ok: number } }
      }
      if (!res.ok) throw new Error(j.error || "Could not load donations")
      setDonations(j.donations ?? [])
      setByAthlete(j.byAthlete ?? [])
      setGeneralTotalCents(typeof j.generalTotalCents === "number" ? j.generalTotalCents : 0)
      setReimbursementsPaidTotalCents(typeof j.reimbursementsPaidTotalCents === "number" ? j.reimbursementsPaidTotalCents : 0)
      setGrossSessionTotalCents(typeof j.grossSessionTotalCents === "number" ? j.grossSessionTotalCents : 0)
      setNetAfterReimbursementsCents(typeof j.netAfterReimbursementsCents === "number" ? j.netAfterReimbursementsCents : 0)
      setParentCoverage(j.parentCoverage ?? null)
      void fetchTeeRollup()
    } catch (e) {
      setDonationsError(e instanceof Error ? e.message : "Load failed")
      setDonations(null)
      setByAthlete(null)
      setParentCoverage(null)
      setGeneralTotalCents(0)
      setReimbursementsPaidTotalCents(0)
      setGrossSessionTotalCents(0)
      setNetAfterReimbursementsCents(0)
    } finally {
      setDonationsLoading(false)
    }
  }

  const downloadSpartanCsv = async (kind: "runners" | "receipts" | "credits" | "tees" | "ledger") => {
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

  async function postSpartanCreditCorrection(sessionId: string, athleteCode: string): Promise<string> {
    const res = await fetch("/api/admin/spartan-credit-corrections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        session_id: sessionId.trim(),
        athlete_code: athleteCode.trim(),
      }),
    })
    const j = (await res.json()) as { error?: string; message?: string }
    if (!res.ok) throw new Error(j.error || "Save failed")
    return j.message ?? "Saved."
  }

  const applySpartanCreditFix = async () => {
    setCreditFixMsg(null)
    setCreditFixBusy(true)
    try {
      const msg = await postSpartanCreditCorrection(creditFixSessionId, creditFixCode)
      setCreditFixMsg(msg)
      setCreditFixSessionId("")
      setCreditFixCode("")
      if (donations !== null) await loadDonations()
    } catch (e) {
      setCreditFixMsg(e instanceof Error ? e.message : "Save failed")
    } finally {
      setCreditFixBusy(false)
    }
  }

  const openReassignDialog = (d: SpartanDonationRow) => {
    setReassignRow(d)
    setReassignCode((d.athleteCode ?? "").trim())
    setReassignOpen(true)
  }

  const applyReassignFromRow = async () => {
    if (!reassignRow) return
    setReassignBusy(true)
    try {
      const msg = await postSpartanCreditCorrection(reassignRow.sessionId, reassignCode)
      toast({ title: "Fundraising credit updated", description: msg })
      setReassignOpen(false)
      setReassignRow(null)
      await loadDonations()
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Save failed",
        variant: "destructive",
      })
    } finally {
      setReassignBusy(false)
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
      if (j.warning) {
        toast({
          title: "Email sent, database log failed",
          description: j.warning,
          variant: "destructive",
        })
        setReceiptMsg(j.warning)
      } else {
        setReceiptMsg("Sent.")
      }
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
            (d.athleteDisplayName ?? "").toLowerCase().includes(q) ||
            (d.creditLabel ?? "").toLowerCase().includes(q) ||
            (d.publicDisplayName ?? "").toLowerCase().includes(q),
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
    return list.filter(
      (a) =>
        a.athleteCode.toLowerCase().includes(q) ||
        (a.athleteDisplayName ?? "").toLowerCase().includes(q),
    )
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
              Fundraising — Spartan Fayetteville
            </h1>
            <p className="text-muted-foreground mt-1 max-w-3xl">
              Goal: <strong className="text-foreground">every gift</strong> credits the{" "}
              <strong className="text-foreground">right wrestler</strong>, and that wrestler has a{" "}
              <strong className="text-foreground">parent (or self) account linked</strong> so Fundraise totals match reality.
              Below: (1) parent links → (2) every Stripe row → (3) rollup by athlete → tools & exports.
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

          <TabsContent value="spartan-2026" className="mt-4 space-y-8">
            <Card className="border-[#003366]/20 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">This page in order</CardTitle>
                <CardDescription>
                  Work top to bottom after you click <strong className="text-foreground">Load donations</strong> (loads Stripe +
                  parent coverage together).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                  <li>
                    <strong className="text-foreground">Parent ↔ athlete links</strong> — For each NCU code that has raised
                    money, is there a parent (or self) account that can open <strong className="text-foreground">Profile → Fundraise</strong>?
                    Fix gaps before you trust family-facing totals.
                  </li>
                  <li>
                    <strong className="text-foreground">Every donation row</strong> — One row = one paid Stripe checkout. Confirm
                    the <strong className="text-foreground">Athlete</strong> column is the kid you intend; use{" "}
                    <strong className="text-foreground">Reassign credit</strong> if checkout metadata picked the wrong wrestler.
                  </li>
                  <li>
                    <strong className="text-foreground">Totals by athlete</strong> — Same window, aggregated by code, with
                    reimbursements and Guild allocations. Not a second source of truth — it rolls up the detail view.
                  </li>
                  <li>
                    <strong className="text-foreground">Charts &amp; exports</strong> — Optional graphics and CSVs for Spartan ops
                    / books; see labels on those cards.
                  </li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">How checkout credits the kid</CardTitle>
                <CardDescription>
                  Donors pick a wrestler on the Spartan form; Stripe stores{" "}
                  <code className="rounded bg-muted px-1 text-xs">athlete_code</code>.{" "}
                  <strong className="text-foreground">Race</strong> vs <strong className="text-foreground">Support</strong> only
                  describes entry path — both can credit an athlete. Public list uses the same pipeline as{" "}
                  <HardLink href="/spartan" className="text-primary underline-offset-4 hover:underline">
                    /spartan
                  </HardLink>
                  .
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={copyTemplate}>
                  <ClipboardCopy className="mr-2 h-4 w-4" />
                  Copy bookmark template
                </Button>
                <Button type="button" variant="outline" size="sm" asChild>
                  <HardLink href="/spartan">Open public /spartan</HardLink>
                </Button>
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href="https://dashboard.stripe.com/payments" target="_blank" rel="noopener noreferrer">
                    Open Stripe Payments
                  </a>
                </Button>
              </CardContent>
            </Card>

            {parentCoverage && parentCoverage.summary.withFunds > 0 ? (
              <Card className={parentCoverage.summary.needsAttention > 0 ? "border-amber-500/50" : "border-emerald-600/40"}>
                <CardHeader>
                  <CardTitle className="text-lg">1. Parent ↔ athlete coverage</CardTitle>
                  <CardDescription className="space-y-2">
                    <span className="block">
                      <strong className="text-foreground">Purpose:</strong> each code with Stripe dollars should have at least
                      one managing account for <strong className="text-foreground">Profile → Fundraise</strong> (
                      <code className="rounded bg-muted px-1 text-xs">parent_athlete_links</code>
                      {`, `}
                      <code className="rounded bg-muted px-1 text-xs">user_profiles.athlete_id</code> if used).
                    </span>
                    <span className="block text-muted-foreground">
                      Parents link kids under <strong className="text-foreground">Profile → Family &amp; athletes</strong>. Staff
                      can insert links in Supabase or use <strong className="text-foreground">Edit athlete</strong> for roster/directory fixes.
                      This grid does not create links — it only reports status.
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {parentCoverage.summary.ok} linked · {parentCoverage.summary.needsAttention} need attention ·{" "}
                      {parentCoverage.summary.withFunds} codes with dollars
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={parentCoverageView === "attention" ? "default" : "outline"}
                      onClick={() => setParentCoverageView("attention")}
                    >
                      Needs attention ({parentCoverage.summary.needsAttention})
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={parentCoverageView === "all" ? "default" : "outline"}
                      onClick={() => setParentCoverageView("all")}
                    >
                      All codes ({parentCoverage.summary.withFunds})
                    </Button>
                  </div>
                  {parentCoverage.summary.needsAttention === 0 ? (
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">
                      All {parentCoverage.summary.withFunds} athlete code{parentCoverage.summary.withFunds === 1 ? "" : "s"} with
                      dollars have a managing user. Use &quot;All codes&quot; below to review each row.
                    </p>
                  ) : parentCoverageView === "attention" ? (
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      {parentCoverage.summary.needsAttention} of {parentCoverage.summary.withFunds} codes with dollars need a
                      parent/self link. Switch to &quot;All codes&quot; to see who is already linked.
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Green rows already have a parent or self profile tied to this athlete. Amber rows still need work.
                    </p>
                  )}
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Athlete</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead className="text-right">Raised</TableHead>
                          <TableHead>Managers</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parentCoverageDisplayRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                              No rows in this view — switch to &quot;All codes&quot; or everything is already linked.
                            </TableCell>
                          </TableRow>
                        ) : (
                          parentCoverageDisplayRows.map((r) => (
                            <TableRow
                              key={r.athleteCode}
                              className={r.status === "ok" ? "bg-emerald-50/40 dark:bg-emerald-950/15" : undefined}
                            >
                              <TableCell>
                                <Badge
                                  variant={r.status === "ok" ? "outline" : "secondary"}
                                  className={
                                    r.status === "ok"
                                      ? "border-emerald-600/60 text-emerald-900 dark:text-emerald-100"
                                      : "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-50"
                                  }
                                >
                                  {parentCoverageStatusShort(r.status)}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                {r.athleteId ? (
                                  <HardLink
                                    href={`/view-profile?id=${encodeURIComponent(r.athleteId)}`}
                                    className="text-primary underline-offset-4 hover:underline"
                                  >
                                    {r.displayName}
                                  </HardLink>
                                ) : (
                                  r.displayName
                                )}
                              </TableCell>
                              <TableCell>
                                <code className="text-xs">{r.athleteCode}</code>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{formatMoney(r.totalCents, "usd")}</TableCell>
                              <TableCell className="tabular-nums">{r.managingUserCount}</TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-[min(28rem,55vw)]">
                                {r.status === "no_managing_user"
                                  ? "No row in parent_athlete_links for this athlete — parent must add them under Family & athletes."
                                  : r.status === "roster_only_no_athlete_row"
                                    ? "Fundraising roster entry without athletes table row — create athlete profile first."
                                    : r.status === "code_not_in_directory"
                                      ? "Stripe used this code but it is not tied to directory fundraising entries."
                                      : "At least one parent or self profile can manage Fundraise for this athlete."}
                              </TableCell>
                              <TableCell className="text-right">
                                {r.athleteId ? (
                                  <HardLink
                                    href={`/admin/athletes/edit?id=${encodeURIComponent(r.athleteId)}`}
                                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                                  >
                                    Edit athlete
                                  </HardLink>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <Card>
                <CardHeader>
                <CardTitle className="text-lg">2. Every donation (Stripe)</CardTitle>
                <CardDescription>
                  <strong className="text-foreground">Purpose:</strong> audit <strong className="text-foreground">each paid checkout</strong>{" "}
                  (<code className="rounded bg-muted px-1 text-xs">spartan_campaign=fayetteville_2026</code>). The Athlete column is who
                  receives credit in RecruitNC — use <strong className="text-foreground">Reassign credit</strong> if Stripe metadata picked the wrong kid.
                  <strong className="text-foreground"> Ack</strong> = charitable acknowledgment email status. Switch view to{" "}
                  <strong className="text-foreground">Totals by athlete</strong> for aggregated raised, reimbursements, Guild, net (same window).
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
                      <option value="all">Every gift (detail)</option>
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
                        · Ack sent <strong className="text-green-700 dark:text-green-400">{ackStats.sent}</strong> / not
                        sent <strong className="text-red-700 dark:text-red-400">{ackStats.unsent}</strong> (entire
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
                          <TableHead>Runner</TableHead>
                          <TableHead>Race / support</TableHead>
                          <TableHead>Athlete</TableHead>
                          <TableHead>Public list</TableHead>
                          <TableHead>Attribution</TableHead>
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
                                <div className="truncate text-sm font-medium">
                                  {d.publicDisplayName ?? d.donorName ?? "—"}
                                </div>
                                <div className="text-muted-foreground truncate text-xs">{d.donorEmail ?? "—"}</div>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[140px] truncate text-sm text-muted-foreground">
                              {d.publicRaceParticipantName?.trim() ? d.publicRaceParticipantName : "—"}
                            </TableCell>
                            <TableCell>
                              {d.raceParticipant ? (
                                <Badge variant="default" className="text-[10px]">
                                  Race
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  Support
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[240px] text-sm">
                              <span className="text-foreground">
                                {d.creditLabel ?? publicAthleteCreditLabel(d) ?? "—"}
                              </span>
                              {d.athleteCode && (
                                <span className="text-muted-foreground mt-0.5 block font-mono text-[10px]">
                                  {d.athleteCode}
                                </span>
                              )}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-2 h-7 w-full max-w-[11rem] text-[10px]"
                                onClick={() => openReassignDialog(d)}
                                title="Wrong athlete at checkout? Set who gets credit — no SQL."
                              >
                                <Wrench className="mr-1 h-3 w-3" />
                                Reassign credit
                              </Button>
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
                                  <Badge className="border-0 bg-green-600 text-[10px] font-semibold text-white hover:bg-green-600 dark:bg-green-600 dark:text-white">
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
                                    className="border-red-600 bg-red-600 text-[10px] font-semibold text-white dark:border-red-500 dark:bg-red-600 dark:text-white"
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
                      <strong className="text-foreground">Totals by athlete</strong> — sum of Stripe gifts per NCU code in this window,
                      minus reimbursements paid and Guild allocations (matches parent Profile → Fundraise logic). NC United pooled fund (no wrestler credit):{" "}
                      <strong className="text-foreground">{formatMoney(generalTotalCents, "usd")}</strong>.
                    </p>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Athlete</TableHead>
                            <TableHead>Raised (window)</TableHead>
                            <TableHead>Reimb. paid</TableHead>
                            <TableHead>Net (after reimb.)</TableHead>
                            <TableHead>Guild alloc.</TableHead>
                            <TableHead>Notional remaining</TableHead>
                            <TableHead>Gifts</TableHead>
                            <TableHead>Race signups</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredByAthlete.map((a) => {
                            const r = a.reimbursementsPaidCents ?? 0
                            const n = a.netAfterReimbursementsCents ?? a.totalCents - r
                            const g = a.guildAllocationsCents ?? 0
                            const remaining = n - g
                            return (
                            <TableRow key={a.athleteCode}>
                              <TableCell className="text-sm">
                                <div className="font-medium text-foreground">{a.athleteDisplayName ?? "—"}</div>
                                <div className="font-mono text-[10px] text-muted-foreground">{a.athleteCode}</div>
                              </TableCell>
                              <TableCell className="font-medium">{formatMoney(a.totalCents, "usd")}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {r > 0 ? formatMoney(r, "usd") : "—"}
                              </TableCell>
                              <TableCell className={n < 0 ? "text-destructive font-medium" : "font-medium text-green-800"}>
                                {formatMoney(n, "usd")}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {g > 0 ? formatMoney(g, "usd") : "—"}
                              </TableCell>
                              <TableCell
                                className={
                                  remaining < 0 ? "text-destructive font-medium" : "font-medium text-green-800"
                                }
                              >
                                {formatMoney(remaining, "usd")}
                              </TableCell>
                              <TableCell>{a.donationCount}</TableCell>
                              <TableCell>{a.raceSignupCount}</TableCell>
                            </TableRow>
                            )
                          })}
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

            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wrench className="h-4 w-4 text-amber-700 dark:text-amber-500" />
                  Fix Stripe metadata (wrong NCU code on a session)
                </CardTitle>
                <CardDescription>
                  Use when <strong className="text-foreground">Reassign credit</strong> on a row isn&apos;t enough or you only have ids from Stripe.
                  Saves to <code className="rounded bg-muted px-1 text-xs">spartan_credit_corrections</code>; totals and exports pick it up after refresh.
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

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-base">Downloads — tees & fulfillment</CardTitle>
                  <CardDescription>
                    Shirt sizes and shipping addresses come from Stripe session metadata (<code className="text-xs">tee_sz</code>,{" "}
                    <code className="text-xs">ship_*</code>). Eligibility is per charge ($100+ single gift or race path).
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {teeRollupError ? (
                    <p className="text-destructive text-sm" role="alert">
                      {teeRollupError}
                    </p>
                  ) : teeRollup ? (
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">{teeRollup.totalTeeOrders}</strong> tee order
                      {teeRollup.totalTeeOrders === 1 ? "" : "s"} (last 120 days).{" "}
                      {teeRollup.bySize.length > 0 ? (
                        <span className="text-foreground">{teeRollup.bySize.map((r) => `${r.size}: ${r.count}`).join(" · ")}</span>
                      ) : (
                        <span>None in window yet.</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">Loading tee counts…</p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    disabled={exportBusy !== null}
                    onClick={() => void downloadSpartanCsv("tees")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {exportBusy === "tees" ? "Preparing…" : "Tee list (CSV)"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-base">Downloads — operations & books</CardTitle>
                  <CardDescription>
                    <strong className="text-foreground">Runners</strong> race metadata, <strong className="text-foreground">Receipts</strong> payers,{" "}
                    <strong className="text-foreground">Credits</strong> attribution, <strong className="text-foreground">Ledger</strong> audit-style
                    columns with session ids.
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
                      {exportBusy === "runners" ? "…" : "Runners"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={exportBusy !== null}
                      onClick={() => void downloadSpartanCsv("receipts")}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {exportBusy === "receipts" ? "…" : "Receipts"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={exportBusy !== null}
                      onClick={() => void downloadSpartanCsv("credits")}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {exportBusy === "credits" ? "…" : "Credits"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={exportBusy !== null}
                      onClick={() => void downloadSpartanCsv("ledger")}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {exportBusy === "ledger" ? "…" : "Ledger"}
                    </Button>
                  </div>
                  {exportError ? (
                    <p className="text-destructive text-sm" role="alert">
                      {exportError}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Charts &amp; social graphics</CardTitle>
                <CardDescription>
                  Optional visuals for announcements — same underlying numbers as the tables above. Click a bar to filter the donation list by code.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <SpartanFundraisingVisuals
                  embedded
                  donations={donations}
                  byAthlete={byAthlete}
                  generalTotalCents={generalTotalCents}
                  reimbursementsPaidTotalCents={reimbursementsPaidTotalCents}
                  grossSessionTotalCents={grossSessionTotalCents}
                  netAfterReimbursementsCents={netAfterReimbursementsCents}
                  onPickAthlete={(code) => setAthleteFilter(code)}
                  selectedAthleteFilter={athleteFilter}
                />
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
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
            </div>
          </TabsContent>
        </Tabs>

        <Dialog
          open={reassignOpen}
          onOpenChange={(o) => {
            setReassignOpen(o)
            if (!o) setReassignRow(null)
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reassign fundraising credit</DialogTitle>
              <DialogDescription>
                Checkout picked the wrong athlete. Enter the correct{" "}
                <span className="font-mono text-xs">NCU-…-YY</span> code — the Stripe id below is from this row (you do
                not need to copy it from Stripe).
              </DialogDescription>
            </DialogHeader>
            {reassignRow ? (
              <div className="space-y-3 text-sm">
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
                  <p>
                    <span className="text-muted-foreground">Donor: </span>
                    {reassignRow.donorName ?? "—"}{" "}
                    <span className="text-muted-foreground">· {formatMoney(reassignRow.amountCents, reassignRow.currency)}</span>
                  </p>
                  <p className="text-muted-foreground mt-1 font-mono text-[10px] break-all">{reassignRow.sessionId}</p>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="reassign-code">Credit this gift to (NCU code)</Label>
                  <Input
                    id="reassign-code"
                    className="font-mono text-xs"
                    value={reassignCode}
                    onChange={(e) => setReassignCode(e.target.value.toUpperCase())}
                    placeholder="e.g. NCU-SHUSTER-28"
                    autoComplete="off"
                  />
                </div>
              </div>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setReassignOpen(false)}
                disabled={reassignBusy}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void applyReassignFromRow()}
                disabled={reassignBusy || !reassignCode.trim() || !reassignRow}
              >
                {reassignBusy ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
