/** Admin list for TOC athlete interest (`toc_nominations`). */

export const TOC_NOMINATIONS_TABLE_SETUP_HINT =
  "Run docs/sql/toc-phase-1.sql.txt in the Supabase SQL Editor (creates toc_nominations and related TOC tables)."

export function isTocNominationsTableMissingError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === "42P01") return true
  const msg = String(error.message ?? "").toLowerCase()
  return msg.includes("toc_nominations") && msg.includes("does not exist")
}
