/**
 * Deciding when two identity rows are one wrestler.
 *
 * The registry keys a person on the exact normalised name, so any spelling difference mints a
 * second human: a bracketed nickname, a middle initial, a source truncation, a hyphen that became
 * a space. These are the three judgements that merge them, and they are deliberately separate:
 * the name test only proposes, and a merge needs positive corroboration AND no conflict.
 *
 * That split exists because of "Claire Ball" and "Claire Ballard" of North Carolina. The name test
 * reads one as the other truncated — a surname really can be a prefix of another surname — and
 * they are two different girls. Only their class years held them apart, and 95% of the registry
 * has no class year.
 */
import { namesLikelySamePerson } from "@/lib/athlete-name-match"

export type Identity = {
  id: string
  canonical_name: string
  normalized_name: string
  first_name: string | null
  last_name: string | null
  state: string | null
  gender: string | null
  graduation_year: number | null
  athlete_id: string | null
  first_seen_season: number | null
  last_seen_season: number | null
  evidence: Record<string, unknown> | null
}


/** The ways one wrestler's name differs from itself across sources. */
export function sameNameDifferentSpelling(a: string, b: string): string | null {
  if (a === b) return null
  const wa = a.split(" ")
  const wb = b.split(" ")
  /* "zoe-shal ahue bolosan" against "zoe-shalom ahue bolosan": a source truncated a word. */
  if (wa.length === wb.length) {
    const diff = wa.map((w, i) => [w, wb[i]] as const).filter(([x, y]) => x !== y)
    if (diff.length === 1) {
      const [x, y] = diff[0]
      const [shortW, longW] = x.length < y.length ? [x, y] : [y, x]
      if (shortW.length >= 4 && longW.startsWith(shortW)) return `"${shortW}" is "${longW}" truncated`
    }
  }
  /* "ericson ej coney" against "ericson coney": a middle name, initial or bracketed nickname. */
  const [shortN, longN] = wa.length < wb.length ? [wa, wb] : [wb, wa]
  if (longN.length === shortN.length + 1 && shortN.length >= 2) {
    const extra = longN.filter((w) => !shortN.includes(w))
    if (longN[0] === shortN[0] && longN[longN.length - 1] === shortN[shortN.length - 1] && extra.length === 1) {
      return `"${extra[0]}" is a middle name or nickname`
    }
  }
  /* Nick for Nicholas, and the rest the product's matcher already knows. */
  if (namesLikelySamePerson(a, b)) return "the name matcher reads them as one person"
  return null
}

/**
 * Positive evidence that two rows ARE one wrestler.
 *
 * Absence of conflict is not enough. Only 4.6% of identities carry a class year and most placers
 * appear in a single season, so two brothers usually conflict with nothing — and "Claire Ball"
 * against "Claire Ballard" of North Carolina, two different girls, was held apart only because
 * both happened to have one. A surname that is a prefix of another surname is a coincidence, not
 * a truncation.
 *
 * So a merge has to be corroborated: the same school, or a weight close enough in a season close
 * enough to be one wrestler growing.
 */
export function corroborates(a: Identity, b: Identity): string | null {
  const schools = (i: Identity) =>
    ((i.evidence?.schools as string[] | undefined) ?? []).map((x) => String(x).trim().toLowerCase()).filter(Boolean)
  const sa = schools(a)
  const sb2 = schools(b)
  const shared = sa.find((x) => sb2.includes(x))
  if (shared) return `same school (${shared})`

  const points = (i: Identity) => {
    const weights = ((i.evidence?.weights as string[] | undefined) ?? []).map(Number).filter(Boolean)
    const seasons = ((i.evidence?.seasons as number[] | undefined) ?? []).map(Number).filter(Boolean)
    return { weights, seasons }
  }
  const pa = points(a)
  const pb = points(b)
  for (const wa of pa.weights) {
    for (const wb of pb.weights) {
      if (Math.abs(wa - wb) > 30) continue
      for (const ya of pa.seasons) {
        for (const yb of pb.seasons) {
          if (Math.abs(ya - yb) <= 2) return `weight ${wa} and ${wb} in ${ya} and ${yb}`
        }
      }
    }
  }
  return null
}

/** Evidence that two rows are two people after all. */
export function conflict(a: Identity, b: Identity): string | null {
  if (a.graduation_year && b.graduation_year && a.graduation_year !== b.graduation_year) {
    return `different class years (${a.graduation_year} vs ${b.graduation_year})`
  }
  if (a.athlete_id && b.athlete_id && a.athlete_id !== b.athlete_id) {
    return "each is already a different profile of ours"
  }
  const seasons = (i: Identity) =>
    new Set(((i.evidence?.seasons as number[] | undefined) ?? []).map(Number).filter(Boolean))
  const sa = seasons(a)
  const sb2 = seasons(b)
  const shared = [...sa].filter((y) => sb2.has(y))
  /*
   * Both placing in the same season is the strongest signal of two people: a wrestler places once
   * per season per division, so two rows in one year are two wrestlers — unless the divisions
   * differ, which happens when a state reclassifies.
   */
  if (shared.length) {
    const wa = new Set(((a.evidence?.weights as string[] | undefined) ?? []).map(String))
    const wb = new Set(((b.evidence?.weights as string[] | undefined) ?? []).map(String))
    const sameWeight = [...wa].some((w) => wb.has(w))
    if (!sameWeight) return `both placed in ${shared.join(", ")} at different weights`
  }
  return null
}

