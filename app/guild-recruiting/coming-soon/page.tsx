/**
 * What everyone except staff sees on a pre-launch brand address (middleware.ts, lib/staging-gate.ts).
 * No athlete data, no links into the product, not indexed.
 *
 * Only recruit.wrestlingguild.com shows the Guild emblem and name. Any other gated address
 * (recruitwrestlers.com) shows a plain holding page: the Guild name is not public until Matt
 * approves the brand (16 Oct 2026).
 */
import type { Metadata } from "next"
import Image from "next/image"
import { headers } from "next/headers"
import { guildMetadata } from "@/lib/recruiting/guild-brand"

export const dynamic = "force-dynamic"

async function isGuildAddress() {
  const host = ((await headers()).get("host") ?? "").toLowerCase().split(":")[0]
  return host === "recruit.wrestlingguild.com"
}

export async function generateMetadata(): Promise<Metadata> {
  if (await isGuildAddress()) return guildMetadata("Guild Recruiting")
  return { title: { absolute: "Coming soon" }, robots: { index: false, follow: false }, openGraph: null, twitter: null, manifest: null }
}

export default async function ComingSoon() {
  const guild = await isGuildAddress()
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-white">
      {guild ? (
        <>
          <Image src="/guild/guild-emblem.png" alt="The Wrestling Guild emblem" width={1100} height={1007} priority sizes="320px" className="h-auto w-72 sm:w-80" />
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.4em] text-[#B89D60]">Guild Recruiting</p>
        </>
      ) : null}
      <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Coming soon.</h1>
      {guild ? <p className="mt-3 max-w-md text-white/60">College wrestling recruiting, built on verified results.</p> : null}
      <a href="/auth/signin" className="mt-10 text-xs text-white/35 hover:text-white/60">
        Staff sign in
      </a>
    </main>
  )
}
