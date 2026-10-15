/**
 * Which state a wrestler belongs to, and how a query is narrowed to one state.
 *
 * North Carolina was the whole product, so "in the product" was one flag, `athletes.is_nc_athlete`.
 * South Carolina profiles went live on 15 October 2026 and more states follow, each under its own
 * name (RecruitNC, RecruitSC, ...). This is the one place that turns a state into a filter.
 *
 * North Carolina keeps its flag on purpose. The flag is what every NC list read before, and it is
 * the answer for wrestlers whose `state` was never filled in (1 of 1,306 on 15 October 2026) and
 * for profiles created by paths that set the flag but not the state - so no NC list can change
 * because of this file. Every other state is `state = code` and not flagged NC: a wrestler who
 * moved into North Carolina is counted once, as NC.
 */
export const HOME_STATE = "NC"

export function normalizeStateCode(code: string | null | undefined): string | null {
  const c = String(code ?? "").trim().toUpperCase()
  return /^[A-Z]{2}$/.test(c) ? c : null
}

/** The state a wrestler counts for: NC when flagged, otherwise his recorded state, or null. */
export function athleteStateCode(row: { state?: string | null; is_nc_athlete?: boolean | null } | null | undefined): string | null {
  if (!row) return null
  if (row.is_nc_athlete === true) return HOME_STATE
  return normalizeStateCode(row.state)
}

type Filterable = { eq(column: string, value: unknown): unknown }

/** Narrow a query over `athletes` to one state's wrestlers (North Carolina when none is given). */
export function inState<Q>(query: Q, state: string = HOME_STATE): Q {
  const code = normalizeStateCode(state) ?? HOME_STATE
  const q = query as unknown as Filterable
  if (code === HOME_STATE) return q.eq("is_nc_athlete", true) as Q
  return (q.eq("state", code) as Filterable).eq("is_nc_athlete", false) as Q
}

/**
 * States the head-to-head comparison covers. Its opponent credentials are built from North
 * Carolina's results; a state joins once its own have been checked against real matches.
 */
export const COMPARE_STATES: readonly string[] = [HOME_STATE]
