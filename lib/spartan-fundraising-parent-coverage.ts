import type { SupabaseClient } from "@supabase/supabase-js"
import { getFundraisingAthleteEntries, type FundraisingAthleteEntry } from "@/lib/spartan-fundraising-code"
import type { SpartanAthleteAggregate } from "@/lib/spartan-fayetteville-stripe"

export type SpartanParentCoverageStatus =
  | "ok"
  | "no_managing_user"
  | "roster_only_no_athlete_row"
  | "code_not_in_directory"

export type SpartanParentCoverageRow = {
  athleteCode: string
  displayName: string
  athleteId: string | null
  totalCents: number
  donationCount: number
  managingUserCount: number
  status: SpartanParentCoverageStatus
}

/**
 * For each NCU code with Stripe dollars in `aggregates`, checks whether a parent (or self-profile)
 * can manage that athlete on Profile → Fundraise (`parent_athlete_links` or `user_profiles.athlete_id`).
 */
export async function getSpartanFundraisingParentCoverage(
  admin: SupabaseClient,
  aggregates: SpartanAthleteAggregate[],
): Promise<{
  rows: SpartanParentCoverageRow[]
  summary: { withFunds: number; needsAttention: number; ok: number }
}> {
  const entries = await getFundraisingAthleteEntries(admin)
  const byLowerCode = new Map<string, FundraisingAthleteEntry>()
  for (const e of entries) {
    byLowerCode.set(e.code.trim().toLowerCase(), e)
  }

  type Pending =
    | { kind: "directory_miss"; code: string; totalCents: number; donationCount: number }
    | { kind: "entry"; code: string; totalCents: number; donationCount: number; entry: FundraisingAthleteEntry }

  const pending: Pending[] = []
  for (const a of aggregates) {
    if (!a.athleteCode?.trim() || a.totalCents <= 0) continue
    const code = a.athleteCode.trim()
    const e = byLowerCode.get(code.toLowerCase())
    if (!e) {
      pending.push({ kind: "directory_miss", code, totalCents: a.totalCents, donationCount: a.donationCount })
      continue
    }
    pending.push({ kind: "entry", code, totalCents: a.totalCents, donationCount: a.donationCount, entry: e })
  }

  const athleteIds = new Set<string>()
  for (const p of pending) {
    if (p.kind === "entry" && !p.entry.id.startsWith("spartan-fundraising:")) {
      athleteIds.add(p.entry.id)
    }
  }

  const idList = [...athleteIds]
  const managersByAthlete = new Map<string, Set<string>>()
  for (const id of idList) managersByAthlete.set(id, new Set())

  if (idList.length > 0) {
    const { data: linkRows, error: linkErr } = await admin
      .from("parent_athlete_links")
      .select("athlete_id, user_id")
      .in("athlete_id", idList)
    if (linkErr && linkErr.code !== "42P01") {
      console.error("[spartan-fundraising-parent-coverage] parent_athlete_links", linkErr.message)
    }
    for (const r of linkRows ?? []) {
      const row = r as { athlete_id?: string; user_id?: string }
      if (row.athlete_id && row.user_id) managersByAthlete.get(row.athlete_id)?.add(row.user_id)
    }

    const { data: profileRows, error: profErr } = await admin
      .from("user_profiles")
      .select("user_id, athlete_id")
      .in("athlete_id", idList)
    if (profErr) {
      console.error("[spartan-fundraising-parent-coverage] user_profiles", profErr.message)
    }
    for (const r of profileRows ?? []) {
      const row = r as { user_id?: string; athlete_id?: string | null }
      if (row.athlete_id && row.user_id) managersByAthlete.get(row.athlete_id)?.add(row.user_id)
    }
  }

  const rows: SpartanParentCoverageRow[] = []
  for (const p of pending) {
    if (p.kind === "directory_miss") {
      rows.push({
        athleteCode: p.code,
        displayName: "—",
        athleteId: null,
        totalCents: p.totalCents,
        donationCount: p.donationCount,
        managingUserCount: 0,
        status: "code_not_in_directory",
      })
      continue
    }
    const e = p.entry
    const rosterOnly = e.id.startsWith("spartan-fundraising:")
    if (rosterOnly) {
      rows.push({
        athleteCode: p.code,
        displayName: e.fullName?.trim() || e.label,
        athleteId: null,
        totalCents: p.totalCents,
        donationCount: p.donationCount,
        managingUserCount: 0,
        status: "roster_only_no_athlete_row",
      })
      continue
    }
    const athleteId = e.id
    const managingUserCount = managersByAthlete.get(athleteId)?.size ?? 0
    rows.push({
      athleteCode: p.code,
      displayName: e.fullName?.trim() || e.label,
      athleteId,
      totalCents: p.totalCents,
      donationCount: p.donationCount,
      managingUserCount,
      status: managingUserCount > 0 ? "ok" : "no_managing_user",
    })
  }

  rows.sort((a, b) => b.totalCents - a.totalCents)
  const ok = rows.filter((r) => r.status === "ok").length
  const needsAttention = rows.length - ok
  return { rows, summary: { withFunds: rows.length, needsAttention, ok } }
}
