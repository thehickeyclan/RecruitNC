/**
 * The board a scoped ranker opens first (lib/rankings/ranking-board-access.ts for who they are).
 *
 * Brandon Palmer ranks the girls: when he signs in he goes straight to the women's Class of 2027
 * board (Matt, 13 October 2026), not to the rankings sales page a non-subscriber would get, and
 * not to the men's board the page opens on when a link carries no class. The choice lives beside
 * the grant in Supabase Auth `app_metadata`, which only the service role can write:
 *
 *   app_metadata.ranking_board_default = { "gender": "Female", "year": 2027 }
 *
 * With no default set, the first board they may edit is used; then the first they may read.
 *
 * Pure, and free of server imports, so the board page can use it in the browser.
 */
export const RANKING_BOARD_PATH = "/admin/rankings/board"

/** state: the first state the chosen grant covers (North Carolina when a grant names none). */
export type RankingBoardDefault = { gender: "Male" | "Female"; year: number; state: string }

type GrantLike = { gender?: unknown; years?: unknown; access?: unknown; states?: unknown }

function statesOf(g: GrantLike): string[] {
  return Array.isArray(g.states) && g.states.length ? (g.states as unknown[]).map((x) => String(x).trim().toUpperCase()) : ["NC"]
}

/**
 * The states a ranker's grants open, or null for somebody with no grant (an admin sees every state).
 * Dilberth Jimenez ranks Maryland only (22 Oct 2026): his board opens on Maryland and lists nothing else.
 */
export function rankingBoardStates(appMetadata: unknown): string[] | null {
  const meta = (appMetadata ?? {}) as Record<string, unknown>
  const grants = (Array.isArray(meta.ranking_board_access) ? meta.ranking_board_access : []) as GrantLike[]
  if (!grants.length) return null
  return [...new Set(grants.flatMap(statesOf))]
}

function firstYear(years: unknown): number | null {
  if (years === "all") return 2027
  if (Array.isArray(years) && years.length && years.every((y) => Number.isInteger(y))) return Math.min(...(years as number[]))
  return null
}

/** The board this user should open on, or null for somebody with no ranking grant. */
export function rankingBoardDefault(appMetadata: unknown): RankingBoardDefault | null {
  const meta = (appMetadata ?? {}) as Record<string, unknown>
  const grants = (Array.isArray(meta.ranking_board_access) ? meta.ranking_board_access : []) as GrantLike[]
  const usable = grants.filter(
    (g) => g && (g.gender === "Male" || g.gender === "Female") && (g.access === "edit" || g.access === "read") && firstYear(g.years) !== null,
  )
  if (!usable.length) return null

  const chosen = meta.ranking_board_default as Record<string, unknown> | undefined
  if (chosen && (chosen.gender === "Male" || chosen.gender === "Female") && Number.isInteger(chosen.year)) {
    const year = chosen.year as number
    const allowed = usable.some(
      (g) => g.gender === chosen.gender && (g.years === "all" || (g.years as number[]).includes(year)),
    )
    if (allowed) {
      const grant = usable.find((g) => g.gender === chosen.gender && g.access === "edit") ?? usable.find((g) => g.gender === chosen.gender)!
      return { gender: chosen.gender, year, state: statesOf(grant)[0] }
    }
  }

  const first = usable.find((g) => g.access === "edit") ?? usable[0]
  return { gender: first.gender as "Male" | "Female", year: firstYear(first.years)!, state: statesOf(first)[0] }
}

/** The link to that board, or null. */
export function rankingBoardHome(appMetadata: unknown): string | null {
  const board = rankingBoardDefault(appMetadata)
  return board ? `${RANKING_BOARD_PATH}?year=${board.year}&gender=${board.gender}${board.state !== "NC" ? `&state=${board.state}` : ""}` : null
}
