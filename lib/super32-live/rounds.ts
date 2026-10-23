/** Round ordering, client-safe (no server imports) so the page can sort bouts too. */
/** Bout order for one wrestler: championship rounds by depth, then consolation, then placement. */
export function roundOrder(round: string): number {
  const r = round.toLowerCase()
  const placement = r.match(/^(\d)(st|nd|rd|th) place/)
  if (/^finals?$/.test(r) || placement) return 3000 + (placement ? Number(placement[1]) : 1)
  const champ = r.match(/^round of (\d+)/)
  if (champ) return 1000 + (512 - Number(champ[1]))
  if (/quarter/.test(r)) return 1000 + 504
  if (/^semi/.test(r)) return 1000 + 508
  // Consi of 8 #1, #2, Consi of 4, then Consi-Semis: deeper rounds later, #1 before #2.
  const consi = r.match(/^consi of (\d+)(?: #(\d))?/)
  if (consi) return 2000 + (512 - Number(consi[1])) + Number(consi[2] ?? 1) / 10
  if (/consi-?semi/.test(r)) return 2000 + 509
  return 2500
}

/**
 * Roughly when in the event a round is wrestled, for "latest first" lists: championship and
 * consolation rounds interleave by field size, placement matches come last.
 */
export function roundProgress(round: string): number {
  const r = round.toLowerCase()
  const lg = (n: number) => Math.log2(256 / n) * 2
  if (/^(finals?|\d(st|nd|rd|th) place)/.test(r)) return 100
  const champ = r.match(/^round of (\d+)/)
  if (champ) return lg(Number(champ[1]))
  if (/quarter/.test(r)) return lg(8)
  if (/consi-?semi/.test(r)) return lg(4) + 1
  if (/^semi/.test(r)) return lg(4)
  const consi = r.match(/^consi of (\d+)(?: #(\d))?/)
  if (consi) return lg(Number(consi[1])) + 0.5 * Number(consi[2] ?? 1)
  return 50
}
