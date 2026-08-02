import { requireAdmin } from "@/lib/admin-auth"

export type TocBracketViewerCheck = { allowed: true } | { allowed: false }

/** TOC brackets are admin-only until leadership explicitly publishes them. */
export async function checkTocBracketViewer(): Promise<TocBracketViewerCheck> {
  const auth = await requireAdmin()
  if (!auth.ok) return { allowed: false }
  return { allowed: true }
}

/** Admin-only gate for bracket pages and APIs. */
export async function requireTocBracketViewer(): Promise<
  { ok: true } | { ok: false; status: 401 | 403 }
> {
  return requireAdmin()
}
