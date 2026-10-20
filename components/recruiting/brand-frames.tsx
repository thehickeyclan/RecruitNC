"use client"

import dynamic from "next/dynamic"
import { useEffect } from "react"
import { useBrandHost, type BrandHost } from "@/components/recruiting/brand-host"

/** Tab titles carry the brand's name on its address (the pages are titled for NC United). */
function useBrandTitle(host: BrandHost) {
  useEffect(() => {
    if (!host) return
    const name = host === "guild" ? "Guild Recruiting" : "RecruitWrestlers"
    const fix = () => {
      const t = document.title
      // "Cobin Rabon | RecruitNC", "Coach Home | RecruitNC | NC United Wrestling": the brand's name,
      // once. The state name stays on pages about a state (the NC rankings), never as the site name.
      const next = t
        .replace(/ \| RecruitNC(?= \||$)/g, ` | ${name}`)
        .replace(/NC United Wrestling/g, name)
        .replace(new RegExp(`( \\| ${name})+`, "g"), ` | ${name}`)
      if (next !== t) document.title = next
    }
    fix()
    const observer = new MutationObserver(fix)
    observer.observe(document.head, { subtree: true, childList: true, characterData: true })
    const timer = window.setInterval(fix, 500)
    return () => {
      observer.disconnect()
      window.clearInterval(timer)
    }
  }, [host])
}

/*
 * The brand frames, loaded only on their own address: their code is a separate chunk that NC
 * United's pages never request, and they render nothing elsewhere.
 */
const GuildHeader = dynamic(() => import("@/components/recruiting/guild-frame").then((m) => m.GuildHeader), { ssr: false })
const GuildFooter = dynamic(() => import("@/components/recruiting/guild-frame").then((m) => m.GuildFooter), { ssr: false })
const GuildLockup = dynamic(() => import("@/components/recruiting/guild-frame").then((m) => m.GuildRecruitingLockup), { ssr: false })
const GuildSignIn = dynamic(() => import("@/components/recruiting/guild-frame").then((m) => m.GuildSignInPanel), { ssr: false })
const NationalHeader = dynamic(() => import("@/components/recruiting/national-frame").then((m) => m.NationalHeader), { ssr: false })
const NationalFooter = dynamic(() => import("@/components/recruiting/national-frame").then((m) => m.NationalFooter), { ssr: false })
const NationalLockup = dynamic(() => import("@/components/recruiting/national-frame").then((m) => m.NationalLockup), { ssr: false })

export function BrandHeader() {
  const host = useBrandHost()
  useBrandTitle(host)
  return host === "guild" ? <GuildHeader /> : host === "national" ? <NationalHeader /> : null
}

export function BrandFooter() {
  const host = useBrandHost()
  return host === "guild" ? <GuildFooter /> : host === "national" ? <NationalFooter /> : null
}

export function BrandLockup() {
  const host = useBrandHost()
  // The coach portal has no BrandHeader; its lockup carries the tab-title rename instead.
  useBrandTitle(host)
  return host === "guild" ? <GuildLockup /> : host === "national" ? <NationalLockup /> : null
}

export function BrandSignInPanel() {
  const host = useBrandHost()
  return host === "guild" ? <GuildSignIn /> : null
}
