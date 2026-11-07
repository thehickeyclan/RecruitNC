import { currentClassYears } from "@/lib/class-years"
import { loadDirectoryRows } from "@/lib/prospect-directory-cache"
import { visibleStates } from "@/lib/recruiting/brand"
import { onRecruitWrestlersProject } from "@/lib/recruiting/product-name"
import { HOME_STATE } from "@/lib/recruiting/states"
import { claimedElsewhereSlice } from "@/lib/prospects-directory"
import ProspectsAllClient from "./prospects-all-client"

export const revalidate = 120

export default async function ProspectsAllPage() {
  /*
   * The list this address opens on, so the browser never has to fetch it again: RecruitWrestlers
   * opens on every live state at once, NC United on North Carolina (prospects-all-client.tsx).
   */
  const onRw = onRecruitWrestlersProject()
  const liveCodes = visibleStates(false, onRw).map((s) => s.code)
  const scope = onRw && liveCodes.length > 1 ? "ALL" : HOME_STATE
  let initialProspects: Awaited<ReturnType<typeof loadDirectoryRows>> = []
  try {
    /*
     * RecruitWrestlers' "All" also lists claimed profiles from states not open yet
     * (lib/prospects-directory.ts).
     *
     * This prefetch is an OPTIMISATION, never a requirement: the client fetches the same list
     * when it arrives empty, which is why initialScope is null below when it does. So it gets a
     * time budget. On 6 November 2026 the live-state count went 5 -> 41 in one evening, this
     * call became 168 slice builds, and with a cold cache it stopped returning at all - the page
     * 500ed and then hung, because an await with no ceiling is an outage waiting for enough
     * states. Budget exceeded means render without it and let the browser ask; it is slower for
     * one visitor rather than down for all of them.
     */
    const budgetMs = 7_000
    initialProspects = await Promise.race([
      loadDirectoryRows(scope === "ALL" ? [...liveCodes, claimedElsewhereSlice(liveCodes)] : [HOME_STATE], currentClassYears()),
      new Promise<[]>((resolve) => setTimeout(() => resolve([]), budgetMs)),
    ])
  } catch (error) {
    console.error("[prospects/all] SSR prefetch failed:", error)
  }

  return <ProspectsAllClient initialProspects={initialProspects as never[]} initialScope={initialProspects.length ? scope : null} />
}
