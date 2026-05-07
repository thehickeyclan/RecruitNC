import type { ScholarshipRow } from "@/lib/scholarships/types"

/** Application window is open for submissions (server checks dates + status). */
export function scholarshipApplicationsAreOpen(
  row: Pick<ScholarshipRow, "status" | "applications_open_date" | "applications_close_date">,
): boolean {
  if (row.status === "archived" || row.status === "applications_closed") return false

  const now = Date.now()

  if (row.applications_open_date) {
    const openMs = Date.parse(`${row.applications_open_date}T00:00:00`)
    if (Number.isFinite(openMs) && now < openMs) return false
  }

  if (row.applications_close_date) {
    const closeMs = Date.parse(`${row.applications_close_date}T23:59:59`)
    if (Number.isFinite(closeMs) && now > closeMs) return false
  }

  return row.status === "applications_open" || row.status === "active"
}

export type ScholarshipApplicationBadge = "open" | "closed" | "coming_soon"

export function scholarshipApplicationBadge(row: ScholarshipRow): ScholarshipApplicationBadge {
  if (row.status === "archived" || row.status === "applications_closed") return "closed"

  if (row.applications_open_date) {
    const openMs = Date.parse(`${row.applications_open_date}T00:00:00`)
    if (Number.isFinite(openMs) && Date.now() < openMs) return "coming_soon"
  }

  if (!scholarshipApplicationsAreOpen(row)) return "closed"
  return "open"
}
