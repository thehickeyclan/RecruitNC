import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { getAthleteProfileUrl } from "@/lib/athlete-profile-links"
import { resultClauses } from "@/lib/college-programs/outreach-results"
import { loadAthleteCredentials } from "@/lib/credentials/athlete-credentials"
import { loadLastCompeted } from "@/lib/prospect-last-competed"

/**
 * The recruiting info sheet: everything a college questionnaire asks, in one block to copy
 * (Matt, 15 Oct 2026, from a parent's guide: "every form asks the same things - keep them in one
 * document"). Built from the profile and verified results, so it says what the email says; a line
 * the profile does not have is left out, never filled in.
 */
const COLUMNS =
  'id, name, wrestling_name, "firstName", "lastName", highschool, graduationyear, gender, weightclass, location, academic_gpa, academic_sat, academic_act, academic_interest, "contactEmail", phone, nhsca_results, super32_results'

export async function buildInfoSheet(admin: SupabaseClient, athleteId: string): Promise<string | null> {
  const { data: a } = await admin.from("athletes").select(COLUMNS).eq("id", athleteId).maybeSingle()
  if (!a) return null
  const row = a as unknown as Record<string, unknown>
  const year = Number(row.graduationyear) || null
  const [creds, last] = await Promise.all([loadAthleteCredentials(admin, row), loadLastCompeted(admin, [athleteId], new Map([[athleteId, year]]))])
  const text = (v: unknown) => (v == null ? "" : String(v).trim())
  const name = `${text(row.firstName)} ${text(row.lastName)}`.trim() || text(row.name)
  const weight = last.get(athleteId)?.weight ?? (text(row.weightclass) || null)
  const results = resultClauses(creds, 4).map((c) => c.replace(/^I /, "").replace(/^\w/, (x) => x.toUpperCase()))
  const lines: Array<[string, string | null]> = [
    ["Name", name || null],
    ["Graduation year", year ? String(year) : null],
    ["High school", text(row.highschool) && text(row.highschool) !== "Not specified" ? text(row.highschool) : null],
    ["Hometown", text(row.location) || null],
    ["Weight", weight ? `${String(weight).replace(/\s*lbs?$/i, "")} lbs (last competed)` : null],
    ["Results", results.length ? results.join("; ") : null],
    ["GPA", text(row.academic_gpa) || null],
    ["SAT", text(row.academic_sat) || null],
    ["ACT", text(row.academic_act) || null],
    ["Intended major", text(row.academic_interest) || null],
    ["Phone", text(row.phone) || null],
    ["Email", text(row.contactEmail) || null],
    ["Profile and results", getAthleteProfileUrl(athleteId)],
  ]
  return lines
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")
}
