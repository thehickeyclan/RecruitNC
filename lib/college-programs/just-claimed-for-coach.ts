import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { currentClassYears } from "@/lib/class-years"
import { withFitSignals } from "@/lib/college-programs/interested-for-coach"
import { highestAchievement, loadAchievements, type AchievementLevel } from "@/lib/prospect-achievements"
import { resolveFitViewer } from "@/lib/program-fit-viewer"

/**
 * "Just claimed" on My Recruits (Matt, 5 Nov 2026): wrestlers whose family claimed the profile in
 * the last 30 days, from any state, each with its state and how it may fit this program. A claim
 * is the one signal that a family is here and can be messaged; without this list a coach only
 * finds them one at a time.
 */
export type JustClaimedCard = Awaited<ReturnType<typeof loadJustClaimed>>[number]

const WINDOW_DAYS = 30

/**
 * A claim is written in three places and no one of them holds every claim: athletes.claimed_at
 * (a wrestler's own account), parent_athlete_links (a parent's) and profile_claim_consents (the
 * routes through claimProfile). Jax Smith's parent claim, Virginia's first, is only in the last two.
 */
async function claimedSince(admin: SupabaseClient, since: string): Promise<Map<string, string>> {
  const [own, parents, consents] = await Promise.all([
    admin.from("athletes").select("id, claimed_at").gte("claimed_at", since).limit(1000),
    admin.from("parent_athlete_links").select("athlete_id, created_at").gte("created_at", since).limit(1000),
    admin.from("profile_claim_consents").select("athlete_id, created_at").gte("created_at", since).limit(1000),
  ])
  const at = new Map<string, string>()
  const add = (id: unknown, when: unknown) => {
    if (!id || !when) return
    const prev = at.get(String(id))
    if (!prev || String(when) > prev) at.set(String(id), String(when))
  }
  for (const r of own.data ?? []) add(r.id, r.claimed_at)
  for (const r of parents.data ?? []) add(r.athlete_id, r.created_at)
  for (const r of consents.data ?? []) add(r.athlete_id, r.created_at)
  return at
}

/** The window's claims as rows, before fit and credentials: the menu count needs only these. */
async function claimedRows(admin: SupabaseClient, gender: "Male" | "Female" | null) {
  const at = await claimedSince(admin, new Date(Date.now() - WINDOW_DAYS * 864e5).toISOString())
  if (!at.size) return []
  const { data } = await admin
    .from("athletes")
    .select("id, name, graduationyear, highschool, gender, photourl, state, college, recruiting_status")
    .in("id", [...at.keys()])
    .in("graduationyear", currentClassYears())
  const rows = (data ?? [])
    // A committed wrestler is not a recruit to act on.
    .filter((a) => !a.college && String(a.recruiting_status ?? "").toLowerCase() !== "committed")
    .filter((a) => !gender || (gender === "Female" ? /^f/i.test(String(a.gender ?? "")) : !/^f/i.test(String(a.gender ?? ""))))
    .map((a) => ({
      id: String(a.id),
      name: String(a.name ?? ""),
      gender: (a.gender as string | null) ?? null,
      classYear: a.graduationyear ? Number(a.graduationyear) : null,
      highSchool: (a.highschool as string | null) ?? null,
      photo: (a.photourl as string | null) ?? null,
      // Two letters or nothing: a few early profiles carry "XX" or no state at all.
      state: /^[A-Z]{2}$/.test(String(a.state ?? "")) && a.state !== "XX" ? String(a.state) : null,
      at: at.get(String(a.id))!,
    }))
  return rows
}

/** The recently claimed wrestlers in this coach's view, fits first, then newest. */
export async function loadJustClaimed(
  admin: SupabaseClient,
  schoolId: string | null,
  gender: "Male" | "Female" | null,
  onBoard: Set<string>,
  fitViewer: Awaited<ReturnType<typeof resolveFitViewer>> | null,
  limit = 12,
) {
  const rows = await claimedRows(admin, gender)
  const [fitted, facts] = await Promise.all([
    withFitSignals(admin, rows, schoolId, gender, onBoard, fitViewer),
    // The tile's credential (Matt, 5 Nov 2026), from the same tables the directory's honour pills read, every state's included.
    loadAchievements(admin, rows.map((r) => ({ id: r.id, name: r.name }))).catch(() => new Map()),
  ])
  const cards = fitted.map((c) => ({ ...c, ...honorOf(facts.get(c.id) ?? {}) }))
  const fitRank = (c: (typeof cards)[number]) =>
    (c.fit?.verdict === "meets" ? 0 : c.fit?.verdict === "possible" ? 1 : c.fit ? 3 : 2) + (c.room?.need === "likely" ? 0 : c.room?.need === "some" ? 0.5 : 0.9)
  return cards
    // Fit, then newest: ranking by honour put a 29-day-old claim above yesterday's, and the point is who just arrived.
    .sort((a, b) => fitRank(a) - fitRank(b) || b.at.localeCompare(a.at))
    .slice(0, limit)
}

/** "All-American · State Placer", "State Champ", "State Qualifier", or nothing for a wrestler with neither. */
function honorOf(facts: Parameters<typeof highestAchievement>[0]): { honor: string | null; honorLevel: AchievementLevel } {
  const top = highestAchievement(facts)
  const place = facts.bestStatePlace
  const state = place === 1 ? "State Champ" : place != null && place >= 2 && place <= 6 ? "State Placer" : null
  if (top.level === "all-american") return { honor: ["All-American", state].filter(Boolean).join(" · "), honorLevel: top.level }
  if (top.level === "dnq") return { honor: null, honorLevel: top.level }
  return { honor: top.level === "state-champion" ? "State Champ" : top.badge, honorLevel: top.level }
}

/** New since the coach last opened /recently-claimed: the menu's count. */
export async function newClaimedCount(admin: SupabaseClient, gender: "Male" | "Female" | null, seenAt: string | null): Promise<number> {
  const rows = await claimedRows(admin, gender)
  return rows.filter((r) => !seenAt || r.at > seenAt).length
}

/** When the coach last opened the page, and marking it opened (clears the count). */
export function claimedSeenAt(user: { user_metadata?: Record<string, unknown> | null } | null): string | null {
  const v = user?.user_metadata?.claimed_seen_at
  return typeof v === "string" ? v : null
}

export async function markClaimedSeen(admin: SupabaseClient, userId: string): Promise<void> {
  const { data } = await admin.auth.admin.getUserById(userId)
  await admin.auth.admin.updateUserById(userId, { user_metadata: { ...(data?.user?.user_metadata ?? {}), claimed_seen_at: new Date().toISOString() } })
}
