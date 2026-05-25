import type { NhscaDualsTournamentGalleryPhoto } from "@/lib/nhsca-duals-2026-tournament-gallery"
import type { NhscaDualsWrestlerRecord } from "@/lib/nhsca-duals-live-results/types"

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+jr\.?$/i, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function weightMatches(recordWeight: string, photoWeight: string): boolean {
  const rw = recordWeight.trim().toUpperCase()
  const pw = photoWeight.trim().toUpperCase()
  if (rw === pw) return true
  if (rw === "HWT" || pw === "HWT") return rw === pw
  return parseInt(rw, 10) === parseInt(pw, 10)
}

/** Match gallery photo to live wrestler record (name + weight). */
export function recordForGalleryPhoto(
  photo: NhscaDualsTournamentGalleryPhoto,
  records: NhscaDualsWrestlerRecord[]
): NhscaDualsWrestlerRecord | undefined {
  const target = normalizeName(photo.wrestler)
  const exact = records.find(
    (r) => normalizeName(r.name) === target && weightMatches(r.displayWeight, photo.weightClass)
  )
  if (exact) return exact

  const byName = records.filter((r) => normalizeName(r.name) === target)
  if (byName.length === 1) return byName[0]

  const lastToken = target.split(" ").pop() ?? target
  return records.find(
    (r) =>
      weightMatches(r.displayWeight, photo.weightClass) &&
      normalizeName(r.name).split(" ").includes(lastToken)
  )
}

export function formatGalleryRecord(record: NhscaDualsWrestlerRecord | undefined): string | null {
  if (!record) return null
  const bouts = record.wins + record.losses
  if (bouts === 0) return null
  return `${record.wins}-${record.losses}`
}
