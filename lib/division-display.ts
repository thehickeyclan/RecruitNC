/**
 * Division display/filter stubs — division removed from platform.
 * Rebuild division tracking from scratch when needed.
 */

export const CANONICAL_DIVISIONS_FULL: string[] = []

export function matchesDivisionFilter(_division: string | null | undefined, _filter: string): boolean {
  return true
}

export function getDivisionDisplayShort(_division: string | null | undefined): string {
  return ""
}
