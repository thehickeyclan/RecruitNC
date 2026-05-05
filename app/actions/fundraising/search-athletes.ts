"use server"

import { searchHubAthletes } from "@/lib/fundraising/hub-athlete-search"

export async function searchFundraisingAthletesAction(query: string) {
  return searchHubAthletes(query)
}
