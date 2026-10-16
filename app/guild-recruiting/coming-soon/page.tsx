/**
 * What everyone except staff sees on recruit.wrestlingguild.com before launch (middleware.ts,
 * lib/staging-gate.ts). No athlete data, no links into the product, not indexed.
 */
import type { Metadata } from "next"
import { guildMetadata } from "@/lib/recruiting/guild-brand"

export const metadata: Metadata = guildMetadata("Guild Recruiting")

export default function GuildComingSoon() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/guild/guild-mark-512.png" alt="The Wrestling Guild" className="h-28 w-28 object-contain" />
      <p className="mt-6 text-xs font-bold uppercase tracking-[0.4em] text-[#B89D60]">Guild Recruiting</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Coming soon.</h1>
      <p className="mt-3 max-w-md text-white/60">College wrestling recruiting, built on verified results.</p>
      <a href="/auth/signin" className="mt-10 text-xs text-white/35 hover:text-white/60">
        Staff sign in
      </a>
    </main>
  )
}
