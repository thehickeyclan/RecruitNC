/**
 * What everyone except staff sees on the pre-launch brand address (middleware.ts, lib/staging-gate.ts).
 * No athlete data, no links into the product, not indexed.
 *
 * recruitwrestlers.com shows the RecruitWrestlers logo in navy and lime (Matt's final design,
 * 20 Oct 2026). Any other gated address shows a plain holding page. The route keeps its old path
 * because middleware rewrites to it; recruit.wrestlingguild.com now forwards to recruitwrestlers.com.
 */
import type { Metadata } from "next"
import { headers } from "next/headers"
import { RwLogo } from "@/components/recruiting/rw-mark"

export const dynamic = "force-dynamic"

async function isRecruitWrestlers() {
  const host = ((await headers()).get("host") ?? "").toLowerCase().split(":")[0]
  return host === "recruitwrestlers.com" || host === "www.recruitwrestlers.com"
}

export async function generateMetadata(): Promise<Metadata> {
  const rw = await isRecruitWrestlers()
  return {
    title: { absolute: rw ? "RecruitWrestlers" : "Coming soon" },
    robots: { index: false, follow: false },
    openGraph: null,
    twitter: null,
    manifest: null,
    ...(rw ? { icons: { icon: [{ url: "/recruitwrestlers/favicon-32.png", sizes: "32x32", type: "image/png" }, { url: "/recruitwrestlers/icon-192.png", sizes: "192x192", type: "image/png" }], apple: [{ url: "/recruitwrestlers/apple-icon.png" }] } } : {}),
  }
}

export default async function ComingSoon() {
  const rw = await isRecruitWrestlers()
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0B1426] px-6 text-center text-white">
      {rw ? (
        <>
          <RwLogo className="h-12 w-auto sm:h-16" />
        </>
      ) : null}
      <h1 className={`${rw ? "mt-10" : "mt-3"} text-3xl font-black tracking-tight sm:text-4xl`}>Coming soon.</h1>
      {rw ? (
        <p className="mt-4 max-w-xl text-lg text-white/70">
          The future of college wrestling recruiting.
          <span className="mt-1 block text-base text-white/55">Powered by verified results, real recruiting intelligence, and AI.</span>
        </p>
      ) : null}
      <a href="/auth/signin" className="mt-10 text-xs text-white/35 hover:text-white/60">
        Staff sign in
      </a>
      {rw ? <p className="mt-6 text-xs text-white/30">A Guild Ventures company</p> : null}
    </main>
  )
}
