/** Which colleges on file a coach might mean by what he has typed so far (components/auth/college-field.tsx). */

export type College = {
  id: string
  /** Shown and searched. */
  name: string
  /** Saved when chosen; a second spelling the school is also found by ("UNC Chapel Hill"). */
  value?: string
  place?: string | null
  division?: string | null
}

/** Words every school shares; they find nothing and order nothing. */
const NOISE = /^(the|of|at|and|&|university|college)$/

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9& ]/g, " ").split(/\s+/).filter(Boolean)

export function matchColleges(colleges: readonly College[], typed: string, limit = 8): College[] {
  const wanted = words(typed).filter((w) => !NOISE.test(w))
  if (!wanted.length) return []
  return colleges
    .map((college) => {
      // "The University of Virginia" begins, for this purpose, with "virginia".
      const have = words(`${college.name} ${college.value ?? ""}`).filter((w) => !NOISE.test(w))
      const hits = wanted.filter((w) => have.some((h) => h.startsWith(w))).length
      return { college, hits, starts: have[0]?.startsWith(wanted[0]!) ? 1 : 0 }
    })
    .filter((m) => m.hits === wanted.length)
    .sort((a, b) => b.starts - a.starts || a.college.name.length - b.college.name.length || a.college.name.localeCompare(b.college.name))
    .slice(0, limit)
    .map((m) => m.college)
}
