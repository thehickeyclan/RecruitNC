import { currentClassYears } from "@/lib/class-years"
import { loadDirectoryRows } from "@/lib/prospect-directory-cache"
import { visibleStates } from "@/lib/recruiting/brand"
import { onRecruitWrestlersProject } from "@/lib/recruiting/product-name"
import { HOME_STATE } from "@/lib/recruiting/states"
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
    initialProspects = await loadDirectoryRows(scope === "ALL" ? liveCodes : [HOME_STATE], currentClassYears())
  } catch (error) {
    console.error("[prospects/all] SSR prefetch failed:", error)
  }

  return <ProspectsAllClient initialProspects={initialProspects as never[]} initialScope={initialProspects.length ? scope : null} />
}
