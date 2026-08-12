import { redirect } from "next/navigation"

/**
 * Retired. Single source of truth: Enhanced Media Manager.
 *
 * There were fifteen media and logo manager surfaces, four of them public routes in
 * production. Kept as a redirect rather than deleted so existing bookmarks still land
 * somewhere useful — the same pattern /admin/logo-manager already used.
 */
export default function RetiredunifiedmediamanagerRedirect() {
  redirect("/admin/enhanced-media-manager")
}
