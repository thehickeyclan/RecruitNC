"use client"

import { NhscaDualsResultsCommandCenter } from "@/components/national-team/nhsca-duals-results-command-center"
import type { NhscaDualsResultsSnapshot } from "@/lib/nhsca-duals-live-results/types"

/** Family-facing live results — command center layout. */
export function NhscaDualsResultsPublic({ snapshot }: { snapshot: NhscaDualsResultsSnapshot }) {
  return <NhscaDualsResultsCommandCenter snapshot={snapshot} />
}
