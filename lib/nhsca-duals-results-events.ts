/** Fired after NHSCA duals results are saved or cleared so roster flip cards refetch stats. */
export const NHSCA_DUALS_RESULTS_UPDATED = "nhsca-duals-results-updated"

export function notifyNhscaDualsResultsUpdated() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(NHSCA_DUALS_RESULTS_UPDATED))
}
