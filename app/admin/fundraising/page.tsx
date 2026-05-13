"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AdminHeader } from "@/components/admin-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { HardLink } from "@/components/hard-link"
import { FundraisingPlaybookHeader } from "@/app/admin/fundraising/_components/fundraising-playbook-header"
import { AttachAthleteToProfileDialog } from "@/components/fundraising-wiring/attach-athlete-to-profile-dialog"
import {
  LinkParentToAthleteDialog,
  type FundraisingParentLinkPayload,
} from "@/components/fundraising-wiring/link-parent-to-athlete-dialog"
import {
  FUNDRAISING_CAMPAIGNS,
  DEFAULT_FUNDRAISING_CAMPAIGN,
  NC_UNITED_FUNDRAISING_BRAND,
  adminFundraisingLeaderboardStorageKey,
  adminFundraisingNotesStorageKey,
  fundraisingCampaignByContextKey,
  fundraisingCampaignByStripeSlug,
} from "@/lib/fundraising/campaign-registry"
import { emptyFundraisingWiringSnapshot, type FundraisingWiringAdminSnapshot } from "@/lib/fundraising/fundraising-wiring-status"
import { cn } from "@/lib/utils"
import { publicAthleteCreditLabel } from "@/lib/spartan-fayetteville-stripe"
import { SpartanFundraisingVisuals } from "@/components/admin/spartan-fundraising-visuals"
import {
  AlertTriangle,
  ChevronDown,
  ClipboardCopy,
  Download,
  Filter,
  Gift,
  Layers,
  LayoutGrid,
  Link2,
  Mail,
  RefreshCw,
  Search,
  UserRoundX,
  UserCircle,
  Users,
  Wallet,
  Wrench,
} from "lucide-react"
import type { FundraisingAthleteMatrixPayload } from "@/lib/admin-fundraising-athlete-matrix"
import { matrixRowDisplayName } from "@/lib/admin-fundraising-athlete-matrix"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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

type AdminAthleteFundraisingProfileRow = {
  id: string
  created_at: string
  updated_at: string
  athlete_id: string
  slug: string
  bio: string | null
  photo_url: string | null
  is_active: boolean
  /** When true, Stripe checkout may embed on /fundraising/athletes/{slug}. */
  checkout_live: boolean
  campaign_goal_cents: number | null
  total_raised_cents: number | null
  primary_fundraising_code: string | null
  athlete_name: string | null
  roster_ncu_code: string | null
  wiring: FundraisingWiringAdminSnapshot
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

/** Open reimbursement requests (pending / review / approved awaiting payout), keyed by `athletes.id`. */
function rollupOpenExpenseRequestsByAthleteId(
  requests: { athlete_id: string; status: string; amount_cents: number; amount_approved_cents: number | null }[],
): Record<string, { pendingReviewCents: number; awaitingPayoutCents: number; openCount: number }> {
  const out: Record<string, { pendingReviewCents: number; awaitingPayoutCents: number; openCount: number }> = {}
  for (const r of requests) {
    const st = r.status
    if (st === "paid" || st === "rejected") continue
    const id = typeof r.athlete_id === "string" ? r.athlete_id.trim() : ""
    if (!id) continue
    const cur = out[id] ?? { pendingReviewCents: 0, awaitingPayoutCents: 0, openCount: 0 }
    cur.openCount += 1
    if (st === "pending" || st === "under_review") {
      cur.pendingReviewCents += typeof r.amount_cents === "number" ? r.amount_cents : 0
    } else if (st === "approved") {
      cur.awaitingPayoutCents += r.amount_approved_cents ?? r.amount_cents ?? 0
    }
    out[id] = cur
  }
  return out
}

function scrollToFundraisingSection(elementId: string) {
  window.requestAnimationFrame(() => {
    document.getElementById(elementId)?.scrollIntoView({ behavior: "smooth", block: "start" })
  })
}

function WiringDot({ ok, title }: { ok: boolean; title: string }) {
  return (
    <span title={title} className="inline-flex items-center justify-center">
      <span
        className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", ok ? "bg-emerald-500" : "bg-red-500")}
        aria-hidden
      />
    </span>
  )
}

function ProfileCodeSyncDot({ ok }: { ok: boolean | null }) {
  if (ok === null) {
    return (
      <span
        title="Fundraising profile has no primary NCU code — optional sanity check"
        className="text-muted-foreground inline-flex min-w-[1.25rem] justify-center text-xs font-medium"
      >
        —
      </span>
    )
  }
  return (
    <WiringDot
      ok={ok}
      title={ok ? "Primary NCU on profile matches roster code" : "Primary NCU on profile does not match roster code"}
    />
  )
}

const ATHLETE_UUID_PIN_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const NCU_CODE_PIN_RE = /^NCU-[A-Z0-9]+-\d{2}$/

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

  /** Wrestler picker + manual Pin when Directory gaps table is empty */
  const [quickPinAthletes, setQuickPinAthletes] = useState<{ id: string; name: string }[] | null>(null)
  const [quickPinAthletesLoading, setQuickPinAthletesLoading] = useState(false)
  const [quickPinSearch, setQuickPinSearch] = useState("")
  const [quickPinAthleteIdField, setQuickPinAthleteIdField] = useState("")
  const [quickPinAthleteNameHint, setQuickPinAthleteNameHint] = useState("")
  const [quickPinNcu, setQuickPinNcu] = useState("")
  const [quickPinSubmitBusy, setQuickPinSubmitBusy] = useState(false)

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
  const [creditFixToNcUnitedFund, setCreditFixToNcUnitedFund] = useState(false)
  const [creditFixBusy, setCreditFixBusy] = useState(false)
  const [creditFixMsg, setCreditFixMsg] = useState<string | null>(null)

  const [reassignOpen, setReassignOpen] = useState(false)
  const [reassignRow, setReassignRow] = useState<SpartanDonationRow | null>(null)
  const [reassignCode, setReassignCode] = useState("")
  const [reassignToNcUnitedFund, setReassignToNcUnitedFund] = useState(false)
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

  const [linkParentPayload, setLinkParentPayload] = useState<FundraisingParentLinkPayload | null>(null)

  /** Narrow section 3 donation table to checkouts credited to NCU codes missing from fundraising directory. */
  const [donationTableMode, setDonationTableMode] = useState<"all" | "orphaned_codes">("all")

  const [fundraisingProfiles, setFundraisingProfiles] = useState<AdminAthleteFundraisingProfileRow[] | null>(null)
  const [fundraisingProfilesLoading, setFundraisingProfilesLoading] = useState(false)
  const [fundraisingProfilesError, setFundraisingProfilesError] = useState<string | null>(null)
  const [syncDirectoryBusy, setSyncDirectoryBusy] = useState(false)

  const [athleteMatrix, setAthleteMatrix] = useState<FundraisingAthleteMatrixPayload | null>(null)
  const [athleteMatrixLoading, setAthleteMatrixLoading] = useState(false)
  const [athleteMatrixError, setAthleteMatrixError] = useState<string | null>(null)
  const [athleteMatrixFilter, setAthleteMatrixFilter] = useState("")
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [profileEditingId, setProfileEditingId] = useState<string | null>(null)
  const [profileAthleteId, setProfileAthleteId] = useState("")
  const [profileSlug, setProfileSlug] = useState("")
  const [profileBio, setProfileBio] = useState("")
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("")
  const [profileGoalDollars, setProfileGoalDollars] = useState("")
  const [profilePrimaryCode, setProfilePrimaryCode] = useState("")
  const [profileActive, setProfileActive] = useState(true)
  const [profileCheckoutLive, setProfileCheckoutLive] = useState(false)
  const [checkoutLiveToggleBusyId, setCheckoutLiveToggleBusyId] = useState<string | null>(null)
  const [profileSaveBusy, setProfileSaveBusy] = useState(false)
  /** Donor profile row → Attach athlete dialog */
  const [attachAthleteProfile, setAttachAthleteProfile] = useState<AdminAthleteFundraisingProfileRow | null>(null)
  const [walletGuideOpen, setWalletGuideOpen] = useState(false)

  const [kidLedgerFilter, setKidLedgerFilter] = useState("")
  const [expenseRollupByAthleteId, setExpenseRollupByAthleteId] = useState<
    Record<string, { pendingReviewCents: number; awaitingPayoutCents: number; openCount: number }>
  >({})
  const [expenseRollupLoading, setExpenseRollupLoading] = useState(false)
  const [expenseRollupError, setExpenseRollupError] = useState<string | null>(null)

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

  const loadAthleteMatrix = useCallback(async () => {
    setAthleteMatrixLoading(true)
    setAthleteMatrixError(null)
    try {
      const res = await fetch("/api/admin/fundraising-athlete-matrix", { credentials: "include" })
      const j = (await res.json()) as FundraisingAthleteMatrixPayload & { error?: string }
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Failed to load wiring matrix")
      setAthleteMatrix({
        rows: Array.isArray(j.rows) ? j.rows : [],
        campaigns: Array.isArray(j.campaigns) ? j.campaigns : [],
        generatedAt: typeof j.generatedAt === "string" ? j.generatedAt : new Date().toISOString(),
      })
    } catch (e) {
      setAthleteMatrixError(e instanceof Error ? e.message : "Failed")
      setAthleteMatrix(null)
    } finally {
      setAthleteMatrixLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAthleteMatrix()
  }, [loadAthleteMatrix])

  const loadDonations = useCallback(async () => {
    setDonationsLoading(true)
    setDonationsError(null)
    try {
      const days = campaign.defaultLookbackDays
      const slug = encodeURIComponent(campaign.stripeCampaignSlug)
      const res = await fetch(
        `/api/admin/spartan-donations?days=${days}&includeParentCoverage=1&campaign=${slug}`,
        { cache: "no-store" },
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
      void loadAthleteMatrix()
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
  }, [campaign.defaultLookbackDays, campaign.stripeCampaignSlug, fetchTeeRollup, loadAthleteMatrix])

  useEffect(() => {
    void loadDonations()
  }, [loadDonations])

  const loadExpenseRollup = useCallback(async () => {
    setExpenseRollupLoading(true)
    setExpenseRollupError(null)
    try {
      const res = await fetch("/api/admin/expense-requests", { credentials: "include" })
      const j = (await res.json()) as {
        error?: string
        requests?: {
          athlete_id: string
          status: string
          amount_cents: number
          amount_approved_cents: number | null
        }[]
      }
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Could not load reimbursement queue")
      setExpenseRollupByAthleteId(rollupOpenExpenseRequestsByAthleteId(j.requests ?? []))
    } catch (e) {
      setExpenseRollupError(e instanceof Error ? e.message : "Reimbursement queue failed")
      setExpenseRollupByAthleteId({})
    } finally {
      setExpenseRollupLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadExpenseRollup()
  }, [loadExpenseRollup])

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

  const submitSpartanFundraisingPin = useCallback(
    async (athleteIdRaw: string, ncuCodeRaw: string): Promise<boolean> => {
      const athleteId = athleteIdRaw.trim()
      const code = ncuCodeRaw.trim().toUpperCase()
      if (!ATHLETE_UUID_PIN_RE.test(athleteId)) {
        toast({
          title: "Need a valid athlete ID",
          description: "Pick a wrestler below or paste UUID from Athletes admin / view-profile.",
          variant: "destructive",
        })
        return false
      }
      if (!NCU_CODE_PIN_RE.test(code)) {
        toast({
          title: "NCU code format",
          description: "Use NCU-NAME-YY (example: NCU-SMITH-28). Letters/numbers OK in the middle.",
          variant: "destructive",
        })
        return false
      }
      try {
        const res = await fetch("/api/admin/spartan-fundraising-pin-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ athleteId, ncuCode: code }),
        })
        const j = (await res.json()) as { error?: string; message?: string }
        if (!res.ok) throw new Error(j.error || "Pin failed")
        toast({ title: "Pinned", description: j.message ?? `${code} linked.` })
        await loadDonations()
        await loadAthleteMatrix()
        return true
      } catch (e) {
        toast({
          title: "Pin failed",
          description: e instanceof Error ? e.message : "Unknown error",
          variant: "destructive",
        })
        return false
      }
    },
    [loadDonations, loadAthleteMatrix],
  )

  const loadQuickPinAthletes = async () => {
    if (quickPinAthletes !== null || quickPinAthletesLoading) return
    setQuickPinAthletesLoading(true)
    try {
      const res = await fetch("/api/admin/athletes", { credentials: "include" })
      if (!res.ok) throw new Error(`Could not load athletes (${res.status})`)
      const data = await res.json()
      let arr: unknown[] = []
      if (Array.isArray(data)) arr = data
      else if (data && typeof data === "object") {
        const d = data as { athletes?: unknown[]; data?: unknown[] }
        if (Array.isArray(d.athletes)) arr = d.athletes
        else if (Array.isArray(d.data)) arr = d.data
      }
      const mapped = arr
        .map((raw) => {
          const a = raw as { id?: string; name?: string }
          return {
            id: typeof a.id === "string" ? a.id : "",
            name: typeof a.name === "string" ? a.name : "—",
          }
        })
        .filter((a) => a.id)
        .sort((a, b) => a.name.localeCompare(b.name))
      setQuickPinAthletes(mapped)
    } catch (e) {
      toast({
        title: "Could not load wrestler list",
        description: e instanceof Error ? e.message : "Open Athletes admin to copy an ID.",
        variant: "destructive",
      })
      setQuickPinAthletes(null)
    } finally {
      setQuickPinAthletesLoading(false)
    }
  }

  const pinGapToAthleteProfile = async (ncuCode: string) => {
    const key = ncuCode.trim().toUpperCase()
    const athleteId = (gapPinAthleteId[key] ?? "").trim()
    setGapPinBusy(key)
    try {
      await submitSpartanFundraisingPin(athleteId, key)
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

  async function saveSpartanCreditCorrection(
    sessionId: string,
    payload: { athleteCode: string } | { generalFund: true },
  ): Promise<string> {
    const body =
      "athleteCode" in payload
        ? { session_id: sessionId.trim(), athlete_code: payload.athleteCode.trim() }
        : { session_id: sessionId.trim(), general_fund: true }
    const res = await fetch("/api/admin/spartan-credit-corrections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    })
    const j = (await res.json()) as { error?: string; message?: string }
    if (!res.ok) throw new Error(j.error || "Save failed")
    return j.message ?? "Saved."
  }

  const applySpartanCreditFix = async () => {
    setCreditFixMsg(null)
    setCreditFixBusy(true)
    try {
      const msg = creditFixToNcUnitedFund
        ? await saveSpartanCreditCorrection(creditFixSessionId, { generalFund: true })
        : await saveSpartanCreditCorrection(creditFixSessionId, { athleteCode: creditFixCode })
      setCreditFixMsg(msg)
      setCreditFixSessionId("")
      setCreditFixCode("")
      setCreditFixToNcUnitedFund(false)
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
    setReassignToNcUnitedFund(false)
    setReassignOpen(true)
  }

  const applyReassignFromRow = async () => {
    if (!reassignRow) return
    setReassignBusy(true)
    try {
      const msg = reassignToNcUnitedFund
        ? await saveSpartanCreditCorrection(reassignRow.sessionId, { generalFund: true })
        : await saveSpartanCreditCorrection(reassignRow.sessionId, { athleteCode: reassignCode })
      toast({ title: "Fundraising credit updated", description: msg })
      setReassignOpen(false)
      setReassignRow(null)
      setReassignToNcUnitedFund(false)
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
    if (!r.athleteId) {
      toast({
        title: "No athlete id",
        description: "Pin this NCU code to a directory athlete first.",
        variant: "destructive",
      })
      return
    }
    setLinkParentPayload({
      athleteId: r.athleteId,
      displayName: r.displayName,
      athleteCode: r.athleteCode,
      fundraisingSlug: null,
    })
  }

  const openLinkParentDialogFromProfile = (p: AdminAthleteFundraisingProfileRow) => {
    const codeRaw = (p.primary_fundraising_code ?? p.roster_ncu_code ?? "").trim()
    setLinkParentPayload({
      athleteId: p.athlete_id,
      displayName: p.athlete_name ?? p.slug,
      athleteCode: codeRaw || "—",
      fundraisingSlug: p.slug,
    })
  }

  const openAttachAthleteDialog = (p: AdminAthleteFundraisingProfileRow) => {
    setAttachAthleteProfile(p)
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

  const fundraiserCodeToAthleteId = useMemo(() => {
    const m = new Map<string, string>()
    for (const row of parentCoverage?.rows ?? []) {
      const code = row.athleteCode?.trim().toUpperCase()
      const aid = row.athleteId?.trim()
      if (code && aid) m.set(code, aid)
    }
    for (const row of athleteMatrix?.rows ?? []) {
      const code = row.code.trim().toUpperCase()
      if (row.pinnedAthleteId) m.set(code, row.pinnedAthleteId)
    }
    return m
  }, [parentCoverage, athleteMatrix])

  const aggByAthleteCode = useMemo(() => {
    const map = new Map<string, SpartanAthleteAggregate>()
    for (const a of byAthlete ?? []) {
      map.set(a.athleteCode.trim().toUpperCase(), a)
    }
    return map
  }, [byAthlete])

  const kidLedgerRows = useMemo(() => {
    const matrixRows = athleteMatrix?.rows ?? []
    const codes = new Set<string>()
    for (const r of matrixRows) codes.add(r.code.trim().toUpperCase())
    for (const k of aggByAthleteCode.keys()) codes.add(k)

    const rows = [...codes].map((code) => {
      const mat = matrixRows.find((x) => x.code.trim().toUpperCase() === code)
      const agg = aggByAthleteCode.get(code)
      const raised = agg?.totalCents ?? 0
      const reimbPaid = agg?.reimbursementsPaidCents ?? 0
      const net = agg?.netAfterReimbursementsCents ?? raised - reimbPaid
      const guild = agg?.guildAllocationsCents ?? 0
      const balance = net - guild
      const displayName = mat ? matrixRowDisplayName(mat) : (agg?.athleteDisplayName ?? "").trim() || code
      const athleteId = fundraiserCodeToAthleteId.get(code) ?? mat?.pinnedAthleteId ?? null
      const exp = athleteId ? expenseRollupByAthleteId[athleteId] : undefined
      const pendingReviewCents = exp?.pendingReviewCents ?? 0
      const awaitingPayoutCents = exp?.awaitingPayoutCents ?? 0
      const openReimbCents = pendingReviewCents + awaitingPayoutCents
      return {
        code,
        displayName,
        raised,
        reimbPaid,
        guild,
        balance,
        athleteId,
        openReimbCents,
        openReimbCount: exp?.openCount ?? 0,
        pendingReviewCents,
        awaitingPayoutCents,
      }
    })

    rows.sort((a, b) => b.raised - a.raised || a.displayName.localeCompare(b.displayName))
    return rows
  }, [aggByAthleteCode, athleteMatrix, expenseRollupByAthleteId, fundraiserCodeToAthleteId])

  const quickPinFiltered = useMemo(() => {
    if (!quickPinAthletes?.length) return []
    const q = quickPinSearch.trim().toLowerCase()
    if (q.length < 2) return []
    return quickPinAthletes.filter((a) => a.name.toLowerCase().includes(q)).slice(0, 20)
  }, [quickPinAthletes, quickPinSearch])

  const filteredKidLedgerRows = useMemo(() => {
    const q = kidLedgerFilter.trim().toLowerCase()
    if (!q) return kidLedgerRows
    return kidLedgerRows.filter(
      (r) => r.displayName.toLowerCase().includes(q) || r.code.toLowerCase().includes(q),
    )
  }, [kidLedgerRows, kidLedgerFilter])

  const kidLedgerOpenReimbCount = useMemo(
    () => kidLedgerRows.filter((r) => r.openReimbCount > 0).length,
    [kidLedgerRows],
  )

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

  const loadFundraisingProfiles = useCallback(async () => {
    setFundraisingProfilesLoading(true)
    setFundraisingProfilesError(null)
    try {
      const res = await fetch("/api/admin/athlete-fundraising-profiles", { credentials: "include" })
      const j = (await res.json()) as { error?: string; profiles?: AdminAthleteFundraisingProfileRow[] }
      if (!res.ok) {
        setFundraisingProfilesError(typeof j.error === "string" ? j.error : "Failed to load profiles")
        setFundraisingProfiles([])
        return
      }
      setFundraisingProfiles(
        (Array.isArray(j.profiles) ? j.profiles : []).map((p) => ({
          ...p,
          wiring: p.wiring ?? emptyFundraisingWiringSnapshot(),
        })),
      )
    } catch {
      setFundraisingProfilesError("Failed to load profiles")
      setFundraisingProfiles([])
    } finally {
      setFundraisingProfilesLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadFundraisingProfiles()
  }, [loadFundraisingProfiles])

  const syncFundraisingProfilesFromDirectory = useCallback(async () => {
    setSyncDirectoryBusy(true)
    try {
      const res = await fetch("/api/admin/athlete-fundraising-profiles/sync-directory", {
        method: "POST",
        credentials: "include",
      })
      const j = (await res.json()) as {
        error?: string
        created?: number
        skippedHasProfile?: number
        conflicts?: { code: string; reason: string }[]
      }
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Sync failed")
      await loadFundraisingProfiles()
      await loadAthleteMatrix()
      const nConf = j.conflicts?.length ?? 0
      toast({
        title: "Directory sync finished",
        description: `Created ${j.created ?? 0}. Skipped ${j.skippedHasProfile ?? 0} already linked.${nConf ? ` ${nConf} conflicts (slug taken).` : ""}`,
      })
    } catch (e) {
      toast({
        title: "Sync failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSyncDirectoryBusy(false)
    }
  }, [loadFundraisingProfiles, loadAthleteMatrix])

  const athleteMatrixFilteredRows = useMemo(() => {
    if (!athleteMatrix?.rows.length) return []
    const q = athleteMatrixFilter.trim().toLowerCase()
    if (!q) return athleteMatrix.rows

    const campaignSlugHints = FUNDRAISING_CAMPAIGNS.filter(
      (c) =>
        c.tabLabel.toLowerCase().includes(q) ||
        c.stripeCampaignSlug.toLowerCase().includes(q) ||
        c.adminContextKey.toLowerCase().includes(q),
    ).map((c) => c.stripeCampaignSlug)

    return athleteMatrix.rows.filter((r) => {
      const slugs = r.campaignActivitySlugs ?? []
      if (
        r.code.toLowerCase().includes(q) ||
        matrixRowDisplayName(r).toLowerCase().includes(q) ||
        (r.donorProfileSlug ?? "").toLowerCase().includes(q) ||
        (r.pinnedAthleteId ?? "").toLowerCase().includes(q)
      ) {
        return true
      }
      if (campaignSlugHints.length > 0 && campaignSlugHints.some((slug) => slugs.includes(slug))) return true
      return slugs.some((s) => s.toLowerCase().includes(q))
    })
  }, [athleteMatrix, athleteMatrixFilter])

  const athleteMatrixSummary = useMemo(() => {
    const rows = athleteMatrix?.rows ?? []
    if (!rows.length) return null
    let fullyWired = 0
    let needPin = 0
    let needDonorPage = 0
    let needParent = 0
    for (const r of rows) {
      if (r.rosterPinOk && r.donorPageOk && r.parentOk) fullyWired++
      if (!r.rosterPinOk) needPin++
      if (r.rosterPinOk && !r.donorPageOk) needDonorPage++
      if (r.rosterPinOk && !r.parentOk) needParent++
    }
    return { fullyWired, needPin, needDonorPage, needParent, total: rows.length }
  }, [athleteMatrix])

  const openNewFundraisingProfileDialog = () => {
    setProfileEditingId(null)
    setProfileAthleteId("")
    setProfileSlug("")
    setProfileBio("")
    setProfilePhotoUrl("")
    setProfileGoalDollars("")
    setProfilePrimaryCode("")
    setProfileActive(true)
    setProfileCheckoutLive(false)
    setProfileDialogOpen(true)
  }

  const openEditFundraisingProfileDialog = (row: AdminAthleteFundraisingProfileRow) => {
    setProfileEditingId(row.id)
    setProfileAthleteId(row.athlete_id)
    setProfileSlug(row.slug)
    setProfileBio(row.bio ?? "")
    setProfilePhotoUrl(row.photo_url ?? "")
    setProfileGoalDollars(
      row.campaign_goal_cents != null && row.campaign_goal_cents > 0
        ? (row.campaign_goal_cents / 100).toFixed(2)
        : "",
    )
    setProfilePrimaryCode(row.primary_fundraising_code ?? "")
    setProfileActive(row.is_active)
    setProfileCheckoutLive(row.checkout_live === true)
    setProfileDialogOpen(true)
  }

  const patchFundraisingProfileCheckoutLive = async (row: AdminAthleteFundraisingProfileRow, next: boolean) => {
    setCheckoutLiveToggleBusyId(row.id)
    try {
      const res = await fetch("/api/admin/athlete-fundraising-profiles", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, checkout_live: next }),
      })
      const j = (await res.json()) as { error?: string }
      if (!res.ok) {
        toast({
          title: "Could not update checkout",
          description: j.error ?? res.statusText,
          variant: "destructive",
        })
        return
      }
      toast({
        title: next ? "Checkout activated on gift page" : "Checkout paused",
        description: `${row.slug} — Stripe ${next ? "will" : "will not"} embed for this slug.`,
      })
      await loadFundraisingProfiles()
      await loadAthleteMatrix()
    } finally {
      setCheckoutLiveToggleBusyId(null)
    }
  }

  const saveFundraisingProfile = async () => {
    const goalCents =
      profileGoalDollars.trim() === "" ? null : parseDollarsToCents(profileGoalDollars)
    if (profileGoalDollars.trim() !== "" && goalCents === null) {
      toast({
        title: "Invalid goal",
        description: "Enter a valid dollar amount or leave goal blank.",
        variant: "destructive",
      })
      return
    }
    const slugTrim = profileSlug.trim().toLowerCase()
    if (!slugTrim) {
      toast({ title: "Slug required", variant: "destructive" })
      return
    }
    setProfileSaveBusy(true)
    try {
      if (profileEditingId) {
        const res = await fetch("/api/admin/athlete-fundraising-profiles", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: profileEditingId,
            slug: slugTrim,
            bio: profileBio.trim() || null,
            photo_url: profilePhotoUrl.trim() || null,
            is_active: profileActive,
            checkout_live: profileCheckoutLive,
            campaign_goal_cents: goalCents,
            primary_fundraising_code: profilePrimaryCode.trim() ? profilePrimaryCode.trim().toUpperCase() : null,
          }),
        })
        const j = (await res.json()) as { error?: string }
        if (!res.ok) {
          toast({
            title: "Save failed",
            description: j.error ?? res.statusText,
            variant: "destructive",
          })
          return
        }
      } else {
        const aid = profileAthleteId.trim()
        if (!aid) {
          toast({ title: "Athlete id required", description: "Paste the RecruitNC athletes.id UUID.", variant: "destructive" })
          setProfileSaveBusy(false)
          return
        }
        if (!ATHLETE_UUID_PIN_RE.test(aid)) {
          toast({ title: "Invalid athlete id", description: "Must be a UUID from the athletes table.", variant: "destructive" })
          setProfileSaveBusy(false)
          return
        }
        const res = await fetch("/api/admin/athlete-fundraising-profiles", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            athlete_id: aid,
            slug: slugTrim,
            bio: profileBio.trim() || null,
            photo_url: profilePhotoUrl.trim() || null,
            is_active: profileActive,
            campaign_goal_cents: goalCents,
            primary_fundraising_code: profilePrimaryCode.trim() ? profilePrimaryCode.trim().toUpperCase() : null,
          }),
        })
        const j = (await res.json()) as { error?: string }
        if (!res.ok) {
          toast({
            title: "Create failed",
            description: j.error ?? res.statusText,
            variant: "destructive",
          })
          return
        }
      }
      toast({ title: profileEditingId ? "Profile updated" : "Profile created" })
      setProfileDialogOpen(false)
      await loadFundraisingProfiles()
      await loadAthleteMatrix()
    } finally {
      setProfileSaveBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100/80 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <FundraisingPlaybookHeader campaign={campaign} />

        <AdminHeader />

        <Card id="admin-fundraising-start-here" className="mt-6 overflow-hidden border-[#003366]/25 bg-white shadow-sm">
          <div
            className="h-1"
            style={{ background: `linear-gradient(to right, ${brand.navy}, ${brand.crimson})` }}
            aria-hidden
          />
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-[#003366] dark:text-blue-100">Start here (new teammate)</CardTitle>
            <CardDescription className="text-base leading-relaxed text-foreground/85">
              No prior context needed. When someone says money is not showing for their kid, walk down this list in order.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0 text-sm leading-relaxed">
            <ol className="text-muted-foreground list-decimal space-y-2.5 pl-5 marker:font-semibold marker:text-[#003366]">
              <li>
                <span className="font-medium text-foreground">Gifts use a wrestler code</span> (looks like{" "}
                <span className="font-mono text-xs text-foreground">NCU-LASTNAME-28</span>). Stripe stores that on each payment.
              </li>
              <li>
                <span className="font-medium text-foreground">Pin NCU to the athlete</span> — use Directory gaps →{" "}
                <strong className="text-foreground">Pin any wrestler</strong> (name search). Without Pin, gifts never credit that kid&apos;s wallet.
              </li>
              <li>
                <span className="font-medium text-foreground">Optional:</span> turn on a public donor page (see section Donor-facing athlete profiles). Families do not need this to see balances.
              </li>
              <li>
                <span className="font-medium text-foreground">Link the parent account</span> if Mom/Dad should see Profile → Fundraise (section Parent coverage).
              </li>
              <li>
                <span className="font-medium text-foreground">Use Kids ledger</span> as your cheat sheet: raised vs paid back vs what&apos;s left + flags for open reimbursement requests.
              </li>
            </ol>
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => scrollToFundraisingSection("admin-fundraising-quick-ops")}>
                Jump to 3-step setup
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => scrollToFundraisingSection("admin-fundraising-kids-ledger")}>
                Jump to Kids ledger
              </Button>
            </div>
          </CardContent>
        </Card>

        {FUNDRAISING_CAMPAIGNS.length > 1 ? (
          <div
            role="tablist"
            aria-label="Fundraising campaigns"
            className="mt-6 flex flex-wrap gap-2 rounded-xl border border-[#003366]/12 bg-white p-2 shadow-sm"
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

        <div className="mt-6 space-y-6">
            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
              <Card id="admin-fundraising-campaign-overview" className="overflow-hidden border-[#003366]/20 bg-white shadow-sm">
                <div
                  className="h-1"
                  style={{ background: `linear-gradient(to right, ${brand.navy}, ${brand.crimson})` }}
                  aria-hidden
                />
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-lg">Numbers at a glance</CardTitle>
                      <CardDescription className="mt-1 max-w-xl leading-snug">
                        Pulled from Stripe for <strong className="font-medium text-foreground">{campaign.tabLabel}</strong>, last{" "}
                        {campaign.defaultLookbackDays} days. Updates when you open the page; press Refresh if you fixed something in another tab.
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-2"
                      onClick={() => {
                        void loadDonations()
                        void loadExpenseRollup()
                      }}
                      disabled={donationsLoading}
                    >
                      <RefreshCw className={cn("h-4 w-4 shrink-0", donationsLoading && "animate-spin")} aria-hidden />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {donationsLoading && donations === null ? (
                    <p className="text-muted-foreground text-sm">Syncing Stripe payments and parent coverage…</p>
                  ) : null}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border bg-muted/30 px-3 py-2">
                      <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">Checkouts</p>
                      <p className="mt-1 text-xs text-muted-foreground">rows</p>
                      <p className="mt-0.5 text-xl font-bold tabular-nums">{donations !== null ? ackStats.total : "—"}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 px-3 py-2">
                      <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">Total charged</p>
                      <p className="mt-1 text-xs text-muted-foreground">all gifts</p>
                      <p className="mt-0.5 text-xl font-bold tabular-nums leading-tight">
                        {donations !== null ? formatMoney(grossSessionTotalCents, "usd") : "—"}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 px-3 py-2">
                      <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">After paid-back</p>
                      <p className="mt-1 text-xs text-muted-foreground">reimbursements</p>
                      <p className="mt-0.5 text-xl font-bold tabular-nums leading-tight">
                        {donations !== null ? formatMoney(netAfterReimbursementsCents, "usd") : "—"}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 px-3 py-2">
                      <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">Codes w/ money</p>
                      <p className="mt-1 text-xs text-muted-foreground">wrestlers</p>
                      <p className="mt-0.5 text-xl font-bold tabular-nums">{parentCoverage ? parentCoverage.summary.withFunds : "—"}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 px-3 py-2">
                      <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">Still broken</p>
                      <p className="mt-1 text-xs text-muted-foreground">need fixes</p>
                      <p className="mt-0.5 text-xl font-bold tabular-nums">{parentCoverage ? parentCoverage.summary.needsAttention : "—"}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 px-3 py-2">
                      <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">Thank-you emails</p>
                      <p className="mt-1 text-xs text-muted-foreground">not sent yet</p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums leading-snug">
                        {donations !== null ? `${ackStats.unsent} unsent` : "—"}
                      </p>
                    </div>
                  </div>
                  {dash ? (
                    <p className="text-muted-foreground text-xs leading-snug">
                      Tap the colored tiles further down to jump to each fix list —{" "}
                      <span className="font-medium tabular-nums text-foreground">{dash.offDirectoryCodes}</span> payments on codes we
                      haven&apos;t matched to a kid yet ·{" "}
                      <span className="font-medium tabular-nums text-foreground">{dash.rosterOnlyKids}</span> roster placeholders (no real athlete row) ·{" "}
                      <span className="font-medium tabular-nums text-foreground">{dash.needsParentKids}</span> kids still need a parent login linked ·{" "}
                      <span className="font-medium tabular-nums text-foreground">{dash.orphanedCheckouts}</span> checkouts stuck on mystery codes.
                    </p>
                  ) : null}
                  {donationsError ? (
                    <p className="text-destructive text-sm" role="alert">
                      {donationsError}
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card id="admin-fundraising-quick-ops" className="overflow-hidden border-[#003366]/20 bg-white shadow-sm">
                <div
                  className="h-1"
                  style={{ background: `linear-gradient(to right, ${brand.navy}, ${brand.crimson})` }}
                  aria-hidden
                />
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">3-step setup</CardTitle>
                  <CardDescription className="leading-relaxed">
                    Search the wrestler in{" "}
                    <HardLink href="/admin/athletes" className="text-primary font-medium underline-offset-2 hover:underline">
                      Athletes admin
                    </HardLink>
                    , copy their <strong className="font-medium text-foreground">ID</strong> (long text with dashes). Then do these in order on this page.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 pt-0">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-auto justify-start gap-3 py-3 text-left"
                    onClick={() => scrollToFundraisingSection("admin-fundraising-directory-gaps")}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#003366]/12 text-sm font-bold text-[#003366]">
                      1
                    </span>
                    <span>
                      <span className="font-semibold text-foreground">Pin code to athlete</span>
                      <span className="text-muted-foreground block text-xs font-normal leading-snug">
                        Tell the system which wrestler owns this NCU checkout code (Directory gaps).
                      </span>
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-auto justify-start gap-3 py-3 text-left"
                    onClick={() => scrollToFundraisingSection("admin-fundraising-athlete-profiles")}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#003366]/12 text-sm font-bold text-[#003366]">
                      2
                    </span>
                    <span>
                      <span className="font-semibold text-foreground">Turn on a public gift page (optional)</span>
                      <span className="text-muted-foreground block text-xs font-normal leading-snug">
                        Gives donors a nice link — not required for Profile → Fundraise totals.
                      </span>
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-auto justify-start gap-3 py-3 text-left"
                    onClick={() => scrollToFundraisingSection("admin-fundraising-parent-coverage")}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#003366]/12 text-sm font-bold text-[#003366]">
                      3
                    </span>
                    <span>
                      <span className="font-semibold text-foreground">Link parent</span>
                      <span className="text-muted-foreground block text-xs font-normal leading-snug">
                        So a parent login can open Profile → Fundraise for this athlete (Parent coverage).
                      </span>
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-1 gap-2 self-start"
                    onClick={() => scrollToFundraisingSection("admin-fundraising-kids-ledger")}
                  >
                    View money table (Kids ledger)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 self-start"
                    onClick={() => scrollToFundraisingSection("fundraising-athlete-wiring-matrix")}
                  >
                    <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
                    Wiring matrix (full roster codes)
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card id="admin-fundraising-kids-ledger" className="overflow-hidden border-[#003366]/20 bg-white shadow-sm">
              <div
                className="h-1"
                style={{ background: `linear-gradient(to right, ${brand.navy}, ${brand.crimson})` }}
                aria-hidden
              />
              <CardHeader className="space-y-4 pb-3">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 space-y-2">
                    <CardTitle className="text-lg">Kids ledger</CardTitle>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {kidLedgerOpenReimbCount > 0 ? (
                        <Badge variant="outline" className="gap-1 border-amber-500/60 font-normal text-amber-950 dark:text-amber-50">
                          <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
                          {kidLedgerOpenReimbCount} wrestler{kidLedgerOpenReimbCount === 1 ? "" : "s"} still have open reimbursement requests
                        </Badge>
                      ) : expenseRollupLoading ? (
                        <span className="text-muted-foreground">Loading reimbursement queue…</span>
                      ) : (
                        <span className="text-muted-foreground">No open reimbursement requests right now.</span>
                      )}
                      {expenseRollupError ? (
                        <span className="text-destructive font-medium" role="alert">
                          {expenseRollupError}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
                      One row per wrestler code on our roster (plus any code that got a gift in this reporting window). Use it to answer: how much came in, how much went back to families, and what reimbursement paperwork is still open.
                    </p>
                    <details className="rounded-lg border border-[#003366]/15 bg-slate-50/90 px-3 py-2 text-sm dark:bg-slate-950/40">
                      <summary className="cursor-pointer font-medium text-[#003366] outline-none dark:text-blue-300">
                        What each column means
                      </summary>
                      <ul className="text-muted-foreground mt-3 list-disc space-y-2 pl-5 leading-snug">
                        <li>
                          <strong className="font-medium text-foreground">Raised</strong> — gifts credited to this code in the same{" "}
                          {campaign.defaultLookbackDays}-day window as the numbers above.
                        </li>
                        <li>
                          <strong className="font-medium text-foreground">Paid back</strong> — reimbursements already marked{" "}
                          <em>paid</em> in that window (cash sent to the family).
                        </li>
                        <li>
                          <strong className="font-medium text-foreground">Training hold</strong> — NC United Guild / training credits booked against this wrestler (counts down what&apos;s still available on Profile → Fundraise).
                        </li>
                        <li>
                          <strong className="font-medium text-foreground">Balance</strong> — approximate amount still available after paid backs and training holds (same idea families see on Profile → Fundraise).
                        </li>
                        <li>
                          <strong className="font-medium text-foreground">Open requests</strong> — reimbursement paperwork still waiting on staff or payout; details in{" "}
                          <HardLink href="/admin/expense-requests" className="text-primary font-medium underline-offset-2 hover:underline">
                            Expense requests
                          </HardLink>
                          .
                        </li>
                      </ul>
                    </details>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void loadExpenseRollup()} disabled={expenseRollupLoading}>
                      <RefreshCw className={cn("h-4 w-4", expenseRollupLoading && "animate-spin")} aria-hidden />
                      Refresh requests
                    </Button>
                  </div>
                </div>
                <div className="grid min-w-0 gap-1.5 max-w-md">
                  <Label htmlFor="kid-ledger-filter">Search by kid name or code</Label>
                  <Input
                    id="kid-ledger-filter"
                    placeholder="Name or NCU-…"
                    value={kidLedgerFilter}
                    onChange={(e) => setKidLedgerFilter(e.target.value)}
                    autoComplete="off"
                  />
                  <p className="text-muted-foreground text-xs">Rows sort by most raised (gift dollars first).</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {donationsLoading && donations === null ? (
                  <p className="text-muted-foreground text-sm">Loading gift totals for this campaign window…</p>
                ) : null}
                {filteredKidLedgerRows.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {kidLedgerRows.length === 0
                      ? "No roster codes yet — wait for the wiring matrix to load, or refresh."
                      : "No rows match your search."}
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border shadow-sm">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[160px] whitespace-nowrap">Kid</TableHead>
                          <TableHead className="whitespace-nowrap font-mono text-xs">NCU</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Raised</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Paid back</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Training hold</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Balance</TableHead>
                          <TableHead className="min-w-[140px] whitespace-nowrap">Open requests</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredKidLedgerRows.map((r) => (
                          <TableRow key={r.code}>
                            <TableCell className="text-sm">
                              <div className="font-medium text-foreground">{r.displayName}</div>
                              {!r.athleteId ? (
                                <div className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
                                  Pin this code first — open requests won&apos;t attach without an athlete ID.
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{r.code}</TableCell>
                            <TableCell className="text-right font-medium tabular-nums">{formatMoney(r.raised, "usd")}</TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {r.reimbPaid > 0 ? formatMoney(r.reimbPaid, "usd") : "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {r.guild > 0 ? formatMoney(r.guild, "usd") : "—"}
                            </TableCell>
                            <TableCell
                              className={cn(
                                "text-right font-semibold tabular-nums",
                                r.balance < 0 ? "text-destructive" : "text-green-800 dark:text-green-400",
                              )}
                            >
                              {formatMoney(r.balance, "usd")}
                            </TableCell>
                            <TableCell className="text-sm">
                              {r.openReimbCount > 0 ? (
                                <span
                                  className="inline-flex items-center gap-1.5"
                                  title={`${r.openReimbCount} open request(s): ${formatMoney(r.pendingReviewCents, "usd")} in review · ${formatMoney(r.awaitingPayoutCents, "usd")} approved / awaiting payout`}
                                >
                                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                                  <span className="font-medium tabular-nums">{formatMoney(r.openReimbCents, "usd")}</span>
                                  <span className="text-muted-foreground text-xs">({r.openReimbCount})</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Collapsible open={walletGuideOpen} onOpenChange={setWalletGuideOpen}>
              <Card id="admin-fundraising-family-wallet" className="overflow-hidden border-[#003366]/25 bg-white shadow-sm">
                <div
                  className="h-1"
                  style={{ background: `linear-gradient(to right, ${brand.navy}, ${brand.crimson})` }}
                  aria-hidden
                />
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-6 py-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Wallet className="h-5 w-5 shrink-0 text-[#003366]" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-foreground">Extra detail: who sees Fundraise balances?</span>
                      <span className="text-muted-foreground mt-0.5 block text-xs leading-snug">
                        Expand only if you are coaching someone — athlete login vs parent link vs donor page.
                      </span>
                    </span>
                    <ChevronDown
                      className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", walletGuideOpen && "rotate-180")}
                      aria-hidden
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 border-t pt-4 text-sm leading-relaxed">
                    <ul className="text-muted-foreground list-none space-y-3 p-0">
                      <li className="flex gap-2">
                        <span className="mt-0.5 font-bold text-foreground">1.</span>
                        <span>
                          <strong className="text-foreground">Athlete on their own RecruitNC login:</strong>{" "}
                          <code className="rounded bg-muted px-1 text-[11px]">user_profiles.athlete_id</code> must equal their directory{" "}
                          <code className="rounded bg-muted px-1 text-[11px]">athletes.id</code> (claim / confirm profile, or admin fixes the profile row).
                          Then Fundraise lists that wrestler automatically — no parent row required.
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="mt-0.5 font-bold text-foreground">2.</span>
                        <span>
                          <strong className="text-foreground">Parent account:</strong> add{" "}
                          <code className="rounded bg-muted px-1 text-[11px]">parent_athlete_links</code> for each kid (Family &amp; athletes on{" "}
                          <HardLink href="/profile" className="text-primary font-medium underline-offset-2 hover:underline">
                            Profile
                          </HardLink>
                          , or admin tooling below). Totals use the same NCU → athlete pin as the athlete path.
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="mt-0.5 font-bold text-foreground">3.</span>
                        <span>
                          <strong className="text-foreground">NCU → athlete pin:</strong> Stripe credits checkout codes; pin each NCU to the correct{" "}
                          <code className="rounded bg-muted px-1 text-[11px]">athletes.id</code> in{" "}
                          <button
                            type="button"
                            className="text-[#003366] font-semibold underline-offset-2 hover:underline dark:text-blue-400"
                            onClick={() => scrollToFundraisingSection("admin-fundraising-directory-gaps")}
                          >
                            Directory gaps
                          </button>
                          . Without this, gifts never attach to the kid&apos;s wallet row.
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="mt-0.5 font-bold text-foreground">4.</span>
                        <span>
                          <strong className="text-foreground">Public gift page</strong> (
                          <code className="rounded bg-muted px-1 text-[11px]">athlete_fundraising_profiles</code>
                          ) is for donors — optional for the ledger math that drives Profile → Fundraise.
                        </span>
                      </li>
                    </ul>
                    <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <HardLink href="/profile">Open Profile (test Fundraise tab)</HardLink>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => scrollToFundraisingSection("admin-fundraising-parent-coverage")}
                      >
                        Jump to parent linking
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => scrollToFundraisingSection("fundraising-athlete-wiring-matrix")}
                      >
                        Wiring matrix
                      </Button>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            <Card
              id="fundraising-athlete-wiring-matrix"
              className="overflow-hidden border-[#003366]/20 bg-white shadow-sm"
            >
              <div
                className="h-1"
                style={{ background: `linear-gradient(to right, ${brand.navy}, ${brand.crimson})` }}
                aria-hidden
              />
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <LayoutGrid className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
                      Athlete wiring matrix
                    </CardTitle>
                    <CardDescription className="max-w-2xl text-sm leading-snug">
                      Wiring for each <strong className="text-foreground">active NCU code</strong> in the playbook roster (
                      <code className="rounded bg-muted px-1 text-[11px]">spartan_fundraising_athletes</code>). Directory athletes
                      without an NCU row here don&apos;t appear — pin (below) creates or updates that row and links{" "}
                      <code className="rounded bg-muted px-1 text-[11px]">athletes.id</code>. Then add a donor profile and link a
                      parent. Green = OK / activity; red = missing (Page &amp; Parent stay neutral until Pin is green).
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-2"
                    onClick={() => void loadAthleteMatrix()}
                    disabled={athleteMatrixLoading}
                  >
                    <RefreshCw className={`h-4 w-4 shrink-0 ${athleteMatrixLoading ? "animate-spin" : ""}`} />
                    Refresh matrix
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="rounded-lg border border-dashed border-[#003366]/25 bg-slate-50/80 px-3 py-3 text-sm dark:bg-slate-950/25">
                  <p className="font-semibold text-foreground">Connect any kid (order matters)</p>
                  <ol className="text-muted-foreground mt-2 list-decimal space-y-1.5 pl-5 leading-snug">
                    <li>
                      <button
                        type="button"
                        className="text-left font-medium text-[#003366] underline-offset-2 hover:underline dark:text-blue-400"
                        onClick={() => scrollToFundraisingSection("admin-fundraising-directory-gaps")}
                      >
                        1. Directory gaps — Pin
                      </button>{" "}
                      Paste the RecruitNC{" "}
                      <code className="rounded bg-muted px-1 text-[11px]">athletes.id</code> UUID and pin it to the NCU code (also
                      sets roster name/grad from the athlete). Codes with money show here first; you can pin the same way for any
                      valid NCU if the row exists in the roster.
                    </li>
                    <li>
                      <button
                        type="button"
                        className="text-left font-medium text-[#003366] underline-offset-2 hover:underline dark:text-blue-400"
                        onClick={() => scrollToFundraisingSection("admin-fundraising-athlete-profiles")}
                      >
                        2. Donor-facing athlete profiles
                      </button>{" "}
                      After Pin, add a donor profile (section Donor-facing athlete profiles) — slug + athlete UUID, mark active.
                    </li>
                    <li>
                      <button
                        type="button"
                        className="text-left font-medium text-[#003366] underline-offset-2 hover:underline dark:text-blue-400"
                        onClick={() => scrollToFundraisingSection("admin-fundraising-parent-coverage")}
                      >
                        3. Parent coverage
                      </button>{" "}
                      Link the parent&apos;s RecruitNC account to that pinned athlete so Profile → Fundraise and thank-you lists
                      work for the family.
                    </li>
                  </ol>
                  <p className="text-muted-foreground mt-2 text-xs leading-snug">
                    Stripe and parent coverage sync automatically (or use Refresh). Need an NCU on the roster with no Stripe gifts
                    yet? Use Pin from gaps when it appears, or upsert{" "}
                    <code className="rounded bg-muted px-1 text-[11px]">spartan_fundraising_athletes</code> in Supabase (same columns as pin —
                    see{" "}
                    <code className="rounded bg-muted px-1 text-[11px]">POST /api/admin/spartan-fundraising-pin-code</code>
                    ).
                  </p>
                </div>

                <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-2 text-[11px] leading-snug">
                  <span>
                    <span className="font-semibold text-foreground">Pin</span> — roster row linked to{" "}
                    <code className="rounded bg-muted px-1">athletes.id</code>
                  </span>
                  <span>
                    <span className="font-semibold text-foreground">Page</span> — active profile for the{" "}
                    <strong className="font-medium text-foreground">pinned</strong> athlete (
                    <code className="rounded bg-muted px-1">/fundraising/athletes/[slug]</code>)
                  </span>
                  <span>
                    <span className="font-semibold text-foreground">Parent</span> — after Pin: parent profile or link on that
                    athlete (before Pin: not evaluated)
                  </span>
                  <span>
                    <span className="font-semibold text-foreground">NCU</span> — primary fundraising code on profile vs
                    roster (when set)
                  </span>
                  <span>
                    <span className="font-semibold text-foreground">Campaign</span> — ≥1 paid Spartan gift credited to
                    this code in that drive (<code className="rounded bg-muted px-1">spartan_campaign</code>)
                  </span>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative max-w-md flex-1">
                    <Filter className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <Input
                      id="athlete-matrix-filter"
                      placeholder="Filter by code, name, slug, UUID, or campaign…"
                      value={athleteMatrixFilter}
                      onChange={(e) => setAthleteMatrixFilter(e.target.value)}
                      className="pl-9"
                      aria-label="Filter athlete wiring matrix"
                    />
                  </div>
                  {athleteMatrixSummary ? (
                    <p className="text-muted-foreground text-xs leading-snug sm:text-right">
                      <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                        {athleteMatrixSummary.fullyWired}
                      </span>
                      /{athleteMatrixSummary.total} fully wired ·{" "}
                      <span className="tabular-nums">{athleteMatrixSummary.needPin}</span> need pin ·{" "}
                      <span className="tabular-nums">{athleteMatrixSummary.needDonorPage}</span> need donor page ·{" "}
                      <span className="tabular-nums">{athleteMatrixSummary.needParent}</span> pinned need parent
                    </p>
                  ) : null}
                </div>

                {athleteMatrixError ? (
                  <p className="text-destructive text-sm" role="alert">
                    {athleteMatrixError}
                  </p>
                ) : null}

                <div className="-mx-1 overflow-x-auto px-1 pb-1">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="whitespace-nowrap font-semibold">NCU</TableHead>
                        <TableHead className="min-w-[140px] font-semibold">Athlete</TableHead>
                        <TableHead className="whitespace-nowrap font-semibold">Grad</TableHead>
                        <TableHead className="text-center font-semibold">Pin</TableHead>
                        <TableHead className="min-w-[160px] font-semibold">Donor page</TableHead>
                        <TableHead className="text-center font-semibold">Parent</TableHead>
                        <TableHead className="text-center font-semibold">NCU</TableHead>
                        <TableHead className="min-w-[180px] font-semibold">Campaign gifts</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {athleteMatrixLoading && !athleteMatrix?.rows.length ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-muted-foreground py-8 text-center text-sm">
                            Loading roster wiring…
                          </TableCell>
                        </TableRow>
                      ) : null}
                      {!athleteMatrixLoading && athleteMatrixFilteredRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-muted-foreground py-8 text-center text-sm">
                            {athleteMatrix?.rows.length ? "No rows match your filter." : "No active roster codes."}
                          </TableCell>
                        </TableRow>
                      ) : null}
                      {athleteMatrixFilteredRows.map((r) => {
                        const campaigns = athleteMatrix?.campaigns?.length
                          ? athleteMatrix.campaigns
                          : FUNDRAISING_CAMPAIGNS.map((c) => ({
                              stripeCampaignSlug: c.stripeCampaignSlug,
                              tabLabel: c.tabLabel,
                            }))
                        const slugSet = new Set(r.campaignActivitySlugs ?? [])
                        return (
                          <TableRow key={r.code} className="align-middle">
                            <TableCell className="font-mono text-xs font-semibold">{r.code}</TableCell>
                            <TableCell className="text-sm">{matrixRowDisplayName(r)}</TableCell>
                            <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                              {r.gradYear ?? "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              <WiringDot
                                ok={r.rosterPinOk}
                                title={
                                  r.rosterPinOk
                                    ? "Pinned to directory athlete"
                                    : "Not pinned — paste athlete UUID in gap tools below"
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex min-w-0 items-center gap-2">
                                {!r.rosterPinOk ? (
                                  <span
                                    className="text-muted-foreground text-xs"
                                    title="Pin this NCU to a directory athlete first — then create an active fundraising profile"
                                  >
                                    Pin first
                                  </span>
                                ) : (
                                  <>
                                    <WiringDot
                                      ok={r.donorPageOk}
                                      title={
                                        r.donorPageOk
                                          ? "Active donor-facing fundraising profile"
                                          : r.donorProfileSlug
                                            ? "Profile exists but inactive or incomplete"
                                            : "No fundraising profile — use New profile below"
                                      }
                                    />
                                    {r.donorProfileSlug ? (
                                      <HardLink
                                        href={`/fundraising/athletes/${encodeURIComponent(r.donorProfileSlug)}`}
                                        className="text-primary truncate text-xs underline underline-offset-2"
                                      >
                                        /{r.donorProfileSlug}
                                      </HardLink>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">—</span>
                                    )}
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {!r.rosterPinOk ? (
                                <span
                                  className="text-muted-foreground text-xs"
                                  title="Pin this NCU first — parent links attach to the directory athlete"
                                >
                                  Pin first
                                </span>
                              ) : (
                                <div className="flex flex-col items-center gap-0.5">
                                  <WiringDot
                                    ok={r.parentOk}
                                    title={
                                      r.parentOk
                                        ? `${r.parentLinkCount} parent manager(s)`
                                        : "No parent linked — use Parent coverage section below"
                                    }
                                  />
                                  <span className="text-muted-foreground text-[10px] tabular-nums">{r.parentLinkCount}</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <ProfileCodeSyncDot ok={r.codeSyncOk ?? null} />
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-x-3 gap-y-1">
                                {campaigns.map((c) => {
                                  const active = slugSet.has(c.stripeCampaignSlug)
                                  const def = fundraisingCampaignByStripeSlug(c.stripeCampaignSlug)
                                  const publicPath = def?.publicPagePath ?? "/spartan"
                                  return (
                                    <span
                                      key={c.stripeCampaignSlug}
                                      className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
                                    >
                                      <WiringDot
                                        ok={active}
                                        title={
                                          active
                                            ? `${c.tabLabel}: paid gift on ledger`
                                            : `${c.tabLabel}: no paid gifts on ledger for this code yet`
                                        }
                                      />
                                      <HardLink
                                        href={`${publicPath}?${def?.athleteQueryParam ?? "athlete"}=${encodeURIComponent(r.code)}`}
                                        className="max-w-[100px] truncate hover:text-foreground hover:underline"
                                      >
                                        {c.tabLabel}
                                      </HardLink>
                                    </span>
                                  )
                                })}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {athleteMatrix?.generatedAt ? (
                  <p className="text-muted-foreground text-[11px]">
                    Matrix generated {new Date(athleteMatrix.generatedAt).toLocaleString()}
                  </p>
                ) : null}
              </CardContent>
            </Card>

            {dash ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <button
                  type="button"
                  disabled={donationsLoading}
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
                  disabled={donationsLoading}
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
                  disabled={donationsLoading}
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
                  disabled={donationsLoading}
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

            <Card id="admin-fundraising-athlete-profiles" className="border-[#003366]/15 bg-white">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <UserCircle className="h-4 w-4 text-[#003366]" />
                      Donor-facing athlete profiles
                    </CardTitle>
                    <CardDescription className="mt-1 max-w-2xl">
                      Public URLs:{" "}
                      <HardLink href="/fundraising/athletes" className="text-primary underline-offset-4 hover:underline">
                        /fundraising/athletes
                      </HardLink>
                      . Use row actions <strong className="text-foreground">Attach athlete</strong> /{" "}
                      <strong className="text-foreground">Attach parent</strong> — same dialogs as on the live donor page when you&apos;re logged in as admin.
                      Table{" "}
                      <code className="rounded bg-muted px-1 text-[11px]">athlete_fundraising_profiles</code>.{" "}
                      <strong className="text-foreground">Parent links</strong> column: green when{" "}
                      <code className="rounded bg-muted px-1 text-[10px]">parent_athlete_links</code> ≥ 1 (use{" "}
                      <strong className="text-foreground">Attach parent</strong>). Linked parents see the wallet and can edit the gift page when checkout
                      is on. Athletes who claimed their recruiting profile also get edit access from their own login — that is not a separate row here.{" "}
                      <strong className="text-foreground">Sync from directory</strong> creates missing rows (slug = lowercase NCU) for every real roster athlete — run once after deploy or when pages say “no donor profile”.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void loadFundraisingProfiles()}
                      disabled={fundraisingProfilesLoading}
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${fundraisingProfilesLoading ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void syncFundraisingProfilesFromDirectory()}
                      disabled={syncDirectoryBusy || fundraisingProfilesLoading}
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${syncDirectoryBusy ? "animate-spin" : ""}`} />
                      Sync from directory
                    </Button>
                    <Button type="button" size="sm" className="bg-[#003366] text-white hover:bg-[#002952]" onClick={openNewFundraisingProfileDialog}>
                      New profile
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {fundraisingProfilesError ? (
                  <p className="text-destructive text-sm" role="alert">
                    {fundraisingProfilesError}
                  </p>
                ) : null}
                {fundraisingProfilesLoading && fundraisingProfiles === null ? (
                  <p className="text-muted-foreground text-sm">Loading profiles…</p>
                ) : null}
                {fundraisingProfiles && fundraisingProfiles.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No profiles yet — create one with the athlete&apos;s{" "}
                    <span className="font-mono text-xs">athletes.id</span> and a URL slug (e.g. lowercase{" "}
                    <span className="font-mono text-xs">ncu-gore-27</span>).
                  </p>
                ) : null}
                {fundraisingProfiles && fundraisingProfiles.length > 0 ? (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Slug / URL</TableHead>
                          <TableHead>Athlete</TableHead>
                          <TableHead>NCU (roster / override)</TableHead>
                          <TableHead>Goal</TableHead>
                          <TableHead>Active</TableHead>
                          <TableHead className="whitespace-nowrap">Gift checkout</TableHead>
                          <TableHead className="whitespace-nowrap min-w-[7.5rem] text-[11px] leading-tight">
                            Parent links
                          </TableHead>
                          <TableHead className="text-right min-w-[11rem]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fundraisingProfiles.map((p) => {
                          const ncu =
                            p.primary_fundraising_code ??
                            p.roster_ncu_code ??
                            "—"
                          return (
                            <TableRow key={p.id}>
                              <TableCell className="font-mono text-xs">
                                <HardLink
                                  href={`/fundraising/athletes/${p.slug}`}
                                  className="text-primary underline-offset-4 hover:underline"
                                >
                                  {p.slug}
                                </HardLink>
                              </TableCell>
                              <TableCell className="text-sm">
                                <div className="font-medium">{p.athlete_name ?? "—"}</div>
                                <div className="text-muted-foreground font-mono text-[10px]">{p.athlete_id.slice(0, 8)}…</div>
                              </TableCell>
                              <TableCell className="font-mono text-[11px]">{ncu}</TableCell>
                              <TableCell className="text-sm tabular-nums">
                                {p.campaign_goal_cents != null && p.campaign_goal_cents > 0
                                  ? formatMoney(p.campaign_goal_cents, "usd")
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                {p.is_active ? (
                                  <Badge variant="secondary" className="text-xs">
                                    Yes
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs text-muted-foreground">
                                    No
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="align-top">
                                <div className="flex flex-col items-start gap-1.5">
                                  {p.checkout_live ? (
                                    <Badge className="bg-emerald-600 text-xs hover:bg-emerald-600">Live</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs text-muted-foreground">
                                      Off
                                    </Badge>
                                  )}
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="h-7 text-[11px]"
                                    disabled={checkoutLiveToggleBusyId === p.id}
                                    onClick={() => void patchFundraisingProfileCheckoutLive(p, !p.checkout_live)}
                                  >
                                    {checkoutLiveToggleBusyId === p.id
                                      ? "Updating…"
                                      : p.checkout_live
                                        ? "Pause checkout"
                                        : "Activate checkout"}
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell className="align-top">
                                <div className="flex flex-col gap-1.5 text-[11px] leading-tight">
                                  <div
                                    className="flex items-center gap-1.5"
                                    title="parent_athlete_links — use Attach parent on this row"
                                  >
                                    <span
                                      className={cn(
                                        "inline-block h-2 w-2 shrink-0 rounded-full",
                                        p.wiring.parentAthleteLinkCount > 0 ? "bg-emerald-500" : "bg-red-600",
                                      )}
                                      aria-hidden
                                    />
                                    <span className="text-muted-foreground">Links</span>
                                    <span className="font-medium tabular-nums text-foreground">{p.wiring.parentAthleteLinkCount}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex flex-col items-end gap-1 sm:flex-row sm:flex-wrap sm:justify-end">
                                  <Button type="button" variant="outline" size="sm" onClick={() => openEditFundraisingProfileDialog(p)}>
                                    Edit
                                  </Button>
                                  <Button type="button" variant="outline" size="sm" onClick={() => openAttachAthleteDialog(p)}>
                                    Attach athlete
                                  </Button>
                                  <Button type="button" variant="outline" size="sm" onClick={() => openLinkParentDialogFromProfile(p)}>
                                    Attach parent
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : null}
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
                        The table below only appears when Stripe shows checkout dollars on a code we couldn&apos;t match yet — it is{" "}
                        <strong className="text-foreground">not</strong> a wrestler search. Use{" "}
                        <strong className="text-foreground">Pin any wrestler</strong> (box below) to search by name and attach any NCU code anytime.
                        If rows appear here instead, paste the athlete UUID per row → Pin.
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="rounded-xl border border-[#003366]/20 bg-white p-4 shadow-sm dark:bg-card">
                    <div className="flex flex-wrap items-start gap-2">
                      <Search className="mt-0.5 h-5 w-5 shrink-0 text-[#003366]" aria-hidden />
                      <div className="min-w-0 flex-1 space-y-3">
                        <div>
                          <p className="font-semibold text-foreground">Pin any wrestler (search by name)</p>
                          <p className="text-muted-foreground mt-1 text-sm leading-snug">
                            Same action as Pin profile — links an NCU checkout code to the athlete record. Donor page slug is separate (Donor-facing profiles section).
                          </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="grid gap-1.5">
                            <Label htmlFor="quick-pin-search">Find wrestler</Label>
                            <Input
                              id="quick-pin-search"
                              placeholder="Type name (min 2 letters)"
                              value={quickPinSearch}
                              onChange={(e) => setQuickPinSearch(e.target.value)}
                              onFocus={() => void loadQuickPinAthletes()}
                              autoComplete="off"
                              disabled={quickPinAthletesLoading}
                            />
                            {quickPinAthletesLoading ? (
                              <p className="text-muted-foreground text-xs">Loading directory…</p>
                            ) : quickPinAthletes && quickPinAthletes.length === 0 ? (
                              <p className="text-muted-foreground text-xs">No athletes returned — try Athletes admin.</p>
                            ) : quickPinSearch.trim().length >= 2 && quickPinFiltered.length === 0 ? (
                              <p className="text-muted-foreground text-xs">No name matches — paste ID manually.</p>
                            ) : null}
                            {quickPinFiltered.length > 0 ? (
                              <ul className="max-h-44 overflow-auto rounded-md border bg-muted/30 text-sm">
                                {quickPinFiltered.map((a) => (
                                  <li key={a.id}>
                                    <button
                                      type="button"
                                      className="hover:bg-muted/80 w-full px-3 py-2 text-left"
                                      onClick={() => {
                                        setQuickPinAthleteIdField(a.id)
                                        setQuickPinAthleteNameHint(a.name)
                                        setQuickPinSearch("")
                                      }}
                                    >
                                      <span className="font-medium text-foreground">{a.name}</span>
                                      <span className="text-muted-foreground ml-2 font-mono text-[10px]">{a.id.slice(0, 8)}…</span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                          <div className="grid gap-1.5">
                            <Label htmlFor="quick-pin-athlete-id">Athlete ID (fills when you pick above)</Label>
                            <Input
                              id="quick-pin-athlete-id"
                              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                              value={quickPinAthleteIdField}
                              onChange={(e) => {
                                setQuickPinAthleteIdField(e.target.value)
                                setQuickPinAthleteNameHint("")
                              }}
                              className="font-mono text-xs"
                              autoComplete="off"
                            />
                            {quickPinAthleteNameHint ? (
                              <p className="text-muted-foreground text-xs">Selected: {quickPinAthleteNameHint}</p>
                            ) : null}
                          </div>
                        </div>
                        <div className="grid gap-1.5 sm:max-w-md">
                          <Label htmlFor="quick-pin-ncu">NCU code to attach</Label>
                          <Input
                            id="quick-pin-ncu"
                            placeholder="NCU-LASTNAME-28"
                            value={quickPinNcu}
                            onChange={(e) => setQuickPinNcu(e.target.value)}
                            className="font-mono text-sm"
                            autoComplete="off"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            className="bg-[#003366] text-white hover:bg-[#002952]"
                            disabled={quickPinSubmitBusy}
                            onClick={async () => {
                              setQuickPinSubmitBusy(true)
                              try {
                                const ok = await submitSpartanFundraisingPin(quickPinAthleteIdField, quickPinNcu)
                                if (ok) setQuickPinNcu("")
                              } finally {
                                setQuickPinSubmitBusy(false)
                              }
                            }}
                          >
                            {quickPinSubmitBusy ? "Pinning…" : "Pin NCU to this athlete"}
                          </Button>
                          <Button type="button" variant="outline" size="sm" asChild>
                            <HardLink href="/admin/athletes">Open Athletes admin</HardLink>
                          </Button>
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-snug">
                          Pin errors about missing <span className="font-mono">athlete_id</span>? Run{" "}
                          <span className="font-mono">docs/sql/spartan-fundraising-athlete-id-column.sql.txt</span> in Supabase once.
                        </p>
                      </div>
                    </div>
                  </div>

                  {directoryGapRows.length === 0 ? (
                    <p className="text-sm leading-relaxed text-emerald-800 dark:text-emerald-200">
                      No orphaned checkout codes in this reporting window — nothing needs fixing in the table below. Use{" "}
                      <strong className="font-semibold text-foreground">Pin any wrestler</strong> above anytime you still need to attach a code.
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

            {parentCoverage !== null ? (
              <Card id="admin-fundraising-parent-coverage" className={parentCoverage.summary.needsAttention > 0 ? "border-amber-500/50" : "border-emerald-600/40"}>
                <CardHeader className="space-y-4 pb-4">
                  <div className="space-y-2">
                    <CardTitle className="text-lg leading-snug">2. Parent coverage</CardTitle>
                    <p className="text-muted-foreground text-sm leading-snug">
                      Anyone with dollars should have a manager who can open <strong className="text-foreground">Profile → Fundraise</strong>. After data loads,
                      find the kid by name in this table (or filter views).
                      <strong className="text-foreground"> Link parent</strong> only appears when the row has a RecruitNC{" "}
                      <code className="rounded bg-muted px-1 text-[11px]">athleteId</code> and status &quot;Needs parent link&quot; — search parent
                      accounts by name/email in the dialog, then <strong className="text-foreground">Create link</strong>. Or ask the family to add the
                      wrestler under Family on Profile. Directory issues → fix in{" "}
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
                  onClick={() => {
                    void loadDonations()
                    void loadExpenseRollup()
                  }}
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
                  Wrong credit at checkout. Force an <span className="font-mono text-xs">NCU-…-YY</span> athlete code, or
                  credit to the NC United community fund (pooled, no wrestler). Overrides roll into totals after refresh.
                  Run <span className="font-mono text-xs">add-spartan-credit-corrections-general-fund.sql</span> once in
                  Supabase if fund saves fail.
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
                    disabled={creditFixToNcUnitedFund}
                  />
                </div>
                <div className="flex w-full min-w-[200px] flex-1 items-center gap-2 pt-2 sm:pt-0">
                  <Checkbox
                    id="credit-fix-fund"
                    checked={creditFixToNcUnitedFund}
                    onCheckedChange={(c) => setCreditFixToNcUnitedFund(c === true)}
                  />
                  <Label htmlFor="credit-fix-fund" className="cursor-pointer text-sm font-normal leading-snug">
                    NC United fund only (no individual wrestler)
                  </Label>
                </div>
                <Button
                  type="button"
                  onClick={() => void applySpartanCreditFix()}
                  disabled={
                    creditFixBusy ||
                    !creditFixSessionId.trim() ||
                    (!creditFixToNcUnitedFund && !creditFixCode.trim())
                  }
                >
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

        <AttachAthleteToProfileDialog
          profile={attachAthleteProfile}
          variant="admin"
          onClose={() => setAttachAthleteProfile(null)}
          onApplied={async () => {
            await loadFundraisingProfiles()
            await loadAthleteMatrix()
            await loadDonations()
          }}
        />

        <LinkParentToAthleteDialog
          payload={linkParentPayload}
          variant="admin"
          onClose={() => setLinkParentPayload(null)}
          afterLinked={(ctx) => {
            const linkedAthleteId = ctx.athleteId
            const linkedCodeKey = ctx.athleteCode.trim().toUpperCase()
            setParentCoverage((prev) => {
              if (!prev) return prev
              const rows = prev.rows.map((r) => {
                const sameRow =
                  r.athleteId === linkedAthleteId && r.athleteCode.trim().toUpperCase() === linkedCodeKey
                if (sameRow && r.status === "no_managing_user") {
                  return {
                    ...r,
                    status: "ok" as const,
                    managingUserCount: Math.max(r.managingUserCount, 1),
                  }
                }
                return r
              })
              const ok = rows.filter((x) => x.status === "ok").length
              const needsAttention = rows.filter((x) => x.status !== "ok").length
              return {
                rows,
                summary: { ...prev.summary, ok, needsAttention },
              }
            })
          }}
          onRefresh={() => void loadDonations()}
        />

        <Dialog
          open={profileDialogOpen}
          onOpenChange={(o) => {
            setProfileDialogOpen(o)
            if (!o) setProfileSaveBusy(false)
          }}
        >
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{profileEditingId ? "Edit fundraising profile" : "New fundraising profile"}</DialogTitle>
              <DialogDescription className="leading-snug">
                {profileEditingId ? (
                  <>
                    Update slug, story, photo URL, goal, or NCU override. To point this page at a different wrestler, close here and use{" "}
                    <strong className="text-foreground">Attach athlete</strong> on that profile&apos;s row (name search).
                  </>
                ) : (
                  "Paste the RecruitNC athletes.id (UUID), choose a unique URL slug, then save."
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 text-sm">
              <div className="grid gap-1.5">
                <Label htmlFor="fp-athlete-id">Athlete id (UUID)</Label>
                <Input
                  id="fp-athlete-id"
                  className="font-mono text-xs"
                  value={profileAthleteId}
                  onChange={(e) => setProfileAthleteId(e.target.value)}
                  disabled={!!profileEditingId}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fp-slug">URL slug</Label>
                <Input
                  id="fp-slug"
                  className="font-mono text-xs lowercase"
                  value={profileSlug}
                  onChange={(e) => setProfileSlug(e.target.value.toLowerCase())}
                  placeholder="e.g. ncu-gore-27"
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fp-bio">Bio (donor-facing)</Label>
                <Textarea
                  id="fp-bio"
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  placeholder="2–3 sentences for donors…"
                  className="min-h-[100px]"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fp-photo">Photo URL</Label>
                <Input
                  id="fp-photo"
                  value={profilePhotoUrl}
                  onChange={(e) => setProfilePhotoUrl(e.target.value)}
                  placeholder="https://…"
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fp-goal">Campaign goal (USD, optional)</Label>
                <Input
                  id="fp-goal"
                  value={profileGoalDollars}
                  onChange={(e) => setProfileGoalDollars(e.target.value)}
                  placeholder="e.g. 5000"
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fp-primary-ncu">NCU code override (optional)</Label>
                <Input
                  id="fp-primary-ncu"
                  className="font-mono text-xs uppercase"
                  value={profilePrimaryCode}
                  onChange={(e) => setProfilePrimaryCode(e.target.value.toUpperCase())}
                  placeholder="NCU-LAST-YY — if roster code is wrong or missing"
                  autoComplete="off"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox id="fp-active" checked={profileActive} onCheckedChange={(c) => setProfileActive(c === true)} />
                <Label htmlFor="fp-active" className="cursor-pointer font-normal">
                  Active (public directory lists active profiles only)
                </Label>
              </div>
              {profileEditingId ? (
                <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2.5">
                  <div className="min-w-0 space-y-0.5">
                    <Label htmlFor="fp-checkout-live" className="text-foreground font-medium">
                      Gift page checkout (Stripe)
                    </Label>
                    <p className="text-muted-foreground text-xs leading-snug">
                      Off until families complete activation (or you turn it on after wiring). Matches{" "}
                      <code className="rounded bg-muted px-1 text-[10px]">checkout_live</code> in Supabase.
                    </p>
                  </div>
                  <Switch
                    id="fp-checkout-live"
                    checked={profileCheckoutLive}
                    onCheckedChange={(c) => setProfileCheckoutLive(c === true)}
                    disabled={profileSaveBusy}
                    className="mt-0.5 shrink-0"
                  />
                </div>
              ) : null}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="secondary" onClick={() => setProfileDialogOpen(false)} disabled={profileSaveBusy}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void saveFundraisingProfile()} disabled={profileSaveBusy}>
                {profileSaveBusy ? "Saving…" : profileEditingId ? "Save changes" : "Create profile"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={reassignOpen}
          onOpenChange={(o) => {
            setReassignOpen(o)
            if (!o) {
              setReassignRow(null)
              setReassignToNcUnitedFund(false)
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reassign fundraising credit</DialogTitle>
              <DialogDescription>
                Wrong credit at checkout. Choose another <span className="font-mono text-xs">NCU-…-YY</span> or credit to
                the NC United community fund. Session id below is from this row.
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
                <div className="flex items-start gap-2 rounded-md border border-amber-200/50 bg-amber-50/40 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/20">
                  <Checkbox
                    id="reassign-nc-united-fund"
                    checked={reassignToNcUnitedFund}
                    onCheckedChange={(c) => setReassignToNcUnitedFund(c === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="reassign-nc-united-fund" className="cursor-pointer text-sm font-normal leading-snug">
                    Credit to <strong>NC United fund</strong> (community — no wrestler)
                  </Label>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="reassign-code">Athlete NCU code (if not fund)</Label>
                  <Input
                    id="reassign-code"
                    className="font-mono text-xs"
                    value={reassignCode}
                    onChange={(e) => setReassignCode(e.target.value.toUpperCase())}
                    placeholder="e.g. NCU-SHUSTER-28"
                    autoComplete="off"
                    disabled={reassignToNcUnitedFund}
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
                disabled={
                  reassignBusy ||
                  !reassignRow ||
                  (!reassignToNcUnitedFund && !reassignCode.trim())
                }
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
