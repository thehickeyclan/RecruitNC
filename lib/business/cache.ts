import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

import { loadBusinessData, type BusinessData } from "@/lib/business/load"

/**
 * One read of the business data, shared by every filter change for a few minutes.
 *
 * The load is ~13,000 events over 8,600 wrestlers and takes about seven seconds, nearly all of it
 * paging `user_analytics`. Changing a filter re-renders the page on the server, so without this
 * every chip click would pay that again. Numbers this old are fine for the job: nobody runs sales
 * off the last four minutes.
 *
 * Deliberately a module memo rather than `unstable_cache`: the payload is a Map and large, and it
 * should live and die with the server instance, not be written to a cache store.
 */

const TTL_MS = 5 * 60 * 1000

let cached: { at: number; data: BusinessData } | null = null
let inFlight: Promise<BusinessData> | null = null

export async function businessData(force = false): Promise<BusinessData> {
  if (!force && cached && Date.now() - cached.at < TTL_MS) return cached.data
  if (inFlight) return inFlight
  inFlight = loadBusinessData(createAdminClient())
    .then((data) => {
      cached = { at: Date.now(), data }
      return data
    })
    .finally(() => {
      inFlight = null
    })
  return inFlight
}
