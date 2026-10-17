"use client"

import { useBrandHost } from "@/components/recruiting/brand-host"

/**
 * The product's name where it is printed in a page: RecruitNC on NC United's address, and the
 * brand's own name on a pre-launch brand address. Only NC United's name is in the HTML; the other
 * is swapped in after load on its own address, so an unannounced name never appears on NC United.
 */
export function BrandName({ ncu = "RecruitNC", guild = "Guild Recruiting", national = "RecruitWrestlers" }: { ncu?: string; guild?: string; national?: string }) {
  const host = useBrandHost()
  return <>{host === "guild" ? guild : host === "national" ? national : ncu}</>
}
