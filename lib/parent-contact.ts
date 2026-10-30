import type { SupabaseClient } from "@supabase/supabase-js"

import { classifyViewer } from "@/lib/viewer-role"

/**
 * A wrestler's parent or guardian contact (Matt, 30 Oct 2026: "keep it super simple.. only show
 * to parent and college coaches and admin"). One parent: name, email, phone.
 *
 * Stored in athlete_parent_contacts, never on athletes - profile feeds select athletes.*, and this
 * must not reach the public or the wrestler's own account.
 *
 *   see:  a parent linked to the wrestler, the owner when the owner's account is a parent's,
 *         verified college coaches, admins
 *   edit: the same family, and admins
 */
export type ParentContact = { name: string | null; email: string | null; phone: string | null }

export type ParentContactAccess = { see: boolean; edit: boolean }

export type ParentContactViewer = {
  isLinkedParent: boolean
  ownsAsParent: boolean
  isAdmin: boolean
  isVerifiedCoach: boolean
}

export function parentContactAccess(v: ParentContactViewer): ParentContactAccess {
  const family = v.isLinkedParent || v.ownsAsParent
  return { see: family || v.isAdmin || v.isVerifiedCoach, edit: family || v.isAdmin }
}

const clean = (v: unknown, max: number) => {
  const s = String(v ?? "").trim().slice(0, max)
  return s || null
}

/** What a family typed, tidied; null when there is nothing to keep. */
export function cleanParentContact(input: unknown): ParentContact | null {
  const i = (input ?? {}) as Record<string, unknown>
  const contact = { name: clean(i.name, 80), email: clean(i.email, 120)?.toLowerCase() ?? null, phone: clean(i.phone, 30) }
  return contact.name || contact.email || contact.phone ? contact : null
}

export function isValidParentEmail(email: string | null): boolean {
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function parentContactViewer(admin: SupabaseClient, viewerId: string | null, athleteId: string): Promise<ParentContactViewer> {
  const none = { isLinkedParent: false, ownsAsParent: false, isAdmin: false, isVerifiedCoach: false }
  if (!viewerId) return none
  const [{ data: link }, { data: athlete }, { data: profile }] = await Promise.all([
    admin.from("parent_athlete_links").select("athlete_id").eq("user_id", viewerId).eq("athlete_id", athleteId).maybeSingle(),
    admin.from("athletes").select("claimed_by_user_id").eq("id", athleteId).maybeSingle(),
    admin.from("user_profiles").select("role, verified_coach, is_admin, profile_type").eq("user_id", viewerId).maybeSingle(),
  ])
  const viewer = profile ? classifyViewer(profile as Parameters<typeof classifyViewer>[0]) : null
  const isAdmin = (profile as { is_admin?: unknown } | null)?.is_admin === true || viewer?.kind === "admin"
  const owns = Boolean(athlete?.claimed_by_user_id && String(athlete.claimed_by_user_id) === viewerId)
  return {
    isLinkedParent: Boolean(link),
    ownsAsParent: owns && String((profile as { role?: unknown } | null)?.role ?? "") === "parent",
    isAdmin,
    isVerifiedCoach: Boolean(viewer?.verifiedCoach),
  }
}
