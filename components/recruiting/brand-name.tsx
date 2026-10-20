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

/** A sentence written for NC United, with the product's name swapped on a brand address. */
export function BrandText({ text }: { text: string }) {
  const host = useBrandHost()
  if (host !== "national" && host !== "guild") return <>{text}</>
  const name = host === "guild" ? "Guild Recruiting" : "RecruitWrestlers"
  return <>{text.replace(/RecruitNC/g, name).replace(/NC United Wrestling|NC United/g, name)}</>
}
