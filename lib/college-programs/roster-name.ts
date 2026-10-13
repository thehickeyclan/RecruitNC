// Kept apart from rosters.ts so a browser component can use it without downloading every roster.

/** For matching a roster name to a commitment: case, accents and punctuation aside. */
export function rosterNameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}
