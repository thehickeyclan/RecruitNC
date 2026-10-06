import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * A family-reported win, checked against the brackets we hold - the check a college coach would
 * make. Reported wins are published on submission (lib/athlete-submitted-wins.ts), so nothing
 * waits on this; it decides whether the record can close itself or needs a person.
 *
 * - "confirmed": we hold that win.
 * - "contradicted": we hold bouts against that opponent and every one is a loss - the only case
 *   worth a human's time.
 * - "unverified": we do not hold the event (2025 Tar Heel, the US Open, 16U National Duals...).
 *   Normal, and published as athlete-reported, so it closes too.
 */
export type ReportedWinCheck = "confirmed" | "contradicted" | "unverified"

function surname(name: string): string {
  return (
    String(name ?? "")
      .trim()
      .split(/\s+/)
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z]/g, "") ?? ""
  )
}

export async function checkReportedWin(
  admin: SupabaseClient,
  athleteId: string,
  opponent: string,
): Promise<ReportedWinCheck> {
  const last = surname(opponent)
  if (!last || last.length < 2) return "unverified"
  const { data } = await admin
    .from("other_tournament_bouts")
    .select("win, opponent_name")
    .eq("athlete_id", athleteId)
    .ilike("opponent_name", `%${last}%`)
    .limit(50)
  const bouts = (data ?? []).filter((b) => surname(String(b.opponent_name ?? "")) === last)
  if (!bouts.length) return "unverified"
  if (bouts.some((b) => b.win === true)) return "confirmed"
  return bouts.some((b) => b.win === false) ? "contradicted" : "unverified"
}

export function reviewNote(check: ReportedWinCheck): { status: "approved" | "pending"; note: string } {
  if (check === "contradicted") {
    return {
      status: "pending",
      note: "ESCALATED: published as athlete-reported, but our bracket data shows only losses to this opponent.",
    }
  }
  return {
    status: "approved",
    note:
      check === "confirmed"
        ? "Auto-reviewed: published on submission; the win is in our bracket data."
        : "Auto-reviewed: published on submission as athlete-reported; event not in our bracket data, nothing contradicts it.",
  }
}
