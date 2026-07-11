import { requireAdmin } from "@/lib/admin-auth"
import { tocBracketsPublicEnabled } from "@/lib/toc/bracket-public-access"

export type TocBracketViewerCheck = { allowed: true } | { allowed: false }

/** Public + logged-in users blocked until TOC_BRACKETS_PUBLIC_ENABLED=true. */
export async function checkTocBracketViewer(): Promise<TocBracketViewerCheck> {
  if (tocBracketsPublicEnabled()) return { allowed: true }
  const auth = await requireAdmin()
  if (!auth.ok) return { allowed: false }
  return { allowed: true }
}

/** Admin-only gate for bracket pages and APIs (unless public flag is on). */
export async function requireTocBracketViewer(): Promise<
  { ok: true } | { ok: false; status: 401 | 403 }
> {
  if (tocBracketsPublicEnabled()) return { ok: true }
  return requireAdmin()
}
