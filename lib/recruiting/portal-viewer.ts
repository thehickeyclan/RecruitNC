import "server-only"

import { cookies } from "next/headers"
import type { SupabaseClient } from "@supabase/supabase-js"

import { resolveRankingViewer, resolveRankingViewerForUser } from "@/lib/ranking-access"
import type { RankingViewer } from "@/lib/ranking-visibility"

/**
 * Who the recruiting portal is being shown to.
 *
 * In production this is exactly the signed-in viewer (resolveRankingViewer), nothing else.
 *
 * On a developer's machine an admin can look at the portal as one named family
 * (/dev/family-preview), the same idea as /dev/coach-preview: the Command Center, the map and the
 * rules pages each change with the wrestler, and "what does a girl's family see" could not be
 * answered without that family's password. The preview:
 *
 * - does not exist in a production or preview build (NODE_ENV is "production" in both);
 * - needs the real signed-in viewer to be an admin as well;
 * - is read-only by construction: only pages and read routes ask this function. Everything that
 *   saves (My List, the schedule, emails) still acts as the real signed-in account, so nothing
 *   can be written to the family being looked at.
 */
export const PREVIEW_COOKIE = "dev_family_preview"

export type PortalViewer = { viewer: RankingViewer; userId: string | null; previewing: boolean }

export function parsePreview(value: string | undefined): { userId: string; blue: boolean } | null {
  const m = /^([0-9a-f-]{36})(:blue)?$/i.exec(String(value ?? ""))
  return m ? { userId: m[1], blue: Boolean(m[2]) } : null
}

export async function resolvePortalViewer(options: { supabase: SupabaseClient; admin: SupabaseClient }): Promise<PortalViewer> {
  const real = await resolveRankingViewer(options)
  if (process.env.NODE_ENV === "production" || !real.viewer.isAdmin) return { ...real, previewing: false }
  const preview = parsePreview((await cookies()).get(PREVIEW_COOKIE)?.value)
  if (!preview) return { ...real, previewing: false }
  const family = await resolveRankingViewerForUser({ admin: options.admin, userId: preview.userId })
  // `blue` shows the portal as it would be if this family were a member: most of it is locked otherwise.
  return { viewer: { ...family.viewer, isAdmin: false, ...(preview.blue ? { isBlueMember: true } : {}) }, userId: preview.userId, previewing: true }
}
