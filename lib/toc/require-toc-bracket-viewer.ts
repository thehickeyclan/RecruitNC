import { requireTocFieldViewer } from "@/lib/toc/require-toc-field-viewer"

export type TocBracketViewerCheck = { allowed: true } | { allowed: false }

/** TOC brackets are private to admins and explicitly approved TOC media/staff. */
export async function checkTocBracketViewer(): Promise<TocBracketViewerCheck> {
  const auth = await requireTocFieldViewer()
  if (!auth.ok) return { allowed: false }
  return { allowed: true }
}

/** Private gate for bracket pages and APIs. */
export async function requireTocBracketViewer(): Promise<
  { ok: true } | { ok: false; status: 401 | 403 }
> {
  const auth = await requireTocFieldViewer()
  if (!auth.ok) return { ok: false, status: auth.status }
  return { ok: true }
}
