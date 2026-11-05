import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

import { viewAsRole } from "@/lib/business/view-as-coach"
import { VIEW_AS_COOKIE, cleanViewAsId } from "@/lib/view-as/cookie"

/**
 * Whose coach portal a page should show (Matt, 4 Nov 2026: viewing as Hayden "shows reinhard on
 * some stuff, shows hayden on others.. it should show nothing but what hayden sees").
 *
 * The coach picked at /admin/view-as-coach arrives as `?as=<id>` on the first page and is kept in
 * the `view_as_coach` cookie for every page after (set in components/app-chrome.tsx). The cookie
 * is only a request: it counts for an admin or a business account (lib/business/view-as-coach.ts)
 * and is ignored for everyone else, so a coach cannot use it to read another program.
 *
 * Every coach page and API resolves its subject through here instead of `user.id`.
 */
export type ViewSubject = {
  /** The account whose portal is shown. */
  subjectId: string
  /** "self" unless an admin or business account is viewing a coach. */
  viewer: "self" | "admin" | "business"
  /** Viewing someone else: show, never write. */
  readOnly: boolean
}

export async function requestedViewAsId(asParam?: string | null): Promise<string | null> {
  const fromParam = cleanViewAsId(asParam)
  if (fromParam) return fromParam
  try {
    return cleanViewAsId((await cookies()).get(VIEW_AS_COOKIE)?.value)
  } catch {
    return null
  }
}

export async function viewSubject(
  admin: SupabaseClient,
  user: { id: string; app_metadata?: unknown },
  asParam?: string | null,
): Promise<ViewSubject> {
  const self: ViewSubject = { subjectId: user.id, viewer: "self", readOnly: false }
  const requested = await requestedViewAsId(asParam)
  if (!requested || requested === user.id) return self
  const role = await viewAsRole(admin, user.id, user.app_metadata)
  if (!role) return self
  return { subjectId: requested, viewer: role, readOnly: true }
}
