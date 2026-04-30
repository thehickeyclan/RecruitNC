"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AdminHeader } from "@/components/admin-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { HardLink } from "@/components/hard-link"
import { FundraisingPlaybookHeader } from "@/app/admin/fundraising/_components/fundraising-playbook-header"
import {
  FUNDRAISING_CAMPAIGNS,
  DEFAULT_FUNDRAISING_CAMPAIGN,
  NC_UNITED_FUNDRAISING_BRAND,
  adminFundraisingLeaderboardStorageKey,
  adminFundraisingNotesStorageKey,
  fundraisingCampaignByContextKey,
} from "@/lib/fundraising/campaign-registry"
import { cn } from "@/lib/utils"
import { publicAthleteCreditLabel } from "@/lib/spartan-fayetteville-stripe"
import { SpartanFundraisingVisuals } from "@/components/admin/spartan-fundraising-visuals"
import {
  ClipboardCopy,
  Download,
  Filter,
  Gift,
  Layers,
  Link2,
  Mail,
  RefreshCw,
  UserRoundX,
  Users,
  Wrench,
} from "lucide-react"
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

/** Legacy localStorage keys before campaign-registry (`adminContextKey`). */
const LEGACY_LS_LEADERBOARD = "recruitnc_admin_fundraising_spartan2026_leaderboard"
const LEGACY_LS_NOTES = "recruitnc_admin_fundraising_spartan2026_notes"

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

function scrollToFundraisingSection(elementId: string) {
  window.requestAnimationFrame(() => {
    document.getElementById(elementId)?.scrollIntoView({ behavior: "smooth", block: "start" })
  })
}

const ATHLETE_UUID_PIN_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default function AdminFundraisingPage() {
  const [activeCampaignKey, setActiveCampaignKey] = useState(DEFAULT_FUNDRAISING_CAMPAIGN.adminContextKey)
  const campaign = fundraisingCampaignByContextKey(activeCampaignKey) ?? DEFAULT_FUNDRAISING_CAMPAIGN
  const brand = NC_UNITED_FUNDRAISING_BRAND

  const [leaderboard, setLeaderboard] = useState("")
  const [notes, setNotes] = useState("")
  const [mounted, setMounted] = useState(false)

  /** Paste athlete UUID per gap row → POST pin API */
  const [gapPinAthleteId, setGapPinAthleteId] = useState<Record<string, string>>({})
  const [gapPinBusy, setGapPinBusy] = useState<string | null>(null)

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
  /** Narrow “Needs attention” by issue type (ignored when viewing “All codes”). */
  const [attentionKind, setAttentionKind] = useState<"all" | "no_parent" | "directory" | "roster">("all")

  const [linkParentOpen, setLinkParentOpen] = useState(false)
  const [linkParentRow, setLinkParentRow] = useState<SpartanParentCoverageRow | null>(null)
  const [parentSearchQuery, setParentSearchQuery] = useState("")
  const [parentSearchResults, setParentSearchResults] = useState<
    { id: string; email?: string | null; full_name: string }[]
  >([])
  const [parentSearchBusy, setParentSearchBusy] = useState(false)
  const [selectedParent, setSelectedParent] = useState<{ id: string; email?: string | null; full_name: string } | null>(
    null,
  )
  const [linkParentBusy, setLinkParentBusy] = useState(false)

  /** Narrow section 3 donation table to checkouts credited to NCU codes missing from fundraising directory. */
  const [donationTableMode, setDonationTableMode] = useState<"all" | "orphaned_codes">("all")

  const parentCoverageDisplayRows = useMemo(() => {
    if (!parentCoverage) return []
    const raw =
      parentCoverageView === "attention"
        ? parentCoverage.rows.filter((r) => r.status !== "ok")
        : parentCoverage.rows
    const narrowed =
      parentCoverageView === "attention" && attentionKind !== "all"
        ? raw.filter((r) => {
            if (attentionKind === "no_parent") return r.status === "no_managing_user"
            if (attentionKind === "directory") return r.status === "code_not_in_directory"
            if (attentionKind === "roster") return r.status === "roster_only_no_athlete_row"
            return true
          })
        : raw
    return sortParentCoverageRows(narrowed)
  }, [parentCoverage, parentCoverageView, attentionKind])

  useEffect(() => {
    setDonations(null)
    setByAthlete(null)
    setParentCoverage(null)
    setDonationsError(null)
    setGeneralTotalCents(0)
    setReimbursementsPaidTotalCents(0)
    setGrossSessionTotalCents(0)
    setNetAfterReimbursementsCents(0)
    setAthleteFilter("")
    setDonationTableMode("all")
    setReceiptAckFilter("all")
    setAdminView("all")
  }, [campaign.adminContextKey])

  useEffect(() => {
    if (parentCoverageView === "all") setAttentionKind("all")
  }, [parentCoverageView])

  useEffect(() => {
    if (!linkParentOpen) return
    const q = parentSearchQuery.trim()
    if (q.length < 2) {
      setParentSearchResults([])
      setParentSearchBusy(false)
      return
    }
    const ctrl = new AbortController()
    const t = window.setTimeout(() => {
      setParentSearchBusy(true)
      void fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}`, {
        credentials: "include",
        signal: ctrl.signal,
      })
        .then((res) => res.json() as Promise<{ users?: { id: string; email?: string | null; full_name: string }[] }>)
        .then((j) => setParentSearchResults(Array.isArray(j.users) ? j.users.slice(0, 40) : []))
        .catch(() => {
          if (!ctrl.signal.aborted) setParentSearchResults([])
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setParentSearchBusy(false)
        })
    }, 320)
    return () => {
      ctrl.abort()
      window.clearTimeout(t)
    }
  }, [parentSearchQuery, linkParentOpen])

  const attentionBreakdown = useMemo(() => {
    if (!parentCoverage) return { no_parent: 0, directory: 0, roster: 0 }
    const attn = parentCoverage.rows.filter((r) => r.status !== "ok")
    return {
      no_parent: attn.filter((r) => r.status === "no_managing_user").length,
      directory: attn.filter((r) => r.status === "code_not_in_directory").length,
      roster: attn.filter((r) => r.status === "roster_only_no_athlete_row").length,
    }
  }, [parentCoverage])

  /** Paid Stripe codes that do not resolve to a fundraising-directory athlete (no profile row → cannot link parents yet). */
  const directoryGapRows = useMemo(() => {
    if (!parentCoverage) return []
    return [...parentCoverage.rows.filter((r) => r.status === "code_not_in_directory")].sort(
      (a, b) => b.totalCents - a.totalCents,
    )
  }, [parentCoverage])

  /** Labels donors saw at checkout — helps match a mystery NCU code to a real kid while fixing directory. */
  const stripeHintsByAthleteCode = useMemo(() => {
    const map = new Map<string, Set<string>>()
    const add = (code: string | null | undefined, hint: string | null | undefined) => {
      const c = code?.trim()
      const h = hint?.trim()
      if (!c || !h || h.toLowerCase() === "anonymous") return
      const k = c.toUpperCase()
      if (!map.has(k)) map.set(k, new Set())
      map.get(k)!.add(h)
    }
    for (const d of donations ?? []) {
      add(d.athleteCode, d.manualCreditName)
      add(d.athleteCode, d.athleteDisplayName)
      add(d.athleteCode, d.creditLabel)
      add(d.athleteCode, d.publicDisplayName)
    }
    const flat = new Map<string, string>()
    for (const [k, set] of map) flat.set(k, [...set].slice(0, 5).join(" · "))
    return flat
  }, [donations])

  const directoryGapCodeSet = useMemo(() => {
    const s = new Set<string>()
    for (const r of directoryGapRows) s.add(r.athleteCode.trim().toUpperCase())
    return s
  }, [directoryGapRows])

  const fundraisingDashboardMetrics = useMemo(() => {
    if (donations === null) return null
    if (!parentCoverage) {
      return {
        offDirectoryCodes: 0,
        rosterOnlyKids: 0,
        needsParentKids: 0,
        orphanedCheckouts: 0,
      }
    }
    let orphanedCheckoutCount = 0
    for (const d of donations) {
      const c = d.athleteCode?.trim()
      if (c && directoryGapCodeSet.has(c.toUpperCase())) orphanedCheckoutCount += 1
    }
    return {
      offDirectoryCodes: directoryGapRows.length,
      rosterOnlyKids: attentionBreakdown.roster,
      needsParentKids: attentionBreakdown.no_parent,
      orphanedCheckouts: orphanedCheckoutCount,
    }
  }, [
    parentCoverage,
    donations,
    directoryGapRows,
    directoryGapCodeSet,
    attentionBreakdown,
  ])

  const fetchTeeRollup = useCallback(() => {
    setTeeRollupError(null)
    const days = campaign.defaultLookbackDays
    const slug = encodeURIComponent(campaign.stripeCampaignSlug)
    return fetch(`/api/admin/spartan-tee-fulfillment?days=${days}&campaign=${slug}`, { credentials: "include" })
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
  }, [campaign.defaultLookbackDays, campaign.stripeCampaignSlug])

  useEffect(() => {
    try {
      const lk = adminFundraisingLeaderboardStorageKey(campaign.adminContextKey)
      const nk = adminFundraisingNotesStorageKey(campaign.adminContextKey)
      let lb = localStorage.getItem(lk) ?? ""
      let nt = localStorage.getItem(nk) ?? ""
      if (campaign.adminContextKey === "spartan-spring-2026") {
        if (!lb) lb = localStorage.getItem(LEGACY_LS_LEADERBOARD) ?? ""
        if (!nt) nt = localStorage.getItem(LEGACY_LS_NOTES) ?? ""
      }
      setLeaderboard(lb)
      setNotes(nt)
    } catch {
      /* ignore */
    }
    setMounted(true)
  }, [campaign.adminContextKey])

  useEffect(() => {
    void fetchTeeRollup()
  }, [fetchTeeRollup])

  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem(adminFundraisingLeaderboardStorageKey(campaign.adminContextKey), leaderboard)
    } catch {
      /* ignore */
    }
  }, [leaderboard, mounted, campaign.adminContextKey])

  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem(adminFundraisingNotesStorageKey(campaign.adminContextKey), notes)
    } catch {
      /* ignore */
    }
  }, [notes, mounted, campaign.adminContextKey])

  const publicBase =
    typeof window !== "undefined"
      ? `${window.location.origin}${campaign.publicPagePath}`
      : `https://recruitnc.com${campaign.publicPagePath}`

  const copyTemplate = () => {
    const qp = campaign.athleteQueryParam
    const t = `${campaign.tabLabel} — bookmark template:\n${publicBase}?${qp}=NCU-LASTNAME-YY\n\nReplace with the athlete fundraising code (LASTNAME + grad year digits). Example: ${publicBase}?${qp}=NCU-SMITH-28`
    void navigator.clipboard.writeText(t)
  }

  const copyFundraisingCode = (code: string) => {
    void navigator.clipboard.writeText(code.trim())
    toast({ title: "Copied code", description: code.trim() })
  }

  const filterDonationsToCode = (code: string) => {
    const c = code.trim()
    setAthleteFilter(c)
    setAdminView("all")
    toast({ title: "Filtered", description: `Payments list shows ${c}.` })
    window.requestAnimationFrame(() => {
      document.getElementById("admin-fundraising-stripe-donations")?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  const loadDonations = async () => {
    setDonationsLoading(true)
    setDonationsError(null)
    try {
      const days = campaign.defaultLookbackDays
      const slug = encodeURIComponent(campaign.stripeCampaignSlug)
      const res = await fetch(
        `/api/admin/spartan-donations?days=${days}&includeParentCoverage=1&campaign=${slug}`,
      )
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

  const pinGapToAthleteProfile = async (ncuCode: string) => {
    const key = ncuCode.trim().toUpperCase()
    const athleteId = (gapPinAthleteId[key] ?? "").trim()
    if (!ATHLETE_UUID_PIN_RE.test(athleteId)) {
      toast({
        title: "Paste athlete UUID",
        description: "Copy id from view-profile (?id=…) or athletes admin.",
        variant: "destructive",
      })
      return
    }
    setGapPinBusy(key)
    try {
      const res = await fetch("/api/admin/spartan-fundraising-pin-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ athleteId, ncuCode: key }),
      })
      const j = (await res.json()) as { error?: string; message?: string }
      if (!res.ok) throw new Error(j.error || "Pin failed")
      toast({ title: "Pinned", description: j.message ?? `${key} linked.` })
      await loadDonations()
    } catch (e) {
      toast({
        title: "Pin failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setGapPinBusy(null)
    }
  }

  const downloadSpartanCsv = async (kind: "runners" | "receipts" | "credits" | "tees" | "ledger") => {
    setExportError(null)
    setExportBusy(kind)
    try {
      const days = campaign.defaultLookbackDays
      const slug = encodeURIComponent(campaign.stripeCampaignSlug)
      const res = await fetch(`/api/admin/spartan-export?kind=${kind}&days=${days}&campaign=${slug}`, {
        credentials: "include",
      })
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

  const openLinkParentDialog = (r: SpartanParentCoverageRow) => {
    setLinkParentRow(r)
    setParentSearchQuery("")
    setParentSearchResults([])
    setSelectedParent(null)
    setLinkParentOpen(true)
  }

  const submitParentLink = async () => {
    if (!linkParentRow?.athleteId || !selectedParent) return
    setLinkParentBusy(true)
    try {
      const res = await fetch("/api/admin/parent-athlete-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          athleteId: linkParentRow.athleteId,
          parentUserId: selectedParent.id,
        }),
      })
      const j = (await res.json()) as { error?: string; message?: string }
      if (!res.ok) throw new Error(j.error || "Could not create link")
      toast({ title: "Parent linked", description: j.message ?? "Saved." })
      setLinkParentOpen(false)
      setLinkParentRow(null)
      await loadDonations()
    } catch (e) {
      toast({
        title: "Link failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLinkParentBusy(false)
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
    const afterOrphanTile =
      donationTableMode === "orphaned_codes" && directoryGapCodeSet.size > 0
        ? afterAthlete.filter((d) => {
            const c = d.athleteCode?.trim()
            return Boolean(c && directoryGapCodeSet.has(c.toUpperCase()))
          })
        : afterAthlete
    const byAck =
      receiptAckFilter === "sent"
        ? afterOrphanTile.filter((d) => Boolean(d.receiptEmailSentAt))
        : receiptAckFilter === "unsent"
          ? afterOrphanTile.filter((d) => !d.receiptEmailSentAt)
          : afterOrphanTile
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
  }, [donations, athleteFilter, sortBy, receiptAckFilter, donationTableMode, directoryGapCodeSet])

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

  const remediationDashboardReady = donations !== null && parentCoverage !== null
  const dash = fundraisingDashboardMetrics

  const goDirectoryGapTable = () => {
    setParentCoverageView("attention")
    setAttentionKind("directory")
    scrollToFundraisingSection("admin-fundraising-directory-gaps")
  }

  const goRosterOnlyTable = () => {
    setParentCoverageView("attention")
    setAttentionKind("roster")
    scrollToFundraisingSection("admin-fundraising-parent-coverage")
  }

  const goNeedsParentTable = () => {
    setParentCoverageView("attention")
    setAttentionKind("no_parent")
    scrollToFundraisingSection("admin-fundraising-parent-coverage")
  }

  const goOrphanedCheckoutsTable = () => {
    setDonationTableMode("orphaned_codes")
    setAthleteFilter("")
    setReceiptAckFilter("all")
    setAdminView("all")
    toast({
      title: "Filtered payments",
      description: "Only checkouts tied to codes that are still off-directory.",
    })
    scrollToFundraisingSection("admin-fundraising-stripe-donations")
  }

  return (
    <div className="min-h-screen bg-slate-100/80 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <FundraisingPlaybookHeader campaign={campaign} />

        <AdminHeader />

        {FUNDRAISING_CAMPAIGNS.length > 1 ? (
          <div
            role="tablist"
            aria-label="Fundraising campaigns"
            className="mt-4 flex flex-wrap gap-2 rounded-xl border border-[#003366]/12 bg-white p-2 shadow-sm"
          >
            {FUNDRAISING_CAMPAIGNS.map((c) => (
              <button
                key={c.adminContextKey}
                type="button"
                role="tab"
                aria-selected={activeCampaignKey === c.adminContextKey}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activeCampaignKey === c.adminContextKey
                    ? "bg-[#003366] text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                )}
                onClick={() => setActiveCampaignKey(c.adminContextKey)}
              >
                {c.tabLabel}
              </button>
            ))}
          </div>
        ) : null}

        <div className={FUNDRAISING_CAMPAIGNS.length > 1 ? "mt-6 space-y-6" : "mt-8 space-y-6"}>
            <Card className="overflow-hidden border-[#003366]/20 bg-white shadow-sm">
              <div
                className="h-1"
                style={{ background: `linear-gradient(to right, ${brand.navy}, ${brand.crimson})` }}
                aria-hidden
              />
              <CardContent className="flex flex-col gap-4 py-5">
                <div className="flex flex-wrap items-center gap-4">
                  <Button
                    type="button"
                    size="lg"
                    className="gap-2 bg-[#003366] text-white shadow-sm hover:bg-[#002952]"
                    onClick={() => void loadDonations()}
                    disabled={donationsLoading}
                  >
                    <RefreshCw className={`h-5 w-5 shrink-0 ${donationsLoading ? "animate-spin" : ""}`} />
                    {donations === null ? "Load data" : "Refresh"}
                  </Button>
                  {remediationDashboardReady ? (
                    <p className="text-muted-foreground max-w-xl text-sm leading-snug">
                      <span className="font-semibold tabular-nums" style={{ color: brand.navy }}>
                        {ackStats.total}
                      </span>{" "}
                      payments ·{" "}
                      <span className="font-semibold tabular-nums" style={{ color: brand.navy }}>
                        {parentCoverage!.summary.withFunds}
                      </span>{" "}
                      codes with money. Tiles = work queue — click to jump.
                    </p>
                  ) : (
                    <p className="text-muted-foreground max-w-md text-sm">Fetches Stripe + link status in one step.</p>
                  )}
                </div>
                {donationsError ? (
                  <p className="text-destructive text-sm" role="alert">
                    {donationsError}
                  </p>
                ) : null}
              </CardContent>
            </Card>

            {dash ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <button
                  type="button"
                  disabled={!remediationDashboardReady}
                  onClick={goDirectoryGapTable}
                  className={cn(
                    "rounded-xl border bg-card p-4 text-left shadow-sm outline-none ring-offset-background transition hover:bg-muted/60 hover:border-orange-400/45 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45",
                    dash.offDirectoryCodes > 0 &&
                      "border-orange-400/55 bg-orange-50/45 dark:border-orange-900/50 dark:bg-orange-950/30",
                  )}
                >
                  <UserRoundX className="mb-2 h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">Off-directory codes</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums leading-none">{dash.offDirectoryCodes}</p>
                  <p className="text-muted-foreground mt-2 text-xs leading-snug">
                    Dollars on NCU codes that don&apos;t match a fundraising profile yet.
                  </p>
                </button>
                <button
                  type="button"
                  disabled={!remediationDashboardReady}
                  onClick={goRosterOnlyTable}
                  className={cn(
                    "rounded-xl border bg-card p-4 text-left shadow-sm outline-none ring-offset-background transition hover:bg-muted/60 hover:border-amber-500/35 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45",
                    dash.rosterOnlyKids > 0 &&
                      "border-amber-400/50 bg-amber-50/35 dark:border-amber-900/45 dark:bg-amber-950/25",
                  )}
                >
                  <Layers className="mb-2 h-5 w-5 text-amber-700 dark:text-amber-400" />
                  <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">Roster-only placeholders</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums leading-none">{dash.rosterOnlyKids}</p>
                  <p className="text-muted-foreground mt-2 text-xs leading-snug">
                    Roster placeholder only — still needs a real athlete row.
                  </p>
                </button>
                <button
                  type="button"
                  disabled={!remediationDashboardReady}
                  onClick={goNeedsParentTable}
                  className={cn(
                    "rounded-xl border bg-card p-4 text-left shadow-sm outline-none ring-offset-background transition hover:bg-muted/60 hover:border-blue-500/35 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45",
                    dash.needsParentKids > 0 &&
                      "border-blue-400/45 bg-blue-50/40 dark:border-blue-900/45 dark:bg-blue-950/25",
                  )}
                >
                  <Users className="mb-2 h-5 w-5 text-blue-700 dark:text-blue-400" />
                  <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">Needs parent link</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums leading-none">{dash.needsParentKids}</p>
                  <p className="text-muted-foreground mt-2 text-xs leading-snug">
                    Profile exists but no parent tied to Fundraise yet.
                  </p>
                </button>
                <button
                  type="button"
                  disabled={!remediationDashboardReady}
                  onClick={goOrphanedCheckoutsTable}
                  className={cn(
                    "rounded-xl border bg-card p-4 text-left shadow-sm outline-none ring-offset-background transition hover:bg-muted/60 hover:border-rose-500/35 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45",
                    dash.orphanedCheckouts > 0 &&
                      "border-rose-400/45 bg-rose-50/35 dark:border-rose-900/45 dark:bg-rose-950/25",
                  )}
                >
                  <Gift className="mb-2 h-5 w-5 text-rose-700 dark:text-rose-400" />
                  <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">Orphaned checkouts</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums leading-none">{dash.orphanedCheckouts}</p>
                  <p className="text-muted-foreground mt-2 text-xs leading-snug">
                    Paid checkouts still mapped to codes missing from the directory.
                  </p>
                </button>
              </div>
            ) : null}

            <Card className="border-[#003366]/15 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick links</CardTitle>
                <CardDescription>
                  Spartan stores <code className="rounded bg-muted px-1 text-xs">athlete_code</code> on each checkout — same pipeline as the{" "}
                  <HardLink href={campaign.publicPagePath} className="text-primary underline-offset-4 hover:underline">
                    public page
                  </HardLink>
                  .
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 pt-0">
                <Button type="button" variant="outline" size="sm" onClick={copyTemplate}>
                  <ClipboardCopy className="mr-2 h-4 w-4" />
                  Bookmark template
                </Button>
                <Button type="button" variant="outline" size="sm" asChild>
                  <HardLink href={campaign.publicPagePath}>Public campaign page</HardLink>
                </Button>
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href="https://dashboard.stripe.com/payments" target="_blank" rel="noopener noreferrer">
                    Stripe Payments
                  </a>
                </Button>
              </CardContent>
            </Card>

            {parentCoverage !== null ? (
              <Card
                id="admin-fundraising-directory-gaps"
                className={
                  directoryGapRows.length > 0
                    ? "border-orange-500/45 bg-orange-50/35 dark:border-orange-900/50 dark:bg-orange-950/25"
                    : "border-emerald-600/25 bg-emerald-50/20 dark:border-emerald-900/40 dark:bg-emerald-950/15"
                }
              >
                <CardHeader className="space-y-3 pb-2">
                  <div className="flex flex-wrap items-start gap-2">
                    <UserRoundX className="mt-0.5 h-5 w-5 shrink-0 text-orange-700 dark:text-orange-400" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <CardTitle className="text-lg leading-snug">1. Directory gaps</CardTitle>
                      <p className="text-muted-foreground text-sm leading-snug">
                        Stripe credited these NCU codes but the playbook couldn&apos;t match them yet. Paste the{" "}
                        <strong className="text-foreground">athlete UUID</strong> for the correct profile (from{" "}
                        <HardLink href="/admin/athletes" className="text-primary underline-offset-4 hover:underline">
                          athletes admin
                        </HardLink>{" "}
                        or <span className="font-mono text-[11px]">view-profile?id=…</span>) → <strong className="text-foreground">Pin</strong>.
                        First-time setup: run the SQL in{" "}
                        <span className="font-mono text-[11px]">docs/sql/spartan-fundraising-athlete-id-column.sql.txt</span> in Supabase if pinning errors mention{" "}
                        <span className="font-mono text-[11px]">athlete_id</span>.
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {directoryGapRows.length === 0 ? (
                    <p className="text-sm leading-relaxed text-emerald-800 dark:text-emerald-200">
                      No orphaned codes — every NCU code with dollars in this window maps to the fundraising directory (or there are no coded gifts loaded yet).
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-orange-600/50 font-normal tabular-nums">
                          {directoryGapRows.length} code{directoryGapRows.length === 1 ? "" : "s"} need directory/profile work
                        </Badge>
                      </div>
                      <div className="overflow-x-auto rounded-lg border bg-background shadow-sm">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="whitespace-nowrap">NCU code</TableHead>
                              <TableHead className="text-right whitespace-nowrap">Raised</TableHead>
                              <TableHead className="whitespace-nowrap">Checkouts</TableHead>
                              <TableHead className="min-w-[200px] max-w-lg">Stripe hints (checkout labels)</TableHead>
                              <TableHead className="min-w-[160px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {directoryGapRows.map((r) => {
                              const hints =
                                stripeHintsByAthleteCode.get(r.athleteCode.trim().toUpperCase()) ?? ""
                              return (
                                <TableRow key={r.athleteCode}>
                                  <TableCell className="align-top font-mono text-[11px] leading-snug">
                                    <code className="break-all">{r.athleteCode}</code>
                                  </TableCell>
                                  <TableCell className="align-top text-right tabular-nums font-medium">
                                    {formatMoney(r.totalCents, "usd")}
                                  </TableCell>
                                  <TableCell className="align-top tabular-nums">{r.donationCount}</TableCell>
                                  <TableCell className="text-muted-foreground align-top text-sm leading-snug break-words">
                                    {hints || "—"}
                                  </TableCell>
                                  <TableCell className="align-top">
                                    <div className="flex flex-col gap-2">
                                      <Label className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                                        Athlete ID → Pin to this NCU code
                                      </Label>
                                      <Input
                                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                        value={gapPinAthleteId[r.athleteCode.trim().toUpperCase()] ?? ""}
                                        onChange={(e) =>
                                          setGapPinAthleteId((prev) => ({
                                            ...prev,
                                            [r.athleteCode.trim().toUpperCase()]: e.target.value,
                                          }))
                                        }
                                        className="font-mono text-[11px] h-8"
                                        autoComplete="off"
                                      />
                                      <Button
                                        type="button"
                                        size="sm"
                                        className="h-8 w-full max-w-[14rem] bg-[#003366] text-white hover:bg-[#002952]"
                                        disabled={gapPinBusy === r.athleteCode.trim().toUpperCase() || donationsLoading}
                                        onClick={() => void pinGapToAthleteProfile(r.athleteCode)}
                                      >
                                        {gapPinBusy === r.athleteCode.trim().toUpperCase() ? "Pinning…" : "Pin profile"}
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 justify-start gap-1"
                                        onClick={() => filterDonationsToCode(r.athleteCode)}
                                      >
                                        <Filter className="h-3.5 w-3.5" />
                                        Filter donations (sec. 3)
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 justify-start gap-1"
                                        onClick={() => copyFundraisingCode(r.athleteCode)}
                                      >
                                        <ClipboardCopy className="h-3.5 w-3.5" />
                                        Copy code
                                      </Button>
                                      <p className="text-muted-foreground text-[10px] leading-snug">
                                        <HardLink href="/admin/athletes" className="text-primary underline-offset-4 hover:underline">
                                          Browse athletes
                                        </HardLink>
                                        {" · "}
                                        <HardLink href="/admin/athletes/add" className="text-primary underline-offset-4 hover:underline">
                                          Add athlete
                                        </HardLink>
                                      </p>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                  <p className="text-muted-foreground border-t pt-4 text-xs leading-snug">
                    Only codes missing from the directory map. “Roster only” placeholders appear under section 2.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            {parentCoverage && parentCoverage.summary.withFunds > 0 ? (
              <Card id="admin-fundraising-parent-coverage" className={parentCoverage.summary.needsAttention > 0 ? "border-amber-500/50" : "border-emerald-600/40"}>
                <CardHeader className="space-y-4 pb-4">
                  <div className="space-y-2">
                    <CardTitle className="text-lg leading-snug">2. Parent coverage</CardTitle>
                    <p className="text-muted-foreground text-sm leading-snug">
                      Anyone with dollars should have a manager who can open <strong className="text-foreground">Profile → Fundraise</strong>. Use{" "}
                      <strong className="text-foreground">Link parent</strong> or have them add the athlete under Family. Directory issues → fix in{" "}
                      <HardLink href="/admin/athletes" className="text-primary underline-offset-4 hover:underline">
                        athletes admin
                      </HardLink>
                      , then refresh.
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-normal tabular-nums">
                      {parentCoverage.summary.ok} linked
                    </Badge>
                    <Badge variant="outline" className="border-amber-500/60 font-normal tabular-nums text-amber-950 dark:text-amber-50">
                      {parentCoverage.summary.needsAttention} need attention
                    </Badge>
                    <Badge variant="outline" className="font-normal tabular-nums">
                      {parentCoverage.summary.withFunds} codes with dollars
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
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
                    {parentCoverageView === "attention" ? (
                      <div className="grid gap-1.5 sm:min-w-[240px]">
                        <Label htmlFor="attention-kind">Show</Label>
                        <select
                          id="attention-kind"
                          className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
                          value={attentionKind}
                          onChange={(e) =>
                            setAttentionKind(e.target.value as "all" | "no_parent" | "directory" | "roster")
                          }
                        >
                          <option value="all">All issue types ({parentCoverage.summary.needsAttention})</option>
                          <option value="no_parent">
                            Needs parent link ({attentionBreakdown.no_parent})
                          </option>
                          <option value="directory">
                            Code not in directory ({attentionBreakdown.directory})
                          </option>
                          <option value="roster">
                            Roster only — no athlete row ({attentionBreakdown.roster})
                          </option>
                        </select>
                      </div>
                    ) : null}
                  </div>
                  {parentCoverage.summary.needsAttention === 0 ? (
                    <p className="text-sm leading-relaxed text-emerald-700 dark:text-emerald-400">
                      All {parentCoverage.summary.withFunds} athlete code{parentCoverage.summary.withFunds === 1 ? "" : "s"} with
                      dollars have a managing user. Use &quot;All codes&quot; to review each row.
                    </p>
                  ) : parentCoverageView === "attention" ? (
                    <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-100">
                      {parentCoverage.summary.needsAttention} of {parentCoverage.summary.withFunds} codes still need parent/directory
                      fixes. Switch to &quot;All codes&quot; for green (linked) rows.
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Green rows have a parent or self profile tied to Fundraise. Amber rows still need work.
                    </p>
                  )}
                  <div className="overflow-x-auto rounded-lg border shadow-sm">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="whitespace-nowrap">Status</TableHead>
                          <TableHead className="min-w-[140px] whitespace-nowrap">Athlete</TableHead>
                          <TableHead className="whitespace-nowrap">Code</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Raised</TableHead>
                          <TableHead className="whitespace-nowrap">Managers</TableHead>
                          <TableHead className="min-w-[220px] max-w-md">Details</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parentCoverageDisplayRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                              No rows in this view — widen the filter or switch to &quot;All codes&quot;.
                            </TableCell>
                          </TableRow>
                        ) : (
                          parentCoverageDisplayRows.map((r) => (
                            <TableRow
                              key={r.athleteCode}
                              className={r.status === "ok" ? "bg-emerald-50/40 dark:bg-emerald-950/15" : undefined}
                            >
                              <TableCell className="align-top">
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
                              <TableCell className="align-top font-medium">
                                <div className="max-w-[200px] break-words leading-snug">
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
                                </div>
                              </TableCell>
                              <TableCell className="align-top">
                                <code className="break-all font-mono text-[11px] leading-snug">{r.athleteCode}</code>
                              </TableCell>
                              <TableCell className="align-top text-right tabular-nums">{formatMoney(r.totalCents, "usd")}</TableCell>
                              <TableCell className="align-top tabular-nums">{r.managingUserCount}</TableCell>
                              <TableCell className="text-muted-foreground align-top text-sm leading-snug break-words">
                                {r.status === "no_managing_user"
                                  ? "No parent_athlete_links row yet. Link the correct parent account here, or ask them to add this wrestler under Family & athletes."
                                  : r.status === "roster_only_no_athlete_row"
                                    ? "Fundraising roster entry only — create or attach an athlete profile before linking parents."
                                    : r.status === "code_not_in_directory"
                                      ? "Stripe credited this NCU code but it is missing from fundraising directory entries."
                                      : "At least one parent or self profile can manage Fundraise for this athlete."}
                              </TableCell>
                              <TableCell className="align-top text-right">
                                <div className="flex flex-col items-end gap-2">
                                  {r.athleteId && r.status === "no_managing_user" ? (
                                    <Button
                                      type="button"
                                      variant="default"
                                      size="sm"
                                      className="h-8 shrink-0 gap-1"
                                      onClick={() => openLinkParentDialog(r)}
                                    >
                                      <Link2 className="h-3.5 w-3.5" />
                                      Link parent
                                    </Button>
                                  ) : null}
                                  {r.athleteId ? (
                                    <HardLink
                                      href={`/admin/athletes/edit?id=${encodeURIComponent(r.athleteId)}`}
                                      className="text-primary text-sm font-medium underline-offset-4 hover:underline"
                                    >
                                      Edit athlete
                                    </HardLink>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">—</span>
                                  )}
                                </div>
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

            <Card id="admin-fundraising-stripe-donations">
              <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1.5">
                  <CardTitle className="text-lg">3. Payments</CardTitle>
                  <CardDescription>
                    One row = one checkout (<code className="rounded bg-muted px-1 text-xs">{campaign.stripeCampaignSlug}</code>).
                    Athlete column = credit in RecruitNC.{" "}
                    <strong className="text-foreground">Reassign credit</strong> fixes wrong metadata. Ack = thank-you email state.{" "}
                    <strong className="text-foreground">Totals by athlete</strong> rolls up this same data.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-2"
                  disabled={donationsLoading || donations === null}
                  onClick={() => void loadDonations()}
                >
                  <RefreshCw className={`h-4 w-4 ${donationsLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {donationTableMode === "orphaned_codes" ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-500/35 bg-rose-50/60 px-3 py-2.5 dark:border-rose-900/45 dark:bg-rose-950/30">
                    <p className="text-sm leading-snug text-rose-950 dark:text-rose-50">
                      Only checkouts tied to codes still off the directory. Fix section 1, refresh, then clear.
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={() => setDonationTableMode("all")}>
                      Clear orphaned filter
                    </Button>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-end gap-3">
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
                  <p className="text-muted-foreground text-sm">
                    No paid sessions for this campaign in the last {campaign.defaultLookbackDays} days.
                  </p>
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
                  Fix Stripe metadata
                </CardTitle>
                <CardDescription>
                  When you have a session / PI id from Stripe and need to force the NCU code. Overrides roll into totals after refresh.
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

            <Card className="border-[#003366]/15 bg-white">
              <CardHeader>
                <CardTitle className="text-base">CSV exports</CardTitle>
                <CardDescription>
                  <strong className="text-foreground">Tees</strong> — sizes / ship fields from Stripe.{" "}
                  <strong className="text-foreground">Runners / Receipts / Credits / Ledger</strong> — ops and books; each label matches one download.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div>
                  <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">Fulfillment</p>
                  {teeRollupError ? (
                    <p className="text-destructive text-sm" role="alert">
                      {teeRollupError}
                    </p>
                  ) : teeRollup ? (
                    <p className="text-muted-foreground mb-3 text-sm leading-snug">
                      <strong className="text-foreground">{teeRollup.totalTeeOrders}</strong> tee order
                      {teeRollup.totalTeeOrders === 1 ? "" : "s"} ·{" "}
                      {teeRollup.bySize.length > 0 ? (
                        <span className="text-foreground">{teeRollup.bySize.map((r) => `${r.size}: ${r.count}`).join(" · ")}</span>
                      ) : (
                        <span>none in window</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-muted-foreground mb-3 text-sm">Loading tee counts…</p>
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
                    {exportBusy === "tees" ? "Preparing…" : "Tee list"}
                  </Button>
                </div>
                <div>
                  <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">Operations</p>
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
                </div>
                {exportError ? (
                  <p className="text-destructive text-sm" role="alert">
                    {exportError}
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-[#003366]/10">
              <CardHeader>
                <CardTitle className="text-lg">Charts</CardTitle>
                <CardDescription>
                  Same numbers as the tables. Click a bar to filter payments by athlete code.
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
              <Card className="border-[#003366]/10">
                <CardHeader>
                  <CardTitle className="text-base">Leaderboard scratchpad</CardTitle>
                  <CardDescription>Paste totals for announcements — saved in this browser only.</CardDescription>
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

              <Card className="border-[#003366]/10">
                <CardHeader>
                  <CardTitle className="text-base">Notes</CardTitle>
                  <CardDescription>Internal reminders — local to this browser.</CardDescription>
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
        </div>

        <Dialog
          open={linkParentOpen}
          onOpenChange={(o) => {
            setLinkParentOpen(o)
            if (!o) {
              setLinkParentRow(null)
              setParentSearchQuery("")
              setParentSearchResults([])
              setSelectedParent(null)
            }
          }}
        >
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="leading-snug">Link parent to wrestler</DialogTitle>
              <DialogDescription className="leading-snug">
                Search by email or name, click a row to select, then <strong className="text-foreground">Create link</strong>. That adds{" "}
                <code className="rounded bg-muted px-1 text-[11px]">parent_athlete_links</code> so Fundraise shows under Profile.
              </DialogDescription>
            </DialogHeader>
            {linkParentRow ? (
              <div className="space-y-4 text-sm">
                <div className="rounded-md border bg-muted/35 px-3 py-2 leading-relaxed">
                  <p className="font-medium text-foreground">{linkParentRow.displayName}</p>
                  <p className="text-muted-foreground mt-1 font-mono text-xs">{linkParentRow.athleteCode}</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="parent-search-fundraising">Search parent accounts</Label>
                  <Input
                    id="parent-search-fundraising"
                    placeholder="e.g. smith, mom@gmail.com, Jane Smith…"
                    value={parentSearchQuery}
                    onChange={(e) => {
                      setParentSearchQuery(e.target.value)
                      setSelectedParent(null)
                    }}
                    autoComplete="off"
                  />
                  <p className="text-muted-foreground text-xs leading-snug">
                    Matches login email, full name, and separate first/last on the profile. Click a result to select it — the
                    highlighted row is who will be linked.
                  </p>
                </div>
                {parentSearchBusy ? (
                  <p className="text-muted-foreground text-xs">Searching…</p>
                ) : parentSearchResults.length > 0 ? (
                  <div className="max-h-[220px] overflow-y-auto rounded-md border">
                    <ul className="divide-y">
                      {parentSearchResults.map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            className={`hover:bg-muted/60 flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition-colors ${
                              selectedParent?.id === u.id ? "bg-muted" : ""
                            }`}
                            onClick={() => setSelectedParent(u)}
                          >
                            <span className="font-medium">{u.full_name}</span>
                            <span className="text-muted-foreground break-all text-xs">{u.email ?? "—"}</span>
                            <span className="text-muted-foreground font-mono text-[10px]">{u.id}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : parentSearchQuery.trim().length >= 2 ? (
                  <p className="text-muted-foreground text-xs">No matches — try another spelling or email fragment.</p>
                ) : null}
                {selectedParent ? (
                  <div className="rounded-md border border-emerald-600/40 bg-emerald-50/50 px-3 py-2 text-sm dark:bg-emerald-950/30">
                    <p className="font-medium text-emerald-950 dark:text-emerald-50">Selected</p>
                    <p className="mt-1">{selectedParent.full_name}</p>
                    <p className="text-muted-foreground break-all text-xs">{selectedParent.email ?? "—"}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setLinkParentOpen(false)}
                disabled={linkParentBusy}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void submitParentLink()}
                disabled={linkParentBusy || !linkParentRow?.athleteId || !selectedParent}
              >
                {linkParentBusy ? "Saving…" : "Create link"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                Wrong athlete at checkout. Enter the correct <span className="font-mono text-xs">NCU-…-YY</span> code — session id below is pre-filled from this row.
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
                Preview then send the NC United acknowledgment. Amount and recipient email must match this Stripe row.
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
