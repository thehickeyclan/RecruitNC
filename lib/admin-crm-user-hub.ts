import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { ParentSpartanFundraisingAthleteRow } from "@/lib/parent-spartan-fundraising-totals"
import { computeParentSpartanFundraisingTotalsForUser } from "@/lib/parent-spartan-fundraising-totals"

export type CrmSection<T> = { ok: true; data: T } | { ok: false; error: string }

export type CrmAuthSummary = {
  id: string
  email: string | null
  phone: string | null
  createdAt: string | null
  lastSignInAt: string | null
  confirmedAt: string | null
  isAnonymous: boolean
}

export type CrmLinkedAthleteRow = {
  athleteId: string
  name: string | null
  profileVerified: boolean | null
}

export type CrmOrderSummaryRow = {
  id: string
  created_at: string | null
  total: number | null
  status: string | null
  channel: string | null
  customer_email: string | null
  matchSource?: "recruitnc_user_id" | "customer_email"
}

export type CrmBlueMembershipRow = {
  id: string
  athlete_id: string | null
  status: string | null
  stripe_subscription_id: string | null
  started_at: string | null
  created_at: string | null
  next_billing_at: string | null
  ended_at: string | null
}

export type CrmGuildAllocationRow = {
  id: string
  athlete_id: string
  amount_cents: number
  status: string
  campaign: string
  created_at: string
  error_message: string | null
}

export type CrmNationalTeamRegRow = {
  id: string
  event_slug: string | null
  status: string | null
  created_at: string | null
  parent_user_id: string | null
  parent_email: string | null
  matchSource: "parent_user_id" | "parent_email"
}

export type CrmDropInRow = {
  id: string
  payment_status: string | null
  created_at: string | null
  wrestler_name: string | null
}

export type CrmBlueSignupRow = {
  id: string
  status: string | null
  created_at: string | null
  parent_email: string | null
}

export type CrmNoteRow = {
  id: string
  body: string
  pinned: boolean
  author_user_id: string
  created_at: string
  updated_at: string
}

export type CrmContactSettingsRow = {
  contact_user_id: string
  assigned_admin_user_id: string | null
  priority: string | null
  last_touched_at: string | null
  updated_at: string
}

export type CrmAuditRow = {
  id: string
  action: string
  actor_user_id: string
  created_at: string
  metadata: Record<string, unknown>
}

export type CrmExpenseRequestHistoryRow = {
  id: string
  athlete_id: string
  athlete_name: string | null
  expense_type: string | null
  amount_cents: number
  amount_approved_cents: number | null
  payment_method: string | null
  status: string | null
  parent_notes: string | null
  admin_notes: string | null
  created_at: string | null
  paid_at: string | null
}

export type CrmSpartanDonorChargeRow = {
  id: string
  amount_cents: number
  created_unix: number
  athlete_code: string
  campaign: string
  status: string
}

export type AdminCrmUserHubPayload = {
  userId: string
  generatedAt: string
  emailUsedForLookup: string | null
  auth: CrmSection<CrmAuthSummary | null>
  profile: CrmSection<Record<string, unknown> | null>
  linkedAthletes: CrmSection<CrmLinkedAthleteRow[]>
  orders: CrmSection<{ rows: CrmOrderSummaryRow[]; note?: string }>
  blueMemberships: CrmSection<CrmBlueMembershipRow[]>
  guildAllocations: CrmSection<CrmGuildAllocationRow[]>
  nationalTeamRegistrations: CrmSection<CrmNationalTeamRegRow[]>
  dropInRequests: CrmSection<CrmDropInRow[]>
  blueSignups: CrmSection<CrmBlueSignupRow[]>
  crmNotes: CrmSection<CrmNoteRow[]>
  crmSettings: CrmSection<CrmContactSettingsRow | null>
  crmAuditRecent: CrmSection<CrmAuditRow[]>
  /** Per linked / primary athlete: all-time wallet totals — same basis as Profile → Digital wallet. */
  fundraisingWallet: CrmSection<{
    campaign: string
    athletes: ParentSpartanFundraisingAthleteRow[]
  }>
  /** Parent-submitted reimbursement history for this account. */
  athleteExpenseRequests: CrmSection<CrmExpenseRequestHistoryRow[]>
  /** Checkout charges where this contact’s email was the payer (Spartan / NCU channel). */
  spartanDonorCharges: CrmSection<{ rows: CrmSpartanDonorChargeRow[]; note?: string }>
}

function sectionError<T>(message: string): CrmSection<T> {
  return { ok: false, error: message }
}

function isMissingTable(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false
  if (err.code === "42P01") return true
  return Boolean(err.message?.includes("does not exist"))
}

function normalizeEmail(row: Record<string, unknown> | null): string | null {
  if (!row) return null
  const e = row.email
  if (typeof e !== "string") return null
  const t = e.trim().toLowerCase()
  return t || null
}

async function loadAuthSummary(admin: SupabaseClient, userId: string): Promise<CrmSection<CrmAuthSummary | null>> {
  try {
    const { data, error } = await admin.auth.admin.getUserById(userId)
    if (error) {
      return sectionError(error.message || "auth.lookup_failed")
    }
    const u = data?.user
    if (!u) return { ok: true, data: null }
    return {
      ok: true,
      data: {
        id: u.id,
        email: u.email ?? null,
        phone: u.phone ?? null,
        createdAt: u.created_at ?? null,
        lastSignInAt: u.last_sign_in_at ?? null,
        confirmedAt: u.confirmed_at ?? null,
        isAnonymous: !!u.is_anonymous,
      },
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return sectionError(msg)
  }
}

async function loadProfile(admin: SupabaseClient, userId: string): Promise<CrmSection<Record<string, unknown> | null>> {
  try {
    const { data, error } = await admin.from("user_profiles").select("*").eq("user_id", userId).maybeSingle()
    if (error) {
      if (isMissingTable(error)) return { ok: true, data: null }
      return sectionError(error.message)
    }
    return { ok: true, data: (data as Record<string, unknown>) ?? null }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return sectionError(msg)
  }
}

async function loadLinkedAthletes(
  admin: SupabaseClient,
  userId: string,
): Promise<CrmSection<CrmLinkedAthleteRow[]>> {
  try {
    const { data: links, error: linkError } = await admin
      .from("parent_athlete_links")
      .select("athlete_id")
      .eq("user_id", userId)

    if (linkError) {
      if (isMissingTable(linkError)) return { ok: true, data: [] }
      return sectionError(linkError.message)
    }

    const athleteIds = [...new Set((links ?? []).map((r) => (r as { athlete_id: string }).athlete_id))]
    if (athleteIds.length === 0) return { ok: true, data: [] }

    const { data: athletes, error: athleteError } = await admin
      .from("athletes")
      .select("id, name, profile_verified")
      .in("id", athleteIds)

    if (athleteError) {
      if (isMissingTable(athleteError)) return { ok: true, data: [] }
      return sectionError(athleteError.message)
    }

    const rows = (athletes ?? []).map((a) => {
      const row = a as { id: string; name: string | null; profile_verified: boolean | null }
      return {
        athleteId: row.id,
        name: row.name ?? null,
        profileVerified: row.profile_verified ?? null,
      }
    })
    return { ok: true, data: rows }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return sectionError(msg)
  }
}

async function loadOrders(
  admin: SupabaseClient,
  userId: string,
  emailLower: string | null,
): Promise<CrmSection<{ rows: CrmOrderSummaryRow[]; note?: string }>> {
  const map = new Map<string, CrmOrderSummaryRow>()
  const noteParts: string[] = []

  try {
    const byUser = await admin
      .from("orders")
      .select("id, created_at, total, status, channel, customer_email, recruitnc_user_id")
      .eq("recruitnc_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(40)

    if (byUser.error) {
      if ((byUser.error as { code?: string }).code === "42703") {
        noteParts.push("Column recruitnc_user_id not on orders yet — run scripts/crm-hub-extensions.sql.")
      } else if (!isMissingTable(byUser.error)) {
        return sectionError(byUser.error.message)
      }
    } else {
      for (const r of byUser.data ?? []) {
        const row = r as CrmOrderSummaryRow
        map.set(row.id, { ...row, matchSource: "recruitnc_user_id" })
      }
    }

    if (emailLower) {
      const byEmail = await admin
        .from("orders")
        .select("id, created_at, total, status, channel, customer_email, recruitnc_user_id")
        .ilike("customer_email", emailLower)
        .order("created_at", { ascending: false })
        .limit(40)

      if (byEmail.error) {
        if (isMissingTable(byEmail.error)) {
          return { ok: true, data: { rows: [] } }
        }
        return sectionError(byEmail.error.message)
      }
      for (const r of byEmail.data ?? []) {
        const row = r as CrmOrderSummaryRow
        if (!map.has(row.id)) {
          map.set(row.id, { ...row, matchSource: "customer_email" })
        }
      }
    } else {
      noteParts.push("No profile or auth email — orders matched by user id only.")
    }

    const rows = [...map.values()].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 40)

    return {
      ok: true,
      data: {
        rows,
        note: noteParts.length ? noteParts.join(" ") : undefined,
      },
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return sectionError(msg)
  }
}

async function loadBlueMemberships(admin: SupabaseClient, userId: string): Promise<CrmSection<CrmBlueMembershipRow[]>> {
  try {
    const { data, error } = await admin
      .from("blue_memberships")
      .select(
        "id, athlete_id, status, stripe_subscription_id, started_at, created_at, next_billing_at, ended_at",
      )
      .eq("payer_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30)

    if (error) {
      if (isMissingTable(error)) return { ok: true, data: [] }
      return sectionError(error.message)
    }
    return { ok: true, data: (data ?? []) as CrmBlueMembershipRow[] }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return sectionError(msg)
  }
}

async function loadGuildAllocations(admin: SupabaseClient, userId: string): Promise<CrmSection<CrmGuildAllocationRow[]>> {
  try {
    const { data, error } = await admin
      .from("guild_credit_allocations")
      .select("id, athlete_id, amount_cents, status, campaign, created_at, error_message")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      if (isMissingTable(error)) return { ok: true, data: [] }
      return sectionError(error.message)
    }
    return { ok: true, data: (data ?? []) as CrmGuildAllocationRow[] }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return sectionError(msg)
  }
}

async function loadNationalTeam(
  admin: SupabaseClient,
  userId: string,
  emailLower: string | null,
): Promise<CrmSection<CrmNationalTeamRegRow[]>> {
  try {
    const byId = await admin
      .from("national_team_event_registrations")
      .select("id, event_slug, status, created_at, parent_user_id, parent_email")
      .eq("parent_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)

    if (byId.error) {
      if (isMissingTable(byId.error)) return { ok: true, data: [] }
      return sectionError(byId.error.message)
    }

    const map = new Map<string, CrmNationalTeamRegRow>()
    for (const r of byId.data ?? []) {
      const row = r as CrmNationalTeamRegRow
      map.set(row.id, { ...row, matchSource: "parent_user_id" })
    }

    if (emailLower) {
      const byEmail = await admin
        .from("national_team_event_registrations")
        .select("id, event_slug, status, created_at, parent_user_id, parent_email")
        .ilike("parent_email", emailLower)
        .order("created_at", { ascending: false })
        .limit(50)

      if (byEmail.error) {
        if (!isMissingTable(byEmail.error)) {
          return sectionError(byEmail.error.message)
        }
      } else if (byEmail.data) {
        for (const r of byEmail.data) {
          const row = r as CrmNationalTeamRegRow
          if (!map.has(row.id)) {
            map.set(row.id, { ...row, matchSource: "parent_email" })
          }
        }
      }
    }

    return { ok: true, data: [...map.values()].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))) }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return sectionError(msg)
  }
}

async function loadDropIns(admin: SupabaseClient, userId: string): Promise<CrmSection<CrmDropInRow[]>> {
  try {
    const { data, error } = await admin
      .from("drop_in_requests")
      .select("id, payment_status, created_at, wrestler_name")
      .eq("parent_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(25)

    if (error) {
      if (isMissingTable(error)) return { ok: true, data: [] }
      return sectionError(error.message)
    }
    return { ok: true, data: (data ?? []) as CrmDropInRow[] }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return sectionError(msg)
  }
}

async function loadBlueSignups(
  admin: SupabaseClient,
  userId: string,
  emailLower: string | null,
): Promise<CrmSection<CrmBlueSignupRow[]>> {
  try {
    const map = new Map<string, CrmBlueSignupRow>()

    const byPayer = await admin
      .from("blue_signups")
      .select("id, status, created_at, parent_email")
      .eq("payer_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(25)

    if (byPayer.error) {
      const code = (byPayer.error as { code?: string }).code
      if (code === "42703") {
        // Older blue_signups schema has no payer_user_id; match by parent_email only.
      } else if (isMissingTable(byPayer.error)) {
        return { ok: true, data: [] }
      } else {
        return sectionError(byPayer.error.message)
      }
    } else {
      for (const r of byPayer.data ?? []) {
        const row = r as CrmBlueSignupRow
        map.set(row.id, row)
      }
    }

    if (emailLower) {
      const byEmail = await admin
        .from("blue_signups")
        .select("id, status, created_at, parent_email")
        .ilike("parent_email", emailLower)
        .order("created_at", { ascending: false })
        .limit(25)

      if (byEmail.error) {
        if (!isMissingTable(byEmail.error)) {
          return sectionError(byEmail.error.message)
        }
      } else {
        for (const r of byEmail.data ?? []) {
          const row = r as CrmBlueSignupRow
          if (!map.has(row.id)) {
            map.set(row.id, row)
          }
        }
      }
    }

    const rows = [...map.values()].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    return { ok: true, data: rows }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return sectionError(msg)
  }
}

async function loadCrmNotes(admin: SupabaseClient, contactUserId: string): Promise<CrmSection<CrmNoteRow[]>> {
  try {
    const { data, error } = await admin
      .from("crm_contact_notes")
      .select("id, body, pinned, author_user_id, created_at, updated_at")
      .eq("contact_user_id", contactUserId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(80)

    if (error) {
      if (isMissingTable(error)) return { ok: true, data: [] }
      return sectionError(error.message)
    }
    return { ok: true, data: (data ?? []) as CrmNoteRow[] }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return sectionError(msg)
  }
}

async function loadCrmSettings(admin: SupabaseClient, contactUserId: string): Promise<CrmSection<CrmContactSettingsRow | null>> {
  try {
    const { data, error } = await admin
      .from("crm_contact_settings")
      .select("contact_user_id, assigned_admin_user_id, priority, last_touched_at, updated_at")
      .eq("contact_user_id", contactUserId)
      .maybeSingle()

    if (error) {
      if (isMissingTable(error)) return { ok: true, data: null }
      return sectionError(error.message)
    }
    return { ok: true, data: (data as CrmContactSettingsRow) ?? null }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return sectionError(msg)
  }
}

async function loadCrmAuditRecent(admin: SupabaseClient, contactUserId: string): Promise<CrmSection<CrmAuditRow[]>> {
  try {
    const { data, error } = await admin
      .from("crm_hub_audit_log")
      .select("id, action, actor_user_id, created_at, metadata")
      .eq("contact_user_id", contactUserId)
      .order("created_at", { ascending: false })
      .limit(40)

    if (error) {
      if (isMissingTable(error)) return { ok: true, data: [] }
      return sectionError(error.message)
    }
    const rows = (data ?? []).map((r) => {
      const row = r as CrmAuditRow & { metadata?: unknown }
      return {
        id: row.id,
        action: row.action,
        actor_user_id: row.actor_user_id,
        created_at: row.created_at,
        metadata: (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, unknown>,
      }
    })
    return { ok: true, data: rows }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return sectionError(msg)
  }
}

async function loadFundraisingWallet(
  admin: SupabaseClient,
  userId: string,
): Promise<
  CrmSection<{
    campaign: string
    athletes: ParentSpartanFundraisingAthleteRow[]
  }>
> {
  try {
    const { campaign, athletes } = await computeParentSpartanFundraisingTotalsForUser(admin, userId)
    return {
      ok: true,
      data: {
        campaign,
        athletes,
      },
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return sectionError(msg)
  }
}

async function loadAthleteExpenseRequestHistory(
  admin: SupabaseClient,
  userId: string,
): Promise<CrmSection<CrmExpenseRequestHistoryRow[]>> {
  try {
    const { data, error } = await admin
      .from("athlete_expense_requests")
      .select(
        "id, athlete_id, expense_type, amount_cents, amount_approved_cents, payment_method, status, parent_notes, admin_notes, created_at, paid_at, athletes ( name )",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      if (isMissingTable(error)) return { ok: true, data: [] }
      return sectionError(error.message)
    }

    const rows: CrmExpenseRequestHistoryRow[] = (data ?? []).map((raw) => {
      const r = raw as {
        id: string
        athlete_id: string
        expense_type: string | null
        amount_cents: number
        amount_approved_cents: number | null
        payment_method: string | null
        status: string | null
        parent_notes: string | null
        admin_notes: string | null
        created_at: string | null
        paid_at: string | null
        athletes: { name: string } | { name: string }[] | null
      }
      const a = r.athletes
      const athleteName = a == null ? null : Array.isArray(a) ? a[0]?.name ?? null : a.name ?? null
      return {
        id: r.id,
        athlete_id: r.athlete_id,
        athlete_name: athleteName,
        expense_type: r.expense_type,
        amount_cents: r.amount_cents,
        amount_approved_cents: r.amount_approved_cents,
        payment_method: r.payment_method,
        status: r.status,
        parent_notes: r.parent_notes,
        admin_notes: r.admin_notes,
        created_at: r.created_at,
        paid_at: r.paid_at,
      }
    })
    return { ok: true, data: rows }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return sectionError(msg)
  }
}

async function loadSpartanDonorChargesForEmail(
  emailLower: string | null,
): Promise<CrmSection<{ rows: CrmSpartanDonorChargeRow[]; note?: string }>> {
  if (!emailLower) {
    return {
      ok: true,
      data: { rows: [], note: "No email on file — cannot match Stripe charges to this donor." },
    }
  }
  const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim()
  if (!stripeSecret) {
    return { ok: true, data: { rows: [], note: "Stripe not configured." } }
  }
  try {
    const Stripe = (await import("stripe")).default
    const stripe = new Stripe(stripeSecret)
    const charges = await stripe.charges.list({ limit: 100 })
    const matches = charges.data.filter((c) => {
      if (c.metadata?.channel !== "spartan") return false
      const r = (c.receipt_email ?? "").trim().toLowerCase()
      const b = (c.billing_details?.email ?? "").trim().toLowerCase()
      return r === emailLower || b === emailLower
    })
    matches.sort((a, b) => b.created - a.created)
    const rows: CrmSpartanDonorChargeRow[] = matches.slice(0, 40).map((c) => ({
      id: c.id,
      amount_cents: c.amount,
      created_unix: c.created,
      athlete_code: c.metadata?.athlete_code ?? c.metadata?.fundraising_code ?? "",
      campaign: c.metadata?.spartan_campaign ?? "",
      status: c.status ?? "",
    }))
    return { ok: true, data: { rows } }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return sectionError(msg)
  }
}

/**
 * Read-only admin CRM snapshot for one auth user. Each subsection is isolated;
 * a failure in one area does not prevent others from returning data.
 */
export async function fetchAdminCrmUserHub(admin: SupabaseClient, userId: string): Promise<AdminCrmUserHubPayload> {
  const generatedAt = new Date().toISOString()

  const [auth, profile] = await Promise.all([loadAuthSummary(admin, userId), loadProfile(admin, userId)])

  const profileEmail = profile.ok ? normalizeEmail(profile.data) : null
  const authEmail =
    auth.ok && auth.data?.email
      ? auth.data.email.trim().toLowerCase()
      : null
  const emailUsedForLookup = profileEmail ?? authEmail

  const [
    linkedAthletes,
    orders,
    blueMemberships,
    guildAllocations,
    nationalTeamRegistrations,
    dropInRequests,
    blueSignups,
    crmNotes,
    crmSettings,
    crmAuditRecent,
    fundraisingWallet,
    athleteExpenseRequests,
    spartanDonorCharges,
  ] = await Promise.all([
    loadLinkedAthletes(admin, userId),
    loadOrders(admin, userId, emailUsedForLookup),
    loadBlueMemberships(admin, userId),
    loadGuildAllocations(admin, userId),
    loadNationalTeam(admin, userId, emailUsedForLookup),
    loadDropIns(admin, userId),
    loadBlueSignups(admin, userId, emailUsedForLookup),
    loadCrmNotes(admin, userId),
    loadCrmSettings(admin, userId),
    loadCrmAuditRecent(admin, userId),
    loadFundraisingWallet(admin, userId),
    loadAthleteExpenseRequestHistory(admin, userId),
    loadSpartanDonorChargesForEmail(emailUsedForLookup),
  ])

  return {
    userId,
    generatedAt,
    emailUsedForLookup,
    auth,
    profile,
    linkedAthletes,
    orders,
    blueMemberships,
    guildAllocations,
    nationalTeamRegistrations,
    dropInRequests,
    blueSignups,
    crmNotes,
    crmSettings,
    crmAuditRecent,
    fundraisingWallet,
    athleteExpenseRequests,
    spartanDonorCharges,
  }
}
