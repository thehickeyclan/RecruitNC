import { createHmac, timingSafeEqual } from "node:crypto"

import { cleanViewAsId } from "@/lib/view-as/cookie"

/**
 * The family-view cookie, signed (Matt, 4 Nov 2026). /view-as-family/<id> checks the account once
 * and writes who may look at which family, as what; every later page only checks the signature and
 * that the same account is still signed in. Re-checking the grant on every page bounced Rhett to
 * the plans page from My List.
 */
export type FamilyPassRole = "admin" | "business"

function secret(): string {
  const s = process.env.VIEW_AS_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error("No signing secret for the family view")
  return s
}

const sign = (body: string) => createHmac("sha256", secret()).update(`view-as-family:${body}`).digest("base64url")

export function makeFamilyPass(familyId: string, viewerId: string, role: FamilyPassRole): string {
  const body = `${familyId}.${viewerId}.${role}`
  return `${body}.${sign(body)}`
}

/** The family and role, when the pass is genuine and was made for this signed-in account. */
export function readFamilyPass(value: string | undefined, viewerId: string | null): { familyId: string; role: FamilyPassRole } | null {
  if (!value || !viewerId) return null
  const [familyId, owner, role, mac] = value.split(".")
  if (!cleanViewAsId(familyId) || owner !== viewerId || (role !== "admin" && role !== "business") || !mac) return null
  const want = Buffer.from(sign(`${familyId}.${owner}.${role}`))
  const got = Buffer.from(mac)
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null
  return { familyId: familyId!, role }
}
